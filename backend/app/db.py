"""SQLite database for websites, images, and classroom progress."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from sqlalchemy import BigInteger, ForeignKey, LargeBinary, String, Text, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


def _data_dir() -> Path:
    """Websites live beside the source while developing, and in LocalAppData once installed."""
    override = os.environ.get("WEBSTUDIO_DATA", "").strip()
    if override:
        path = Path(override)
    elif getattr(sys, "frozen", False):
        root = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        path = Path(root) / "WebStudio"
    else:
        path = Path(__file__).resolve().parents[1] / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


DATA_DIR = _data_dir()
DB_PATH = DATA_DIR / "studio.db"

engine = create_engine(
    f"sqlite:///{DB_PATH.as_posix()}",
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def now_ms() -> int:
    return int(time.time() * 1000)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(200))
    site_lang: Mapped[str] = mapped_column(String(2), default="en")
    html: Mapped[str] = mapped_column(Text, default="")
    css: Mapped[str] = mapped_column(Text, default="")
    js: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)
    device_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    class_id: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    learner_id: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    lesson_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    mission_json: Mapped[str] = mapped_column(Text, default="{}")
    note: Mapped[str] = mapped_column(Text, default="")
    files_json: Mapped[str] = mapped_column(Text, default="[]")

    assets: Mapped[list["Asset"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Asset.path",
    )


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (UniqueConstraint("project_id", "path"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    path: Mapped[str] = mapped_column(String(300))
    mime: Mapped[str] = mapped_column(String(120))
    data: Mapped[bytes] = mapped_column(LargeBinary)

    project: Mapped[Project] = relationship(back_populates="assets")


class AppState(Base):
    """Single-studio row: which website is open, and mission progress."""

    __tablename__ = "app_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    current_project_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    mission_json: Mapped[str] = mapped_column(Text, default="{}")
    owner_device: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Classroom(Base):
    """One course section. The same title and course code may be used again with another section."""

    __tablename__ = "classrooms"
    __table_args__ = (UniqueConstraint("course_code", "section", name="uq_course_section"),)

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    join_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    course_code: Mapped[str] = mapped_column(String(16), default="", index=True)
    section: Mapped[str] = mapped_column(String(8), default="1")
    pin_hash: Mapped[str] = mapped_column(String(120))
    teacher_token: Mapped[str] = mapped_column(String(80), unique=True)
    exam_json: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class Learner(Base):
    __tablename__ = "learners"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    student_id: Mapped[str] = mapped_column(String(32), default="")
    token: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class WelcomeMessage(Base):
    """The words on the welcome window. One row, edited by an admin."""

    __tablename__ = "welcome_message"

    id: Mapped[int] = mapped_column(primary_key=True)
    version_label: Mapped[str] = mapped_column(String(40), default="Version 1.0")
    title_en: Mapped[str] = mapped_column(String(80), default="Web Studio")
    title_ar: Mapped[str] = mapped_column(String(80), default="استوديو الويب")
    credit_en: Mapped[str] = mapped_column(String(160), default="Designed by Nasser Tabook")
    credit_ar: Mapped[str] = mapped_column(String(160), default="تصميم ناصر طابوق")
    line1_en: Mapped[str] = mapped_column(String(220), default="A classroom for learning how to build a real website.")
    line2_en: Mapped[str] = mapped_column(String(220), default="Design the page, write the HTML, then check and save your work.")
    line1_ar: Mapped[str] = mapped_column(String(220), default="صف لتعلّم كيف يُبنى موقع حقيقي.")
    line2_ar: Mapped[str] = mapped_column(String(220), default="صمّم الصفحة، واكتب HTML، ثم افحص عملك واحفظه.")


class Staff(Base):
    """A coordinator or admin. Course settings require one of these accounts."""

    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(16), default="coordinator")
    active: Mapped[int] = mapped_column(default=1)
    token: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


class Lesson(Base):
    """A starter the lecturer publishes. Students begin from its template."""

    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    brief_en: Mapped[str] = mapped_column(Text, default="")
    brief_ar: Mapped[str] = mapped_column(Text, default="")
    template_id: Mapped[str] = mapped_column(String(40), default="blank")
    site_lang: Mapped[str] = mapped_column(String(8), default="ask")
    mission_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[int] = mapped_column(BigInteger, default=now_ms)


def _columns(connection, table: str) -> set[str]:
    rows = connection.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
    return {row[1] for row in rows}


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        project_cols = _columns(connection, "projects")
        additions = {
            "device_id": "device_id VARCHAR(32)",
            "class_id": "class_id VARCHAR(16)",
            "learner_id": "learner_id VARCHAR(16)",
            "lesson_id": "lesson_id VARCHAR(16)",
            "mission_json": "mission_json TEXT DEFAULT '{}'",
            "note": "note TEXT DEFAULT ''",
            "files_json": "files_json TEXT DEFAULT '[]'",
        }
        for name, ddl in additions.items():
            if name not in project_cols:
                connection.exec_driver_sql(f"ALTER TABLE projects ADD COLUMN {ddl}")
        state_cols = _columns(connection, "app_state")
        if "owner_device" not in state_cols:
            connection.exec_driver_sql("ALTER TABLE app_state ADD COLUMN owner_device VARCHAR(32)")
        connection.exec_driver_sql("UPDATE projects SET mission_json = '{}' WHERE mission_json IS NULL")
        connection.exec_driver_sql("UPDATE projects SET note = '' WHERE note IS NULL")
        connection.exec_driver_sql("UPDATE projects SET files_json = '[]' WHERE files_json IS NULL")
        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_projects_device ON projects(device_id)")
        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_projects_class ON projects(class_id)")
        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_projects_learner ON projects(learner_id)")
        room_cols = _columns(connection, "classrooms")
        if "course_code" not in room_cols:
            connection.exec_driver_sql("ALTER TABLE classrooms ADD COLUMN course_code VARCHAR(16) DEFAULT ''")
        if "section" not in room_cols:
            connection.exec_driver_sql("ALTER TABLE classrooms ADD COLUMN section VARCHAR(8) DEFAULT '1'")
        if "exam_json" not in room_cols:
            connection.exec_driver_sql("ALTER TABLE classrooms ADD COLUMN exam_json TEXT DEFAULT ''")
        connection.exec_driver_sql(
            "UPDATE classrooms SET course_code = join_code WHERE course_code IS NULL OR course_code = ''"
        )
        connection.exec_driver_sql("UPDATE classrooms SET section = '1' WHERE section IS NULL OR section = ''")
        connection.exec_driver_sql("UPDATE classrooms SET exam_json = '' WHERE exam_json IS NULL")
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_course_section ON classrooms(course_code, section)"
        )
        learner_cols = _columns(connection, "learners")
        if "student_id" not in learner_cols:
            connection.exec_driver_sql("ALTER TABLE learners ADD COLUMN student_id VARCHAR(32) DEFAULT ''")
        connection.exec_driver_sql("UPDATE learners SET student_id = '' WHERE student_id IS NULL")
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_learner_student ON learners(class_id, student_id) WHERE student_id != ''"
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
