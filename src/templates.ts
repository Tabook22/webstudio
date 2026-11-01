import { KITS, kitCss } from './kits';
import { formatCss } from './serialize';
import type { Asset } from './assets';

type Pair = [string, string];

export interface Template {
  id: string;
  name: Pair;
  desc: Pair;
  /** Design kit the template starts with (none for Blank). */
  kit?: string;
  html: string;
  css: string;
  images: Asset[];
}

/** Soft gradient picture with a label, used as a placeholder photo. */
function art(label: string, c1: string, c2: string, w = 800, h = 520) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.78}" cy="${h * 0.25}" r="${h * 0.16}" fill="#ffffff" fill-opacity="0.25"/><path d="M0 ${h * 0.8} Q ${w * 0.3} ${h * 0.55} ${w * 0.55} ${h * 0.75} T ${w} ${h * 0.7} V ${h} H 0 Z" fill="#ffffff" fill-opacity="0.22"/><text x="50%" y="52%" font-family="sans-serif" font-size="${Math.round(h / 9)}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const COMMON = `
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
`;

const base = `body {\n  margin: 0;\n  line-height: 1.6;\n}\n`;

function build(kitId: string | undefined, extra: string) {
  const kit = KITS.find((k) => k.id === kitId);
  return base + '\n' + (kit ? kitCss(kit) + '\n' : '') + formatCss(COMMON + extra);
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank', name: ['Blank page', 'صفحة فارغة'], desc: ['Start from nothing', 'ابدأ من الصفر'],
    html: '', css: base + '\nimg {\n  max-width: 100%;\n}\n', images: [],
  },
  {
    id: 'personal', name: ['About me', 'نبذة عني'], desc: ['Photo, hobbies and a timetable', 'صورة وهوايات وجدول'], kit: 'indigo',
    images: [{ path: 'images/me.svg', dataUrl: art('Me', '#818cf8', '#22d3ee', 400, 400) }],
    html: `<section class="section about">
  <img class="avatar" src="images/me.svg" alt="A photo of me">
  <h1>Hello, I'm Sara 👋</h1>
  <p class="lead">I am a student learning how to design websites. This is my first page.</p>
  <h2>My hobbies</h2>
  <ul>
    <li>Reading</li>
    <li>Photography</li>
    <li>Football</li>
  </ul>
  <h2>My timetable</h2>
  <table class="table">
    <thead><tr><th>Day</th><th>Subject</th></tr></thead>
    <tbody><tr><td>Sunday</td><td>Web Design</td></tr><tr><td>Monday</td><td>Databases</td></tr></tbody>
  </table>
</section>`,
    css: '',
  },
  {
    id: 'landing', name: ['Landing page', 'صفحة تعريفية'], desc: ['Hero, features and footer', 'واجهة ومزايا وتذييل'], kit: 'ocean',
    images: [],
    html: `<nav class="navbar"><a class="brand" href="#">Brand</a><ul><li><a href="#features">Features</a></li><li><a href="#contact">Contact</a></li></ul></nav>
<header class="hero"><h1>Build something great</h1><p>One clear sentence that explains your idea and why people will love it.</p><a class="btn" href="#features">Get started</a></header>
<section class="section" id="features"><h2 class="center">Why choose us?</h2><div class="row"><div class="card"><h3>⚡ Fast</h3><p>Explain the first idea in one or two sentences.</p></div><div class="card"><h3>🎯 Simple</h3><p>Explain the second idea in one or two sentences.</p></div><div class="card"><h3>💬 Friendly</h3><p>Explain the third idea in one or two sentences.</p></div></div></section>
<footer class="footer" id="contact"><p>© 2026 Brand · hello@example.com</p></footer>`,
    css: '',
  },
  {
    id: 'portfolio', name: ['Portfolio', 'معرض أعمال'], desc: ['Show your projects in a grid', 'اعرض مشاريعك في شبكة'], kit: 'night',
    images: [
      { path: 'images/project-1.svg', dataUrl: art('Project 1', '#7c3aed', '#22d3ee') },
      { path: 'images/project-2.svg', dataUrl: art('Project 2', '#db2777', '#f59e0b') },
      { path: 'images/project-3.svg', dataUrl: art('Project 3', '#059669', '#3b82f6') },
    ],
    html: `<nav class="navbar"><a class="brand" href="#">Ali.design</a><ul><li><a href="#work">Work</a></li><li><a href="#about">About</a></li></ul></nav>
<header class="section intro"><p class="eyebrow">Web designer · Muscat</p><h1>I design websites that people enjoy using.</h1><a class="btn" href="#work">See my work</a></header>
<section class="section" id="work"><h2>Selected work</h2><div class="grid"><div class="card project"><img src="images/project-1.svg" alt="Project 1 screenshot"><h3>Café website</h3><p>Menu and online orders.</p></div><div class="card project"><img src="images/project-2.svg" alt="Project 2 screenshot"><h3>Event page</h3><p>Tickets and schedule.</p></div><div class="card project"><img src="images/project-3.svg" alt="Project 3 screenshot"><h3>Club portal</h3><p>News and members.</p></div></div></section>
<footer class="footer" id="about"><p>Let's work together → ali@example.com</p></footer>`,
    css: `
.intro { padding-top: 96px; padding-bottom: 48px; }
.intro h1 { font-size: 46px; max-width: 760px; line-height: 1.2; margin: 8px 0 28px; }
.eyebrow { color: var(--color-secondary); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
.project { padding: 0; overflow: hidden; transition: transform 0.2s; }
.project:hover { transform: translateY(-6px); }
.project img { display: block; width: 100%; height: 180px; object-fit: cover; }
.project h3, .project p { margin: 12px 18px; }
`,
  },
  {
    id: 'cv', name: ['CV / Résumé', 'السيرة الذاتية'], desc: ['Education, skills and experience', 'التعليم والمهارات والخبرة'], kit: 'mono',
    images: [{ path: 'images/photo.svg', dataUrl: art('Photo', '#94a3b8', '#475569', 400, 400) }],
    html: `<main class="cv">
  <header class="cv-head"><img class="avatar" src="images/photo.svg" alt="Profile photo"><div><h1>Fatma Al-Balushi</h1><p class="lead">Information Technology student · Front-end developer</p><p>📧 fatma@example.com · 📍 Muscat, Oman</p></div></header>
  <section><h2>Education</h2><h3>BSc Information Technology</h3><p>University of Technology and Applied Sciences · 2023 – 2027</p></section>
  <section><h2>Skills</h2><ul class="skills"><li>HTML</li><li>CSS</li><li>JavaScript</li><li>Teamwork</li><li>Arabic &amp; English</li></ul></section>
  <section><h2>Experience</h2><h3>Web design intern</h3><p>Built three websites for local businesses.</p></section>
</main>`,
    css: `
.cv { max-width: 820px; margin: 48px auto; padding: 48px; background: var(--color-surface); border-radius: var(--radius); }
.cv-head { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; border-bottom: 2px solid var(--color-primary); padding-bottom: 24px; }
.cv-head h1 { margin: 0; font-size: 36px; }
.cv section { margin-top: 28px; }
.cv h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-secondary); }
.skills { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; }
.skills li { background: var(--color-primary); color: var(--color-on-primary); padding: 6px 14px; border-radius: 999px; font-size: 14px; }
`,
  },
  {
    id: 'cafe', name: ['Café menu', 'قائمة مقهى'], desc: ['Menu with prices and opening hours', 'قائمة بالأسعار وساعات العمل'], kit: 'sunset',
    images: [{ path: 'images/cafe.svg', dataUrl: art('Karak & Coffee', '#ea580c', '#7c2d12', 1200, 600) }],
    html: `<header class="hero cafe-hero"><h1>☕ Karak Corner</h1><p>Fresh karak, coffee and sweets — every day from 7 am.</p><a class="btn" href="#menu">See the menu</a></header>
<section class="section" id="menu"><h2 class="center">Our menu</h2><div class="row"><div class="card"><h3>Drinks</h3><ul class="menu"><li><span>Karak tea</span><b>0.300 OMR</b></li><li><span>Omani coffee</span><b>0.500 OMR</b></li><li><span>Fresh juice</span><b>1.200 OMR</b></li></ul></div><div class="card"><h3>Sweets</h3><ul class="menu"><li><span>Halwa</span><b>0.800 OMR</b></li><li><span>Luqaimat</span><b>1.000 OMR</b></li><li><span>Date cake</span><b>1.500 OMR</b></li></ul></div></div></section>
<section class="section"><h2>Opening hours</h2><table class="table"><thead><tr><th>Day</th><th>Hours</th></tr></thead><tbody><tr><td>Sat – Thu</td><td>7:00 – 23:00</td></tr><tr><td>Friday</td><td>14:00 – 23:00</td></tr></tbody></table></section>
<footer class="footer"><p>Al Khuwair, Muscat · 📞 9123 4567</p></footer>`,
    css: `
.cafe-hero { background: linear-gradient(rgba(67, 20, 7, 0.55), rgba(67, 20, 7, 0.55)), url("images/cafe.svg") center / cover; }
.menu { list-style: none; padding: 0; margin: 0; }
.menu li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed rgba(0, 0, 0, 0.15); }
.menu b { color: var(--color-primary); }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.1); text-align: start; }
`,
  },
  {
    id: 'event', name: ['Event page', 'صفحة فعالية'], desc: ['Date, schedule and registration', 'التاريخ والبرنامج والتسجيل'], kit: 'playful',
    images: [],
    html: `<header class="hero"><p class="date">📅 15 December 2026 · Muscat</p><h1>Tech Day 2026</h1><p>A day of talks, workshops and fun for students who love technology.</p><a class="btn" href="#register">Register now</a></header>
<section class="section"><h2 class="center">Schedule</h2><ol class="timeline"><li><b>09:00</b> Welcome &amp; coffee</li><li><b>10:00</b> Talk: The future of the web</li><li><b>12:00</b> Workshop: Build your first website</li><li><b>15:00</b> Awards &amp; closing</li></ol></section>
<section class="section" id="register"><h2 class="center">Register</h2><form class="form"><label for="name">Name</label><input id="name" type="text" placeholder="Your name"><label for="email">Email</label><input id="email" type="email" placeholder="you@example.com"><button class="btn" type="submit">Save my seat</button></form></section>
<footer class="footer"><p>Organised by the Student Tech Club</p></footer>`,
    css: `
.date { font-weight: 700; letter-spacing: 0.05em; }
.timeline { max-width: 620px; margin: 0 auto; padding: 0; list-style: none; }
.timeline li { padding: 16px 20px; margin-bottom: 12px; background: var(--color-surface); border-radius: var(--radius); border-inline-start: 6px solid var(--color-primary); }
.timeline b { color: var(--color-primary); margin-inline-end: 12px; }
.form { display: flex; flex-direction: column; gap: 10px; max-width: 460px; margin: 0 auto; }
.form input { padding: 12px 14px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: var(--radius); font: inherit; }
.form .btn { border: 0; cursor: pointer; font: inherit; font-weight: 700; margin-top: 8px; }
.center { text-align: center; }
`,
  },
  {
    id: 'club', name: ['Student club (Arabic)', 'نادي طلابي (عربي)'], desc: ['Right-to-left page in Arabic', 'صفحة عربية من اليمين إلى اليسار'], kit: 'heritage',
    images: [{ path: 'images/club.svg', dataUrl: art('نادي التقنية', '#b91c1c', '#15803d', 1200, 600) }],
    html: `<nav class="navbar"><a class="brand" href="#">نادي التقنية</a><ul><li><a href="#about">من نحن</a></li><li><a href="#join">انضم إلينا</a></li></ul></nav>
<header class="hero"><h1>مرحبًا بكم في نادي التقنية</h1><p>نتعلم معًا تصميم المواقع والبرمجة وصناعة الأفكار.</p><a class="btn" href="#join">انضم الآن</a></header>
<section class="section" id="about"><img class="banner" src="images/club.svg" alt="صورة النادي"><h2>أنشطتنا</h2><div class="row"><div class="card"><h3>🖥️ ورش عمل</h3><p>ورشة أسبوعية في تصميم المواقع.</p></div><div class="card"><h3>🏆 مسابقات</h3><p>تحديات برمجية بجوائز قيّمة.</p></div><div class="card"><h3>🤝 رحلات</h3><p>زيارات لشركات التقنية في عُمان.</p></div></div></section>
<footer class="footer" id="join"><p>للتسجيل: club@example.com</p></footer>`,
    css: `
.banner { width: 100%; height: 260px; object-fit: cover; border-radius: var(--radius); margin-bottom: 24px; }
`,
  },
];

/** Templates whose page is right-to-left Arabic. */
export const RTL_TEMPLATES = new Set(['club']);

export function templateCss(t: Template) {
  return t.kit || t.css ? build(t.kit, t.css) : t.css;
}

/** A self-contained page for the gallery preview (images inlined). */
export function templatePreviewHtml(t: Template) {
  let css = templateCss(t);
  let html = t.html;
  for (const img of t.images) {
    css = css.split(img.path).join(img.dataUrl);
    html = html.split(img.path).join(img.dataUrl);
  }
  const fonts = /"(Inter|Poppins|Montserrat|Open Sans|Lato|Merriweather|Amiri|Tajawal|Changa)"/.test(css)
    ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@700&family=Open+Sans&family=Lato&family=Merriweather:wght@700&family=Amiri:wght@700&family=Tajawal&family=Changa:wght@700&display=swap">'
    : '';
  const dir = RTL_TEMPLATES.has(t.id) ? 'rtl' : 'ltr';
  return `<!doctype html><html dir="${dir}"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body>${html}</body></html>`;
}
