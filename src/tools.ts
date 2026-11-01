import type { Component, Editor } from 'grapesjs';
import { lang, t, type Key } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { askText, h } from './ui';
import { FONT_OPTIONS } from './fonts';
import { tableCards } from './table';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

/** Plain-language notes shown for the selected element (teaching aid). */
const TAG_INFO: Record<string, Pair> = {
  h1: ['Main heading — use one per page for its title.', 'العنوان الرئيسي — استخدم واحدًا فقط لعنوان الصفحة.'],
  h2: ['Section heading — starts a new part of the page.', 'عنوان قسم — يبدأ جزءًا جديدًا من الصفحة.'],
  h3: ['Smaller heading inside a section.', 'عنوان أصغر داخل القسم.'],
  h4: ['Heading level 4 — a sub-part of an <h3> section.', 'عنوان من المستوى 4 — جزء فرعي داخل قسم <h3>.'],
  h5: ['Heading level 5 — a small heading inside an <h4> part.', 'عنوان من المستوى 5 — عنوان صغير داخل جزء <h4>.'],
  h6: ['Heading level 6 — the smallest heading. Headings go h1 → h6 in order.', 'عنوان من المستوى 6 — أصغر عنوان. تتدرج العناوين من h1 إلى h6 بالترتيب.'],
  p: ['Paragraph — a block of normal text.', 'فقرة — كتلة من النص العادي.'],
  a: ['Link — takes the visitor to another page or website (href).', 'رابط — ينقل الزائر إلى صفحة أو موقع آخر (href).'],
  img: ['Image — shows a picture from a file (src). Always add alt text.', 'صورة — تعرض صورة من ملف (src). أضف دائمًا نصًا بديلًا (alt).'],
  ul: ['Bulleted (unordered) list — items with dots.', 'قائمة نقطية (غير مرتبة) — بنود بنقاط.'],
  ol: ['Numbered (ordered) list — items with numbers.', 'قائمة مرقمة (مرتبة) — بنود بأرقام.'],
  li: ['List item — one entry inside a list.', 'بند قائمة — عنصر واحد داخل القائمة.'],
  table: ['Table — rows and columns of data.', 'جدول — صفوف وأعمدة من البيانات.'],
  thead: ['Table head — the title row(s).', 'رأس الجدول — صف العناوين.'],
  tbody: ['Table body — the data rows.', 'جسم الجدول — صفوف البيانات.'],
  tr: ['Table row.', 'صف في الجدول.'],
  th: ['Header cell — a column title (bold).', 'خلية عنوان — عنوان العمود (عريض).'],
  td: ['Data cell — one box in the table.', 'خلية بيانات — مربع واحد في الجدول.'],
  div: ['Division — a box that groups other elements.', 'حاوية (div) — صندوق يجمع عناصر أخرى.'],
  section: ['Section — a themed part of the page.', 'قسم — جزء من الصفحة له موضوع واحد.'],
  header: ['Header — the top/intro area.', 'الترويسة — منطقة البداية أعلى الصفحة.'],
  footer: ['Footer — the bottom area of the page.', 'التذييل — المنطقة السفلية من الصفحة.'],
  nav: ['Navigation — the menu of links.', 'التنقل — قائمة الروابط.'],
  blockquote: ['Quote — text quoted from someone.', 'اقتباس — نص منقول عن شخص.'],
  strong: ['Bold — important text.', 'عريض — نص مهم.'],
  b: ['Bold text.', 'نص عريض.'],
  em: ['Emphasis (italic).', 'تأكيد (مائل).'],
  i: ['Italic text.', 'نص مائل.'],
  u: ['Underlined text.', 'نص مسطر.'],
  span: ['Span — a piece of text you can style.', 'نطاق (span) — جزء من النص يمكن تنسيقه.'],
  form: ['Form — collects information from visitors.', 'نموذج — يجمع المعلومات من الزوار.'],
  input: ['Input — a box where visitors type.', 'حقل إدخال — مربع يكتب فيه الزائر.'],
  textarea: ['Text area — a large typing box.', 'مربع نص — مساحة كتابة كبيرة.'],
  select: ['Dropdown — choose one option.', 'قائمة منسدلة — اختر خيارًا واحدًا.'],
  button: ['Button — something to click.', 'زر — شيء يُنقر عليه.'],
  label: ['Label — the name of a form field.', 'تسمية — اسم حقل النموذج.'],
  hr: ['Horizontal line — separates parts of the page. It has no closing tag.', 'خط أفقي — يفصل بين أجزاء الصفحة. ليس له وسم إغلاق.'],
  iframe: ['Frame — shows another page inside this one (map, video).', 'إطار — يعرض صفحة أخرى داخل هذه الصفحة (خريطة، فيديو).'],
  video: ['Video player.', 'مشغل فيديو.'],
  body: ['Body — everything visible on the page.', 'الجسم — كل ما يظهر في الصفحة.'],
};

const TEXT_TYPES = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const tagOf = (c: Component) => String(c.get('tagName') || '').toLowerCase();

function closest(c: Component | undefined, tags: string[]): Component | undefined {
  for (let x: Component | undefined = c; x; x = x.parent()) if (tags.includes(tagOf(x))) return x;
  return undefined;
}

function btn(key: Key, svg: string, onClick: () => void, extra: Record<string, any> = {}) {
  return h('button', {
    type: 'button', class: 'tool', title: t(key), 'aria-label': t(key), html: icon(svg, 17),
    onmousedown: (e: Event) => e.preventDefault(), // keep the text selection inside the canvas
    onclick: onClick, ...extra,
  });
}

function textBtn(key: Key, svg: string, onClick: () => void) {
  return h('button', {
    type: 'button', class: 'tool wide',
    onmousedown: (e: Event) => e.preventDefault(), onclick: onClick,
    html: `${icon(svg, 16)}<span>${t(key)}</span>`,
  });
}

export function setupTools(editor: Editor) {
  const formatBox = document.getElementById('format')!;
  const contextBox = document.getElementById('context-tools')!;
  const infoBox = document.getElementById('element-info')!;
  const emptyBox = document.getElementById('nothing-selected')!;

  const doc = () => editor.Canvas.getDocument()!;
  const editing = () => !!editor.getEditing();
  const sel = () => editor.getSelected();

  /* ---- formatting: inside text while typing, otherwise the whole element ---- */
  const toggleStyle = (prop: string, on: string, off = '') => {
    const c = sel();
    if (!c) return;
    const cur = (c.getStyle() as Record<string, string>)[prop];
    if (cur === on) {
      if (off) c.addStyle({ [prop]: off });
      else c.removeStyle(prop);
    } else c.addStyle({ [prop]: on });
    updateState();
  };
  const fmt = (cmd: string, prop: string, on: string) => () => {
    if (editing()) doc().execCommand(cmd);
    else toggleStyle(prop, on);
  };
  const align = (value: string, cmd: string) => () => {
    if (editing()) doc().execCommand(cmd);
    else toggleStyle('text-align', value);
  };

  const colorInput = (key: Key, apply: (v: string) => void) => {
    const input = h('input', { type: 'color', value: '#1e293b', title: t(key), 'aria-label': t(key) });
    let saved: Range | null = null;
    input.addEventListener('pointerdown', () => {
      const s = doc().getSelection();
      saved = editing() && s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
    });
    input.addEventListener('input', () => {
      if (saved) {
        const s = doc().getSelection()!;
        s.removeAllRanges();
        s.addRange(saved);
      }
      apply(input.value);
    });
    return h('label', { class: 'tool color', title: t(key) }, h('span', { class: 'swatch-label' }, key === 'textColor' ? 'A' : '▧'), input);
  };

  const sizeSelect = h('select', { class: 'size-select', title: t('fontSize'), 'aria-label': t('fontSize') },
    h('option', { value: '' }, t('fontSize')),
    ...['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '64px'].map((s) => h('option', { value: s }, s)),
  );
  sizeSelect.addEventListener('change', () => {
    const c = sel();
    if (c && sizeSelect.value) c.addStyle({ 'font-size': sizeSelect.value });
  });

  const fontSelect = h('select', { class: 'size-select font-select', title: t('font'), 'aria-label': t('font') },
    h('option', { value: '' }, t('font')),
    ...FONT_OPTIONS.map(([label, value]) => h('option', { value, style: `font-family:${value}` }, label)),
  );
  fontSelect.addEventListener('change', () => {
    const c = sel();
    if (c && fontSelect.value) c.addStyle({ 'font-family': fontSelect.value });
    updateState();
  });

  /* Paragraph ↔ Heading 1–6, keeping the text, classes and styles. */
  const textTypeSelect = h('select', { class: 'size-select text-type', title: t('textType'), 'aria-label': t('textType') },
    h('option', { value: '' }, t('textType')),
    h('option', { value: 'p' }, tx(['Paragraph', 'فقرة'])),
    ...[1, 2, 3, 4, 5, 6].map((n) => h('option', { value: `h${n}` }, `${tx(['Heading', 'عنوان'])} ${n}`)),
  );
  textTypeSelect.addEventListener('change', () => {
    const c = sel();
    const to = textTypeSelect.value;
    if (!c || !to || !TEXT_TYPES.includes(tagOf(c)) || tagOf(c) === to) return;
    const attributes: Record<string, string> = { ...((c.get('attributes') as Record<string, string>) ?? {}) };
    // Keep the element's own CSS (#id rules) by keeping its id.
    if (editor.Css.getRules(`#${c.getId()}`).some((r) => Object.keys(r.getStyle()).length)) attributes.id = c.getId();
    const [added] = c.replaceWith({ type: 'text', tagName: to, attributes, classes: c.getClasses(), components: c.getInnerHTML() });
    if (added) editor.select(added);
  });

  const insertLink = async () => {
    const d = doc();
    const s = d.getSelection();
    const range = editing() && s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
    const c = sel();
    const current = c && tagOf(c) === 'a' ? String(c.getAttributes().href || '') : 'https://';
    const url = await askText(t('link'), t('linkUrl'), current);
    if (!url) return;
    if (range) {
      editor.getEditing()?.getEl()?.focus();
      const s2 = d.getSelection()!;
      s2.removeAllRanges();
      s2.addRange(range);
      d.execCommand('createLink', false, url);
    } else if (c && tagOf(c) === 'a') {
      c.addAttributes({ href: url });
    }
  };

  const formatButtons = {
    bold: btn('bold', I.Bold, fmt('bold', 'font-weight', 'bold')),
    italic: btn('italic', I.Italic, fmt('italic', 'font-style', 'italic')),
    underline: btn('underline', I.Underline, fmt('underline', 'text-decoration', 'underline')),
    strike: btn('strike', I.Strikethrough, fmt('strikeThrough', 'text-decoration', 'line-through')),
    left: btn('alignLeft', I.AlignLeft, align('left', 'justifyLeft')),
    center: btn('alignCenter', I.AlignCenter, align('center', 'justifyCenter')),
    right: btn('alignRight', I.AlignRight, align('right', 'justifyRight')),
    justify: btn('justify', I.AlignJustify, align('justify', 'justifyFull')),
  };
  formatBox.append(
    h('div', { class: 'tool-row' }, formatButtons.bold, formatButtons.italic, formatButtons.underline, formatButtons.strike,
      h('span', { class: 'sep' }),
      formatButtons.left, formatButtons.center, formatButtons.right, formatButtons.justify),
    h('div', { class: 'tool-row' },
      colorInput('textColor', (v) => (editing() ? doc().execCommand('foreColor', false, v) : sel()?.addStyle({ color: v }))),
      colorInput('bgColor', (v) => (editing() ? doc().execCommand('hiliteColor', false, v) : sel()?.addStyle({ 'background-color': v }))),
      sizeSelect,
      btn('link', I.Link, insertLink),
    ),
    h('div', { class: 'tool-row' }, textTypeSelect, fontSelect),
  );

  function updateState() {
    const c = sel();
    const st = (c?.getStyle() ?? {}) as Record<string, string>;
    const set = (b: HTMLElement, on: boolean) => b.classList.toggle('on', on);
    set(formatButtons.bold, st['font-weight'] === 'bold' || st['font-weight'] === '700');
    set(formatButtons.italic, st['font-style'] === 'italic');
    set(formatButtons.underline, st['text-decoration'] === 'underline');
    set(formatButtons.strike, st['text-decoration'] === 'line-through');
    set(formatButtons.left, st['text-align'] === 'left');
    set(formatButtons.center, st['text-align'] === 'center');
    set(formatButtons.right, st['text-align'] === 'right');
    set(formatButtons.justify, st['text-align'] === 'justify');
    const tagNow = c ? tagOf(c) : '';
    textTypeSelect.disabled = !TEXT_TYPES.includes(tagNow);
    textTypeSelect.value = TEXT_TYPES.includes(tagNow) ? tagNow : '';
    fontSelect.value = FONT_OPTIONS.some(([, v]) => v === st['font-family']) ? st['font-family'] : '';
    sizeSelect.value = st['font-size'] && [...sizeSelect.options].some((o) => o.value === st['font-size']) ? st['font-size'] : '';
  }

  /* ---- list helpers ---- */
  const listTools = (li: Component) => {
    const list = li.parent()!;
    const convert = (tag: 'ul' | 'ol') => {
      if (tagOf(list) === tag) return;
      // Keep only ids the student wrote or that carry real styles.
      const keepId = (c: Component, id: string) =>
        !!(c.get('attributes') as any)?.id ||
        editor.Css.getRules(`#${id}`).some((r) => Object.keys(r.getStyle()).length);
      const opts = {
        attributes: (c: Component, attrs: Record<string, any>) => {
          if (attrs.id && !keepId(c, attrs.id)) delete attrs.id;
          return attrs;
        },
      };
      const html = list.toHTML(opts as any).replace(/^<(ul|ol)/, `<${tag}`).replace(/<\/(ul|ol)>$/, `</${tag}>`);
      const added = list.replaceWith(html);
      const first = Array.isArray(added) ? added[0] : added;
      if (first) editor.select(first);
    };
    return section('list', [
      textBtn('addItem', I.Plus, () => {
        const item = li.clone();
        item.components(tx(['New item', 'بند جديد']));
        list.components().add(item, { at: list.components().indexOf(li) + 1 });
        editor.select(item);
      }),
      textBtn('removeItem', I.Trash2, () => {
        if (list.components().length > 1) li.remove();
      }),
      textBtn('toBullets', I.List, () => convert('ul')),
      textBtn('toNumbers', I.ListOrdered, () => convert('ol')),
    ]);
  };

  const imageTools = (img: Component) =>
    section('image', [
      textBtn('replaceImage', I.Image, () => editor.runCommand('core:open-assets', { target: img, types: ['image'], accept: 'image/*' })),
    ]);

  const elementTools = (c: Component) =>
    section('element', [
      c.parent() && tagOf(c.parent()!) !== 'body' && c.parent()!.get('type') !== 'wrapper'
        ? textBtn('selectParent', I.CornerLeftUp, () => editor.select(c.parent()!))
        : null,
      textBtn('duplicate', I.Copy, () => {
        const copy = c.clone();
        c.parent()?.components().add(copy, { at: c.index() + 1 });
        editor.select(copy);
      }),
      textBtn('delete', I.Trash2, () => c.remove()),
    ]);

  /* ---- horizontal line <hr> ---- */
  const lineTools = (hr: Component) => {
    const st = hr.getStyle() as Record<string, string>;
    const m = /(\d+)px\s+(solid|dashed|dotted|double)\s+(.+)/.exec(st['border-top'] || '') ?? [];
    const cur = { width: m[1] ?? '2', style: m[2] ?? 'solid', color: (m[3] ?? '#cbd5e1').trim() };
    const line = (changes: Partial<typeof cur>) => {
      const next = { ...cur, ...changes };
      // A double line needs at least 3px to show two lines.
      if (next.style === 'double' && Number(next.width) < 3) next.width = '4';
      hr.addStyle({ border: 'none', 'border-top': `${next.width}px ${next.style} ${next.color}` });
      requestAnimationFrame(render);
    };
    const chip = (label: string, on: boolean, onClick: () => void, preview?: string) =>
      h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, onclick: onClick },
        preview ? h('span', { class: 'line-preview', style: preview }) : '', label);
    const width = st.width ?? '';
    const space = /^(\d+)px/.exec(st.margin ?? '')?.[1] ?? '32';
    // Width and spacing share one readable rule: "width: 50%; margin: 32px auto;".
    const layout = (w: string, px: string) => {
      const style: Record<string, string> = { ...(hr.getStyle() as Record<string, string>) };
      for (const k of ['margin-top', 'margin-bottom', 'margin-left', 'margin-right']) delete style[k];
      style.width = w;
      style.margin = `${px}px ${w === '100%' ? '0' : 'auto'}`;
      hr.setStyle(style);
      requestAnimationFrame(render);
    };
    const COLORS = ['#cbd5e1', '#94a3b8', '#1e293b', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626'];
    return h('div', { class: 'ctx line-tools' },
      h('div', { class: 'ctx-title' }, t('hrLine')),
      h('div', { class: 'mini-title' }, t('lineStyle')),
      h('div', { class: 'chips' },
        ...(['solid', 'dashed', 'dotted', 'double'] as const).map((s) =>
          chip(t(`line_${s}` as Key), cur.style === s, () => line({ style: s }), `border-top:${s === 'double' ? 4 : 2}px ${s} currentColor`),
        ),
      ),
      h('div', { class: 'mini-title' }, t('thickness')),
      h('div', { class: 'chips' }, ...['1', '2', '4', '6'].map((w) => chip(`${w}px`, cur.width === w, () => line({ width: w })))),
      h('div', { class: 'mini-swatches' },
        ...COLORS.map((c) =>
          h('button', { type: 'button', class: `swatch${c === cur.color ? ' on' : ''}`, style: `background:${c}`, title: c, onclick: () => line({ color: c }) }),
        ),
      ),
      h('div', { class: 'mini-title' }, t('lineWidth')),
      h('div', { class: 'chips' },
        chip(t('full'), !width || width === '100%', () => layout('100%', space)),
        chip(t('half'), width === '50%', () => layout('50%', space)),
        chip(t('short'), width === '120px', () => layout('120px', space)),
      ),
      h('div', { class: 'mini-title' }, t('spaceAround')),
      h('div', { class: 'chips' },
        ...([['small', '16'], ['medium', '32'], ['large', '56']] as const).map(([k, px]) =>
          chip(t(k), space === px, () => layout(width || '100%', px)),
        ),
      ),
    );
  };

  function section(key: Key, buttons: (HTMLElement | null)[]) {
    return h('div', { class: 'ctx' }, h('div', { class: 'ctx-title' }, t(key)), h('div', { class: 'ctx-buttons' }, ...buttons));
  }

  /* ---- react to selection ---- */
  function render() {
    const c = sel();
    const wrapperSelected = c?.get('type') === 'wrapper';
    emptyBox.hidden = !!c && !wrapperSelected;
    contextBox.replaceChildren();
    infoBox.replaceChildren();
    infoBox.hidden = !c;
    if (!c) return;
    const tag = wrapperSelected ? 'body' : tagOf(c);
    const info = TAG_INFO[tag];
    infoBox.append(
      h('code', { class: 'tag-pill' }, `<${tag}>`),
      h('span', {}, info ? tx(info) : tx(['An HTML element.', 'عنصر HTML.'])),
    );
    if (wrapperSelected) return;
    const cell = closest(c, ['td', 'th']);
    const li = closest(c, ['li']);
    const img = tagOf(c) === 'img' ? c : undefined;
    if (cell) contextBox.append(...tableCards(editor, cell, render));
    if (li) contextBox.append(listTools(li));
    if (img) contextBox.append(imageTools(img));
    if (tagOf(c) === 'hr') contextBox.append(lineTools(c));
    contextBox.append(elementTools(c));
    updateState();
  }

  editor.on('component:toggled', render);
  editor.on('component:remove', () => setTimeout(render));
  editor.on('component:styleUpdate', updateState);
  render();

  // Shared with the floating toolbar on the canvas.
  const after = (fn: () => void) => () => {
    fn();
    updateState();
  };
  return {
    bold: after(fmt('bold', 'font-weight', 'bold')),
    italic: after(fmt('italic', 'font-style', 'italic')),
    align: (value: 'left' | 'center' | 'right') =>
      after(align(value, { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight' }[value]))(),
    textColor: (v: string) => (editing() ? doc().execCommand('foreColor', false, v) : sel()?.addStyle({ color: v })),
    bgColor: (v: string) => sel()?.addStyle({ 'background-color': v }),
    link: insertLink,
    replaceImage: (img: Component) => editor.runCommand('core:open-assets', { target: img, types: ['image'], accept: 'image/*' }),
  };
}

export type ToolActions = ReturnType<typeof setupTools>;
