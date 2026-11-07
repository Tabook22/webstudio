"""Web Studio API.

Projects, images, design kits and mission progress are stored in SQLite.
The React app talks to these routes while students design.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .classroom import (
    Actor,
    board,
    claim_device,
    class_out,
    course_admin,
    course_choice,
    create_class,
    create_lesson,
    delete_course,
    delete_lesson,
    enter_class,
    find_actor,
    join_class,
    learner_home,
    lesson_out,
    lessons_for,
    list_courses,
    mission_out,
    read_exam,
    start_lesson,
    update_class,
    write_exam,
)
from .content import public_kits, public_templates, template_by_id
from .db import AppState, Asset, Classroom, Project, Staff, WelcomeMessage, get_db, init_db, now_ms
from .staff import (
    change_own_password,
    create_staff,
    find_staff,
    list_staff,
    login_staff,
    needs_setup,
    session_out,
    staff_out,
    update_staff,
)
from .services import add_asset, build_zip, create_project, import_files

DEVICE_RE = re.compile(r"^[A-Za-z0-9_-]{8,40}$")
LAN_ORIGIN = (
    r"https?://(?:localhost|127\.0\.0\.1"
    r"|10(?:\.\d{1,3}){3}"
    r"|192\.168(?:\.\d{1,3}){2}"
    r"|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})"
    r"(?::\d+)?$"
)

def _dist_dir() -> Path:
    """Built pages. A frozen install carries them inside the application folder."""
    if getattr(sys, "frozen", False):
        root = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
        return root / "frontend" / "dist"
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


DIST = _dist_dir()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Web Studio", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=LAN_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    template_id: str = "blank"
    site_lang: str = "en"


class AssetMove(BaseModel):
    path: str
    to: str


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    title: str | None = Field(default=None, max_length=200)
    site_lang: str | None = None
    html: str | None = None
    css: str | None = None
    js: str | None = None
    files: list | None = None


class StateUpdate(BaseModel):
    current_project_id: str | None = None
    mission: dict | None = None


class ClaimBody(BaseModel):
    claim: bool = False


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    course_code: str = Field(min_length=1, max_length=16)
    section: str = Field(min_length=1, max_length=4)
    pin: str = Field(min_length=4, max_length=8)


class ClassEnter(BaseModel):
    course_code: str = ""
    section: str = ""
    pin: str = ""


class ClassJoin(BaseModel):
    course_code: str = ""
    section: str = ""
    name: str = ""
    student_id: str = ""
    pin: str = ""


class CourseUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    course_code: str = Field(min_length=1, max_length=16)
    section: str = Field(min_length=1, max_length=4)
    pin: str = ""


class ExamWrite(BaseModel):
    questions: str = ""
    questionsAr: str = ""
    html: str = ""


class StaffSetup(BaseModel):
    username: str
    password: str
    display_name: str = ""


class StaffLogin(BaseModel):
    username: str
    password: str


class StaffCreate(BaseModel):
    username: str
    password: str
    display_name: str = ""
    role: str = "coordinator"


class StaffUpdate(BaseModel):
    display_name: str | None = None
    role: str | None = None
    active: bool | None = None
    password: str = ""


class PasswordChange(BaseModel):
    current_password: str
    password: str


class WelcomeWrite(BaseModel):
    version: str = ""
    title_en: str = ""
    title_ar: str = ""
    credit_en: str = ""
    credit_ar: str = ""
    line1_en: str = ""
    line2_en: str = ""
    line1_ar: str = ""
    line2_ar: str = ""


class LessonCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    brief_en: str = ""
    brief_ar: str = ""
    template_id: str = "blank"
    site_lang: str = "ask"
    mission_ids: list[str] = []


class LessonStart(BaseModel):
    site_lang: str = "en"


class MissionBody(BaseModel):
    active: str | None = None
    badges: list[str] = []
    events: list[str] = []


class NoteBody(BaseModel):
    note: str = Field(default="", max_length=500)


def client_device(x_device: Annotated[str | None, Header()] = None) -> str | None:
    if x_device and DEVICE_RE.fullmatch(x_device):
        return x_device
    return None


def read_actor(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> Actor | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Sign in to the class again")
    found = find_actor(db, token.strip())
    if found is None:
        raise HTTPException(status_code=401, detail="Sign in to the class again")
    return found


def _guard(who: Actor | None, project: Project, device: str | None) -> None:
    if project.class_id is None:
        if who is not None and who.role == "learner":
            raise HTTPException(status_code=403, detail="That website is not in your class")
        if who is not None and who.role == "teacher":
            return
        if not device or project.device_id != device:
            raise HTTPException(status_code=404, detail="Website not found")
        return
    if who is None:
        raise HTTPException(status_code=401, detail="Join the class to open this website")
    if who.role == "teacher" and who.classroom.id == project.class_id:
        return
    if who.role == "learner" and who.learner is not None and who.learner.id == project.learner_id:
        return
    raise HTTPException(status_code=403, detail="That website belongs to another student")


def _stamp_owner(project: Project, who: Actor | None, device: str | None) -> None:
    if who is not None and who.role == "learner" and who.learner is not None:
        project.class_id = who.classroom.id
        project.learner_id = who.learner.id
        project.device_id = None
        return
    if not device:
        raise HTTPException(status_code=400, detail="Open the studio on this computer first")
    project.device_id = device
    project.class_id = None
    project.learner_id = None


def _state(db: Session) -> AppState:
    row = db.get(AppState, 1)
    if row is None:
        row = AppState(id=1, current_project_id=None, mission_json="{}")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


NAME_PART = re.compile(r"^[\w][\w. -]{0,40}$", re.UNICODE)
RESERVED = {"index.html", "style.css", "script.js", "images"}


def _files_out(raw: str | None) -> list[dict]:
    try:
        data = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def _clean_files(raw: list) -> str:
    cleaned = []
    seen: set[str] = set()
    for item in raw[:40]:
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or "").replace("\\", "/").strip().strip("/")
        parts = [part.strip() for part in path.split("/") if part.strip()]
        if not parts or any(part in {".", ".."} or not NAME_PART.fullmatch(part) for part in parts):
            continue
        path = "/".join(parts)
        low = path.lower()
        if low in RESERVED or low.startswith("images/") or low in seen:
            continue
        seen.add(low)
        folder = bool(item.get("folder"))
        content = "" if folder else str(item.get("content") or "")[:100_000]
        cleaned.append({"path": path, "folder": folder, "content": content})
    return json.dumps(cleaned, ensure_ascii=False)


def _asset_out(project_id: str, asset: Asset) -> dict:
    safe = "/".join(quote(part) for part in asset.path.split("/"))
    return {
        "path": asset.path,
        "mime": asset.mime,
        "url": f"/api/projects/{project_id}/assets/{safe}",
    }


def _project_out(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "title": project.title,
        "site_lang": project.site_lang,
        "html": project.html or "",
        "css": project.css or "",
        "js": project.js or "",
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "device_id": project.device_id,
        "class_id": project.class_id,
        "learner_id": project.learner_id,
        "lesson_id": project.lesson_id,
        "note": project.note or "",
        "mission": mission_out(project.mission_json),
        "assets": [_asset_out(project.id, asset) for asset in project.assets],
        "files": _files_out(project.files_json),
    }


def _load(db: Session, project_id: str) -> Project:
    project = db.scalar(
        select(Project).where(Project.id == project_id).options(selectinload(Project.assets))
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Website not found")
    return project


def _check_lang(value: str) -> str:
    if value not in {"en", "ar"}:
        raise HTTPException(status_code=422, detail="Language must be en or ar")
    return value


def _check_size(html: str | None, css: str | None, js: str | None) -> None:
    total = len(html or "") + len(css or "") + len(js or "")
    if total > 2_000_000:
        raise HTTPException(status_code=413, detail="This page is too large to store")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "web-studio"}


@app.get("/api/templates")
def templates():
    return public_templates()


@app.get("/api/kits")
def kits():
    return public_kits()


@app.get("/api/state")
def read_state(db: Session = Depends(get_db)):
    row = _state(db)
    try:
        mission = json.loads(row.mission_json or "{}")
    except json.JSONDecodeError:
        mission = {}
    return {"current_project_id": row.current_project_id, "mission": mission}


@app.put("/api/state")
def write_state(body: StateUpdate, db: Session = Depends(get_db)):
    row = _state(db)
    if body.current_project_id is not None:
        row.current_project_id = body.current_project_id or None
    if body.mission is not None:
        row.mission_json = json.dumps(body.mission, ensure_ascii=False)
    db.commit()
    return read_state(db)


@app.post("/api/studio/claim")
def claim_studio(body: ClaimBody, db: Session = Depends(get_db), device: str | None = Depends(client_device)):
    if not device:
        raise HTTPException(status_code=400, detail="This browser needs an id")
    claim_device(db, device, body.claim)
    db.commit()
    return {"ok": True}


@app.get("/api/projects")
def list_projects(
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    query = select(Project).order_by(Project.updated_at.desc())
    if who is not None and who.role == "learner" and who.learner is not None:
        query = query.where(Project.learner_id == who.learner.id)
    else:
        if not device:
            return []
        query = query.where(Project.class_id.is_(None), Project.device_id == device)
    rows = db.scalars(query).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "title": row.title,
            "site_lang": row.site_lang,
            "lesson_id": row.lesson_id,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@app.post("/api/projects", status_code=201)
def post_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    lang = _check_lang(body.site_lang)
    project = create_project(db, body.name, body.template_id, lang)
    _stamp_owner(project, who, device)
    if project.class_id is None:
        _state(db).current_project_id = project.id
    db.commit()
    db.refresh(project)
    return _project_out(project)


@app.get("/api/projects/{project_id}")
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    return _project_out(project)


@app.put("/api/projects/{project_id}")
def put_project(
    project_id: str,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    _check_size(body.html, body.css, body.js)
    if body.name is not None:
        project.name = body.name.strip() or project.name
    if body.title is not None:
        project.title = body.title.strip() or project.name
    if body.site_lang is not None:
        project.site_lang = _check_lang(body.site_lang)
    if body.html is not None:
        project.html = body.html
    if body.css is not None:
        project.css = body.css
    if body.js is not None:
        project.js = body.js
    if body.files is not None:
        project.files_json = _clean_files(body.files)
    project.updated_at = now_ms()
    if project.class_id is None:
        _state(db).current_project_id = project.id
    db.commit()
    db.refresh(project)
    return _project_out(project)


@app.put("/api/projects/{project_id}/mission")
def put_mission(
    project_id: str,
    body: MissionBody,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    if who is None or who.role != "learner" or who.learner is None or project.learner_id != who.learner.id:
        raise HTTPException(status_code=403, detail="Mission progress belongs to the student")
    project.mission_json = json.dumps(
        {
            "active": body.active if body.active else None,
            "badges": [item for item in body.badges if isinstance(item, str)][:40],
            "events": [item for item in body.events if isinstance(item, str)][:40],
        },
        ensure_ascii=False,
    )
    db.commit()
    return mission_out(project.mission_json)


@app.put("/api/projects/{project_id}/note")
def put_note(
    project_id: str,
    body: NoteBody,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    if who is None or who.role != "teacher" or project.class_id != who.classroom.id:
        raise HTTPException(status_code=403, detail="Only the lecturer can leave a note")
    project.note = body.note.strip()
    project.updated_at = now_ms()
    db.commit()
    return {"note": project.note}


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    state = _state(db)
    if state.current_project_id == project.id:
        state.current_project_id = None
    db.delete(project)
    db.commit()
    return {"ok": True}


@app.post("/api/projects/{project_id}/assets", status_code=201)
async def upload_asset(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    data = await file.read()
    try:
        asset = add_asset(db, project, file.filename or "image.png", data, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    project.updated_at = now_ms()
    db.commit()
    db.refresh(asset)
    return _asset_out(project.id, asset)


def _asset_dest(raw: str) -> str:
    path = raw.replace("\\", "/").strip().strip("/")
    parts = [part.strip() for part in path.split("/") if part.strip()]
    if not parts or any(part in {".", ".."} or not NAME_PART.fullmatch(part) for part in parts):
        raise HTTPException(status_code=422, detail="Use a plain file name")
    path = "/".join(parts)
    if path.lower() in RESERVED:
        raise HTTPException(status_code=422, detail="That name is already used")
    return path


@app.post("/api/projects/{project_id}/assets/move")
def move_asset(
    project_id: str,
    body: AssetMove,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    src = body.path.replace("\\", "/").strip().strip("/")
    dest = _asset_dest(body.to)
    asset = db.scalar(select(Asset).where(Asset.project_id == project.id, Asset.path == src))
    if asset is None:
        raise HTTPException(status_code=404, detail="Image not found")
    if dest != src:
        taken = db.scalar(select(Asset).where(Asset.project_id == project.id, Asset.path == dest))
        if taken is not None:
            raise HTTPException(status_code=409, detail="That name is already used")
        asset.path = dest
        project.updated_at = now_ms()
        db.commit()
        db.refresh(asset)
    return _asset_out(project.id, asset)


@app.get("/api/projects/{project_id}/assets/{path:path}")
def read_asset(project_id: str, path: str, db: Session = Depends(get_db)):
    asset = db.scalar(select(Asset).where(Asset.project_id == project_id, Asset.path == path))
    if asset is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(
        content=asset.data,
        media_type=asset.mime,
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        },
    )


@app.delete("/api/projects/{project_id}/assets/{path:path}")
def delete_asset(
    project_id: str,
    path: str,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    asset = db.scalar(select(Asset).where(Asset.project_id == project_id, Asset.path == path))
    if asset is None:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(asset)
    project = db.get(Project, project_id)
    if project:
        project.updated_at = now_ms()
    db.commit()
    return {"ok": True}


@app.get("/api/projects/{project_id}/export")
def export_project(
    project_id: str,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    project = _load(db, project_id)
    _guard(who, project, device)
    data, filename = build_zip(project)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@app.post("/api/import", status_code=201)
async def import_site(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
    device: str | None = Depends(client_device),
):
    payload: list[tuple[str, bytes]] = []
    for item in files:
        payload.append((item.filename or "file", await item.read()))
    try:
        project = import_files(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail="That ZIP could not be read") from exc
    _stamp_owner(project, who, device)
    if project.class_id is None:
        _state(db).current_project_id = project.id
    db.commit()
    loaded = _load(db, project.id)
    return _project_out(loaded)


def _class_error(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _teacher(who: Actor | None) -> Actor:
    if who is None or who.role != "teacher":
        raise HTTPException(status_code=403, detail="Only the lecturer can do that")
    return who


def read_staff(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> Staff | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Sign in as a coordinator or admin.")
    found = find_staff(db, token.strip())
    if found is None:
        raise HTTPException(status_code=401, detail="Sign in as a coordinator or admin.")
    return found


def _coordinator(user: Staff | None) -> Staff:
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in as a coordinator or admin.")
    return user


def _admin(user: Staff | None) -> Staff:
    user = _coordinator(user)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only an admin can do that.")
    return user


# Keep these words aligned with WELCOME_DEFAULTS in frontend/src/welcome.ts.
WELCOME_DEFAULTS = {
    "version": "Version 1.0",
    "title_en": "Web Studio",
    "title_ar": "استوديو الويب",
    "credit_en": "Designed by Nasser Tabook",
    "credit_ar": "تصميم ناصر طابوق",
    "line1_en": "A classroom for learning how to build a real website.",
    "line2_en": "Design the page, write the HTML, then check and save your work.",
    "line1_ar": "صف لتعلّم كيف يُبنى موقع حقيقي.",
    "line2_ar": "صمّم الصفحة، واكتب HTML، ثم افحص عملك واحفظه.",
}
_WELCOME_LIMITS = {
    "version": 40,
    "title_en": 80,
    "title_ar": 80,
    "credit_en": 160,
    "credit_ar": 160,
    "line1_en": 220,
    "line2_en": 220,
    "line1_ar": 220,
    "line2_ar": 220,
}
_WELCOME_REQUIRED = {"version", "title_en", "title_ar"}


def _welcome_line(value: str, key: str) -> str:
    text = " ".join(value.replace("\n", " ").split())
    if len(text) > _WELCOME_LIMITS[key]:
        raise ValueError("One of the welcome lines is too long.")
    if not text and key in _WELCOME_REQUIRED:
        return WELCOME_DEFAULTS[key]
    return text


def _welcome_out(row: WelcomeMessage) -> dict[str, str]:
    return {
        "version": row.version_label,
        "title_en": row.title_en,
        "title_ar": row.title_ar,
        "credit_en": row.credit_en,
        "credit_ar": row.credit_ar,
        "line1_en": row.line1_en,
        "line2_en": row.line2_en,
        "line1_ar": row.line1_ar,
        "line2_ar": row.line2_ar,
    }


def _welcome_row(db: Session) -> WelcomeMessage:
    row = db.get(WelcomeMessage, 1)
    if row is not None:
        return row
    row = WelcomeMessage(
        id=1,
        version_label=WELCOME_DEFAULTS["version"],
        title_en=WELCOME_DEFAULTS["title_en"],
        title_ar=WELCOME_DEFAULTS["title_ar"],
        credit_en=WELCOME_DEFAULTS["credit_en"],
        credit_ar=WELCOME_DEFAULTS["credit_ar"],
        line1_en=WELCOME_DEFAULTS["line1_en"],
        line2_en=WELCOME_DEFAULTS["line2_en"],
        line1_ar=WELCOME_DEFAULTS["line1_ar"],
        line2_ar=WELCOME_DEFAULTS["line2_ar"],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _apply_welcome(row: WelcomeMessage, body: WelcomeWrite) -> None:
    row.version_label = _welcome_line(body.version, "version")
    row.title_en = _welcome_line(body.title_en, "title_en")
    row.title_ar = _welcome_line(body.title_ar, "title_ar")
    row.credit_en = _welcome_line(body.credit_en, "credit_en")
    row.credit_ar = _welcome_line(body.credit_ar, "credit_ar")
    row.line1_en = _welcome_line(body.line1_en, "line1_en")
    row.line2_en = _welcome_line(body.line2_en, "line2_en")
    row.line1_ar = _welcome_line(body.line1_ar, "line1_ar")
    row.line2_ar = _welcome_line(body.line2_ar, "line2_ar")


@app.get("/api/welcome")
def get_welcome(db: Session = Depends(get_db)):
    return _welcome_out(_welcome_row(db))


@app.put("/api/admin/welcome")
def put_welcome(body: WelcomeWrite, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _admin(user)
    row = _welcome_row(db)
    try:
        _apply_welcome(row, body)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return _welcome_out(row)


@app.get("/api/staff/status")
def staff_status(db: Session = Depends(get_db)):
    return {"needs_setup": needs_setup(db)}


@app.post("/api/staff/setup", status_code=201)
def staff_setup(body: StaffSetup, db: Session = Depends(get_db)):
    if not needs_setup(db):
        raise HTTPException(status_code=403, detail="Only an admin can do that.")
    try:
        user = create_staff(db, body.username, body.password, body.display_name, "admin")
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return session_out(user)


@app.post("/api/staff/login")
def staff_login(body: StaffLogin, db: Session = Depends(get_db)):
    try:
        user = login_staff(db, body.username, body.password)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return session_out(user)


@app.get("/api/staff/me")
def staff_me(user: Staff | None = Depends(read_staff)):
    return session_out(_coordinator(user))


@app.post("/api/staff/password")
def staff_password(body: PasswordChange, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    owner = _coordinator(user)
    try:
        change_own_password(owner, body.current_password, body.password)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return session_out(owner)


@app.get("/api/staff/accounts")
def staff_accounts(db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _admin(user)
    return [staff_out(item) for item in list_staff(db)]


@app.post("/api/staff/accounts", status_code=201)
def staff_create_account(body: StaffCreate, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _admin(user)
    try:
        created = create_staff(db, body.username, body.password, body.display_name, body.role)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return staff_out(created)


@app.patch("/api/staff/accounts/{account_id}")
def staff_update_account(
    account_id: str,
    body: StaffUpdate,
    db: Session = Depends(get_db),
    user: Staff | None = Depends(read_staff),
):
    actor = _admin(user)
    account = db.get(Staff, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="That account was not found.")
    if account.id == actor.id and body.active is False:
        raise HTTPException(status_code=400, detail="You cannot turn off the account you are using.")
    try:
        update_staff(db, account, body.display_name, body.role, body.active, body.password)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    if account.id == actor.id:
        return session_out(account)
    return staff_out(account)


@app.get("/api/classes/choices")
def class_choices(db: Session = Depends(get_db)):
    return [course_choice(room) for room in list_courses(db)]


@app.post("/api/classes", status_code=201)
def post_class(body: ClassCreate, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _coordinator(user)
    try:
        room = create_class(db, body.name, body.course_code, body.section, body.pin)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return course_admin(room, include_pin=True)


@app.post("/api/classes/enter")
def post_enter(body: ClassEnter, db: Session = Depends(get_db)):
    try:
        room = enter_class(db, body.course_code, body.section, body.pin)
    except ValueError as exc:
        raise _class_error(exc) from exc
    return course_admin(room)


@app.post("/api/classes/join", status_code=201)
def post_join(body: ClassJoin, db: Session = Depends(get_db)):
    try:
        learner, room = join_class(db, body.course_code, body.section, body.name, body.pin, body.student_id)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return {
        "token": learner.token,
        "learner": {"id": learner.id, "name": learner.name, "student_id": learner.student_id or ""},
        "class": class_out(room),
        "lessons": [lesson_out(lesson) for lesson in lessons_for(db, room.id)],
    }


@app.get("/api/classes/home")
def class_home(db: Session = Depends(get_db), who: Actor | None = Depends(read_actor)):
    if who is None:
        raise HTTPException(status_code=401, detail="Sign in to the class again")
    if who.role == "teacher":
        return board(db, who.classroom)
    assert who.learner is not None
    return learner_home(db, who.learner, who.classroom)


@app.get("/api/classes/exam")
def class_exam(who: Actor | None = Depends(read_actor)):
    if who is None:
        raise HTTPException(status_code=401, detail="Sign in to the class again")
    return {"exam": read_exam(who.classroom)}


def _course(db: Session, course_id: str) -> Classroom:
    room = db.get(Classroom, course_id)
    if room is None:
        raise HTTPException(status_code=404, detail="That course was not found.")
    return room


@app.get("/api/admin/courses")
def admin_courses(db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _coordinator(user)
    return [course_admin(room, include_pin=True) for room in list_courses(db)]


@app.post("/api/admin/courses", status_code=201)
def admin_create_course(body: ClassCreate, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _coordinator(user)
    try:
        room = create_class(db, body.name, body.course_code, body.section, body.pin)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return course_admin(room, include_pin=True)


@app.patch("/api/admin/courses/{course_id}")
def admin_update_course(
    course_id: str,
    body: CourseUpdate,
    db: Session = Depends(get_db),
    user: Staff | None = Depends(read_staff),
):
    _coordinator(user)
    room = _course(db, course_id)
    try:
        update_class(db, room, body.name, body.course_code, body.section, body.pin)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return course_admin(room, include_pin=True)


@app.delete("/api/admin/courses/{course_id}")
def admin_delete_course(course_id: str, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _coordinator(user)
    room = _course(db, course_id)
    delete_course(db, room)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/courses/{course_id}/exam")
def admin_get_exam(course_id: str, db: Session = Depends(get_db), user: Staff | None = Depends(read_staff)):
    _coordinator(user)
    return {"exam": read_exam(_course(db, course_id))}


@app.put("/api/admin/courses/{course_id}/exam")
def admin_put_exam(
    course_id: str,
    body: ExamWrite,
    db: Session = Depends(get_db),
    user: Staff | None = Depends(read_staff),
):
    _coordinator(user)
    room = _course(db, course_id)
    try:
        paper = write_exam(room, body.questions, body.questionsAr, body.html)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return {"exam": paper}


@app.post("/api/classes/lessons", status_code=201)
def post_lesson(body: LessonCreate, db: Session = Depends(get_db), who: Actor | None = Depends(read_actor)):
    teacher = _teacher(who)
    try:
        template_by_id(body.template_id)
        lesson = create_lesson(
            db,
            teacher.classroom,
            body.title,
            body.brief_en,
            body.brief_ar,
            body.template_id,
            body.site_lang,
            body.mission_ids,
        )
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return lesson_out(lesson)


@app.delete("/api/classes/lessons/{lesson_id}")
def remove_lesson(lesson_id: str, db: Session = Depends(get_db), who: Actor | None = Depends(read_actor)):
    teacher = _teacher(who)
    try:
        delete_lesson(db, teacher.classroom, lesson_id)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    return {"ok": True}


@app.post("/api/lessons/{lesson_id}/start", status_code=201)
def post_start_lesson(
    lesson_id: str,
    body: LessonStart,
    db: Session = Depends(get_db),
    who: Actor | None = Depends(read_actor),
):
    if who is None or who.role != "learner" or who.learner is None:
        raise HTTPException(status_code=403, detail="Join the class as a student to start a lesson")
    lang = body.site_lang if body.site_lang in {"en", "ar"} else "en"
    try:
        project = start_lesson(db, who.learner, lesson_id, lang)
    except ValueError as exc:
        raise _class_error(exc) from exc
    db.commit()
    db.refresh(project)
    return _project_out(project)


if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="ui")
