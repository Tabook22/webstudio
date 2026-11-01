import type { Component, Editor } from 'grapesjs';
import { lang, t, type Key } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { h, modal, toast } from './ui';

const tagOf = (c: Component) => String(c.get('tagName') || '').toLowerCase();
const isCell = (c: Component) => tagOf(c) === 'td' || tagOf(c) === 'th';
const span = (c: Component, attr: 'rowspan' | 'colspan') => Math.max(1, parseInt(String(c.getAttributes()[attr] ?? 1), 10) || 1);

function setSpan(c: Component, attr: 'rowspan' | 'colspan', n: number) {
  // Not addAttributes(): that would also freeze GrapesJS's automatic id into the HTML.
  const attrs: Record<string, string> = { ...((c.get('attributes') as Record<string, string>) ?? {}) };
  if (n > 1) attrs[attr] = String(n);
  else delete attrs[attr];
  c.setAttributes(attrs);
}

/** Attributes the student set (not GrapesJS's automatic id). */
const ownAttributes = (c: Component): Record<string, string> => {
  const attrs = { ...((c.get('attributes') as Record<string, string>) ?? {}) };
  delete attrs.id;
  return attrs;
};

const newCell = (tag: string, text = '') => ({ type: 'text-cell', tagName: tag, components: text });

export function closestOf(c: Component | undefined, tags: string[]) {
  for (let x = c; x; x = x.parent()) if (tags.includes(tagOf(x))) return x;
  return undefined;
}

interface CellPos {
  comp: Component;
  row: number;
  col: number;
  rs: number;
  cs: number;
}

/**
 * The table as a grid of rows × columns, taking rowspan/colspan into
 * account, so rows, columns, merging and splitting stay consistent.
 */
export class Grid {
  rows: Component[];
  cells: CellPos[] = [];
  map: (CellPos | undefined)[][] = [];
  width = 0;

  constructor(public table: Component) {
    this.rows = table.find('tr').filter((tr) => closestOf(tr.parent(), ['table']) === table);
    this.rows.forEach((tr, r) => {
      this.map[r] ??= [];
      let c = 0;
      tr.components().forEach((comp: Component) => {
        if (!isCell(comp)) return;
        while (this.map[r][c]) c++;
        const pos: CellPos = { comp, row: r, col: c, rs: span(comp, 'rowspan'), cs: span(comp, 'colspan') };
        this.cells.push(pos);
        for (let i = 0; i < pos.rs && r + i < this.rows.length; i++) {
          this.map[r + i] ??= [];
          for (let j = 0; j < pos.cs; j++) this.map[r + i][c + j] = pos;
        }
        c += pos.cs;
      });
    });
    this.width = Math.max(0, ...this.map.map((row) => row.length));
  }

  pos(comp: Component) {
    return this.cells.find((p) => p.comp === comp);
  }

  /** Index in row r's children where a cell starting at column c belongs. */
  insertIndex(r: number, c: number) {
    const tr = this.rows[r];
    const next = this.cells.filter((p) => p.row === r && p.col >= c).sort((a, b) => a.col - b.col)[0];
    return next ? tr.components().indexOf(next.comp) : tr.components().length;
  }

  /** Rows whose number of columns differs from the rest (broken merges). */
  unevenRows() {
    return this.map.filter((row) => row.filter(Boolean).length !== this.width).length;
  }

  tagAt(r: number) {
    const tr = this.rows[r];
    return tagOf(tr.parent()!) === 'thead' || tr.components().every((c: Component) => !isCell(c) || tagOf(c) === 'th') ? 'th' : 'td';
  }
}

/* ---------- rows & columns ---------- */

export function addRow(cell: Component, after: boolean) {
  const g = new Grid(closestOf(cell, ['table'])!);
  const p = g.pos(cell)!;
  const at = after ? p.row + p.rs : p.row; // the new row's index
  const ref = g.rows[Math.min(after ? p.row + p.rs - 1 : p.row, g.rows.length - 1)];
  let section = ref.parent()!;
  let index = section.components().indexOf(ref) + (after ? 1 : 0);
  let tag = g.tagAt(g.rows.indexOf(ref));
  // A row added under the header row belongs to the body, as normal cells.
  if (after && tagOf(section) === 'thead') {
    const table = closestOf(section, ['table'])!;
    section =
      table.components().find((c: Component) => tagOf(c) === 'tbody') ??
      (table.components().add({ tagName: 'tbody' }) as unknown as Component);
    index = 0;
    tag = 'td';
  }
  const extended = new Set<CellPos>();
  const cells: object[] = [];
  for (let c = 0; c < g.width; c++) {
    const above = g.map[at - 1]?.[c];
    if (above && at < above.row + above.rs && above.row < at) {
      if (!extended.has(above)) {
        extended.add(above);
        setSpan(above.comp, 'rowspan', above.rs + 1);
      }
      c += above.cs - 1;
      continue;
    }
    cells.push(newCell(tag));
  }
  const added = section.components().add({ tagName: 'tr', components: cells }, { at: index }) as unknown as Component;
  return added.components().at(0) ?? cell;
}

export function addColumn(cell: Component, after: boolean) {
  const g = new Grid(closestOf(cell, ['table'])!);
  const p = g.pos(cell)!;
  const at = after ? p.col + p.cs : p.col;
  const widened = new Set<CellPos>();
  let first: Component | undefined;
  for (let r = 0; r < g.rows.length; r++) {
    const left = g.map[r][at - 1];
    if (left && left === g.map[r][at]) {
      if (!widened.has(left)) {
        widened.add(left);
        setSpan(left.comp, 'colspan', left.cs + 1);
      }
      continue;
    }
    const added = g.rows[r].components().add(newCell(g.tagAt(r)), { at: g.insertIndex(r, at) }) as unknown as Component;
    if (r === p.row) first = added;
  }
  return first ?? cell;
}

export function deleteRow(cell: Component) {
  const g = new Grid(closestOf(cell, ['table'])!);
  if (g.rows.length <= 1) return cell;
  const p = g.pos(cell)!;
  const r = p.row;
  const seen = new Set<CellPos>();
  const moving: CellPos[] = [];
  for (let c = 0; c < g.width; c++) {
    const o = g.map[r][c];
    if (!o || seen.has(o)) continue;
    seen.add(o);
    if (o.row < r) setSpan(o.comp, 'rowspan', o.rs - 1);
    else if (o.rs > 1) moving.push(o);
  }
  // A tall cell that starts in this row moves down one row, a little shorter.
  for (const o of moving.sort((a, b) => b.col - a.col)) {
    const attributes = ownAttributes(o.comp);
    if (o.rs > 2) attributes.rowspan = String(o.rs - 1);
    else delete attributes.rowspan;
    g.rows[r + 1].components().add(
      { type: 'text-cell', tagName: tagOf(o.comp), attributes, components: o.comp.getInnerHTML() },
      { at: g.insertIndex(r + 1, o.col) },
    );
  }
  const next = g.rows[r + 1] ?? g.rows[r - 1];
  const section = g.rows[r].parent();
  g.rows[r].remove();
  if (section && !section.components().length) section.remove();
  return next?.components().at(0) ?? cell;
}

export function deleteColumn(cell: Component) {
  const g = new Grid(closestOf(cell, ['table'])!);
  if (g.width <= 1) return cell;
  const c = g.pos(cell)!.col;
  const seen = new Set<CellPos>();
  let neighbour: Component | undefined;
  for (let r = 0; r < g.rows.length; r++) {
    const o = g.map[r][c];
    if (!o || seen.has(o)) continue;
    seen.add(o);
    if (o.cs > 1) setSpan(o.comp, 'colspan', o.cs - 1);
    else o.comp.remove();
    if (r === g.pos(cell)!.row) neighbour = (g.map[r][c - 1] ?? g.map[r][c + 1])?.comp;
  }
  return neighbour && neighbour !== cell ? neighbour : g.rows[0].components().at(0);
}

/* ---------- merge & split ---------- */

export function mergeCells(cells: Component[]): Component | string {
  const table = closestOf(cells[0], ['table']);
  if (!table || cells.some((c) => closestOf(c, ['table']) !== table)) return t('mergeSameTable');
  const g = new Grid(table);
  const ps = [...new Set(cells)].map((c) => g.pos(c)!).filter(Boolean);
  if (ps.length < 2) return t('mergeSelectMore');
  const r0 = Math.min(...ps.map((p) => p.row));
  const r1 = Math.max(...ps.map((p) => p.row + p.rs - 1));
  const c0 = Math.min(...ps.map((p) => p.col));
  const c1 = Math.max(...ps.map((p) => p.col + p.cs - 1));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) if (!ps.includes(g.map[r]?.[c]!)) return t('mergeRectangle');
  }
  const section = g.rows[r0].parent();
  for (let r = r0; r <= r1; r++) if (g.rows[r].parent() !== section) return t('mergeSection');

  const target = g.map[r0][c0]!;
  const others = ps.filter((p) => p !== target).sort((a, b) => a.row - b.row || a.col - b.col);
  const parts = [target.comp.getInnerHTML(), ...others.map((p) => p.comp.getInnerHTML())]
    .map((s) => s.trim())
    .filter((s) => s && s !== '&nbsp;' && s !== '<br>' && s !== '<br/>');
  others.forEach((p) => p.comp.remove());
  target.comp.components(parts.join(' '));
  setSpan(target.comp, 'colspan', c1 - c0 + 1);
  setSpan(target.comp, 'rowspan', r1 - r0 + 1);
  return target.comp;
}

export function splitCell(cell: Component) {
  const g = new Grid(closestOf(cell, ['table'])!);
  const p = g.pos(cell)!;
  if (p.rs === 1 && p.cs === 1) return cell;
  const tag = tagOf(cell);
  for (let r = p.row + p.rs - 1; r >= p.row; r--) {
    if (!g.rows[r]) continue;
    const count = r === p.row ? p.cs - 1 : p.cs;
    const index = r === p.row ? g.rows[r].components().indexOf(cell) + 1 : g.insertIndex(r, p.col);
    for (let i = 0; i < count; i++) g.rows[r].components().add(newCell(tag), { at: index });
  }
  setSpan(cell, 'colspan', 1);
  setSpan(cell, 'rowspan', 1);
  return cell;
}

/* ---------- header row ---------- */

export function hasHeader(table: Component) {
  const g = new Grid(table);
  return g.rows.length > 0 && g.tagAt(0) === 'th';
}

export function setHeader(table: Component, on: boolean) {
  const g = new Grid(table);
  const first = g.rows[0];
  if (!first) return;
  const tag = on ? 'th' : 'td';
  first.components().forEach((c: Component) => {
    if (!isCell(c) || tagOf(c) === tag) return;
    c.replaceWith({ type: 'text-cell', tagName: tag, attributes: ownAttributes(c), components: c.getInnerHTML() });
  });
  const section = first.parent()!;
  if (on && tagOf(section) !== 'thead') {
    let thead = table.components().find((c: Component) => tagOf(c) === 'thead');
    if (!thead) thead = table.components().add({ tagName: 'thead' }, { at: 0 }) as unknown as Component;
    first.move(thead, { at: 0 });
  } else if (!on && tagOf(section) === 'thead') {
    let tbody = table.components().find((c: Component) => tagOf(c) === 'tbody');
    if (!tbody) tbody = table.components().add({ tagName: 'tbody' }) as unknown as Component;
    first.move(tbody, { at: 0 });
    if (!section.components().length) section.remove();
  }
}

/* ---------- insert: choose the size ---------- */

export function pickTableSize(): Promise<{ rows: number; cols: number; header: boolean } | null> {
  const MAX_C = 8;
  const MAX_R = 10;
  let rows = 3;
  let cols = 3;
  const label = h('div', { class: 'tsize-label' });
  const grid = h('div', { class: 'tsize-grid', style: `grid-template-columns:repeat(${MAX_C}, 1fr)` });
  const header = h('input', { type: 'checkbox', checked: true });
  const paint = (r: number, c: number) => {
    label.textContent = `${c} × ${r}  ·  ${c} ${t('columns')}, ${r} ${t('rows')}`;
    grid.querySelectorAll<HTMLElement>('span').forEach((s) => {
      s.classList.toggle('on', Number(s.dataset.r) <= r && Number(s.dataset.c) <= c);
    });
  };
  let resolveFn: (v: { rows: number; cols: number; header: boolean } | null) => void = () => {};
  let chosen = false;
  for (let r = 1; r <= MAX_R; r++) {
    for (let c = 1; c <= MAX_C; c++) {
      grid.append(
        h('span', {
          'data-r': r, 'data-c': c,
          onmouseenter: () => paint(r, c),
          onclick: () => {
            rows = r;
            cols = c;
            chosen = true;
            (document.querySelector('dialog.modal header .icon-btn') as HTMLButtonElement | null)?.click();
          },
        }),
      );
    }
  }
  grid.addEventListener('mouseleave', () => paint(rows, cols));
  paint(rows, cols);
  return new Promise((resolve) => {
    resolveFn = resolve;
    modal({
      title: t('tableSize'),
      okLabel: t('create'),
      body: h('div', { class: 'stack tsize' },
        h('p', { class: 'hint', style: 'margin:0' }, t('tableSizeHint')),
        grid,
        label,
        h('label', { class: 'check' }, header, t('headerRow')),
      ),
    }).then((ok) => resolveFn(ok || chosen ? { rows, cols, header: header.checked } : null));
  });
}

export function buildTable(table: Component, rows: number, cols: number, header: boolean) {
  const words = lang === 'ar' ? ['العنوان', 'خلية'] : ['Heading', 'Cell'];
  const row = (tag: string, text: (c: number) => string) => ({
    tagName: 'tr', components: Array.from({ length: cols }, (_, c) => newCell(tag, text(c))),
  });
  const body = Array.from({ length: header ? rows - 1 : rows }, () => row('td', () => ''));
  table.components([
    ...(header ? [{ tagName: 'thead', components: [row('th', (c) => `${words[0]} ${c + 1}`)] }] : []),
    { tagName: 'tbody', components: body.length ? body : [row('td', () => '')] },
  ]);
}

/* ---------- the right-panel cards ---------- */

type Rule = Record<string, string | null>;
const COLORS = ['#cbd5e1', '#94a3b8', '#1e293b', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626'];
const HEAD_COLORS = ['', '#f1f5f9', '#e0e7ff', '#dcfce7', '#fef3c7', '#1e293b', '#4f46e5', '#0f766e'];

export function tableCards(editor: Editor, cell: Component, refresh: () => void) {
  const table = closestOf(cell, ['table'])!;
  const g = new Grid(table);
  const p = g.pos(cell);
  const selectedCells = editor
    .getSelectedAll()
    .map((c) => (isCell(c) ? c : closestOf(c, ['td', 'th'])))
    .filter((c): c is Component => !!c && closestOf(c, ['table']) === table);
  const uniqueSel = [...new Set(selectedCells)];
  const canSplit = !!p && (p.rs > 1 || p.cs > 1);
  const run = (fn: () => Component | string | undefined) => () => {
    const res = fn();
    if (typeof res === 'string') return toast(res, 'error');
    if (res) editor.select(res);
    requestAnimationFrame(refresh);
  };
  const btn = (key: Key, svg: string, onClick: () => void, extra: Record<string, any> = {}) =>
    h('button', {
      type: 'button', class: 'tool wide', onmousedown: (e: Event) => e.preventDefault(), onclick: onClick,
      html: `${icon(svg, 15)}<span>${t(key)}</span>`, ...extra,
    });

  const structure = h('div', { class: 'ctx' },
    h('div', { class: 'ctx-title row-title' },
      h('span', {}, t('table')),
      h('span', { class: 'tsize-badge', dir: 'ltr' }, `${g.width} × ${g.rows.length}`),
    ),
    h('div', { class: 'ctx-buttons' },
      btn('rowAbove', I.ArrowUp, run(() => addRow(cell, false))),
      btn('rowBelow', I.ArrowDown, run(() => addRow(cell, true))),
      btn('colBefore', lang === 'ar' ? I.ArrowRight : I.ArrowLeft, run(() => addColumn(cell, false))),
      btn('colAfter', lang === 'ar' ? I.ArrowLeft : I.ArrowRight, run(() => addColumn(cell, true))),
      btn('delRow', I.Trash2, run(() => deleteRow(cell))),
      btn('delCol', I.Trash2, run(() => deleteColumn(cell))),
    ),
    h('div', { class: 'ctx-buttons merge-row' },
      btn('mergeCells', I.Columns2, run(() => mergeCells(uniqueSel)), {
        disabled: uniqueSel.length < 2, title: uniqueSel.length < 2 ? t('mergeHint') : '',
      }),
      btn('splitCell', I.LayoutGrid, run(() => splitCell(cell)), { disabled: !canSplit }),
    ),
    h('p', { class: 'hint tight' }, uniqueSel.length > 1 ? `${uniqueSel.length} ${t('cellsSelected')}` : t('mergeHint')),
  );

  /* style card: real CSS rules on #id, so students see them in style.css */
  const id = table.getId();
  if (!(table.get('attributes') as any)?.id) table.addAttributes({ id });
  const sel = {
    table: `#${id}`,
    cells: `#${id} th, #${id} td`,
    head: `#${id} th`,
    stripe: `#${id} tbody tr:nth-child(even) td`,
    hover: `#${id} tbody tr:hover td`,
  };
  const read = (s: string) => (editor.Css.getRule(s)?.getStyle() ?? {}) as Record<string, string>;
  const write = (s: string, changes: Rule) => {
    const style: Record<string, string> = { ...read(s) };
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) delete style[k];
      else style[k] = v;
    }
    const existing = editor.Css.getRule(s);
    if (!Object.keys(style).length) {
      if (existing) editor.Css.remove(existing);
    } else editor.Css.setRule(s, style);
  };
  const apply = (fn: () => void) => () => {
    fn();
    requestAnimationFrame(refresh);
  };

  const tableSt = read(sel.table);
  const cellSt = read(sel.cells);
  const mode = tableSt.border ? 'outer' : cellSt['border-bottom'] ? 'rows' : cellSt.border === 'none' ? 'none' : cellSt.border ? 'all' : 'default';
  const current = tableSt.border || cellSt['border-bottom'] || cellSt.border || '1px solid #cbd5e1';
  const m = /(\d+(?:\.\d+)?px)\s+\w+\s+(.+)/.exec(current);
  const width = m?.[1] ?? '1px';
  const color = m?.[2]?.trim() ?? '#cbd5e1';

  const setBorders = (next: string, w = width, c = color) => {
    const line = `${w} solid ${c}`;
    if (next === 'all') {
      write(sel.table, { border: null, 'border-collapse': 'collapse' });
      write(sel.cells, { border: line, 'border-bottom': null });
    } else if (next === 'outer') {
      write(sel.table, { border: line, 'border-collapse': 'collapse' });
      write(sel.cells, { border: 'none', 'border-bottom': null });
    } else if (next === 'rows') {
      write(sel.table, { border: null, 'border-collapse': 'collapse' });
      write(sel.cells, { border: 'none', 'border-bottom': line });
    } else {
      write(sel.table, { border: null });
      write(sel.cells, { border: 'none', 'border-bottom': null });
    }
  };
  const borderMode = mode === 'default' ? 'all' : mode;

  const BORDER_ICONS: Record<string, string> = {
    all: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
    outer: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke-dasharray="1.5 2.5" opacity=".45"/></svg>',
    rows: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h18M3 9.5h18M3 15h18M3 20.5h18"/></svg>',
    none: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1" stroke-dasharray="1.5 2.5" opacity=".45"/><path d="M5 19 19 5"/></svg>',
  };
  const modeBtn = (key: string, label: Key) =>
    h('button', {
      type: 'button', class: `border-mode${borderMode === key ? ' on' : ''}`, title: t(label),
      onclick: apply(() => setBorders(key)),
    }, h('span', { html: BORDER_ICONS[key] }), h('small', {}, t(label)));

  const chip = (label: string, on: boolean, onClick: () => void) =>
    h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, onclick: apply(onClick) }, label);
  const toggle = (label: Key, on: boolean, onChange: (v: boolean) => void) => {
    const input = h('input', { type: 'checkbox', checked: on });
    input.addEventListener('change', apply(() => onChange(input.checked)));
    return h('label', { class: 'check' }, input, t(label));
  };

  const headSt = read(sel.head);
  const pad = cellSt.padding ?? '';
  const colIndex = p ? cell.parent()!.components().indexOf(cell) + 1 : 1;
  const colSel = `#${id} tr > :nth-child(${colIndex})`;
  const colAlign = read(colSel)['text-align'] ?? '';

  const style = h('div', { class: 'ctx table-style' },
    h('div', { class: 'ctx-title' }, t('tableStyle')),
    h('div', { class: 'mini-title' }, t('borders')),
    h('div', { class: 'border-modes' },
      modeBtn('all', 'bordersAll'), modeBtn('outer', 'bordersOuter'), modeBtn('rows', 'bordersRows'), modeBtn('none', 'bordersNone'),
    ),
    borderMode !== 'none'
      ? h('div', { class: 'tstyle-row' },
          h('div', { class: 'mini-swatches' },
            ...COLORS.map((c) =>
              h('button', {
                type: 'button', class: `swatch${c === color ? ' on' : ''}`, style: `background:${c}`, title: c,
                onclick: apply(() => setBorders(borderMode, width, c)),
              }),
            ),
          ),
          h('div', { class: 'chips' },
            ...['1px', '2px', '3px'].map((w) => chip(w, w === width, () => setBorders(borderMode, w, color))),
          ),
        )
      : '',
    h('div', { class: 'mini-title' }, t('headerRow')),
    toggle('headerRow', hasHeader(table), (v) => setHeader(table, v)),
    h('div', { class: 'mini-swatches' },
      ...HEAD_COLORS.map((c) =>
        h('button', {
          type: 'button', class: `swatch${(headSt['background-color'] ?? '') === c ? ' on' : ''}${c ? '' : ' none'}`,
          style: c ? `background:${c}` : '', title: c || t('noBg'),
          onclick: apply(() => {
            const dark = ['#1e293b', '#4f46e5', '#0f766e'].includes(c);
            write(sel.head, { 'background-color': c || null, color: c ? (dark ? '#ffffff' : null) : null });
          }),
        }),
      ),
    ),
    h('div', { class: 'mini-title' }, t('rowsLook')),
    toggle('striped', !!read(sel.stripe)['background-color'], (v) => write(sel.stripe, { 'background-color': v ? 'rgba(15, 23, 42, 0.04)' : null })),
    toggle('hoverRows', !!read(sel.hover)['background-color'], (v) => write(sel.hover, { 'background-color': v ? 'rgba(79, 70, 229, 0.08)' : null })),
    toggle('fullWidth', tableSt.width === '100%' || (!tableSt.width && table.getClasses().includes('table')), (v) => write(sel.table, { width: v ? '100%' : 'auto' })),
    h('div', { class: 'mini-title' }, t('cellSpace')),
    h('div', { class: 'chips' },
      chip(t('compact'), pad === '4px 8px', () => write(sel.cells, { padding: '4px 8px' })),
      chip(t('normal'), pad === '10px 12px' || !pad, () => write(sel.cells, { padding: '10px 12px' })),
      chip(t('roomy'), pad === '16px 20px', () => write(sel.cells, { padding: '16px 20px' })),
    ),
    h('div', { class: 'mini-title' }, `${t('columnAlign')} ${colIndex}`),
    h('div', { class: 'chips' },
      chip(t('alignLeft'), colAlign === 'left', () => write(colSel, { 'text-align': colAlign === 'left' ? null : 'left' })),
      chip(t('alignCenter'), colAlign === 'center', () => write(colSel, { 'text-align': colAlign === 'center' ? null : 'center' })),
      chip(t('alignRight'), colAlign === 'right', () => write(colSel, { 'text-align': colAlign === 'right' ? null : 'right' })),
    ),
  );
  return [structure, style];
}

/** Ask for the size when a Table block is dropped onto the page. */
export function setupTableInsert(editor: Editor) {
  editor.on('block:drag:stop', async (dropped: Component | Component[] | undefined, block: any) => {
    if (block?.getId?.() !== 'table' && block?.id !== 'table') return;
    const list = Array.isArray(dropped) ? dropped : dropped ? [dropped] : [];
    const table = list.find((c) => tagOf(c) === 'table');
    if (!table) return;
    const size = await pickTableSize();
    if (!size) return;
    buildTable(table, size.rows, size.cols, size.header);
    const first = table.find('td, th')[0];
    if (first) editor.select(first);
  });
}
