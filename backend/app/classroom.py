"""Classes, join codes, lessons, and the lecturer's board.

One FastAPI server can serve a whole lab. Each browser keeps its own
device id, so personal websites stay on that computer. Students who
join a class only see their own pages. The lecturer sees every page.
"""

from __future__ import annotations

import hashlib
import json
import secrets
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .db import AppState, Classroom, Learner, Lesson, Project, now_ms
from .services import create_project, new_id

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MISSION_IDS = (
    "first-page",
    "lists-tables",
    "images-links",
    "style",
    "layout",
    "interactive",
    "publish",
)


@dataclass
class Actor:
    role: str
    classroom: Classroom
    learner: Learner | None = None


def hash_pin(pin: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.sha256(f"{salt}:{pin}".encode()).hexdigest()
    return f"{salt}${digest}"


def pin_matches(stored: str, pin: str) -> bool:
    salt, _, _digest = stored.partition("$")
    if not salt:
        return False
    return secrets.compare_digest(hash_pin(pin, salt), stored)


def _code(db: Session) -> str:
    for _ in range(8):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if db.scalar(select(Classroom).where(Classroom.join_code == code)) is None:
            return code
    raise RuntimeError("Could not create a join code")


def _clean_pin(pin: str) -> str:
    pin = pin.strip()
    if not pin.isdigit() or not 4 <= len(pin) <= 8:
        raise ValueError("The PIN must be 4 to 8 digits.")
    return pin


def _clean_title(name: str) -> str:
    name = " ".join(name.split())
    if not name or len(name) > 120:
        raise ValueError("Give the course a title.")
    return name


def _clean_code(code: str) -> str:
    code = "".join(code.strip().upper().split())
    if not code or len(code) > 16 or not code.isalnum():
        raise ValueError("The course code uses letters and numbers, up to 16.")
    return code


def _clean_section(section: str) -> str:
    section = section.strip()
    if not section.isdigit() or int(section) < 1 or len(section) > 4:
        raise ValueError("The section is a number such as 1, 2, or 3.")
    return str(int(section))


def _ensure_free(db: Session, code: str, section: str, except_id: str | None = None) -> None:
    room = db.scalar(select(Classroom).where(Classroom.course_code == code, Classroom.section == section))
    if room is not None and room.id != except_id:
        raise ValueError("That course code already has this section. Use another section.")


def class_out(room: Classroom) -> dict:
    return {
        "id": room.id,
        "name": room.name,
        "join_code": room.join_code,
        "course_code": room.course_code or room.join_code,
        "section": room.section or "1",
    }


def course_admin(room: Classroom) -> dict:
    return {**class_out(room), "has_exam": read_exam(room) is not None, "teacher_token": room.teacher_token}


def lesson_out(lesson: Lesson) -> dict:
    try:
        missions = json.loads(lesson.mission_json or "[]")
    except json.JSONDecodeError:
        missions = []
    if not isinstance(missions, list):
        missions = []
    return {
        "id": lesson.id,
        "title": lesson.title,
        "brief_en": lesson.brief_en or "",
        "brief_ar": lesson.brief_ar or "",
        "template_id": lesson.template_id,
        "site_lang": lesson.site_lang,
        "mission_ids": [item for item in missions if item in MISSION_IDS],
        "created_at": lesson.created_at,
    }


def mission_out(raw: str | None) -> dict:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    badges = data.get("badges") if isinstance(data.get("badges"), list) else []
    events = data.get("events") if isinstance(data.get("events"), list) else []
    active = data.get("active")
    return {
        "active": active if isinstance(active, str) else None,
        "badges": [item for item in badges if isinstance(item, str)],
        "events": [item for item in events if isinstance(item, str)],
    }


def find_actor(db: Session, token: str) -> Actor | None:
    room = db.scalar(select(Classroom).where(Classroom.teacher_token == token))
    if room is not None:
        return Actor(role="teacher", classroom=room)
    learner = db.scalar(select(Learner).where(Learner.token == token))
    if learner is None:
        return None
    room = db.get(Classroom, learner.class_id)
    if room is None:
        return None
    return Actor(role="learner", classroom=room, learner=learner)


def create_class(db: Session, name: str, course_code: str, section: str, pin: str) -> Classroom:
    name = _clean_title(name)
    code = _clean_code(course_code)
    number = _clean_section(section)
    _ensure_free(db, code, number)
    room = Classroom(
        id=new_id(),
        name=name,
        join_code=_code(db),
        course_code=code,
        section=number,
        pin_hash=hash_pin(_clean_pin(pin)),
        teacher_token=secrets.token_urlsafe(24),
        exam_json="",
        created_at=now_ms(),
    )
    db.add(room)
    db.flush()
    return room


def update_class(db: Session, room: Classroom, name: str, course_code: str, section: str, pin: str) -> Classroom:
    name = _clean_title(name)
    code = _clean_code(course_code)
    number = _clean_section(section)
    _ensure_free(db, code, number, room.id)
    room.name = name
    room.course_code = code
    room.section = number
    if pin.strip():
        room.pin_hash = hash_pin(_clean_pin(pin))
    db.flush()
    return room


def list_courses(db: Session) -> list[Classroom]:
    rooms = list(db.scalars(select(Classroom)).all())
    rooms.sort(key=lambda room: (room.course_code or "", int(room.section) if str(room.section).isdigit() else 0))
    return rooms


def delete_course(db: Session, room: Classroom) -> None:
    projects = list(db.scalars(select(Project).where(Project.class_id == room.id)).all())
    for project in projects:
        db.delete(project)
    db.delete(room)
    db.flush()


def read_exam(room: Classroom) -> dict | None:
    raw = (room.exam_json or "").strip()
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    questions = data.get("questions")
    html = data.get("html")
    if not isinstance(questions, str) or not isinstance(html, str) or not questions.strip() or not html.strip():
        return None
    arabic = data.get("questionsAr")
    return {"questions": questions, "questionsAr": arabic if isinstance(arabic, str) else "", "html": html}


def write_exam(room: Classroom, questions: str, questions_ar: str, html: str) -> dict | None:
    questions = questions.strip()
    questions_ar = questions_ar.strip()
    html = html.strip()
    if not questions and not html and not questions_ar:
        room.exam_json = ""
        return None
    if not questions or not html:
        raise ValueError("Write the questions and the example page.")
    if len(questions) > 20000 or len(questions_ar) > 20000 or len(html) > 100000:
        raise ValueError("That exam is too long.")
    paper = {"questions": questions, "questionsAr": questions_ar, "html": html}
    room.exam_json = json.dumps(paper, ensure_ascii=False)
    return paper


def enter_class(db: Session, course_code: str, section: str, pin: str) -> Classroom:
    try:
        code = _clean_code(course_code)
        number = _clean_section(section)
    except ValueError:
        raise ValueError("That course code, section, or PIN is not right.") from None
    room = db.scalar(select(Classroom).where(Classroom.course_code == code, Classroom.section == number))
    if room is None or not pin_matches(room.pin_hash, pin.strip()):
        raise ValueError("That course code, section, or PIN is not right.")
    return room


def join_class(db: Session, course_code: str, section: str, name: str) -> tuple[Learner, Classroom]:
    name = " ".join(name.split())
    if not name or len(name) > 40:
        raise ValueError("Type your name so the lecturer can see it.")
    code = _clean_code(course_code)
    number = _clean_section(section)
    room = db.scalar(select(Classroom).where(Classroom.course_code == code, Classroom.section == number))
    if room is None:
        raise ValueError("No class uses that code and section.")
    learner = Learner(
        id=new_id(),
        class_id=room.id,
        name=name,
        token=secrets.token_urlsafe(24),
        created_at=now_ms(),
    )
    db.add(learner)
    db.flush()
    return learner, room


def lessons_for(db: Session, class_id: str) -> list[Lesson]:
    return list(db.scalars(select(Lesson).where(Lesson.class_id == class_id).order_by(Lesson.created_at.desc())).all())


def create_lesson(
    db: Session,
    room: Classroom,
    title: str,
    brief_en: str,
    brief_ar: str,
    template_id: str,
    site_lang: str,
    mission_ids: list[str],
) -> Lesson:
    title = title.strip()
    if not title or len(title) > 120:
        raise ValueError("Give the lesson a title.")
    if site_lang not in {"en", "ar", "ask"}:
        raise ValueError("Language must be English, Arabic, or the student's choice.")
    chosen = [item for item in mission_ids if item in MISSION_IDS]
    if not chosen:
        raise ValueError("Choose at least one mission.")
    lesson = Lesson(
        id=new_id(),
        class_id=room.id,
        title=title,
        brief_en=brief_en.strip()[:1000],
        brief_ar=brief_ar.strip()[:1000],
        template_id=template_id or "blank",
        site_lang=site_lang,
        mission_json=json.dumps(chosen),
        created_at=now_ms(),
    )
    db.add(lesson)
    db.flush()
    return lesson


def delete_lesson(db: Session, room: Classroom, lesson_id: str) -> None:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None or lesson.class_id != room.id:
        raise ValueError("That lesson is not in this class.")
    db.delete(lesson)


def start_lesson(db: Session, learner: Learner, lesson_id: str, site_lang: str) -> Project:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None or lesson.class_id != learner.class_id:
        raise ValueError("That lesson is not in your class.")
    existing = db.scalar(
        select(Project)
        .where(Project.learner_id == learner.id, Project.lesson_id == lesson.id)
        .options(selectinload(Project.assets))
    )
    if existing is not None:
        return existing
    lang = lesson.site_lang if lesson.site_lang in {"en", "ar"} else site_lang
    if lang not in {"en", "ar"}:
        lang = "en"
    project = create_project(db, lesson.title, lesson.template_id, lang)
    project.class_id = learner.class_id
    project.learner_id = learner.id
    project.lesson_id = lesson.id
    project.mission_json = "{}"
    project.note = ""
    return project


def claim_device(db: Session, device: str, claim: bool) -> None:
    state = db.get(AppState, 1)
    if state is None:
        state = AppState(id=1, current_project_id=None, mission_json="{}", owner_device=None)
        db.add(state)
        db.flush()
    if claim and not state.owner_device:
        state.owner_device = device
        orphans = db.scalars(select(Project).where(Project.device_id.is_(None), Project.class_id.is_(None))).all()
        for project in orphans:
            project.device_id = device


def board(db: Session, room: Classroom) -> dict:
    learners = db.scalars(select(Learner).where(Learner.class_id == room.id).order_by(Learner.created_at)).all()
    projects = db.scalars(
        select(Project).where(Project.class_id == room.id).order_by(Project.updated_at.desc())
    ).all()
    by_learner: dict[str, list[dict]] = {learner.id: [] for learner in learners}
    for project in projects:
        if project.learner_id not in by_learner:
            continue
        mission = mission_out(project.mission_json)
        by_learner[project.learner_id].append(
            {
                "id": project.id,
                "name": project.name,
                "title": project.title,
                "site_lang": project.site_lang,
                "lesson_id": project.lesson_id,
                "updated_at": project.updated_at,
                "note": project.note or "",
                "mission": {"active": mission["active"], "badges": mission["badges"]},
            }
        )
    return {
        "role": "teacher",
        "class": class_out(room),
        "lessons": [lesson_out(lesson) for lesson in lessons_for(db, room.id)],
        "learners": [
            {
                "id": learner.id,
                "name": learner.name,
                "joined_at": learner.created_at,
                "projects": by_learner.get(learner.id, []),
            }
            for learner in learners
        ],
    }


def learner_home(db: Session, learner: Learner, room: Classroom) -> dict:
    return {
        "role": "learner",
        "class": class_out(room),
        "learner": {"id": learner.id, "name": learner.name},
        "lessons": [lesson_out(lesson) for lesson in lessons_for(db, room.id)],
    }
