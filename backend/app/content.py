"""Starter websites and design kits shipped with the studio."""

from __future__ import annotations

import re
import urllib.parse
from textwrap import dedent

Pair = dict[str, str]


def tx_pair(en: str, ar: str) -> Pair:
    return {"en": en, "ar": ar}


def font(name: str, generic: str = "sans-serif") -> str:
    return f'"{name}", {generic}'


def art(label: str, c1: str, c2: str, w: int = 800, h: int = 520) -> str:
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>'
        f"</linearGradient></defs>"
        f'<rect width="100%" height="100%" fill="url(#g)"/>'
        f'<circle cx="{w * 0.78}" cy="{h * 0.25}" r="{h * 0.16}" fill="#ffffff" fill-opacity="0.25"/>'
        f'<path d="M0 {h * 0.8} Q {w * 0.3} {h * 0.55} {w * 0.55} {h * 0.75} T {w} {h * 0.7} V {h} H 0 Z" '
        f'fill="#ffffff" fill-opacity="0.22"/>'
        f'<text x="50%" y="52%" font-family="sans-serif" font-size="{round(h / 9)}" font-weight="700" '
        f'fill="#ffffff" text-anchor="middle" dominant-baseline="middle">{label}</text></svg>'
    )
    return "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(svg)


KITS: list[dict] = [
    {
        "id": "indigo",
        "name": tx_pair("Indigo", "نيلي"),
        "mood": tx_pair("Modern & clean", "عصري ونظيف"),
        "vars": {
            "--color-primary": "#5b4cf0",
            "--color-secondary": "#06b6d4",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#ffffff",
            "--color-surface": "#f5f7fb",
            "--color-text": "#334155",
            "--color-heading": "#0f172a",
            "--color-dark": "#0f172a",
            "--radius": "12px",
            "--font-heading": font("Poppins"),
            "--font-body": font("Inter"),
        },
    },
    {
        "id": "ocean",
        "name": tx_pair("Ocean", "المحيط"),
        "mood": tx_pair("Calm & fresh", "هادئ ومنعش"),
        "vars": {
            "--color-primary": "#0369a1",
            "--color-secondary": "#14b8a6",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#f0f9ff",
            "--color-surface": "#ffffff",
            "--color-text": "#24425a",
            "--color-heading": "#0c2d48",
            "--color-dark": "#082f49",
            "--radius": "16px",
            "--font-heading": font("Montserrat"),
            "--font-body": font("Open Sans"),
        },
    },
    {
        "id": "sunset",
        "name": tx_pair("Sunset", "الغروب"),
        "mood": tx_pair("Warm & friendly", "دافئ وودود"),
        "vars": {
            "--color-primary": "#ea580c",
            "--color-secondary": "#db2777",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#fff7ed",
            "--color-surface": "#ffffff",
            "--color-text": "#57392a",
            "--color-heading": "#431407",
            "--color-dark": "#431407",
            "--radius": "20px",
            "--font-heading": font("Poppins"),
            "--font-body": font("Lato"),
        },
    },
    {
        "id": "forest",
        "name": tx_pair("Forest", "الغابة"),
        "mood": tx_pair("Natural & classic", "طبيعي وكلاسيكي"),
        "vars": {
            "--color-primary": "#15803d",
            "--color-secondary": "#65a30d",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#f7fbf2",
            "--color-surface": "#ffffff",
            "--color-text": "#334033",
            "--color-heading": "#14321f",
            "--color-dark": "#14321f",
            "--radius": "8px",
            "--font-heading": font("Merriweather", "serif"),
            "--font-body": font("Lato"),
        },
    },
    {
        "id": "mono",
        "name": tx_pair("Minimal", "بسيط"),
        "mood": tx_pair("Black & white", "أبيض وأسود"),
        "vars": {
            "--color-primary": "#111827",
            "--color-secondary": "#6b7280",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#ffffff",
            "--color-surface": "#f4f4f5",
            "--color-text": "#3f3f46",
            "--color-heading": "#09090b",
            "--color-dark": "#09090b",
            "--radius": "4px",
            "--font-heading": font("Inter"),
            "--font-body": font("Inter"),
        },
    },
    {
        "id": "night",
        "name": tx_pair("Night", "الليل"),
        "mood": tx_pair("Dark & bold", "داكن وجريء"),
        "vars": {
            "--color-primary": "#a78bfa",
            "--color-secondary": "#22d3ee",
            "--color-on-primary": "#0b1020",
            "--color-bg": "#0b1020",
            "--color-surface": "#151b2e",
            "--color-text": "#cbd5e1",
            "--color-heading": "#ffffff",
            "--color-dark": "#05070f",
            "--radius": "14px",
            "--font-heading": font("Poppins"),
            "--font-body": font("Inter"),
        },
    },
    {
        "id": "heritage",
        "name": tx_pair("Omani heritage", "التراث العُماني"),
        "mood": tx_pair("Red, green & sand", "أحمر وأخضر ورملي"),
        "vars": {
            "--color-primary": "#b91c1c",
            "--color-secondary": "#15803d",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#fffbf2",
            "--color-surface": "#f6ecd9",
            "--color-text": "#4a3a2c",
            "--color-heading": "#7f1d1d",
            "--color-dark": "#2b1d14",
            "--radius": "10px",
            "--font-heading": font("Amiri", "serif"),
            "--font-body": font("Tajawal"),
        },
    },
    {
        "id": "playful",
        "name": tx_pair("Playful", "مرح"),
        "mood": tx_pair("Bright & fun", "زاهٍ وممتع"),
        "vars": {
            "--color-primary": "#db2777",
            "--color-secondary": "#f59e0b",
            "--color-on-primary": "#ffffff",
            "--color-bg": "#fdf4ff",
            "--color-surface": "#ffffff",
            "--color-text": "#4a3352",
            "--color-heading": "#701a75",
            "--color-dark": "#3b0a3f",
            "--radius": "24px",
            "--font-heading": font("Changa"),
            "--font-body": font("Poppins"),
        },
    },
]

USAGE = """
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-heading); }
a { color: var(--color-primary); }
.btn { background: var(--color-primary); color: var(--color-on-primary); border-radius: var(--radius); }
.card { background: var(--color-surface); border-radius: var(--radius); }
.hero { background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: var(--color-on-primary); }
.hero h1, .hero h2 { color: var(--color-on-primary); }
.navbar, .footer { background: var(--color-dark); }
.table th { background: var(--color-surface); }
""".strip()


FONT_SPEC = {
    "Inter": "Inter:wght@400;600;700",
    "Poppins": "Poppins:wght@400;600;700",
    "Montserrat": "Montserrat:wght@600;700",
    "Open Sans": "Open+Sans:wght@400;700",
    "Lato": "Lato:wght@400;700",
    "Merriweather": "Merriweather:wght@700",
    "Amiri": "Amiri:wght@700",
    "Tajawal": "Tajawal:wght@400;700",
    "Changa": "Changa:wght@500;700",
}


def font_import(kit: dict) -> str:
    specs: list[str] = []
    for value in kit["vars"].values():
        for name in re_fonts(str(value)):
            spec = FONT_SPEC.get(name)
            if spec and spec not in specs:
                specs.append(spec)
    if not specs:
        return ""
    href = "https://fonts.googleapis.com/css2?" + "&".join(f"family={spec}" for spec in specs) + "&display=swap"
    return f'@import url("{href}");'


def re_fonts(value: str) -> list[str]:
    return re.findall(r'"([^"]+)"', value)


def kit_css(kit: dict) -> str:
    vars_body = "\n".join(f"  {key}: {value};" for key, value in kit["vars"].items())
    imported = font_import(kit)
    head = f"{imported}\n" if imported else ""
    return f"{head}/* kit:start */\n:root {{\n{vars_body}\n}}\n{USAGE}\n/* kit:end */\n"


BASE_CSS = """body {
  margin: 0;
  line-height: 1.6;
  color: #1e293b;
  font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif;
}

img { max-width: 100%; }
"""

COMMON = """
.section { padding: 64px 24px; max-width: 1100px; margin: 0 auto; }
.btn { display: inline-block; padding: 12px 26px; text-decoration: none; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: 24px; }
.card { flex: 1 1 240px; padding: 24px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
.navbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 32px; flex-wrap: wrap; }
.navbar .brand { color: #ffffff; font-weight: 800; font-size: 20px; text-decoration: none; }
.navbar ul { display: flex; gap: 24px; list-style: none; margin: 0; padding: 0; }
.navbar ul a { color: #e2e8f0; text-decoration: none; }
.hero { padding: 110px 24px; text-align: center; }
.hero h1 { font-size: 48px; margin: 0 0 14px; }
.hero p { font-size: 20px; margin: 0 auto 30px; max-width: 640px; opacity: 0.92; }
.hero .btn { background: #ffffff; color: var(--color-primary); }
.footer { padding: 36px 24px; text-align: center; color: #cbd5e1; }
.avatar { width: 160px; height: 160px; object-fit: cover; border-radius: 50%; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18); }
.lead { font-size: 20px; }
.center { text-align: center; }
.table { width: 100%; border-collapse: collapse; margin: 16px 0; }
.table th, .table td { padding: 12px 14px; border: 1px solid rgba(15, 23, 42, 0.12); text-align: start; }
img { max-width: 100%; }
""".strip()


def build_css(kit_id: str | None, extra: str = "") -> str:
    kit = next((item for item in KITS if item["id"] == kit_id), None) if kit_id else None
    imported = font_import(kit) if kit else ""
    kit_block = kit_css(kit).replace(imported, "").strip() if kit else ""
    parts = [part for part in (imported, BASE_CSS.strip(), kit_block, COMMON, extra.strip()) if part]
    return "\n\n".join(parts) + "\n"


RTL_TEMPLATES = {"club"}


def _tpl(tid: str, name: Pair, desc: Pair, html: str, css: str, images: list[dict], kit: str | None = None) -> dict:
    return {
        "id": tid,
        "name": name,
        "desc": desc,
        "kit": kit,
        "html": dedent(html).strip(),
        "css": css if tid == "blank" else build_css(kit, css),
        "images": images,
    }


TEMPLATES: list[dict] = [
    _tpl(
        "blank",
        tx_pair("Blank page", "صفحة فارغة"),
        tx_pair("Start from nothing", "ابدأ من الصفر"),
        "",
        BASE_CSS,
        [],
    ),
    _tpl(
        "personal",
        tx_pair("About me", "نبذة عني"),
        tx_pair("Photo, hobbies and a timetable", "صورة وهوايات وجدول"),
        """
        <section class="section about">
          <img class="avatar" src="images/me.svg" alt="A photo of me">
          <h1>Hello, I'm Sara</h1>
          <p class="lead">I am a student learning how to design websites. This is my first page.</p>
          <h2>My hobbies</h2>
          <ul>
            <li>Reading</li>
            <li>Photography</li>
            <li>Football</li>
          </ul>
          <h2>My timetable</h2>
          <table class="table">
            <thead>
              <tr><th>Day</th><th>Subject</th></tr>
            </thead>
            <tbody>
              <tr><td>Sunday</td><td>Web Design</td></tr>
              <tr><td>Monday</td><td>Databases</td></tr>
            </tbody>
          </table>
        </section>
        """,
        "",
        [{"path": "images/me.svg", "data_url": art("Me", "#818cf8", "#22d3ee", 400, 400)}],
        "indigo",
    ),
    _tpl(
        "landing",
        tx_pair("Landing page", "صفحة تعريفية"),
        tx_pair("Hero, features and footer", "واجهة ومزايا وتذييل"),
        """
        <nav class="navbar">
          <a class="brand" href="#">Brand</a>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
        <header class="hero">
          <h1>Build something great</h1>
          <p>One clear sentence that explains your idea and why people will love it.</p>
          <a class="btn" href="#features">Get started</a>
        </header>
        <section class="section" id="features">
          <h2 class="center">Why choose us?</h2>
          <div class="row">
            <div class="card"><h3>Fast</h3><p>Explain the first idea in one or two sentences.</p></div>
            <div class="card"><h3>Simple</h3><p>Explain the second idea in one or two sentences.</p></div>
            <div class="card"><h3>Friendly</h3><p>Explain the third idea in one or two sentences.</p></div>
          </div>
        </section>
        <footer class="footer" id="contact"><p>© 2026 Brand · hello@example.com</p></footer>
        """,
        "",
        [],
        "ocean",
    ),
    _tpl(
        "portfolio",
        tx_pair("Portfolio", "معرض أعمال"),
        tx_pair("Show your projects in a grid", "اعرض مشاريعك في شبكة"),
        """
        <nav class="navbar">
          <a class="brand" href="#">Ali.design</a>
          <ul>
            <li><a href="#work">Work</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
        <header class="section intro">
          <p class="eyebrow">Web designer · Muscat</p>
          <h1>I design websites that people enjoy using.</h1>
          <a class="btn" href="#work">See my work</a>
        </header>
        <section class="section" id="work">
          <h2>Selected work</h2>
          <div class="grid">
            <div class="card project"><img src="images/project-1.svg" alt="Café website screenshot"><h3>Café website</h3><p>Menu and online orders.</p></div>
            <div class="card project"><img src="images/project-2.svg" alt="Event page screenshot"><h3>Event page</h3><p>Tickets and schedule.</p></div>
            <div class="card project"><img src="images/project-3.svg" alt="Club portal screenshot"><h3>Club portal</h3><p>News and members.</p></div>
          </div>
        </section>
        <footer class="footer" id="about"><p>Let's work together → ali@example.com</p></footer>
        """,
        """
        .intro { padding-top: 96px; padding-bottom: 48px; }
        .intro h1 { font-size: 46px; max-width: 760px; line-height: 1.2; margin: 8px 0 28px; }
        .eyebrow { color: var(--color-secondary); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
        .project { padding: 0; overflow: hidden; transition: transform 0.2s; }
        .project:hover { transform: translateY(-6px); }
        .project img { display: block; width: 100%; height: 180px; object-fit: cover; }
        .project h3, .project p { margin: 12px 18px; }
        """,
        [
            {"path": "images/project-1.svg", "data_url": art("Project 1", "#7c3aed", "#22d3ee")},
            {"path": "images/project-2.svg", "data_url": art("Project 2", "#db2777", "#f59e0b")},
            {"path": "images/project-3.svg", "data_url": art("Project 3", "#059669", "#3b82f6")},
        ],
        "night",
    ),
    _tpl(
        "cv",
        tx_pair("CV / Résumé", "السيرة الذاتية"),
        tx_pair("Education, skills and experience", "التعليم والمهارات والخبرة"),
        """
        <main class="cv">
          <header class="cv-head">
            <img class="avatar" src="images/photo.svg" alt="Profile photo">
            <div>
              <h1>Fatma Al-Balushi</h1>
              <p class="lead">Information Technology student · Front-end developer</p>
              <p>fatma@example.com · Muscat, Oman</p>
            </div>
          </header>
          <section>
            <h2>Education</h2>
            <h3>BSc Information Technology</h3>
            <p>University of Technology and Applied Sciences · 2023 – 2027</p>
          </section>
          <section>
            <h2>Skills</h2>
            <ul class="skills">
              <li>HTML</li><li>CSS</li><li>JavaScript</li><li>Teamwork</li><li>Arabic &amp; English</li>
            </ul>
          </section>
          <section>
            <h2>Experience</h2>
            <h3>Web design intern</h3>
            <p>Built three websites for local businesses.</p>
          </section>
        </main>
        """,
        """
        .cv { max-width: 820px; margin: 48px auto; padding: 48px; background: var(--color-surface); border-radius: var(--radius); }
        .cv-head { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; border-bottom: 2px solid var(--color-primary); padding-bottom: 24px; }
        .cv-head h1 { margin: 0; font-size: 36px; }
        .cv section { margin-top: 28px; }
        .cv h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-secondary); }
        .skills { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; }
        .skills li { background: var(--color-primary); color: var(--color-on-primary); padding: 6px 14px; border-radius: 999px; font-size: 14px; }
        """,
        [{"path": "images/photo.svg", "data_url": art("Photo", "#94a3b8", "#475569", 400, 400)}],
        "mono",
    ),
    _tpl(
        "cafe",
        tx_pair("Café menu", "قائمة مقهى"),
        tx_pair("Menu with prices and opening hours", "قائمة بالأسعار وساعات العمل"),
        """
        <header class="hero cafe-hero">
          <h1>Karak Corner</h1>
          <p>Fresh karak, coffee and sweets — every day from 7 am.</p>
          <a class="btn" href="#menu">See the menu</a>
        </header>
        <section class="section" id="menu">
          <h2 class="center">Our menu</h2>
          <div class="row">
            <div class="card">
              <h3>Drinks</h3>
              <ul class="menu">
                <li><span>Karak tea</span><b>0.300 OMR</b></li>
                <li><span>Omani coffee</span><b>0.500 OMR</b></li>
                <li><span>Fresh juice</span><b>1.200 OMR</b></li>
              </ul>
            </div>
            <div class="card">
              <h3>Sweets</h3>
              <ul class="menu">
                <li><span>Halwa</span><b>0.800 OMR</b></li>
                <li><span>Luqaimat</span><b>1.000 OMR</b></li>
                <li><span>Date cake</span><b>1.500 OMR</b></li>
              </ul>
            </div>
          </div>
        </section>
        <section class="section">
          <h2>Opening hours</h2>
          <table class="table">
            <thead><tr><th>Day</th><th>Hours</th></tr></thead>
            <tbody>
              <tr><td>Sat – Thu</td><td>7:00 – 23:00</td></tr>
              <tr><td>Friday</td><td>14:00 – 23:00</td></tr>
            </tbody>
          </table>
        </section>
        <footer class="footer"><p>Al Khuwair, Muscat</p></footer>
        """,
        """
        .cafe-hero { background: linear-gradient(rgba(67, 20, 7, 0.55), rgba(67, 20, 7, 0.55)), url("images/cafe.svg") center / cover; }
        .menu { list-style: none; padding: 0; margin: 0; }
        .menu li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed rgba(0, 0, 0, 0.15); }
        .menu b { color: var(--color-primary); }
        """,
        [{"path": "images/cafe.svg", "data_url": art("Karak & Coffee", "#ea580c", "#7c2d12", 1200, 600)}],
        "sunset",
    ),
    _tpl(
        "event",
        tx_pair("Event page", "صفحة فعالية"),
        tx_pair("Date, schedule and registration", "التاريخ والبرنامج والتسجيل"),
        """
        <header class="hero">
          <p class="date">15 December 2026 · Muscat</p>
          <h1>Tech Day 2026</h1>
          <p>A day of talks, workshops and fun for students who love technology.</p>
          <a class="btn" href="#register">Register now</a>
        </header>
        <section class="section">
          <h2 class="center">Schedule</h2>
          <ol class="timeline">
            <li><b>09:00</b> Welcome &amp; coffee</li>
            <li><b>10:00</b> Talk: The future of the web</li>
            <li><b>12:00</b> Workshop: Build your first website</li>
            <li><b>15:00</b> Awards &amp; closing</li>
          </ol>
        </section>
        <section class="section" id="register">
          <h2 class="center">Register</h2>
          <form class="form">
            <label for="name">Name</label>
            <input id="name" type="text" placeholder="Your name">
            <label for="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com">
            <button class="btn" type="submit">Save my seat</button>
          </form>
        </section>
        <footer class="footer"><p>Organised by the Student Tech Club</p></footer>
        """,
        """
        .date { font-weight: 700; letter-spacing: 0.05em; }
        .timeline { max-width: 620px; margin: 0 auto; padding: 0; list-style: none; }
        .timeline li { padding: 16px 20px; margin-bottom: 12px; background: var(--color-surface); border-radius: var(--radius); border-inline-start: 6px solid var(--color-primary); }
        .timeline b { color: var(--color-primary); margin-inline-end: 12px; }
        .form { display: flex; flex-direction: column; gap: 10px; max-width: 460px; margin: 0 auto; }
        .form input { padding: 12px 14px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: var(--radius); font: inherit; }
        .form .btn { border: 0; cursor: pointer; font: inherit; font-weight: 700; margin-top: 8px; }
        """,
        [],
        "playful",
    ),
    _tpl(
        "club",
        tx_pair("Student club (Arabic)", "نادي طلابي (عربي)"),
        tx_pair("Right-to-left page in Arabic", "صفحة عربية من اليمين إلى اليسار"),
        """
        <nav class="navbar">
          <a class="brand" href="#">نادي التقنية</a>
          <ul>
            <li><a href="#about">من نحن</a></li>
            <li><a href="#join">انضم إلينا</a></li>
          </ul>
        </nav>
        <header class="hero">
          <h1>مرحبًا بكم في نادي التقنية</h1>
          <p>نتعلم معًا تصميم المواقع والبرمجة وصناعة الأفكار.</p>
          <a class="btn" href="#join">انضم الآن</a>
        </header>
        <section class="section" id="about">
          <img class="banner" src="images/club.svg" alt="صورة النادي">
          <h2>أنشطتنا</h2>
          <div class="row">
            <div class="card"><h3>ورش عمل</h3><p>ورشة أسبوعية في تصميم المواقع.</p></div>
            <div class="card"><h3>مسابقات</h3><p>تحديات برمجية بجوائز قيّمة.</p></div>
            <div class="card"><h3>رحلات</h3><p>زيارات لشركات التقنية في عُمان.</p></div>
          </div>
        </section>
        <footer class="footer" id="join"><p>للتسجيل: club@example.com</p></footer>
        """,
        """
        .banner { width: 100%; height: 260px; object-fit: cover; border-radius: var(--radius); margin-bottom: 24px; }
        """,
        [{"path": "images/club.svg", "data_url": art("نادي التقنية", "#b91c1c", "#15803d", 1200, 600)}],
        "heritage",
    ),
]


HTML_AR = {
    "personal": dedent(
        """
        <section class="section about">
          <img class="avatar" src="images/me.svg" alt="صورة لي">
          <h1>مرحبًا، أنا سارة</h1>
          <p class="lead">أنا طالبة أتعلم تصميم المواقع. هذه صفحتي الأولى.</p>
          <h2>هواياتي</h2>
          <ul>
            <li>القراءة</li>
            <li>التصوير</li>
            <li>كرة القدم</li>
          </ul>
          <h2>جدولي</h2>
          <table class="table">
            <thead>
              <tr><th>اليوم</th><th>المادة</th></tr>
            </thead>
            <tbody>
              <tr><td>الأحد</td><td>تصميم الويب</td></tr>
              <tr><td>الإثنين</td><td>قواعد البيانات</td></tr>
            </tbody>
          </table>
        </section>
        """
    ).strip(),
    "landing": dedent(
        """
        <nav class="navbar">
          <a class="brand" href="#">علامتي</a>
          <ul>
            <li><a href="#features">المزايا</a></li>
            <li><a href="#contact">تواصل</a></li>
          </ul>
        </nav>
        <header class="hero">
          <h1>اصنع شيئًا جميلًا</h1>
          <p>جملة واضحة تشرح فكرتك ولماذا سيحبها الناس.</p>
          <a class="btn" href="#features">ابدأ الآن</a>
        </header>
        <section class="section" id="features">
          <h2 class="center">لماذا تختارنا؟</h2>
          <div class="row">
            <div class="card"><h3>سريع</h3><p>اشرح الفكرة الأولى في جملة أو جملتين.</p></div>
            <div class="card"><h3>بسيط</h3><p>اشرح الفكرة الثانية في جملة أو جملتين.</p></div>
            <div class="card"><h3>ودود</h3><p>اشرح الفكرة الثالثة في جملة أو جملتين.</p></div>
          </div>
        </section>
        <footer class="footer" id="contact"><p>© 2026 علامتي · hello@example.com</p></footer>
        """
    ).strip(),
    "portfolio": dedent(
        """
        <nav class="navbar">
          <a class="brand" href="#">علي.تصميم</a>
          <ul>
            <li><a href="#work">الأعمال</a></li>
            <li><a href="#about">عني</a></li>
          </ul>
        </nav>
        <header class="section intro">
          <p class="eyebrow">مصمم ويب · مسقط</p>
          <h1>أصمم مواقع يستمتع الناس باستخدامها.</h1>
          <a class="btn" href="#work">شاهد أعمالي</a>
        </header>
        <section class="section" id="work">
          <h2>أعمال مختارة</h2>
          <div class="grid">
            <div class="card project"><img src="images/project-1.svg" alt="لقطة من موقع المقهى"><h3>موقع مقهى</h3><p>قائمة وطلبات عبر الإنترنت.</p></div>
            <div class="card project"><img src="images/project-2.svg" alt="لقطة من صفحة الفعالية"><h3>صفحة فعالية</h3><p>تذاكر وجدول.</p></div>
            <div class="card project"><img src="images/project-3.svg" alt="لقطة من بوابة النادي"><h3>بوابة نادٍ</h3><p>أخبار وأعضاء.</p></div>
          </div>
        </section>
        <footer class="footer" id="about"><p>لنعمل معًا ← ali@example.com</p></footer>
        """
    ).strip(),
    "cv": dedent(
        """
        <main class="cv">
          <header class="cv-head">
            <img class="avatar" src="images/photo.svg" alt="صورة شخصية">
            <div>
              <h1>فاطمة البلوشي</h1>
              <p class="lead">طالبة تقنية معلومات · مطورة واجهات</p>
              <p>fatma@example.com · مسقط، عُمان</p>
            </div>
          </header>
          <section>
            <h2>التعليم</h2>
            <h3>بكالوريوس تقنية المعلومات</h3>
            <p>جامعة التقنية والعلوم التطبيقية · 2023 – 2027</p>
          </section>
          <section>
            <h2>المهارات</h2>
            <ul class="skills">
              <li>HTML</li><li>CSS</li><li>JavaScript</li><li>العمل الجماعي</li><li>العربية والإنجليزية</li>
            </ul>
          </section>
          <section>
            <h2>الخبرة</h2>
            <h3>متدربة تصميم ويب</h3>
            <p>بنيت ثلاثة مواقع لأعمال محلية.</p>
          </section>
        </main>
        """
    ).strip(),
    "cafe": dedent(
        """
        <header class="hero cafe-hero">
          <h1>ركن الكرك</h1>
          <p>كرك وقهوة وحلويات طازجة — كل يوم من السابعة صباحًا.</p>
          <a class="btn" href="#menu">شاهد القائمة</a>
        </header>
        <section class="section" id="menu">
          <h2 class="center">قائمتنا</h2>
          <div class="row">
            <div class="card">
              <h3>مشروبات</h3>
              <ul class="menu">
                <li><span>شاي كرك</span><b>0.300 ر.ع</b></li>
                <li><span>قهوة عمانية</span><b>0.500 ر.ع</b></li>
                <li><span>عصير طازج</span><b>1.200 ر.ع</b></li>
              </ul>
            </div>
            <div class="card">
              <h3>حلويات</h3>
              <ul class="menu">
                <li><span>حلوى</span><b>0.800 ر.ع</b></li>
                <li><span>لقيمات</span><b>1.000 ر.ع</b></li>
                <li><span>كيك التمر</span><b>1.500 ر.ع</b></li>
              </ul>
            </div>
          </div>
        </section>
        <section class="section">
          <h2>ساعات العمل</h2>
          <table class="table">
            <thead><tr><th>اليوم</th><th>الساعات</th></tr></thead>
            <tbody>
              <tr><td>السبت – الخميس</td><td>7:00 – 23:00</td></tr>
              <tr><td>الجمعة</td><td>14:00 – 23:00</td></tr>
            </tbody>
          </table>
        </section>
        <footer class="footer"><p>الخوير، مسقط</p></footer>
        """
    ).strip(),
    "event": dedent(
        """
        <header class="hero">
          <p class="date">15 ديسمبر 2026 · مسقط</p>
          <h1>يوم التقنية 2026</h1>
          <p>يوم من المحاضرات وورش العمل والمرح للطلاب الذين يحبون التقنية.</p>
          <a class="btn" href="#register">سجّل الآن</a>
        </header>
        <section class="section">
          <h2 class="center">البرنامج</h2>
          <ol class="timeline">
            <li><b>09:00</b> ترحيب وقهوة</li>
            <li><b>10:00</b> محاضرة: مستقبل الويب</li>
            <li><b>12:00</b> ورشة: ابنِ موقعك الأول</li>
            <li><b>15:00</b> الجوائز والختام</li>
          </ol>
        </section>
        <section class="section" id="register">
          <h2 class="center">التسجيل</h2>
          <form class="form">
            <label for="name">الاسم</label>
            <input id="name" type="text" placeholder="اسمك">
            <label for="email">البريد</label>
            <input id="email" type="email" placeholder="you@example.com">
            <button class="btn" type="submit">احجز مقعدي</button>
          </form>
        </section>
        <footer class="footer"><p>تنظيم نادي التقنية الطلابي</p></footer>
        """
    ).strip(),
}

IMAGES_AR = {
    "personal": [{"path": "images/me.svg", "data_url": art("أنا", "#818cf8", "#22d3ee", 400, 400)}],
    "portfolio": [
        {"path": "images/project-1.svg", "data_url": art("مشروع 1", "#7c3aed", "#22d3ee")},
        {"path": "images/project-2.svg", "data_url": art("مشروع 2", "#db2777", "#f59e0b")},
        {"path": "images/project-3.svg", "data_url": art("مشروع 3", "#059669", "#3b82f6")},
    ],
    "cv": [{"path": "images/photo.svg", "data_url": art("صورة", "#94a3b8", "#475569", 400, 400)}],
    "cafe": [{"path": "images/cafe.svg", "data_url": art("كرك وقهوة", "#ea580c", "#7c2d12", 1200, 600)}],
}


def template_by_id(template_id: str) -> dict:
    return next((item for item in TEMPLATES if item["id"] == template_id), TEMPLATES[0])


def template_html(template: dict, lang: str) -> str:
    if lang == "ar":
        return HTML_AR.get(template["id"]) or template["html"]
    return template["html"]


def template_images(template: dict, lang: str) -> list:
    if lang == "ar" and template["id"] in IMAGES_AR:
        return IMAGES_AR[template["id"]]
    return template["images"]


def public_templates() -> list[dict]:
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "desc": item["desc"],
            "kit": item["kit"],
            "html": item["html"],
            "html_ar": HTML_AR.get(item["id"]) or (item["html"] if item["id"] in RTL_TEMPLATES else ""),
            "css": item["css"],
            "images": item["images"],
            "rtl": item["id"] in RTL_TEMPLATES,
        }
        for item in TEMPLATES
    ]


def public_kits() -> list[dict]:
    return [
        {
            "id": kit["id"],
            "name": kit["name"],
            "mood": kit["mood"],
            "vars": kit["vars"],
            "css": kit_css(kit),
        }
        for kit in KITS
    ]
