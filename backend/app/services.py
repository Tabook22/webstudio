"""Import student sites, store images, and pack a downloadable website folder."""

from __future__ import annotations

import base64
import io
import json
import re
import urllib.parse
import zipfile
from html import escape
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .content import RTL_TEMPLATES, template_by_id, template_html, template_images
from .db import Asset, Project, now_ms

MAX_IMAGE_BYTES = 6 * 1024 * 1024


def new_id() -> str:
    import uuid

    return uuid.uuid4().hex[:12]


def decode_data_url(url: str) -> tuple[bytes, str]:
    header, payload = url.split(",", 1)
    mime = "application/octet-stream"
    if header.startswith("data:"):
        mime = header[5:].split(";")[0] or mime
    if ";base64" in header:
        return base64.b64decode(payload), mime
    return urllib.parse.unquote_to_bytes(payload), mime


def slug(name: str) -> str:
    text = re.sub(r"[^\w]+", "-", name.strip().lower(), flags=re.UNICODE).strip("-")
    return text or "my-website"


def safe_filename(name: str) -> str:
    cleaned = Path(name).name.replace(" ", "-")
    cleaned = re.sub(r"[^\w.\-]+", "", cleaned, flags=re.UNICODE).strip(".-")
    return (cleaned or "image")[:80]


def unique_asset_path(db: Session, project_id: str, filename: str) -> str:
    filename = safe_filename(filename)
    if "." in filename:
        stem, ext = filename.rsplit(".", 1)
        ext = "." + ext
    else:
        stem, ext = filename, ""
    path = f"images/{filename}"
    number = 2
    while db.scalar(select(Asset).where(Asset.project_id == project_id, Asset.path == path)):
        path = f"images/{stem}-{number}{ext}"
        number += 1
    return path


def sniff_image(data: bytes, fallback: str) -> str:
    if data.startswith(b"\x89PNG"):
        return "image/png"
    if data.startswith(b"\xff\xd8"):
        return "image/jpeg"
    if data.startswith(b"GIF8"):
        return "image/gif"
    if data.startswith(b"RIFF") and b"WEBP" in data[:16]:
        return "image/webp"
    stripped = data.lstrip()[:200].lower()
    if stripped.startswith(b"<svg") or (stripped.startswith(b"<?xml") and b"<svg" in data[:800].lower()):
        return "image/svg+xml"
    if fallback.startswith("image/"):
        return fallback
    raise ValueError("Only PNG, JPEG, GIF, WebP and SVG images can be stored.")


def add_asset(db: Session, project: Project, filename: str, data: bytes, mime_hint: str = "") -> Asset:
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("That image is larger than 6 MB.")
    mime = sniff_image(data, mime_hint or "")
    asset = Asset(
        project_id=project.id,
        path=unique_asset_path(db, project.id, filename),
        mime=mime,
        data=data,
    )
    db.add(asset)
    return asset


def create_project(db: Session, name: str, template_id: str, site_lang: str) -> Project:
    template = template_by_id(template_id)
    lang = "ar" if template["id"] in RTL_TEMPLATES else site_lang
    lang = "ar" if lang == "ar" else "en"
    stamp = now_ms()
    title = name.strip() or ("موقع" if lang == "ar" else "Website")
    project = Project(
        id=new_id(),
        name=title,
        title=title,
        site_lang=lang,
        html=template_html(template, lang),
        css=template["css"],
        js="",
        created_at=stamp,
        updated_at=stamp,
    )
    db.add(project)
    db.flush()
    for image in template_images(template, lang):
        data, mime = decode_data_url(image["data_url"])
        db.add(
            Asset(
                project_id=project.id,
                path=image["path"],
                mime=mime,
                data=data,
            )
        )
    return project


def website_document(project: Project) -> str:
    direction = "rtl" if project.site_lang == "ar" else "ltr"
    script = '\n  <script src="script.js"></script>' if (project.js or "").strip() else ""
    body = project.html.strip()
    body_block = f"\n{body}\n" if body else "\n"
    return (
        "<!DOCTYPE html>\n"
        f'<html lang="{escape(project.site_lang)}" dir="{direction}">\n'
        "<head>\n"
        '  <meta charset="utf-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"  <title>{escape(project.title or project.name)}</title>\n"
        '  <link rel="stylesheet" href="style.css">\n'
        "</head>\n"
        f"<body>{body_block}</body>{script}\n"
        "</html>\n"
    )


def build_zip(project: Project) -> tuple[bytes, str]:
    folder = slug(project.name)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(f"{folder}/index.html", website_document(project))
        archive.writestr(f"{folder}/style.css", project.css or "")
        if (project.js or "").strip():
            archive.writestr(f"{folder}/script.js", project.js)
        try:
            extra = json.loads(project.files_json or "[]")
        except json.JSONDecodeError:
            extra = []
        if isinstance(extra, list):
            for item in extra:
                if not isinstance(item, dict):
                    continue
                path = str(item.get("path") or "").replace("\\", "/").lstrip("/")
                if not path or ".." in path.split("/"):
                    continue
                if item.get("folder"):
                    archive.writestr(f"{folder}/{path}/", "")
                else:
                    archive.writestr(f"{folder}/{path}", str(item.get("content") or ""))
        for asset in project.assets:
            archive.writestr(f"{folder}/{asset.path}", asset.data)
    filename = f"{folder}.zip"
    return buffer.getvalue(), filename


def _extract_page(text: str) -> tuple[str, str, str, str]:
    title_match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.I | re.S)
    title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else ""
    lang = "ar" if re.search(r"<html[^>]*(lang=[\"']ar|dir=[\"']rtl)", text, flags=re.I) else "en"
    styles = "\n\n".join(re.findall(r"<style[^>]*>(.*?)</style>", text, flags=re.I | re.S)).strip()
    body_match = re.search(r"<body[^>]*>(.*)</body>", text, flags=re.I | re.S)
    html = body_match.group(1).strip() if body_match else text.strip()
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.I | re.S).strip()
    return html, styles, title, lang


def import_files(db: Session, files: list[tuple[str, bytes]]) -> Project:
    named = [(name.replace("\\", "/"), data) for name, data in files if name]
    if not named:
        raise ValueError("Choose a ZIP, an HTML file, or a folder.")

    zip_item = next((item for item in named if item[0].lower().endswith(".zip")), None)
    if zip_item and len(named) == 1:
        named = _unzip(zip_item[1])

    html_item = _find(named, ("index.html", "index.htm"))
    if html_item is None:
        html_candidates = [item for item in named if item[0].lower().endswith((".html", ".htm"))]
        html_item = html_candidates[0] if html_candidates else None
    if html_item is None:
        raise ValueError("No HTML file was found.")

    html_name, html_bytes = html_item
    text = html_bytes.decode("utf-8", errors="replace")
    html, styles, title, lang = _extract_page(text)
    css_item = _find(named, ("style.css",))
    css = ""
    if css_item:
        css = css_item[1].decode("utf-8", errors="replace").strip()
    if styles:
        css = f"{css}\n\n{styles}".strip()
    if not css.strip():
        css = "body {\n  margin: 0;\n  line-height: 1.6;\n}\n\nimg { max-width: 100%; }\n"
    js_item = _find(named, ("script.js",))
    js = js_item[1].decode("utf-8", errors="replace") if js_item else ""

    stem = Path(html_name).stem
    name = title or (stem if stem.lower() != "index" else "Imported website")
    stamp = now_ms()
    project = Project(
        id=new_id(),
        name=name[:200],
        title=(title or name)[:200],
        site_lang=lang,
        html=html,
        css=css,
        js=js,
        created_at=stamp,
        updated_at=stamp,
    )
    db.add(project)
    db.flush()

    for path, data in named:
        lower = path.lower()
        if "/images/" in f"/{lower}" or lower.startswith("images/"):
            filename = Path(path).name
            if not filename or filename.startswith("."):
                continue
            try:
                mime = sniff_image(data, "")
            except ValueError:
                continue
            db.add(Asset(project_id=project.id, path=f"images/{safe_filename(filename)}", mime=mime, data=data))
    return project


def _find(files: list[tuple[str, bytes]], names: tuple[str, ...]) -> tuple[str, bytes] | None:
    for path, data in files:
        base = path.split("/")[-1].lower()
        if base in names:
            return path, data
    return None


def _unzip(data: bytes) -> list[tuple[str, bytes]]:
    found: list[tuple[str, bytes]] = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for info in archive.infolist():
            if info.is_dir() or info.file_size > 8 * 1024 * 1024:
                continue
            name = info.filename.replace("\\", "/")
            if name.startswith("__MACOSX/") or name.split("/")[-1].startswith("."):
                continue
            found.append((name, archive.read(info)))
    return found
