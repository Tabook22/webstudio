import type { Component, Editor } from 'grapesjs';
import { lang, t, type Key } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { askText, h } from './ui';
import { FONT_OPTIONS } from './fonts';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

/** Plain-language notes shown for the selected element (teaching aid). */
const TAG_INFO: Record<string, Pair> = {
  h1: ['Main heading — use one per page for its title.', 'العنوان الرئيسي — استخدم واحدًا فقط لعنوان الصفحة.'],
  h2: ['Section heading — starts a new part of the page.', 'عنوان قسم — يبدأ جزءًا جديدًا من الصفحة.'],
  h3: ['Smaller heading inside a section.', 'عنوان أصغر داخل القسم.'],
  h4: ['Small heading.', 'عنوان صغير.'],
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
  hr: ['Horizontal line — separates parts.', 'خط أفقي — يفصل بين الأجزاء.'],
  iframe: ['Frame — shows another page inside this one (map, video).', 'إطار — يعرض صفحة أخرى داخل هذه الصفحة (خريطة، فيديو).'],
  video: ['Video player.', 'مشغل فيديو.'],
  body: ['Body — everything visible on the page.', 'الجسم — كل ما يظهر في الصفحة.'],
};

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
    h('div', { class: 'tool-row' }, fontSelect),
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
    fontSelect.value = FONT_OPTIONS.some(([, v]) => v === st['font-family']) ? st['font-family'] : '';
    sizeSelect.value = st['font-size'] && [...sizeSelect.options].some((o) => o.value === st['font-size']) ? st['font-size'] : '';
  }

  /* ---- table helpers ---- */
  const emptyCell = (c: Component) => {
    const copy = c.clone();
    copy.components('');
    return copy;
  };
  const rowsOf = (table: Component) => table.find('tr');

  const tableTools = (cell: Component) => {
    const row = cell.parent()!;
    const group = row.parent()!;
    const table = closest(row, ['table'])!;
    const colIndex = () => row.components().indexOf(cell);
    const addRow = (after: boolean) => {
      const copy = row.clone();
      copy.components().forEach((c: Component) => {
        c.components('');
      });
      group.components().add(copy, { at: group.components().indexOf(row) + (after ? 1 : 0) });
      editor.select(copy.components().at(colIndex()));
    };
    const addCol = (after: boolean) => {
      const i = colIndex();
      for (const r of rowsOf(table)) {
        const cells = r.components();
        const ref = cells.at(Math.min(i, cells.length - 1));
        if (ref) cells.add(emptyCell(ref), { at: Math.min(i, cells.length - 1) + (after ? 1 : 0) });
      }
    };
    const delRow = () => {
      if (rowsOf(table).length <= 1) return;
      const next = group.components().at(group.components().indexOf(row) + 1) || group.components().at(group.components().indexOf(row) - 1);
      row.remove();
      if (next) editor.select(next.components().at(0));
    };
    const delCol = () => {
      const i = colIndex();
      if (row.components().length <= 1) return;
      for (const r of rowsOf(table)) r.components().at(i)?.remove();
      editor.select(row.components().at(Math.max(0, i - 1)));
    };
    return section('table', [
      textBtn('rowAbove', I.ArrowUp, () => addRow(false)),
      textBtn('rowBelow', I.ArrowDown, () => addRow(true)),
      textBtn('colBefore', lang === 'ar' ? I.ArrowRight : I.ArrowLeft, () => addCol(false)),
      textBtn('colAfter', lang === 'ar' ? I.ArrowLeft : I.ArrowRight, () => addCol(true)),
      textBtn('delRow', I.Trash2, delRow),
      textBtn('delCol', I.Trash2, delCol),
    ]);
  };

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
    if (cell) contextBox.append(tableTools(cell));
    if (li) contextBox.append(listTools(li));
    if (img) contextBox.append(imageTools(img));
    contextBox.append(elementTools(c));
    updateState();
  }

  editor.on('component:toggled', render);
  editor.on('component:remove', () => setTimeout(render));
  editor.on('component:styleUpdate', updateState);
  render();
}
