import type { Editor } from 'grapesjs';
import { lang } from './i18n';
import * as I from './icons';

type Pair = [string, string];

const CATS: Record<string, Pair> = {
  text: ['Text', 'النصوص'],
  lists: ['Lists', 'القوائم'],
  table: ['Tables', 'الجداول'],
  media: ['Media', 'الوسائط'],
  layout: ['Layout', 'التخطيط'],
  forms: ['Forms', 'النماذج'],
  ready: ['Ready-made parts', 'أجزاء جاهزة'],
  html5: ['HTML5 elements', 'عناصر HTML5'],
};

interface BlockDef {
  id: string;
  label: Pair;
  cat: keyof typeof CATS;
  icon: string;
  content: string | object;
  activate?: boolean;
  select?: boolean;
}

const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

const S = {
  section: `<style>.section{padding:48px 24px;max-width:1100px;margin:0 auto;}</style>`,
  cols: `<style>.row{display:flex;flex-wrap:wrap;gap:24px;}.col{flex:1 1 220px;min-height:80px;padding:16px;border:1px dashed #cbd5e1;border-radius:8px;}</style>`,
  table: `<style>.table{width:100%;border-collapse:collapse;margin:16px 0;}.table th,.table td{border:1px solid #cbd5e1;padding:10px 12px;text-align:start;min-width:60px;height:40px;}.table th{background:#f1f5f9;}</style>`,
  btn: `<style>.btn{display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;}</style>`,
  card: `<style>.card{border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(15,23,42,.06);background:#ffffff;}</style>`,
  form: `<style>.form{display:flex;flex-direction:column;gap:12px;max-width:480px;}.form label{font-weight:600;}.form input,.form textarea,.form select{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;}</style>`,
  nav: `<style>.navbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;background:#0f172a;flex-wrap:wrap;}.navbar .brand{color:#ffffff;font-weight:700;font-size:20px;text-decoration:none;}.navbar ul{display:flex;gap:20px;list-style:none;margin:0;padding:0;}.navbar ul a{color:#cbd5e1;text-decoration:none;}</style>`,
  hero: `<style>.hero{padding:96px 24px;text-align:center;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#ffffff;}.hero h1{font-size:44px;margin:0 0 12px;}.hero p{font-size:20px;margin:0 0 28px;opacity:.9;}</style>`,
  footer: `<style>.footer{padding:32px 24px;background:#0f172a;color:#94a3b8;text-align:center;}</style>`,
  gallery: `<style>.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;}.gallery img{width:100%;height:180px;object-fit:cover;border-radius:8px;}</style>`,
};

const ph = (w: number, h: number, label: string, color = '#c7d2fe') =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(h / 8)}" fill="#3730a3" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`,
  );

export const placeholderImage = (label = 'Image') => ph(800, 500, label);

const BLOCKS: BlockDef[] = [
  { id: 'h1', cat: 'text', label: ['Heading 1', 'عنوان 1'], icon: I.Heading1, content: '<h1>Main heading</h1>' },
  { id: 'h2', cat: 'text', label: ['Heading 2', 'عنوان 2'], icon: I.Heading2, content: '<h2>Section heading</h2>' },
  { id: 'h3', cat: 'text', label: ['Heading 3', 'عنوان 3'], icon: I.Heading3, content: '<h3>Small heading</h3>' },
  { id: 'p', cat: 'text', label: ['Paragraph', 'فقرة'], icon: I.Pilcrow, content: '<p>Write your text here. Double-click to edit it.</p>' },
  { id: 'quote', cat: 'text', label: ['Quote', 'اقتباس'], icon: I.Quote, content: '<blockquote style="border-inline-start:4px solid #4f46e5;margin:16px 0;padding:8px 16px;color:#475569;font-style:italic;">A good quote goes here.</blockquote>' },
  { id: 'link', cat: 'text', label: ['Link', 'رابط'], icon: I.Link, content: '<a href="https://example.com">Click this link</a>' },
  { id: 'button', cat: 'text', label: ['Button', 'زر'], icon: I.RectangleHorizontal, content: `<a class="btn" href="#">Get started</a>${S.btn}` },

  { id: 'ul', cat: 'lists', label: ['Bulleted list', 'قائمة نقطية'], icon: I.List, content: '<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>' },
  { id: 'ol', cat: 'lists', label: ['Numbered list', 'قائمة مرقمة'], icon: I.ListOrdered, content: '<ol><li>Step one</li><li>Step two</li><li>Step three</li></ol>' },
  { id: 'nested', cat: 'lists', label: ['Nested list', 'قائمة متداخلة'], icon: I.ListTree, content: '<ol><li>Fruits<ul><li>Apple</li><li>Orange</li></ul></li><li>Vegetables<ul><li>Carrot</li><li>Tomato</li></ul></li></ol>' },

  { id: 'table', cat: 'table', label: ['Table', 'جدول'], icon: I.Table, content: `<table class="table"><thead><tr><th>Name</th><th>Age</th><th>City</th></tr></thead><tbody><tr><td>Sara</td><td>21</td><td>Muscat</td></tr><tr><td>Ali</td><td>22</td><td>Sohar</td></tr></tbody></table>${S.table}` },

  { id: 'image', cat: 'media', label: ['Image', 'صورة'], icon: I.Image, content: { type: 'image', style: { 'max-width': '100%' } }, activate: true },
  { id: 'video', cat: 'media', label: ['Video', 'فيديو'], icon: I.Video, content: { type: 'video', src: '', style: { width: '100%', height: '360px' } } },
  { id: 'youtube', cat: 'media', label: ['YouTube', 'يوتيوب'], icon: I.SquarePlay, content: { type: 'video', provider: 'yt', videoId: '', style: { width: '100%', height: '360px' } } },
  { id: 'map', cat: 'media', label: ['Map', 'خريطة'], icon: I.Map, content: { type: 'map', style: { width: '100%', height: '320px' } } },
  { id: 'gallery', cat: 'media', label: ['Image gallery', 'معرض صور'], icon: I.Images, content: `<div class="gallery"><img src="${ph(400, 300, '1')}" alt="Photo 1"><img src="${ph(400, 300, '2', '#bae6fd')}" alt="Photo 2"><img src="${ph(400, 300, '3', '#bbf7d0')}" alt="Photo 3"></div>${S.gallery}` },

  { id: 'section', cat: 'layout', label: ['Section', 'قسم'], icon: I.Square, content: `<section class="section"><h2>New section</h2><p>Add content to this section.</p></section>${S.section}` },
  { id: 'cols2', cat: 'layout', label: ['2 columns', 'عمودان'], icon: I.Columns2, content: `<div class="row"><div class="col"></div><div class="col"></div></div>${S.cols}` },
  { id: 'cols3', cat: 'layout', label: ['3 columns', '3 أعمدة'], icon: I.Columns3, content: `<div class="row"><div class="col"></div><div class="col"></div><div class="col"></div></div>${S.cols}` },
  { id: 'cols4', cat: 'layout', label: ['4 columns', '4 أعمدة'], icon: I.Columns4, content: `<div class="row"><div class="col"></div><div class="col"></div><div class="col"></div><div class="col"></div></div>${S.cols}` },
  { id: 'card', cat: 'layout', label: ['Card', 'بطاقة'], icon: I.IdCard, content: `<div class="card"><h3>Card title</h3><p>A short description of this card.</p><a class="btn" href="#">Read more</a></div>${S.card}${S.btn}` },
  { id: 'hr', cat: 'layout', label: ['Divider', 'فاصل'], icon: I.Minus, content: '<hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;">' },
  { id: 'spacer', cat: 'layout', label: ['Spacer', 'مسافة'], icon: I.MoveVertical, content: '<div style="height:48px;"></div>' },

  { id: 'form', cat: 'forms', label: ['Contact form', 'نموذج تواصل'], icon: I.Mail, content: `<form class="form"><label for="name">Name</label><input id="name" type="text" placeholder="Your name"><label for="email">Email</label><input id="email" type="email" placeholder="you@example.com"><label for="msg">Message</label><textarea id="msg" rows="4" placeholder="Write a message"></textarea><button class="btn" type="submit">Send</button></form>${S.form}${S.btn}` },
  { id: 'input', cat: 'forms', label: ['Text input', 'حقل نص'], icon: I.TextCursorInput, content: '<input type="text" placeholder="Type here" style="padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;">' },
  { id: 'textarea', cat: 'forms', label: ['Text area', 'مربع نص'], icon: I.Text, content: '<textarea rows="4" placeholder="Write here" style="padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;width:100%;"></textarea>' },
  { id: 'select', cat: 'forms', label: ['Dropdown', 'قائمة منسدلة'], icon: I.ChevronDown, content: '<select style="padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>' },
  { id: 'checkbox', cat: 'forms', label: ['Checkbox', 'مربع اختيار'], icon: I.SquareCheck, content: '<label><input type="checkbox"> I agree</label>' },
  { id: 'formbtn', cat: 'forms', label: ['Submit button', 'زر إرسال'], icon: I.MousePointerClick, content: `<button class="btn" type="submit">Submit</button>${S.btn}` },

  { id: 'navbar', cat: 'ready', label: ['Navigation bar', 'شريط التنقل'], icon: I.Menu, content: `<nav class="navbar"><a class="brand" href="#">My Site</a><ul><li><a href="#">Home</a></li><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul></nav>${S.nav}` },
  { id: 'hero', cat: 'ready', label: ['Hero banner', 'واجهة رئيسية'], icon: I.PanelTop, content: `<header class="hero"><h1>Welcome to my website</h1><p>A short sentence about what this site is for.</p><a class="btn" href="#" style="background:#ffffff;color:#4f46e5;">Learn more</a></header>${S.hero}${S.btn}` },
  { id: 'features', cat: 'ready', label: ['Three features', 'ثلاث مزايا'], icon: I.LayoutTemplate, content: `<section class="section"><div class="row"><div class="card"><h3>Fast</h3><p>Explain the first idea.</p></div><div class="card"><h3>Simple</h3><p>Explain the second idea.</p></div><div class="card"><h3>Friendly</h3><p>Explain the third idea.</p></div></div></section>${S.section}${S.cols}${S.card}` },
  { id: 'header-el', cat: 'html5', label: ['Header', 'ترويسة'], icon: I.PanelTop, content: '<header style="padding:24px;border-bottom:1px solid #e2e8f0;"><h1>Site name</h1><p>A short tagline.</p></header>' },
  { id: 'main-el', cat: 'html5', label: ['Main', 'المحتوى الرئيسي'], icon: I.Square, content: '<main style="padding:24px;min-height:120px;"><h2>Main content</h2><p>The most important part of the page goes inside &lt;main&gt;.</p></main>' },
  { id: 'article', cat: 'html5', label: ['Article', 'مقالة'], icon: I.Text, content: '<article style="padding:16px 0;"><h2>Article title</h2><p><small>Written by me · 1 Nov 2026</small></p><p>An article is a complete piece of content, like a blog post or news story.</p></article>' },
  { id: 'aside', cat: 'html5', label: ['Aside', 'جانبي'], icon: I.PanelsTopLeft, content: '<aside style="padding:16px;background:#f8fafc;border-inline-start:4px solid #0891b2;border-radius:8px;"><h3>Did you know?</h3><p>An aside holds extra information next to the main content.</p></aside>' },
  { id: 'details', cat: 'html5', label: ['Accordion', 'قائمة قابلة للطي'], icon: I.ChevronDown, content: '<details style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:8px 0;"><summary style="font-weight:600;cursor:pointer;">Click to open</summary><p>Hidden text that appears when the visitor clicks. No JavaScript needed!</p></details>' },
  { id: 'audio', cat: 'html5', label: ['Audio', 'صوت'], icon: I.SquarePlay, content: '<audio controls src="" style="width:100%;"></audio>' },
  { id: 'codeblock', cat: 'html5', label: ['Code sample', 'مثال كود'], icon: I.Code, content: '<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow:auto;"><code>&lt;h1&gt;Hello!&lt;/h1&gt;</code></pre>' },
  { id: 'iframe', cat: 'html5', label: ['Embed page', 'تضمين صفحة'], icon: I.Globe, content: '<iframe src="https://example.com" title="Embedded page" style="width:100%;height:300px;border:1px solid #e2e8f0;border-radius:8px;"></iframe>' },
  { id: 'footer', cat: 'ready', label: ['Footer', 'تذييل'], icon: I.PanelBottom, content: `<footer class="footer"><p>© 2026 My Website. All rights reserved.</p></footer>${S.footer}` },
];

export function registerBlocks(editor: Editor) {
  const bm = editor.Blocks;
  for (const b of BLOCKS) {
    bm.add(b.id, {
      label: `<div class="blk-icon">${b.icon}</div><div class="blk-label">${tx(b.label)}</div>`,
      category: tx(CATS[b.cat]),
      content: b.content as any,
      activate: b.activate,
      select: b.select ?? true,
      attributes: { title: tx(b.label), 'data-block': b.id },
    });
  }
}

/** Shared section styles reused by the starter templates. */
export const STARTER_CSS = S;
export { ph };
