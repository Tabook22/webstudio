import type { Component, Editor } from 'grapesjs';
import type { PageMeta } from './serialize';
import { googleFontsHref } from './fonts';
import { checkPage } from './checker';

type Pair = [string, string];

/** Everything a step check can look at. */
export interface MissionCtx {
  editor: Editor;
  all: Component[];
  html: string;
  css: string;
  js: string;
  meta: PageMeta;
  /** One-off actions the student did: 'run', 'zip', 'preview', 'check'. */
  events: Set<string>;
}

/** Where "Show me" points: an element of the app, after opening its tab or mode. */
export interface Spot {
  sel: string;
  tab?: 'blocks' | 'media' | 'layers';
  mode?: 'visual' | 'split';
  codeTab?: 'css' | 'js' | 'console';
}

export interface Step {
  id: string;
  title: Pair;
  hint: Pair;
  spot?: Spot;
  check: (c: MissionCtx) => boolean;
}

export interface Mission {
  id: string;
  title: Pair;
  topic: Pair;
  level: 1 | 2 | 3;
  badge: { emoji: string; name: Pair; color: string };
  steps: Step[];
}

const tag = (c: Component) => String(c.get('tagName') || '').toLowerCase();
const text = (c: Component) => (c.getEl()?.textContent || '').trim();
const find = (x: MissionCtx, t: string) => x.all.filter((c) => tag(c) === t);
/** CSS rules (other than body/:root) whose declarations contain `prop`. */
const ruleWith = (css: string, prop: RegExp, skipBody = true) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
    ([, sel, body]) => prop.test(body) && !(skipBody && /^\s*(body|:root)\s*$/.test(sel)),
  );
/** Does any CSS rule for this element (#id, any screen size) set a property matching prop? */
const styled = (x: MissionCtx, c: Component, prop: RegExp) => {
  const id = c.getId().replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  return [...x.css.matchAll(new RegExp(`#${id}(?![\\w-])[^{}]*\\{([^{}]*)\\}`, 'g'))].some((m) => prop.test(m[1]));
};
const block = (id: string): Spot => ({ sel: `.gjs-block[data-block="${id}"]`, tab: 'blocks' });

export const MISSIONS: Mission[] = [
  {
    id: 'first-page', level: 1, title: ['My first page', 'صفحتي الأولى'], topic: ['HTML basics', 'أساسيات HTML'],
    badge: { emoji: '🌱', name: ['HTML Starter', 'مبتدئ HTML'], color: '#22c55e' },
    steps: [
      {
        id: 'h1', title: ['Add a main heading <h1>', 'أضف عنوانًا رئيسيًا <h1>'],
        hint: ['Drag “Heading 1” from Blocks onto the page.', 'اسحب “عنوان 1” من العناصر إلى الصفحة.'],
        spot: block('h1'), check: (x) => find(x, 'h1').length > 0,
      },
      {
        id: 'h1-text', title: ['Write your own heading text', 'اكتب نص العنوان بنفسك'],
        hint: ['Double-click the heading and type something about you.', 'انقر نقرًا مزدوجًا على العنوان واكتب شيئًا عنك.'],
        check: (x) => find(x, 'h1').some((c) => text(c).length > 2 && !/^main heading$/i.test(text(c))),
      },
      {
        id: 'p', title: ['Add a paragraph <p>', 'أضف فقرة <p>'],
        hint: ['Drag “Paragraph” under your heading, then change its text.', 'اسحب “فقرة” تحت العنوان، ثم غيّر نصها.'],
        spot: block('p'),
        check: (x) => find(x, 'p').some((c) => text(c).length > 10 && !/^write your text here/i.test(text(c))),
      },
      {
        id: 'bold', title: ['Make some words bold', 'اجعل بعض الكلمات عريضة'],
        hint: ['Select text inside a paragraph and press B (or Ctrl+B).', 'حدد نصًا داخل فقرة واضغط B (أو Ctrl+B).'],
        spot: { sel: '#format .tool[title]' },
        check: (x) => /<(strong|b)[\s>]/.test(x.html) || /font-weight:\s*(bold|[6-9]00)/.test(x.css),
      },
      {
        id: 'title', title: ['Give the page a title', 'اكتب عنوانًا للصفحة'],
        hint: ['Open ⋯ → Page settings and type a title. It appears in the browser tab.', 'افتح ⋯ ← إعدادات الصفحة واكتب عنوانًا. يظهر في تبويب المتصفح.'],
        spot: { sel: '#btn-more' },
        check: (x) => !!x.meta.title.trim() && !/^(my first website|new website|موقعي الأول|موقع جديد)$/i.test(x.meta.title.trim()) && !/^(missions?|المهام|مهمة)/i.test(x.meta.title.trim()),
      },
    ],
  },
  {
    id: 'lists-tables', level: 1, title: ['Lists & tables', 'القوائم والجداول'], topic: ['Organising information', 'تنظيم المعلومات'],
    badge: { emoji: '📋', name: ['Organiser', 'المنظِّم'], color: '#0ea5e9' },
    steps: [
      {
        id: 'ul', title: ['Add a bulleted list <ul>', 'أضف قائمة نقطية <ul>'],
        hint: ['Drag “Bulleted list” from Blocks → Lists.', 'اسحب “قائمة نقطية” من العناصر ← القوائم.'],
        spot: block('ul'), check: (x) => find(x, 'ul').length > 0,
      },
      {
        id: 'li4', title: ['Give a list 4 items or more', 'اجعل في القائمة 4 بنود أو أكثر'],
        hint: ['Click an item, then press “Add item” in the List tools on the right.', 'انقر على بند ثم اضغط “إضافة بند” في أدوات القائمة على اليمين.'],
        check: (x) => [...find(x, 'ul'), ...find(x, 'ol')].some((l) => l.components().filter((c: Component) => tag(c) === 'li').length >= 4),
      },
      {
        id: 'ol', title: ['Add a numbered list <ol>', 'أضف قائمة مرقمة <ol>'],
        hint: ['Drag “Numbered list”, or switch a list to Numbers.', 'اسحب “قائمة مرقمة”، أو حوّل قائمة إلى أرقام.'],
        spot: block('ol'), check: (x) => find(x, 'ol').length > 0,
      },
      {
        id: 'table', title: ['Add a table <table>', 'أضف جدولًا <table>'],
        hint: ['Drag “Table” from Blocks → Tables.', 'اسحب “جدول” من العناصر ← الجداول.'],
        spot: block('table'), check: (x) => find(x, 'table').length > 0,
      },
      {
        id: 'rows', title: ['Make the table 4 rows long', 'اجعل الجدول من 4 صفوف'],
        hint: ['Click a cell, then “Row below”.', 'انقر على خلية ثم “صف أسفل”.'],
        check: (x) => find(x, 'table').some((t) => t.find('tr').length >= 4),
      },
      {
        id: 'th', title: ['Write your own column titles <th>', 'اكتب عناوين الأعمدة <th>'],
        hint: ['Double-click a header cell (the bold top row) and type.', 'انقر نقرًا مزدوجًا على خلية العنوان (الصف العلوي العريض) واكتب.'],
        check: (x) => find(x, 'th').some((c) => text(c) && !/^(name|age|city|day|subject)$/i.test(text(c))),
      },
    ],
  },
  {
    id: 'images-links', level: 1, title: ['Pictures & links', 'الصور والروابط'], topic: ['<img> and <a>', '<img> و <a>'],
    badge: { emoji: '🖼️', name: ['Picture Pro', 'محترف الصور'], color: '#f59e0b' },
    steps: [
      {
        id: 'upload', title: ['Add your own picture to Images', 'أضف صورتك إلى الصور'],
        hint: ['Open the Images tab and drop a picture from your computer.', 'افتح تبويب الصور وأسقط صورة من جهازك.'],
        spot: { sel: '.media-drop', tab: 'media' },
        check: (x) => /<img[^>]+src="images\/(?!image(-\d+)?\.svg|me\.svg)[^"]+"/.test(x.html),
      },
      {
        id: 'alt', title: ['Describe every image with alt text', 'صف كل صورة بنص بديل (alt)'],
        hint: ['Select the image → Settings → Alt. Describe what is in the picture.', 'حدد الصورة ← الإعدادات ← Alt. صف ما في الصورة.'],
        spot: { sel: '#traits' },
        check: (x) => find(x, 'img').length > 0 && find(x, 'img').every((c) => String(c.getAttributes().alt || '').trim().length > 2),
      },
      {
        id: 'link', title: ['Add a link to a real website', 'أضف رابطًا إلى موقع حقيقي'],
        hint: ['Drag “Link”, select it, and set its address in Settings → Href.', 'اسحب “رابط”، حدده، واكتب عنوانه في الإعدادات ← Href.'],
        spot: block('link'),
        check: (x) => find(x, 'a').some((a) => /^https?:\/\/[^/]+\.[a-z]{2,}/i.test(String(a.getAttributes().href || '')) && !/example\.com/.test(String(a.getAttributes().href))),
      },
      {
        id: 'blank', title: ['Make the link open in a new tab', 'اجعل الرابط يفتح في تبويب جديد'],
        hint: ['Select the link → Settings → Target → “New window”.', 'حدد الرابط ← الإعدادات ← Target ← “نافذة جديدة”.'],
        spot: { sel: '#traits' },
        check: (x) => find(x, 'a').some((a) => a.getAttributes().target === '_blank'),
      },
      {
        id: 'bgimg', title: ['Use a picture as a background', 'استخدم صورة كخلفية'],
        hint: ['Drag a picture from Images onto the Background box on the right.', 'اسحب صورة من الصور إلى مربع الخلفية على اليمين.'],
        spot: { sel: '#bg-tools .bg-drop' },
        check: (x) => /background(-image)?:[^;]*url\(/.test(x.css),
      },
    ],
  },
  {
    id: 'style', level: 2, title: ['Colours & style', 'الألوان والتنسيق'], topic: ['CSS basics', 'أساسيات CSS'],
    badge: { emoji: '🎨', name: ['CSS Artist', 'فنان CSS'], color: '#ec4899' },
    steps: [
      {
        id: 'pagebg', title: ['Change the page background', 'غيّر خلفية الصفحة'],
        hint: ['Click an empty part of the page, then choose a colour in Page background.', 'انقر على جزء فارغ من الصفحة، ثم اختر لونًا في خلفية الصفحة.'],
        spot: { sel: '#bg-tools .swatches' },
        check: (x) => /body\s*\{[^}]*background/.test(x.css),
      },
      {
        id: 'color', title: ['Change the colour of a heading', 'غيّر لون عنوان'],
        hint: ['Select a heading and use the text colour (A) button.', 'حدد عنوانًا واستخدم زر لون النص (A).'],
        check: (x) => x.all.some((c) => /^h[1-6]$/.test(tag(c)) && styled(x, c, /(^|[;\s])color:/)) || /h[1-6][^{]*\{[^}]*[^-]color:/.test(x.css),
      },
      {
        id: 'font', title: ['Use a Google font', 'استخدم خطًا من Google'],
        hint: ['Select some text and pick a font marked (Google) in Format → Font.', 'حدد نصًا واختر خطًا عليه (Google) من تنسيق ← الخط.'],
        spot: { sel: '.font-select' },
        check: (x) => !!googleFontsHref(x.css),
      },
      {
        id: 'radius', title: ['Give something rounded corners', 'اجعل زوايا عنصر دائرية'],
        hint: ['Select a box or image → Quick effects → Rounded.', 'حدد صندوقًا أو صورة ← تأثيرات سريعة ← زوايا دائرية.'],
        spot: { sel: '#fx-tools' },
        check: (x) => /border-radius:\s*(?!0[;\s])/.test(x.css),
      },
      {
        id: 'hover', title: ['Add a :hover effect', 'أضف تأثير :hover'],
        hint: ['Select a button or card → Quick effects → Hover: grow.', 'حدد زرًا أو بطاقة ← تأثيرات سريعة ← تمرير: تكبير.'],
        spot: { sel: '#fx-tools' },
        check: (x) => /:hover\s*\{[^}]*\S/.test(x.css),
      },
      {
        id: 'kit', title: ['Try a design kit (CSS variables)', 'جرّب طقم تصميم (متغيرات CSS)'],
        hint: ['Press “Design kits” at the top and choose one.', 'اضغط “أطقم التصميم” في الأعلى واختر واحدًا.'],
        spot: { sel: '#btn-kits' },
        check: (x) => /--color-primary/.test(x.css),
      },
    ],
  },
  {
    id: 'layout', level: 2, title: ['Boxes & layout', 'الصناديق والتخطيط'], topic: ['Box model & flexbox', 'نموذج الصندوق و flexbox'],
    badge: { emoji: '📐', name: ['Layout Builder', 'باني التخطيط'], color: '#8b5cf6' },
    steps: [
      {
        id: 'xray', title: ['Turn on X-ray to see the boxes', 'شغّل الأشعة السينية لرؤية الصناديق'],
        hint: ['Press X-ray at the top. Hover elements to see margin and padding.', 'اضغط الأشعة السينية في الأعلى. مرّر الفأرة لترى الهامش والحشوة.'],
        spot: { sel: '#btn-xray' },
        check: () => document.getElementById('btn-xray')?.getAttribute('aria-pressed') === 'true',
      },
      {
        id: 'section', title: ['Add a <section>', 'أضف قسمًا <section>'],
        hint: ['Drag “Section” from Blocks → Layout.', 'اسحب “قسم” من العناصر ← التخطيط.'],
        spot: block('section'), check: (x) => find(x, 'section').length > 0,
      },
      {
        id: 'columns', title: ['Put boxes side by side (flex or grid)', 'ضع صناديق جنبًا إلى جنب (flex أو grid)'],
        hint: ['Drag “3 columns” and drop something into each column.', 'اسحب “3 أعمدة” وضع شيئًا في كل عمود.'],
        spot: block('cols3'), check: (x) => /display:\s*(flex|grid)/.test(x.css),
      },
      {
        id: 'padding', title: ['Give a box padding (inside space)', 'أعطِ صندوقًا حشوة (مساحة داخلية)'],
        hint: ['Select a box → Quick effects → Padding, and watch the green area in X-ray.', 'حدد صندوقًا ← تأثيرات سريعة ← حشوة، وراقب المنطقة الخضراء في الأشعة.'],
        spot: { sel: '#fx-tools' },
        check: (x) => x.all.some((c) => styled(x, c, /padding/)),
      },
      {
        id: 'margin', title: ['Give a box margin (outside space)', 'أعطِ صندوقًا هامشًا (مساحة خارجية)'],
        hint: ['Style → Size & spacing → Margin. In X-ray margin is orange.', 'التصميم ← الحجم والمسافات ← الهامش. في الأشعة يكون الهامش برتقاليًا.'],
        spot: { sel: '#styles' },
        check: (x) => x.all.some((c) => styled(x, c, /margin/)),
      },
      {
        id: 'phone', title: ['Check your page on a phone', 'افحص صفحتك على الهاتف'],
        hint: ['Press the phone button at the top.', 'اضغط زر الهاتف في الأعلى.'],
        spot: { sel: '#device-switch [data-device="phone"]' },
        check: (x) => x.editor.getDevice() === 'phone',
      },
    ],
  },
  {
    id: 'interactive', level: 3, title: ['Make it interactive', 'اجعلها تفاعلية'], topic: ['JavaScript basics', 'أساسيات JavaScript'],
    badge: { emoji: '⚡', name: ['JS Spark', 'شرارة JS'], color: '#eab308' },
    steps: [
      {
        id: 'button', title: ['Add a button', 'أضف زرًا'],
        hint: ['Drag “Button” from Blocks.', 'اسحب “زر” من العناصر.'],
        spot: block('button'), check: (x) => find(x, 'button').length > 0 || /class="[^"]*\bbtn\b/.test(x.html),
      },
      {
        id: 'log', title: ['Write console.log() in script.js', 'اكتب console.log() في script.js'],
        hint: ['Open Split → script.js and type: console.log("Hello");', 'افتح مقسوم ← script.js واكتب: console.log("Hello");'],
        spot: { sel: '#code-js', mode: 'split', codeTab: 'js' },
        check: (x) => /console\.log\s*\(/.test(x.js),
      },
      {
        id: 'run', title: ['Run your page and read the Console', 'شغّل صفحتك واقرأ وحدة التحكم'],
        hint: ['Press the green Run button above script.js.', 'اضغط زر التشغيل الأخضر فوق script.js.'],
        spot: { sel: '#btn-run', mode: 'split', codeTab: 'js' },
        check: (x) => x.events.has('run') || x.events.has('preview'),
      },
      {
        id: 'click', title: ['React to a click (addEventListener)', 'استجب للنقر (addEventListener)'],
        hint: ['Insert example… → “Message when a button is clicked”.', 'إدراج مثال… ← “رسالة عند النقر على زر”.'],
        spot: { sel: '#js-snippets', mode: 'split', codeTab: 'js' },
        check: (x) => /addEventListener\s*\(\s*['"]click['"]|\.onclick\s*=/.test(x.js),
      },
      {
        id: 'change', title: ['Change the page with JavaScript', 'غيّر الصفحة باستخدام JavaScript'],
        hint: ['Use textContent, style or classList — try “Change the main heading”.', 'استخدم textContent أو style أو classList — جرّب “تغيير العنوان الرئيسي”.'],
        spot: { sel: '#js-snippets', mode: 'split', codeTab: 'js' },
        check: (x) => /\.(textContent|innerText|innerHTML|style\.|classList)/.test(x.js),
      },
    ],
  },
  {
    id: 'publish', level: 3, title: ['Ready to publish', 'جاهز للنشر'], topic: ['Quality & sharing', 'الجودة والمشاركة'],
    badge: { emoji: '🚀', name: ['Web Publisher', 'ناشر الويب'], color: '#6366f1' },
    steps: [
      {
        id: 'content', title: ['Build a page with at least 8 elements', 'ابنِ صفحة من 8 عناصر على الأقل'],
        hint: ['Use a template or keep adding blocks.', 'استخدم قالبًا أو استمر في إضافة العناصر.'],
        check: (x) => x.all.length >= 8,
      },
      {
        id: 'checkpage', title: ['Press “Check page”', 'اضغط “فحص الصفحة”'],
        hint: ['The ✓ button at the top lists things to improve.', 'زر ✓ في الأعلى يعرض النقاط التي تحتاج تحسينًا.'],
        spot: { sel: '#btn-check' },
        check: (x) => x.events.has('check'),
      },
      {
        id: 'clean', title: ['Fix every error and warning', 'أصلح كل الأخطاء والتحذيرات'],
        hint: ['Open Check page and use “Show” to jump to each problem.', 'افتح فحص الصفحة واستخدم “عرض” للانتقال إلى كل مشكلة.'],
        spot: { sel: '#btn-check' },
        check: (x) => x.all.length > 0 && checkPage(x.editor, x.meta.title).every((i) => i.level === 'tip'),
      },
      {
        id: 'preview', title: ['Preview your website', 'عاين موقعك'],
        hint: ['Press the purple Preview button.', 'اضغط زر المعاينة البنفسجي.'],
        spot: { sel: '#btn-preview' },
        check: (x) => x.events.has('preview') || x.events.has('run'),
      },
      {
        id: 'zip', title: ['Download your website as a ZIP', 'نزّل موقعك كملف ZIP'],
        hint: ['Press the download button at the top left.', 'اضغط زر التنزيل في أعلى اليسار.'],
        spot: { sel: '#btn-zip' },
        check: (x) => x.events.has('zip') || x.events.has('folder'),
      },
    ],
  },
];
