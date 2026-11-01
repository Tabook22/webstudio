import type { Component, Editor } from 'grapesjs';
import { t } from './i18n';
import { h } from './ui';

const KEY = 'webdesigner:xray';
const MARGIN = 'rgba(249, 159, 82, 0.45)';
const PADDING = 'rgba(132, 204, 104, 0.5)';
const CONTENT = 'rgba(96, 165, 250, 0.38)';
const MAX_LABELS = 300;

/**
 * X-ray mode, like the browser's developer tools: every element is outlined
 * and labelled with its tag, and the hovered (or selected) element shows its
 * box model — margin, padding and content — in colour.
 */
export function setupXray(editor: Editor) {
  const stage = document.querySelector('.stage') as HTMLElement;
  const button = document.getElementById('btn-xray')!;
  const layer = h('div', { class: 'xray-layer', style: 'position:absolute;inset:0;pointer-events:none;z-index:12;overflow:hidden' });
  const legend = h('div', { class: 'xray-legend', dir: 'ltr' },
    h('span', {}, h('i', { style: `background:${MARGIN}` }), t('margin')),
    h('span', {}, h('i', { style: `background:${PADDING}` }), t('padding')),
    h('span', {}, h('i', { style: `background:${CONTENT}` }), t('content')),
  );
  let on = false;
  let hovered: Component | null = null;

  function set(value: boolean) {
    on = value;
    button.setAttribute('aria-pressed', String(on));
    try {
      localStorage.setItem(KEY, on ? '1' : '');
    } catch {}
    if (on) {
      editor.runCommand('core:component-outline');
      stage.append(layer, legend);
      draw();
    } else {
      editor.stopCommand('core:component-outline');
      layer.remove();
      legend.remove();
    }
  }
  button.addEventListener('click', () => set(!on));

  function draw() {
    if (!on) return;
    const frame = editor.Canvas.getFrameEl();
    const doc = editor.Canvas.getDocument();
    if (!frame || !doc?.body) return;
    const s = stage.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const ox = f.left - s.left;
    const oy = f.top - s.top;
    const parts: HTMLElement[] = [];

    // Tag labels for every visible element.
    let count = 0;
    for (const el of doc.body.querySelectorAll<HTMLElement>('*')) {
      if (count >= MAX_LABELS) break;
      if (el.closest('[data-gjs-type="textnode"]') || el.tagName === 'BR') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 12 || r.bottom < 0 || r.top > f.height) continue;
      count++;
      const cls = [...el.classList].find((c) => !c.startsWith('gjs-'));
      parts.push(
        h('span', {
          class: 'xray-tag',
          style: `position:absolute;left:${ox + r.left}px;top:${oy + Math.max(r.top, 0)}px;font:600 10px/1 ui-monospace,Consolas,monospace;` +
            'padding:2px 4px;border-radius:0 0 4px 0;background:rgba(91,76,240,.85);color:#fff;white-space:nowrap;',
        }, el.tagName.toLowerCase() + (cls ? '.' + cls : '')),
      );
    }

    // Box model for the hovered or selected element.
    const target = (hovered ?? editor.getSelected())?.getEl() as HTMLElement | undefined;
    if (target && target.ownerDocument === doc && target !== doc.body) {
      const cs = doc.defaultView!.getComputedStyle(target);
      const px = (v: string) => parseFloat(v) || 0;
      const r = target.getBoundingClientRect();
      const m = [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)];
      const b = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
      const p = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
      const box = (x: number, y: number, w: number, hgt: number, extra: string) =>
        h('div', { style: `position:absolute;left:${ox + x}px;top:${oy + y}px;width:${Math.max(w, 0)}px;height:${Math.max(hgt, 0)}px;box-sizing:border-box;${extra}` });
      parts.push(
        box(r.left - m[3], r.top - m[0], r.width + m[1] + m[3], r.height + m[0] + m[2],
          `border-style:solid;border-color:${MARGIN};border-width:${m[0]}px ${m[1]}px ${m[2]}px ${m[3]}px;`),
        box(r.left + b[3], r.top + b[0], r.width - b[1] - b[3], r.height - b[0] - b[2],
          `border-style:solid;border-color:${PADDING};border-width:${p[0]}px ${p[1]}px ${p[2]}px ${p[3]}px;`),
        box(r.left + b[3] + p[3], r.top + b[0] + p[0], r.width - b[1] - b[3] - p[1] - p[3], r.height - b[0] - b[2] - p[0] - p[2],
          `background:${CONTENT};`),
      );
      const label = `${target.tagName.toLowerCase()}  ${Math.round(r.width)}×${Math.round(r.height)}  ` +
        `margin ${m.map(Math.round).join(' ')}  padding ${p.map(Math.round).join(' ')}`;
      parts.push(
        h('div', {
          style: `position:absolute;left:${ox + Math.max(r.left, 4)}px;top:${oy + Math.max(r.top - m[0] - 22, 4)}px;` +
            'font:600 11px ui-monospace,Consolas,monospace;padding:3px 7px;border-radius:5px;background:#111827;color:#fff;white-space:nowrap;',
        }, label),
      );
    }
    layer.replaceChildren(...parts);
  }

  let raf = 0;
  const schedule = () => {
    if (!on) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };
  editor.on('component:hovered', (c: Component | null) => {
    hovered = c && c.get('type') !== 'wrapper' ? c : null;
    schedule();
  });
  editor.on('component:toggled update component:styleUpdate change:device', schedule);
  editor.on('canvas:frame:load', ({ window: win }: { window: Window }) => {
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
    win.document.addEventListener('mouseleave', () => {
      hovered = null;
      schedule();
    });
  });
  new ResizeObserver(schedule).observe(stage);

  let saved = false;
  try {
    saved = localStorage.getItem(KEY) === '1';
  } catch {}
  editor.onReady(() => saved && set(true));
}
