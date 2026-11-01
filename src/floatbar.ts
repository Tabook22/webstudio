import type { Component, Editor } from 'grapesjs';
import { t, type Key } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import type { ToolActions } from './tools';
import { h } from './ui';

const tagOf = (c: Component) => String(c.get('tagName') || 'div').toLowerCase();
const TEXTY = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'li', 'span', 'blockquote', 'td', 'th', 'button', 'label', 'strong', 'em']);

/**
 * A small toolbar that floats under the selected element on the canvas, so
 * the most common actions are right where the student is looking.
 */
export function setupFloatBar(editor: Editor, tools: ToolActions) {
  const stage = document.querySelector('.stage') as HTMLElement;
  const bar = h('div', { class: 'float-bar', hidden: true, role: 'toolbar' });
  stage.append(bar);

  const button = (key: Key, svg: string, onClick: () => void, extra: Record<string, any> = {}) =>
    h('button', {
      type: 'button', title: t(key), 'aria-label': t(key), html: icon(svg, 16),
      onmousedown: (e: Event) => e.preventDefault(),
      onclick: () => {
        onClick();
        requestAnimationFrame(render);
      },
      ...extra,
    });

  const colorPicker = (key: Key, svg: string, value: string, apply: (v: string) => void) => {
    const input = h('input', { type: 'color', value });
    input.addEventListener('input', () => apply(input.value));
    return h('label', { title: t(key), 'aria-label': t(key), html: icon(svg, 16) },
      input, h('span', { class: 'fb-color-bar', style: `background:${value}` }));
  };

  const toHex = (v: string, fallback: string) => {
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
    return m ? '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : fallback;
  };

  let hiddenWhileEditing = false;

  function render() {
    const c = editor.getSelected();
    if (!c || c.get('type') === 'wrapper' || hiddenWhileEditing) {
      bar.hidden = true;
      return;
    }
    const tag = tagOf(c);
    const st = c.getStyle() as Record<string, string>;
    const el = c.getEl();
    const computed = el ? el.ownerDocument.defaultView!.getComputedStyle(el) : null;
    const isText = c.is('text') || TEXTY.has(tag);
    const alignNow = st['text-align'] || '';
    const nextAlign = alignNow === 'left' ? 'center' : alignNow === 'center' ? 'right' : 'left';
    const alignIcon = { left: I.AlignLeft, center: I.AlignCenter, right: I.AlignRight }[(alignNow || 'left') as 'left'] ?? I.AlignLeft;

    const sep = () => h('span', { class: 'fb-sep' });
    bar.replaceChildren(
      h('span', { class: 'fb-tag', dir: 'ltr' }, `<${tag}>`),
      ...(isText
        ? [
            button('edit', I.Pencil,() => (c.getView() as any)?.onActive?.()),
            button('bold', I.Bold, tools.bold, { class: /^(bold|700)$/.test(st['font-weight'] || '') ? 'on' : '' }),
            button('italic', I.Italic, tools.italic, { class: st['font-style'] === 'italic' ? 'on' : '' }),
            button(nextAlign === 'center' ? 'alignCenter' : nextAlign === 'right' ? 'alignRight' : 'alignLeft', alignIcon, () => tools.align(nextAlign)),
            colorPicker('textColor', I.Baseline, toHex(st.color || computed?.color || '', '#1e293b'), tools.textColor),
            sep(),
          ]
        : []),
      colorPicker('bgColor', I.PaintBucket, toHex(computed?.backgroundColor || '', '#ffffff'), tools.bgColor),
      tag === 'a' ? button('link', I.Link, tools.link) : '',
      tag === 'img' ? button('replaceImage', I.Image, () => tools.replaceImage(c)) : '',
      sep(),
      c.parent() && c.parent()!.get('type') !== 'wrapper' ? button('selectParent', I.CornerLeftUp, () => editor.select(c.parent()!)) : '',
      button('duplicate', I.Copy, () => {
        const copy = c.clone();
        c.parent()?.components().add(copy, { at: c.index() + 1 });
        editor.select(copy);
      }),
      button('delete', I.Trash2, () => c.remove(), { class: 'danger' }),
    );
    bar.hidden = false;
    place();
  }

  function place() {
    const c = editor.getSelected();
    const el = c?.getEl();
    const frame = editor.Canvas.getFrameEl();
    if (!el || !frame || bar.hidden) return;
    const s = stage.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = f.top - s.top + r.top;
    const bottom = f.top - s.top + r.bottom;
    const left = f.left - s.left + r.left;
    const bw = bar.offsetWidth;
    const bh = bar.offsetHeight;
    // Prefer just below the element; flip above it, or pin inside when it fills the view.
    let y = bottom + 8;
    if (y + bh > s.height - 8) y = top - bh - 8;
    if (y < 8) y = Math.min(Math.max(top + 8, 8), s.height - bh - 8);
    const x = Math.min(Math.max(left, 8), s.width - bw - 8);
    const offscreen = bottom < 0 || top > s.height;
    bar.style.transform = `translate(${x}px, ${y}px)`;
    bar.style.left = '0';
    bar.style.top = '0';
    bar.style.opacity = offscreen ? '0' : '1';
    bar.style.pointerEvents = offscreen ? 'none' : 'auto';
  }

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(place);
  };

  editor.on('component:toggled', render);
  // Don't rebuild while a colour picker in the bar is open.
  editor.on('component:styleUpdate', () => bar.contains(document.activeElement) || render());
  editor.on('component:remove', () => requestAnimationFrame(render));
  editor.on('rte:enable', () => {
    hiddenWhileEditing = true;
    render();
  });
  editor.on('rte:disable', () => {
    hiddenWhileEditing = false;
    render();
  });
  editor.on('update', schedule);
  editor.on('canvas:frame:load', ({ window: win }: { window: Window }) => {
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
  });
  editor.on('canvas:dragenter', () => (bar.hidden = true));
  editor.on('canvas:drop', () => requestAnimationFrame(render));
  new ResizeObserver(schedule).observe(stage);
  window.addEventListener('resize', schedule);
  // Device switches animate the frame width; keep up while it settles.
  editor.on('change:device', () => {
    const until = Date.now() + 600;
    const loop = () => {
      place();
      if (Date.now() < until) requestAnimationFrame(loop);
    };
    loop();
  });
}
