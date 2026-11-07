export type Block = {
  id: string;
  cat: "text" | "lists" | "table" | "media" | "layout" | "forms" | "ready" | "html5";
  label: [string, string];
  html: string;
  css?: string;
};

export const CATS: { id: Block["cat"]; label: [string, string] }[] = [
  { id: "text", label: ["Text", "النصوص"] },
  { id: "lists", label: ["Lists", "القوائم"] },
  { id: "table", label: ["Tables", "الجداول"] },
  { id: "media", label: ["Media", "الوسائط"] },
  { id: "layout", label: ["Layout", "التخطيط"] },
  { id: "forms", label: ["Forms", "النماذج"] },
  { id: "ready", label: ["Ready-made", "أجزاء جاهزة"] },
  { id: "html5", label: ["HTML5", "عناصر HTML5"] },
];

const css = (id: string, rules: string) => `/* block:${id} */\n${rules.trim()}\n`;

const ph = (label: string, color = "#c7d2fe") =>
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="42" fill="#3730a3" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  );

export function tableHtml(cols: number, rows: number, header: boolean, arabic = false) {
  const title = (index: number) => (arabic ? `عنوان ${index}` : `Title ${index}`);
  const head = header
    ? `<thead><tr>${Array.from({ length: cols }, (_, i) => `<th>${title(i + 1)}</th>`).join("")}</tr></thead>`
    : "";
  const bodyRows = Array.from({ length: header ? Math.max(1, rows - 1) : rows }, (_, r) => {
    const cells = Array.from({ length: cols }, (_, c) => `<td>${r + 1}.${c + 1}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<table class="table">${head}<tbody>${bodyRows}</tbody></table>`;
}

export const BLOCKS: Block[] = [
  { id: "h1", cat: "text", label: ["Heading 1", "عنوان 1"], html: "<h1>Main heading</h1>" },
  { id: "h2", cat: "text", label: ["Heading 2", "عنوان 2"], html: "<h2>Section heading</h2>" },
  { id: "h3", cat: "text", label: ["Heading 3", "عنوان 3"], html: "<h3>Small heading</h3>" },
  { id: "h4", cat: "text", label: ["Heading 4", "عنوان 4"], html: "<h4>Smaller heading</h4>" },
  { id: "h5", cat: "text", label: ["Heading 5", "عنوان 5"], html: "<h5>Minor heading</h5>" },
  { id: "h6", cat: "text", label: ["Heading 6", "عنوان 6"], html: "<h6>Smallest heading</h6>" },
  { id: "p", cat: "text", label: ["Paragraph", "فقرة"], html: "<p>Write your text here. Double-click to edit it.</p>" },
  { id: "quote", cat: "text", label: ["Quote", "اقتباس"], html: '<blockquote class="quote">A good quote goes here.</blockquote>', css: css("quote", ".quote { border-inline-start: 4px solid #0f766e; margin: 16px 0; padding: 8px 16px; color: #57534e; }") },
  { id: "hr", cat: "text", label: ["Horizontal line", "خط أفقي"], html: '<hr class="rule">', css: css("hr", ".rule { border: 0; border-top: 2px solid #d6d3d1; margin: 32px 0; }") },
  { id: "link", cat: "text", label: ["Link", "رابط"], html: '<a href="https://example.com">Click this link</a>' },
  { id: "button", cat: "text", label: ["Button", "زر"], html: '<a class="btn" href="#">Get started</a>', css: css("btn", ".btn { display: inline-block; padding: 12px 24px; background: #0f766e; color: #ffffff; border-radius: 999px; text-decoration: none; font-weight: 700; }") },
  { id: "ul", cat: "lists", label: ["Bulleted list", "قائمة نقطية"], html: "<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>" },
  { id: "ol", cat: "lists", label: ["Numbered list", "قائمة مرقمة"], html: "<ol><li>Step one</li><li>Step two</li><li>Step three</li></ol>" },
  { id: "nested", cat: "lists", label: ["Nested list", "قائمة متداخلة"], html: "<ol><li>Fruits<ul><li>Apple</li><li>Orange</li></ul></li><li>Vegetables<ul><li>Carrot</li><li>Tomato</li></ul></li></ol>" },
  { id: "table", cat: "table", label: ["Table", "جدول"], html: tableHtml(3, 3, true), css: css("table", ".table { width: 100%; border-collapse: collapse; margin: 16px 0; }\n.table th, .table td { border: 1px solid #d6d3d1; padding: 10px 12px; text-align: start; }\n.table th { background: #f5f5f4; }") },
  { id: "image", cat: "media", label: ["Image", "صورة"], html: `<img src="${ph("Image")}" alt="" style="max-width:100%">` },
  { id: "video", cat: "media", label: ["Video", "فيديو"], html: '<video class="media" controls title="Video"></video>', css: css("media", ".media, .embed { width: 100%; min-height: 240px; border: 0; border-radius: 12px; background: #1c1917; }") },
  { id: "youtube", cat: "media", label: ["YouTube", "يوتيوب"], html: '<iframe class="embed" src="https://www.youtube.com/embed/ScMzIvxBSi4" title="YouTube video" allowfullscreen></iframe>', css: css("media", ".media, .embed { width: 100%; min-height: 240px; border: 0; border-radius: 12px; background: #1c1917; }") },
  { id: "map", cat: "media", label: ["Map", "خريطة"], html: '<iframe class="embed" src="https://maps.google.com/maps?q=Muscat&z=12&output=embed" title="Map of Muscat"></iframe>', css: css("media", ".media, .embed { width: 100%; min-height: 240px; border: 0; border-radius: 12px; background: #1c1917; }") },
  { id: "gallery", cat: "media", label: ["Gallery", "معرض صور"], html: `<div class="gallery"><img src="${ph("1")}" alt="Photo 1"><img src="${ph("2", "#bae6fd")}" alt="Photo 2"><img src="${ph("3", "#bbf7d0")}" alt="Photo 3"></div>`, css: css("gallery", ".gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }\n.gallery img { width: 100%; height: 160px; object-fit: cover; border-radius: 12px; }") },
  { id: "section", cat: "layout", label: ["Section", "قسم"], html: '<section class="section"><h2>New section</h2><p>Add content to this section.</p></section>', css: css("section", ".section { padding: 48px 24px; max-width: 1100px; margin: 0 auto; }") },
  { id: "cols2", cat: "layout", label: ["2 columns", "عمودان"], html: '<div class="row"><div class="col"><p>Column one</p></div><div class="col"><p>Column two</p></div></div>', css: css("cols", ".row { display: flex; flex-wrap: wrap; gap: 16px; }\n.col { flex: 1 1 220px; min-height: 72px; padding: 16px; border: 1px dashed #d6d3d1; border-radius: 12px; }") },
  { id: "cols3", cat: "layout", label: ["3 columns", "3 أعمدة"], html: '<div class="row"><div class="col"><p>One</p></div><div class="col"><p>Two</p></div><div class="col"><p>Three</p></div></div>', css: css("cols", ".row { display: flex; flex-wrap: wrap; gap: 16px; }\n.col { flex: 1 1 180px; min-height: 72px; padding: 16px; border: 1px dashed #d6d3d1; border-radius: 12px; }") },
  { id: "cols4", cat: "layout", label: ["4 columns", "4 أعمدة"], html: '<div class="row"><div class="col"></div><div class="col"></div><div class="col"></div><div class="col"></div></div>', css: css("cols", ".row { display: flex; flex-wrap: wrap; gap: 16px; }\n.col { flex: 1 1 140px; min-height: 72px; padding: 16px; border: 1px dashed #d6d3d1; border-radius: 12px; }") },
  { id: "card", cat: "layout", label: ["Card", "بطاقة"], html: '<div class="card"><h3>Card title</h3><p>A short description of this card.</p><a class="btn" href="#">Read more</a></div>', css: css("card", ".card { border: 1px solid #e7e5e4; border-radius: 16px; padding: 24px; background: #fff; box-shadow: 0 8px 24px rgba(28, 25, 23, 0.06); }") },
  { id: "spacer", cat: "layout", label: ["Spacer", "مسافة"], html: '<div style="height:48px"></div>' },
  { id: "form", cat: "forms", label: ["Contact form", "نموذج تواصل"], html: '<form class="form"><label for="name">Name</label><input id="name" type="text" placeholder="Your name"><label for="email">Email</label><input id="email" type="email" placeholder="you@example.com"><label for="msg">Message</label><textarea id="msg" rows="4" placeholder="Write a message"></textarea><button class="btn" type="submit">Send</button></form>', css: css("form", ".form { display: flex; flex-direction: column; gap: 10px; max-width: 460px; }\n.form label { font-weight: 700; }\n.form input, .form textarea, .form select { padding: 10px 12px; border: 1px solid #d6d3d1; border-radius: 10px; font: inherit; }") },
  { id: "input", cat: "forms", label: ["Text input", "حقل نص"], html: '<input type="text" placeholder="Type here" style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px">' },
  { id: "textarea", cat: "forms", label: ["Text area", "مربع نص"], html: '<textarea rows="4" placeholder="Write here" style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px;width:100%"></textarea>' },
  { id: "select", cat: "forms", label: ["Dropdown", "قائمة منسدلة"], html: '<select style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>' },
  { id: "checkbox", cat: "forms", label: ["Checkbox", "مربع اختيار"], html: "<label><input type=\"checkbox\"> I agree</label>" },
  { id: "navbar", cat: "ready", label: ["Navigation", "شريط التنقل"], html: '<nav class="navbar"><a class="brand" href="#">My Site</a><ul><li><a href="#">Home</a></li><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul></nav>', css: css("nav", ".navbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; background: #1c1917; }\n.navbar .brand { color: #fff; font-weight: 800; text-decoration: none; }\n.navbar ul { display: flex; gap: 18px; list-style: none; margin: 0; padding: 0; }\n.navbar a { color: #e7e5e4; text-decoration: none; }") },
  { id: "hero", cat: "ready", label: ["Hero", "واجهة رئيسية"], html: '<header class="hero"><h1>Welcome to my website</h1><p>A short sentence about what this site is for.</p><a class="btn" href="#">Learn more</a></header>', css: css("hero", ".hero { padding: 88px 24px; text-align: center; background: linear-gradient(135deg, #0f766e, #164e63); color: #fff; }\n.hero h1 { font-size: 46px; margin: 0 0 12px; color: #fff; }\n.hero p { font-size: 18px; opacity: .92; }") },
  { id: "features", cat: "ready", label: ["Three features", "ثلاث مزايا"], html: '<section class="section"><div class="row"><div class="card"><h3>Fast</h3><p>Explain the first idea.</p></div><div class="card"><h3>Simple</h3><p>Explain the second idea.</p></div><div class="card"><h3>Friendly</h3><p>Explain the third idea.</p></div></div></section>' },
  { id: "footer", cat: "ready", label: ["Footer", "تذييل"], html: '<footer class="footer"><p>© 2026 My Website</p></footer>', css: css("footer", ".footer { padding: 28px 24px; background: #1c1917; color: #d6d3d1; text-align: center; }") },
  { id: "header-el", cat: "html5", label: ["Header", "ترويسة"], html: "<header><h1>Site name</h1><p>A short tagline.</p></header>" },
  { id: "main-el", cat: "html5", label: ["Main", "المحتوى الرئيسي"], html: "<main><h2>Main content</h2><p>The most important part of the page goes inside main.</p></main>" },
  { id: "article", cat: "html5", label: ["Article", "مقالة"], html: "<article><h2>Article title</h2><p><small>Written by me · 1 Nov 2026</small></p><p>An article is a complete piece of content, like a blog post.</p></article>" },
  { id: "aside", cat: "html5", label: ["Aside", "جانبي"], html: '<aside class="note"><h3>Did you know?</h3><p>An aside holds extra information beside the main content.</p></aside>', css: css("aside", ".note { padding: 16px; background: #fafaf9; border-inline-start: 4px solid #0f766e; border-radius: 12px; }") },
  { id: "details", cat: "html5", label: ["Accordion", "قائمة قابلة للطي"], html: "<details class=\"fold\"><summary>Click to open</summary><p>Hidden text that appears when the visitor clicks. No JavaScript needed.</p></details>", css: css("details", ".fold { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px 16px; }\n.fold summary { font-weight: 700; cursor: pointer; }") },
  { id: "audio", cat: "html5", label: ["Audio", "صوت"], html: '<audio controls style="width:100%"></audio>' },
  { id: "codeblock", cat: "html5", label: ["Code sample", "مثال كود"], html: "<pre><code>&lt;h1&gt;Hello!&lt;/h1&gt;</code></pre>", css: css("code", "pre { background: #1c1917; color: #f5f5f4; padding: 16px; border-radius: 12px; overflow: auto; }") },
  { id: "iframe", cat: "html5", label: ["Embed page", "تضمين صفحة"], html: '<iframe class="embed" src="https://example.com" title="Embedded page"></iframe>' },
];

const AR_HTML: Record<string, string> = {
  h1: "<h1>عنوان رئيسي</h1>",
  h2: "<h2>عنوان القسم</h2>",
  h3: "<h3>عنوان صغير</h3>",
  h4: "<h4>عنوان أصغر</h4>",
  h5: "<h5>عنوان فرعي</h5>",
  h6: "<h6>أصغر عنوان</h6>",
  p: "<p>اكتب نصك هنا. انقر مرتين لتعديله.</p>",
  quote: '<blockquote class="quote">اكتب اقتباسًا جميلًا هنا.</blockquote>',
  link: '<a href="https://example.com">انقر هذا الرابط</a>',
  button: '<a class="btn" href="#">ابدأ الآن</a>',
  ul: "<ul><li>البند الأول</li><li>البند الثاني</li><li>البند الثالث</li></ul>",
  ol: "<ol><li>الخطوة الأولى</li><li>الخطوة الثانية</li><li>الخطوة الثالثة</li></ol>",
  nested: "<ol><li>فواكه<ul><li>تفاح</li><li>برتقال</li></ul></li><li>خضار<ul><li>جزر</li><li>طماطم</li></ul></li></ol>",
  image: `<img src="${ph("صورة")}" alt="" style="max-width:100%">`,
  video: '<video class="media" controls title="فيديو"></video>',
  youtube: '<iframe class="embed" src="https://www.youtube.com/embed/ScMzIvxBSi4" title="فيديو يوتيوب" allowfullscreen></iframe>',
  map: '<iframe class="embed" src="https://maps.google.com/maps?q=Muscat&z=12&output=embed" title="خريطة مسقط"></iframe>',
  gallery: `<div class="gallery"><img src="${ph("١")}" alt="صورة 1"><img src="${ph("٢", "#bae6fd")}" alt="صورة 2"><img src="${ph("٣", "#bbf7d0")}" alt="صورة 3"></div>`,
  section: '<section class="section"><h2>قسم جديد</h2><p>أضف محتوى إلى هذا القسم.</p></section>',
  cols2: '<div class="row"><div class="col"><p>العمود الأول</p></div><div class="col"><p>العمود الثاني</p></div></div>',
  cols3: '<div class="row"><div class="col"><p>واحد</p></div><div class="col"><p>اثنان</p></div><div class="col"><p>ثلاثة</p></div></div>',
  card: '<div class="card"><h3>عنوان البطاقة</h3><p>وصف قصير لهذه البطاقة.</p><a class="btn" href="#">اقرأ المزيد</a></div>',
  form: '<form class="form"><label for="name">الاسم</label><input id="name" type="text" placeholder="اسمك"><label for="email">البريد</label><input id="email" type="email" placeholder="you@example.com"><label for="msg">الرسالة</label><textarea id="msg" rows="4" placeholder="اكتب رسالة"></textarea><button class="btn" type="submit">إرسال</button></form>',
  input: '<input type="text" placeholder="اكتب هنا" style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px">',
  textarea: '<textarea rows="4" placeholder="اكتب هنا" style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px;width:100%"></textarea>',
  select: '<select style="padding:10px 12px;border:1px solid #d6d3d1;border-radius:10px"><option>الخيار 1</option><option>الخيار 2</option><option>الخيار 3</option></select>',
  checkbox: '<label><input type="checkbox"> أوافق</label>',
  navbar: '<nav class="navbar"><a class="brand" href="#">موقعي</a><ul><li><a href="#">الرئيسية</a></li><li><a href="#">من نحن</a></li><li><a href="#">تواصل</a></li></ul></nav>',
  hero: '<header class="hero"><h1>مرحبًا بكم في موقعي</h1><p>جملة قصيرة عن هذا الموقع.</p><a class="btn" href="#">اعرف المزيد</a></header>',
  features: '<section class="section"><div class="row"><div class="card"><h3>سريع</h3><p>اشرح الفكرة الأولى.</p></div><div class="card"><h3>بسيط</h3><p>اشرح الفكرة الثانية.</p></div><div class="card"><h3>ودود</h3><p>اشرح الفكرة الثالثة.</p></div></div></section>',
  footer: '<footer class="footer"><p>© 2026 موقعي</p></footer>',
  "header-el": "<header><h1>اسم الموقع</h1><p>شعار قصير.</p></header>",
  "main-el": "<main><h2>المحتوى الرئيسي</h2><p>أهم جزء في الصفحة يوضع داخل main.</p></main>",
  article: "<article><h2>عنوان المقالة</h2><p><small>كتبته أنا · 1 نوفمبر 2026</small></p><p>المقالة قطعة مكتملة من المحتوى، مثل تدوينة.</p></article>",
  aside: '<aside class="note"><h3>هل تعلم؟</h3><p>الجانب يحمل معلومة إضافية بجانب المحتوى الرئيسي.</p></aside>',
  details: '<details class="fold"><summary>انقر للفتح</summary><p>نص مخفي يظهر عندما ينقر الزائر. لا حاجة إلى جافاسكربت.</p></details>',
  codeblock: "<pre><code>&lt;h1&gt;مرحبًا!&lt;/h1&gt;</code></pre>",
  iframe: '<iframe class="embed" src="https://example.com" title="صفحة مضمّنة"></iframe>',
};

export function blockById(id: string) {
  return BLOCKS.find((block) => block.id === id);
}

export function blockMarkup(id: string, arabic: boolean) {
  const block = blockById(id);
  if (!block) return "";
  if (id === "table") return tableHtml(3, 3, true, arabic);
  return arabic && AR_HTML[id] ? AR_HTML[id] : block.html;
}

export const SNIPPETS: { label: [string, string]; code: string; codeAr?: string }[] = [
  {
    label: ["Say hello in the console", "رسالة في وحدة التحكم"],
    code: `// console.log() writes a message you can read in the Console tab
console.log("Hello from script.js!");
`,
    codeAr: `// console.log() يكتب رسالة تقرأها في وحدة التحكم
console.log("مرحبًا من script.js!");
`,
  },
  {
    label: ["Message when a button is clicked", "رسالة عند النقر على زر"],
    code: `document.querySelectorAll("button, .btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    alert("You clicked: " + button.textContent.trim());
  });
});
`,
    codeAr: `document.querySelectorAll("button, .btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    alert("نقرت على: " + button.textContent.trim());
  });
});
`,
  },
  {
    label: ["Change the main heading", "تغيير العنوان الرئيسي"],
    code: `const heading = document.querySelector("h1");
if (heading) {
  heading.textContent = "Changed by JavaScript!";
  heading.style.color = "#0f766e";
}
`,
    codeAr: `const heading = document.querySelector("h1");
if (heading) {
  heading.textContent = "تغيّر بواسطة جافاسكربت!";
  heading.style.color = "#0f766e";
}
`,
  },
  {
    label: ["Dark mode button", "زر الوضع الليلي"],
    code: `const toggle = document.createElement("button");
toggle.textContent = "Dark mode";
toggle.style.cssText = "position:fixed;bottom:16px;inset-inline-end:16px;padding:10px 16px;border-radius:999px;border:0;cursor:pointer;";
document.body.appendChild(toggle);
toggle.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  document.body.style.background = dark ? "#1c1917" : "";
  document.body.style.color = dark ? "#f5f5f4" : "";
  toggle.textContent = dark ? "Light mode" : "Dark mode";
});
`,
    codeAr: `const toggle = document.createElement("button");
toggle.textContent = "الوضع الليلي";
toggle.style.cssText = "position:fixed;bottom:16px;inset-inline-end:16px;padding:10px 16px;border-radius:999px;border:0;cursor:pointer;";
document.body.appendChild(toggle);
toggle.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  document.body.style.background = dark ? "#1c1917" : "";
  document.body.style.color = dark ? "#f5f5f4" : "";
  toggle.textContent = dark ? "الوضع الفاتح" : "الوضع الليلي";
});
`,
  },
  {
    label: ["Show / hide on click", "إظهار / إخفاء عند النقر"],
    code: `document.querySelectorAll("h2").forEach((title) => {
  title.style.cursor = "pointer";
  title.addEventListener("click", () => {
    const next = title.nextElementSibling;
    if (next) next.hidden = !next.hidden;
  });
});
`,
  },
  {
    label: ["Show today's date", "عرض تاريخ اليوم"],
    code: `const today = document.createElement("p");
today.textContent = "Today is " + new Date().toLocaleDateString();
today.style.textAlign = "center";
document.body.appendChild(today);
`,
    codeAr: `const today = document.createElement("p");
today.textContent = "اليوم هو " + new Date().toLocaleDateString("ar");
today.style.textAlign = "center";
document.body.appendChild(today);
`,
  },
  {
    label: ["Check a form before sending", "التحقق من النموذج قبل الإرسال"],
    code: `const form = document.querySelector("form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = [...form.querySelectorAll("input, textarea")].find((field) => !field.value.trim());
    if (empty) {
      empty.style.borderColor = "#b42318";
      alert("Please fill in every field.");
    } else {
      alert("Thank you!");
      form.reset();
    }
  });
}
`,
    codeAr: `const form = document.querySelector("form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const empty = [...form.querySelectorAll("input, textarea")].find((field) => !field.value.trim());
    if (empty) {
      empty.style.borderColor = "#b42318";
      alert("يرجى تعبئة كل الحقول.");
    } else {
      alert("شكرًا لك!");
      form.reset();
    }
  });
}
`,
  },
  {
    label: ["Counter", "عدّاد"],
    code: `let count = 0;
const counter = document.createElement("button");
counter.textContent = "Clicked 0 times";
counter.style.cssText = "padding:12px 20px;font-size:18px;border-radius:12px;margin:16px;";
document.body.appendChild(counter);
counter.addEventListener("click", () => {
  count = count + 1;
  counter.textContent = "Clicked " + count + " times";
  console.log("count is now", count);
});
`,
    codeAr: `let count = 0;
const counter = document.createElement("button");
counter.textContent = "نُقر 0 مرة";
counter.style.cssText = "padding:12px 20px;font-size:18px;border-radius:12px;margin:16px;";
document.body.appendChild(counter);
counter.addEventListener("click", () => {
  count = count + 1;
  counter.textContent = "نُقر " + count + " مرة";
  console.log("العدد الآن", count);
});
`,
  },
];
