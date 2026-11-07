import type { CodeTab, Device, Mode, Project, SideTab } from "../types";

export type Issue = { level: "error" | "warn" | "tip"; en: string; ar: string; path?: number[]; page?: string };

const DEFAULT_TITLES = /^(my first website|new website|website|موقعي الأول|موقع جديد)$/i;

function pathOf(el: Element): number[] {
  const path: number[] = [];
  let cur: Element | null = el;
  const body = el.ownerDocument.body;
  while (cur && cur !== body) {
    const owner: Element | null = cur.parentElement;
    if (!owner) break;
    path.unshift(Array.prototype.indexOf.call(owner.children, cur));
    cur = owner;
  }
  return path;
}

export function checkPage(html: string, title: string): Issue[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const all = [...doc.body.querySelectorAll("*")];
  const issues: Issue[] = [];
  const add = (level: Issue["level"], en: string, ar: string, el?: Element) =>
    issues.push({ level, en, ar, path: el ? pathOf(el) : undefined });

  if (!all.length) add("tip", "The page is empty. Drag a tag from the Toolbox onto it.", "الصفحة فارغة. اسحب وسمًا من صندوق الأدوات إليها.");
  if (!title.trim() || DEFAULT_TITLES.test(title.trim())) {
    add("tip", "Give the page a real title in Page settings. It shows in the browser tab.", "اكتب عنوانًا حقيقيًا في إعدادات الصفحة. يظهر في تبويب المتصفح.");
  }

  const headings = all.filter((el) => /^H[1-6]$/.test(el.tagName));
  const h1s = headings.filter((el) => el.tagName === "H1");
  if (all.length && !h1s.length) add("warn", "There is no <h1>. Every page should have one main heading.", "لا يوجد <h1>. يجب أن تحتوي كل صفحة على عنوان رئيسي واحد.");
  h1s.slice(1).forEach((el) => add("warn", "More than one <h1>. Use <h2> for section headings.", "يوجد أكثر من <h1>. استخدم <h2> لعناوين الأقسام.", el));

  let last = 0;
  for (const el of headings) {
    const level = Number(el.tagName[1]);
    const text = (el.textContent || "").trim();
    if (last && level > last + 1) {
      add("warn", `Heading jumps from <h${last}> to <h${level}>. Don't skip levels.`, `العنوان يقفز من <h${last}> إلى <h${level}>. لا تتخطَّ المستويات.`, el);
    }
    if (!text) add("warn", "Empty heading.", "عنوان فارغ.", el);
    last = level;
  }

  const ids = new Map<string, Element>();
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (tag === "img" && !(el.getAttribute("alt") || "").trim()) {
      add("error", "Image without alt text. Describe the picture.", "صورة بدون نص بديل (alt). صف الصورة.", el);
    }
    if (tag === "a") {
      const href = (el.getAttribute("href") || "").trim();
      if (!href || href === "#") add("tip", 'Link goes nowhere (href="#"). Set its address.', 'الرابط لا يذهب إلى أي مكان (href="#"). عيّن عنوانه.', el);
      if (!(el.textContent || "").trim() && !el.querySelector("img")) add("error", "Link has no text.", "رابط بدون نص.", el);
    }
    if (tag === "button" && !(el.textContent || "").trim()) add("error", "Button has no text.", "زر بدون نص.", el);
    if (tag === "p" && !(el.textContent || "").trim() && !el.children.length) add("tip", "Empty paragraph.", "فقرة فارغة.", el);
    if (["input", "textarea", "select"].includes(tag)) {
      const type = el.getAttribute("type") || "";
      if (type !== "submit" && type !== "hidden" && type !== "button") {
        const id = el.getAttribute("id");
        const labelled = (id && !!doc.body.querySelector(`label[for="${CSS.escape(id)}"]`)) || !!el.closest("label") || !!el.getAttribute("aria-label");
        if (!labelled) add("warn", "Form field without a <label>.", "حقل نموذج بدون <label>.", el);
      }
    }
    if (tag === "table") {
      const table = el as HTMLTableElement;
      if (!table.querySelector("th")) add("tip", "Table has no header cells (<th>).", "الجدول بدون خلايا عناوين (<th>).", el);
      const counts = [...table.rows].map((row) => [...row.cells].reduce((sum, cell) => sum + Number(cell.getAttribute("colspan") || 1), 0));
      if (counts.length > 1 && counts.some((count) => count !== counts[0])) {
        add("warn", "Some rows have a different number of cells.", "بعض الصفوف فيها عدد مختلف من الخلايا.", el);
      }
    }
    const id = el.getAttribute("id");
    if (id) {
      if (ids.has(id)) add("error", `The id "${id}" is used twice.`, `المعرف "${id}" مستخدم مرتين.`, el);
      ids.set(id, el);
    }
  }
  return issues;
}

export function checkLinks(project: Project): Issue[] {
  const pages = new Set(["index.html", ...(project.files || []).filter((file) => !file.folder && /\.html?$/i.test(file.path)).map((file) => file.path)]);
  const assets = new Set(project.assets.map((asset) => asset.path));
  const issues: Issue[] = [];
  const scan = (page: string, html: string) => {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    const add = (level: Issue["level"], en: string, ar: string, el?: Element) =>
      issues.push({ level, en, ar, path: el ? pathOf(el) : undefined, page });
    for (const link of doc.body.querySelectorAll("a")) {
      const href = (link.getAttribute("href") || "").trim();
      const label = (link.textContent || "").trim() || href || "link";
      if (!href || href === "#") {
        add("warn", `"${label}" does not go anywhere yet.`, `"${label}" لا يذهب إلى أي مكان بعد.`, link);
        continue;
      }
      if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) continue;
      const target = href.split("#")[0].split("?")[0].replace(/^\.\//, "");
      if (target && !pages.has(target) && !assets.has(target)) {
        add("error", `"${label}" points to ${target}, and that page is not in the website.`, `"${label}" يشير إلى ${target}، وهذه الصفحة ليست في الموقع.`, link);
      }
    }
    for (const image of doc.body.querySelectorAll("img")) {
      const src = (image.getAttribute("src") || "").trim().replace(/^\.\//, "");
      if (!src) {
        add("error", "A picture has no file.", "صورة بدون ملف.", image);
      } else if (!/^(https?:|data:|\/)/i.test(src) && !assets.has(src)) {
        add("error", `The picture ${src} is not in the website.`, `الصورة ${src} ليست في الموقع.`, image);
      }
    }
  };
  scan("index.html", project.html);
  for (const file of project.files || []) {
    if (!file.folder && /\.html?$/i.test(file.path)) scan(file.path, file.content);
  }
  return issues;
}

export function pageFacts(html: string) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const text = (doc.body.textContent || "").trim();
  return {
    words: text ? text.split(/\s+/).length : 0,
    headings: doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
    pictures: doc.body.querySelectorAll("img").length,
    links: doc.body.querySelectorAll("a").length,
    tables: doc.body.querySelectorAll("table").length,
    paragraphs: doc.body.querySelectorAll("p").length,
  };
}

export type Spot = { id: string; tab?: SideTab; mode?: Mode; codeTab?: CodeTab };

export type Step = {
  id: string;
  title: [string, string];
  hint: [string, string];
  spot?: Spot;
  check: (ctx: MissionCtx) => boolean;
};

export type Mission = {
  id: string;
  title: [string, string];
  topic: [string, string];
  level: 1 | 2 | 3;
  badge: { emoji: string; name: [string, string]; color: string };
  steps: Step[];
};

export type MissionCtx = {
  html: string;
  css: string;
  js: string;
  title: string;
  events: Set<string>;
  doc: Document;
};

const tags = (ctx: MissionCtx, name: string) => [...ctx.doc.body.querySelectorAll(name)];
const text = (el: Element) => (el.textContent || "").trim();

function decl(css: string, prop: RegExp) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(([, sel, body]) => prop.test(body) && !/^\s*(body|:root|html)\s*$/.test(sel));
}

export const MISSIONS: Mission[] = [
  {
    id: "first-page",
    level: 1,
    title: ["My first page", "صفحتي الأولى"],
    topic: ["HTML basics", "أساسيات HTML"],
    badge: { emoji: "🌱", name: ["HTML Starter", "مبتدئ HTML"], color: "#3f8f5b" },
    steps: [
      { id: "h1", title: ["Add a main heading <h1>", "أضف عنوانًا رئيسيًا <h1>"], hint: ["Drag “Heading 1” from the Toolbox onto the page.", "اسحب “عنوان 1” من صندوق الأدوات إلى الصفحة."], spot: { id: "block-h1", tab: "blocks" }, check: (x) => tags(x, "h1").length > 0 },
      { id: "h1-text", title: ["Write your own heading text", "اكتب نص العنوان بنفسك"], hint: ["Double-click the heading and type something about you.", "انقر نقرًا مزدوجًا على العنوان واكتب شيئًا عنك."], check: (x) => tags(x, "h1").some((el) => text(el).length > 2 && !/^(main heading|عنوان رئيسي)$/i.test(text(el))) },
      { id: "p", title: ["Add a paragraph <p>", "أضف فقرة <p>"], hint: ["Drag “Paragraph” under your heading, then change its text.", "اسحب “فقرة” تحت العنوان، ثم غيّر نصها."], spot: { id: "block-p", tab: "blocks" }, check: (x) => tags(x, "p").some((el) => text(el).length > 10 && !/^(write your text here|اكتب نصك هنا)/i.test(text(el))) },
      { id: "bold", title: ["Make some words bold", "اجعل بعض الكلمات عريضة"], hint: ["Select text inside a paragraph and press Ctrl+B, or use Bold.", "حدد نصًا داخل فقرة واضغط Ctrl+B، أو استخدم عريض."], check: (x) => /<(strong|b)[\s>]/.test(x.html) || /font-weight:\s*(bold|[6-9]00)/.test(x.css + x.html) },
      { id: "title", title: ["Give the page a title", "اكتب عنوانًا للصفحة"], hint: ["Press Page on the toolbar, then type a title.", "اضغط الصفحة في شريط الأدوات، ثم اكتب عنوانًا."], spot: { id: "btn-more" }, check: (x) => !!x.title.trim() && !DEFAULT_TITLES.test(x.title.trim()) },
    ],
  },
  {
    id: "lists-tables",
    level: 1,
    title: ["Lists & tables", "القوائم والجداول"],
    topic: ["Organising information", "تنظيم المعلومات"],
    badge: { emoji: "📋", name: ["Organiser", "المنظِّم"], color: "#0f766e" },
    steps: [
      { id: "ul", title: ["Add a bulleted list <ul>", "أضف قائمة نقطية <ul>"], hint: ["Drag “Bulleted list” from the Toolbox.", "اسحب “قائمة نقطية” من صندوق الأدوات."], spot: { id: "block-ul", tab: "blocks" }, check: (x) => tags(x, "ul").length > 0 },
      { id: "li4", title: ["Give a list 4 items or more", "اجعل في القائمة 4 بنود أو أكثر"], hint: ["Select the list, then press Add item.", "حدد القائمة ثم اضغط إضافة بند."], check: (x) => [...tags(x, "ul"), ...tags(x, "ol")].some((list) => list.querySelectorAll(":scope > li").length >= 4) },
      { id: "ol", title: ["Add a numbered list <ol>", "أضف قائمة مرقمة <ol>"], hint: ["Drag “Numbered list”, or switch a list to Numbers.", "اسحب “قائمة مرقمة”، أو حوّل قائمة إلى أرقام."], spot: { id: "block-ol", tab: "blocks" }, check: (x) => tags(x, "ol").length > 0 },
      { id: "table", title: ["Add a table <table>", "أضف جدولًا <table>"], hint: ["Drag “Table” and choose its size.", "اسحب “جدول” واختر حجمه."], spot: { id: "block-table", tab: "blocks" }, check: (x) => tags(x, "table").length > 0 },
      { id: "rows", title: ["Make the table 4 rows long", "اجعل الجدول من 4 صفوف"], hint: ["Click a cell, then Row below.", "انقر على خلية ثم صف أسفل."], check: (x) => tags(x, "table").some((table) => table.querySelectorAll("tr").length >= 4) },
      { id: "th", title: ["Write your own column titles <th>", "اكتب عناوين الأعمدة <th>"], hint: ["Double-click a header cell and type.", "انقر نقرًا مزدوجًا على خلية العنوان واكتب."], check: (x) => tags(x, "th").some((el) => text(el) && !/^(title \d+|عنوان \d+|name|age|city|day|subject|الاسم|العمر|المدينة|اليوم|المادة)$/i.test(text(el))) },
      { id: "merge", title: ["Merge two cells", "ادمج خليتين"], hint: ["Click a cell, then Merge with next.", "انقر على خلية ثم ادمج مع التالية."], check: (x) => /<t[dh][^>]*\s(colspan|rowspan)="[2-9]/.test(x.html) },
    ],
  },
  {
    id: "images-links",
    level: 1,
    title: ["Pictures & links", "الصور والروابط"],
    topic: ["<img> and <a>", "<img> و <a>"],
    badge: { emoji: "🖼️", name: ["Picture Pro", "محترف الصور"], color: "#b86e00" },
    steps: [
      { id: "upload", title: ["Add your own picture", "أضف صورتك"], hint: ["In the Toolbox, open Pictures and drop a picture from your computer.", "في صندوق الأدوات، افتح الصور وأسقط صورة من جهازك."], spot: { id: "tab-images", tab: "images" }, check: (x) => tags(x, "img").some((el) => /^images\//.test(el.getAttribute("src") || "") && !/\/(me|photo|cafe|club|project-\d+)\.svg$/.test(el.getAttribute("src") || "")) },
      { id: "alt", title: ["Describe every image with alt text", "صف كل صورة بنص بديل"], hint: ["Select the image and fill in Alt.", "حدد الصورة واملأ النص البديل."], check: (x) => tags(x, "img").length > 0 && tags(x, "img").every((el) => (el.getAttribute("alt") || "").trim().length > 2) },
      { id: "link", title: ["Add a link to a real website", "أضف رابطًا إلى موقع حقيقي"], hint: ["Drag Link, select it, and set an https address that is not example.com.", "اسحب رابطًا، حدده، واكتب عنوان https ليس example.com."], spot: { id: "block-link", tab: "blocks" }, check: (x) => tags(x, "a").some((el) => /^https?:\/\/[^/]+\.[a-z]{2,}/i.test(el.getAttribute("href") || "") && !/example\.com/i.test(el.getAttribute("href") || "")) },
      { id: "blank", title: ["Open the link in a new tab", "افتح الرابط في تبويب جديد"], hint: ["Select the link and turn on New tab.", "حدد الرابط وفعّل تبويب جديد."], check: (x) => tags(x, "a").some((el) => el.getAttribute("target") === "_blank") },
      { id: "bgimg", title: ["Use a picture as a background", "استخدم صورة كخلفية"], hint: ["Select an element and set a background image, or put one on the page.", "حدد عنصرًا واجعل صورته خلفية، أو ضع صورة لخلفية الصفحة."], check: (x) => /background(-image)?\s*:[^;]*url\(/.test(x.css) },
    ],
  },
  {
    id: "style",
    level: 2,
    title: ["Colours & style", "الألوان والتنسيق"],
    topic: ["CSS basics", "أساسيات CSS"],
    badge: { emoji: "🎨", name: ["CSS Artist", "فنان CSS"], color: "#9d174d" },
    steps: [
      { id: "pagebg", title: ["Change the page background", "غيّر خلفية الصفحة"], hint: ["With nothing selected, choose a page colour.", "من دون تحديد، اختر لون الصفحة."], check: (x) => /body\s*\{[^}]*background/.test(x.css) },
      { id: "color", title: ["Change the colour of a heading", "غيّر لون عنوان"], hint: ["Select a heading and pick a text colour.", "حدد عنوانًا واختر لون النص."], check: (x) => /<h[1-6][^>]*style="[^"]*color\s*:/.test(x.html) || /h[1-6][^{]*\{[^}]*color\s*:/.test(x.css) },
      { id: "font", title: ["Use a Google font", "استخدم خطًا من Google"], hint: ["Select text and pick a font such as Poppins or Amiri.", "حدد نصًا واختر خطًا مثل Poppins أو Amiri."], check: (x) => /fonts\.googleapis\.com|@import/.test(x.css) },
      { id: "radius", title: ["Round some corners", "اجعل الزوايا دائرية"], hint: ["Select a box and press Rounded, or set a radius.", "حدد صندوقًا واضغط زوايا دائرية، أو عيّن نصف القطر."], check: (x) => /border-radius\s*:\s*(?!0(?:px|%|em|rem)?\s*;)/.test(x.css + x.html) },
      { id: "hover", title: ["Add a :hover effect", "أضف تأثير :hover"], hint: ["Select a button or card and press Hover: grow or Hover: lift.", "حدد زرًا أو بطاقة واضغط تمرير: تكبير أو رفع."], check: (x) => /:hover\s*\{[^}]*\S/.test(x.css) },
      { id: "kit", title: ["Try a design kit", "جرّب طقم تصميم"], hint: ["Press Styles and choose one. It writes CSS variables.", "اضغط الأنماط واختر واحدًا. يكتب متغيرات CSS."], spot: { id: "btn-kits" }, check: (x) => /--color-primary/.test(x.css) },
    ],
  },
  {
    id: "layout",
    level: 2,
    title: ["Boxes & layout", "الصناديق والتخطيط"],
    topic: ["Box model & flexbox", "نموذج الصندوق و flexbox"],
    badge: { emoji: "📐", name: ["Layout Builder", "باني التخطيط"], color: "#6d28d9" },
    steps: [
      { id: "xray", title: ["Turn on Visual Aids", "شغّل المساعدات المرئية"], hint: ["Press Visual Aids and hover a tag to see its margin and padding.", "اضغط المساعدات المرئية ومرّر الفأرة على وسم لترى الهامش والحشوة."], spot: { id: "btn-xray" }, check: (x) => x.events.has("xray") },
      { id: "section", title: ["Add a <section>", "أضف قسمًا <section>"], hint: ["Drag Section from the Toolbox.", "اسحب قسمًا من صندوق الأدوات."], spot: { id: "block-section", tab: "blocks" }, check: (x) => tags(x, "section").length > 0 },
      { id: "columns", title: ["Put boxes side by side", "ضع صناديق جنبًا إلى جنب"], hint: ["Drag 2 columns or 3 columns.", "اسحب عمودين أو 3 أعمدة."], spot: { id: "block-cols3", tab: "blocks" }, check: (x) => /display\s*:\s*(flex|grid)/.test(x.css + x.html) },
      { id: "padding", title: ["Give a box padding", "أعطِ صندوقًا حشوة"], hint: ["Select a box and press Padding, or type a padding value.", "حدد صندوقًا واضغط حشوة، أو اكتب قيمة الحشوة."], check: (x) => decl(x.css, /padding\s*:/) || /style="[^"]*padding\s*:/.test(x.html) },
      { id: "margin", title: ["Give a box margin", "أعطِ صندوقًا هامشًا"], hint: ["Select a box and set Margin. With Visual Aids on, margin is orange.", "حدد صندوقًا وعيّن الهامش. مع المساعدات المرئية يكون الهامش برتقاليًا."], check: (x) => decl(x.css, /margin\s*:/) || /style="[^"]*margin\s*:/.test(x.html) },
      { id: "phone", title: ["Check the page on a phone", "افحص الصفحة على الهاتف"], hint: ["Press Phone beside Design, Split and Code.", "اضغط هاتف بجانب تصميم ومقسوم وكود."], spot: { id: "device-phone" }, check: (x) => x.events.has("phone") },
    ],
  },
  {
    id: "interactive",
    level: 3,
    title: ["Make it interactive", "اجعلها تفاعلية"],
    topic: ["JavaScript basics", "أساسيات JavaScript"],
    badge: { emoji: "⚡", name: ["JS Spark", "شرارة JS"], color: "#a16207" },
    steps: [
      { id: "button", title: ["Add a button", "أضف زرًا"], hint: ["Drag Button from the Toolbox.", "اسحب زرًا من صندوق الأدوات."], spot: { id: "block-button", tab: "blocks" }, check: (x) => tags(x, "button").length > 0 || /class="[^"]*\bbtn\b/.test(x.html) },
      { id: "log", title: ["Write console.log() in script.js", "اكتب console.log() في script.js"], hint: ["Click Split, then script.js in the Folder List, and type console.log(\"Hello\");", "انقر مقسوم، ثم script.js في قائمة المجلدات، واكتب console.log(\"Hello\");"], spot: { id: "code-js", mode: "split", codeTab: "js" }, check: (x) => /console\.log\s*\(/.test(x.js) },
      { id: "run", title: ["Run the page and read the Console", "شغّل الصفحة واقرأ وحدة التحكم"], hint: ["Press Run. Messages appear in the Console tab.", "اضغط تشغيل. تظهر الرسائل في وحدة التحكم."], spot: { id: "btn-run", mode: "split", codeTab: "js" }, check: (x) => x.events.has("run") || x.events.has("preview") },
      { id: "click", title: ["React to a click", "استجب للنقر"], hint: ["Insert the example “Message when a button is clicked”.", "أدرج مثال “رسالة عند النقر على زر”."], spot: { id: "js-snippets", mode: "split", codeTab: "js" }, check: (x) => /addEventListener\s*\(\s*['"]click['"]|\.onclick\s*=/.test(x.js) },
      { id: "change", title: ["Change the page with JavaScript", "غيّر الصفحة باستخدام JavaScript"], hint: ["Use textContent, style or classList. Try “Change the main heading”.", "استخدم textContent أو style أو classList. جرّب “تغيير العنوان الرئيسي”."], check: (x) => /\.(textContent|innerText|innerHTML|style\.|classList)/.test(x.js) },
    ],
  },
  {
    id: "publish",
    level: 3,
    title: ["Ready to publish", "جاهز للنشر"],
    topic: ["Quality & sharing", "الجودة والمشاركة"],
    badge: { emoji: "🚀", name: ["Web Publisher", "ناشر الويب"], color: "#1d4ed8" },
    steps: [
      { id: "content", title: ["Build a page with at least 8 elements", "ابنِ صفحة من 8 عناصر على الأقل"], hint: ["Keep adding blocks, or start from a template.", "استمر في إضافة العناصر، أو ابدأ من قالب."], check: (x) => x.doc.body.querySelectorAll("*").length >= 8 },
      { id: "checkpage", title: ["Press Check page", "اضغط فحص الصفحة"], hint: ["The check button lists things to improve.", "زر الفحص يعرض ما يحتاج إلى تحسين."], spot: { id: "btn-check" }, check: (x) => x.events.has("check") },
      { id: "clean", title: ["Fix every error and warning", "أصلح كل الأخطاء والتحذيرات"], hint: ["Open Check page and use Show to jump to each problem.", "افتح فحص الصفحة واستخدم عرض للانتقال إلى كل مشكلة."], check: (x) => x.doc.body.querySelectorAll("*").length > 0 && checkPage(x.html, x.title).every((issue) => issue.level === "tip") },
      { id: "preview", title: ["Preview the website", "عاين الموقع"], hint: ["Press Preview.", "اضغط معاينة."], spot: { id: "btn-preview" }, check: (x) => x.events.has("preview") || x.events.has("run") },
      { id: "zip", title: ["Download the website as a ZIP", "نزّل الموقع كملف ZIP"], hint: ["Press Download. You get index.html, style.css and images.", "اضغط تنزيل. تحصل على index.html و style.css والصور."], spot: { id: "btn-zip" }, check: (x) => x.events.has("zip") },
    ],
  },
];

export function missionContext(project: Project, events: string[]): MissionCtx {
  return {
    html: project.html,
    css: project.css,
    js: project.js,
    title: project.title,
    events: new Set(events),
    doc: new DOMParser().parseFromString(`<body>${project.html}</body>`, "text/html"),
  };
}

export const TAG_HELP: Record<string, [string, string]> = {
  h1: ["The main heading of the page. Use one <h1>.", "العنوان الرئيسي للصفحة. استخدم <h1> واحدًا."],
  h2: ["A section heading, smaller than the main title.", "عنوان قسم، أصغر من العنوان الرئيسي."],
  h3: ["A heading inside a section.", "عنوان داخل قسم."],
  p: ["A paragraph of text.", "فقرة نص."],
  a: ["A link. The href attribute is the address it opens.", "رابط. الخاصية href هي العنوان الذي يفتحه."],
  img: ["A picture. alt describes it for people who cannot see it.", "صورة. alt يصفها لمن لا يراها."],
  ul: ["A bulleted list. Each item is an <li>.", "قائمة نقطية. كل بند هو <li>."],
  ol: ["A numbered list.", "قائمة مرقمة."],
  li: ["One item in a list.", "بند واحد في قائمة."],
  table: ["A table of rows and cells.", "جدول من صفوف وخلايا."],
  th: ["A header cell. It names a column or row.", "خلية عنوان. تسمّي عمودًا أو صفًا."],
  td: ["A normal table cell.", "خلية جدول عادية."],
  tr: ["One row of a table.", "صف واحد في الجدول."],
  section: ["A region of the page, often with its own heading.", "منطقة من الصفحة، غالبًا مع عنوانها."],
  header: ["Introductory content, like a title or banner.", "محتوى تمهيدي، مثل عنوان أو واجهة."],
  footer: ["The closing area of a page or section.", "المنطقة الختامية لصفحة أو قسم."],
  nav: ["A group of navigation links.", "مجموعة روابط للتنقل."],
  main: ["The main content of the page. Use it once.", "المحتوى الرئيسي للصفحة. استخدمه مرة واحدة."],
  article: ["A complete piece of content, like a story or post.", "محتوى مكتمل، مثل قصة أو تدوينة."],
  aside: ["Extra information beside the main content.", "معلومة إضافية بجانب المحتوى الرئيسي."],
  form: ["A form that collects information.", "نموذج يجمع معلومات."],
  input: ["A field the visitor can type in or choose.", "حقل يكتب فيه الزائر أو يختار."],
  textarea: ["A larger box for longer text.", "مربع أكبر لنص أطول."],
  button: ["A button that does something when clicked.", "زر يفعل شيئًا عند النقر."],
  div: ["A box that groups other elements. It has no meaning by itself.", "صندوق يجمع عناصر أخرى. ليس له معنى وحده."],
  blockquote: ["A quotation.", "اقتباس."],
  video: ["A video the visitor can play.", "فيديو يمكن للزائر تشغيله."],
  iframe: ["Another page embedded inside this one.", "صفحة أخرى مضمّنة داخل هذه الصفحة."],
  details: ["A disclosure widget. summary is the label that opens it.", "عنصر قابل للطي. summary هو العنوان الذي يفتحه."],
  audio: ["A sound the visitor can play.", "صوت يمكن للزائر تشغيله."],
  pre: ["Text that keeps its spaces, often used for code.", "نص يحافظ على مسافاته، وغالبًا للكود."],
  hr: ["A horizontal line that separates topics.", "خط أفقي يفصل بين الموضوعات."],
  label: ["The name of a form field. Connect it with for=\"id\".", "اسم حقل النموذج. اربطه بـ for=\"id\"."],
  span: ["A short run of text inside a line.", "قطعة قصيرة من النص داخل السطر."],
  strong: ["Important text, usually shown bold.", "نص مهم، ويظهر عادة عريضًا."],
  em: ["Emphasised text, usually shown italic.", "نص مؤكَّد، ويظهر عادة مائلًا."],
};

export function passes(step: Step, ctx: MissionCtx) {
  try {
    return step.check(ctx);
  } catch {
    return false;
  }
}

export const SWATCHES = ["#ffffff", "#fafaf9", "#fff7ed", "#f0fdf4", "#eff6ff", "#fdf2f8", "#1c1917", "#292524", "#b91c1c", "#c2410c", "#a16207", "#15803d", "#0f766e", "#1d4ed8", "#9d174d", "#44403c"];

export const GRADIENTS = [
  "linear-gradient(135deg,#0f766e,#164e63)",
  "linear-gradient(135deg,#c2410c,#9d174d)",
  "linear-gradient(160deg,#14532d,#86efac)",
  "linear-gradient(135deg,#7f1d1d,#15803d)",
  "linear-gradient(180deg,#1c1917,#44403c)",
  "linear-gradient(135deg,#fde68a,#fb7185)",
];

export const FONTS: { label: string; family: string; value: string }[] = [
  { label: "System", family: "", value: "system-ui, sans-serif" },
  { label: "Inter", family: "Inter", value: '"Inter", sans-serif' },
  { label: "Poppins", family: "Poppins", value: '"Poppins", sans-serif' },
  { label: "Montserrat", family: "Montserrat", value: '"Montserrat", sans-serif' },
  { label: "Open Sans", family: "Open Sans", value: '"Open Sans", sans-serif' },
  { label: "Lato", family: "Lato", value: '"Lato", sans-serif' },
  { label: "Merriweather", family: "Merriweather", value: '"Merriweather", serif' },
  { label: "Amiri", family: "Amiri", value: '"Amiri", serif' },
  { label: "Tajawal", family: "Tajawal", value: '"Tajawal", sans-serif' },
  { label: "Changa", family: "Changa", value: '"Changa", sans-serif' },
  { label: "IBM Plex Sans Arabic", family: "IBM Plex Sans Arabic", value: '"IBM Plex Sans Arabic", sans-serif' },
];
