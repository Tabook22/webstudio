"""Coordinator and admin accounts for course settings."""

from __future__ import annotations

import hashlib
import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import Staff, now_ms
from .services import new_id


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"{salt}${digest}"


def password_ok(stored: str, password: str) -> bool:
    salt, _, _digest = stored.partition("$")
    if not salt:
        return False
    try:
        return secrets.compare_digest(hash_password(password, salt), stored)
    except (ValueError, TypeError):
        return False


def clean_username(username: str) -> str:
    username = username.strip().lower()
    if len(username) < 3:
        raise ValueError("The username needs at least 3 characters.")
    if len(username) > 32 or not all(char.isalnum() or char in "._-" for char in username):
        raise ValueError("The username uses letters, numbers, dots, or dashes.")
    return username


def clean_password(password: str) -> str:
    if len(password) < 8 or len(password) > 80:
        raise ValueError("The password needs 8 to 80 characters.")
    return password


def clean_role(role: str) -> str:
    if role not in {"admin", "coordinator"}:
        raise ValueError("Choose admin or coordinator.")
    return role


def staff_out(user: Staff) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "active": bool(user.active),
    }


def session_out(user: Staff) -> dict:
    return {**staff_out(user), "token": user.token}


def needs_setup(db: Session) -> bool:
    count = db.scalar(select(func.count()).select_from(Staff))
    return not count


def find_staff(db: Session, token: str) -> Staff | None:
    return db.scalar(select(Staff).where(Staff.token == token, Staff.active == 1))


def _fresh_token() -> str:
    return secrets.token_urlsafe(32)


def create_staff(db: Session, username: str, password: str, display_name: str, role: str) -> Staff:
    username = clean_username(username)
    display_name = " ".join(display_name.split()) or username
    if len(display_name) > 80:
        raise ValueError("The name is too long.")
    if db.scalar(select(Staff).where(Staff.username == username)) is not None:
        raise ValueError("That username is already used.")
    user = Staff(
        id=new_id(),
        username=username,
        display_name=display_name,
        password_hash=hash_password(clean_password(password)),
        role=clean_role(role),
        active=1,
        token=_fresh_token(),
        created_at=now_ms(),
    )
    db.add(user)
    db.flush()
    return user


def login_staff(db: Session, username: str, password: str) -> Staff:
    try:
        username = clean_username(username)
    except ValueError:
        raise ValueError("That username or password is not right.") from None
    user = db.scalar(select(Staff).where(Staff.username == username))
    if user is None or not user.active or not password_ok(user.password_hash, password):
        raise ValueError("That username or password is not right.")
    user.token = _fresh_token()
    db.flush()
    return user


def list_staff(db: Session) -> list[Staff]:
    return list(db.scalars(select(Staff).order_by(Staff.role, Staff.username)).all())


def _admins(db: Session) -> list[Staff]:
    return list(db.scalars(select(Staff).where(Staff.role == "admin", Staff.active == 1)).all())


def update_staff(
    db: Session,
    user: Staff,
    display_name: str | None,
    role: str | None,
    active: bool | None,
    password: str,
) -> Staff:
    if display_name is not None:
        name = " ".join(display_name.split())
        if not name or len(name) > 80:
            raise ValueError("The name is too long.")
        user.display_name = name
    if role is not None:
        role = clean_role(role)
        if user.role == "admin" and role != "admin" and len(_admins(db)) < 2:
            raise ValueError("The admin account cannot be turned off.")
        user.role = role
    if active is not None:
        if user.role == "admin" and not active and len(_admins(db)) < 2:
            raise ValueError("The admin account cannot be turned off.")
        user.active = 1 if active else 0
        if not user.active:
            user.token = _fresh_token()
    if password.strip():
        user.password_hash = hash_password(clean_password(password))
        user.token = _fresh_token()
    db.flush()
    return user


def change_own_password(user: Staff, current: str, password: str) -> Staff:
    if not password_ok(user.password_hash, current):
        raise ValueError("The current password is not right.")
    user.password_hash = hash_password(clean_password(password))
    user.token = _fresh_token()
    return user
