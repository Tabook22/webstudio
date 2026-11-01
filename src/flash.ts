import { t } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { h } from './ui';

const KEY = 'webdesigner:flash';
const MAX_LINES = 6;

/** Lines removed / added between two versions (common start and end trimmed). */
export function lineDiff(before: string, after: string) {
  const a = before.split('\n');
  const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--;
    endB--;
  }
  const clean = (lines: string[]) => lines.map((l) => l.trim()).filter((l) => l && l !== '}' && l !== '{');
  return { removed: clean(a.slice(start, endA + 1)), added: clean(b.slice(start, endB + 1)) };
}

/**
 * "What just changed": after each visual action, a small card shows the code
 * that the action produced, so students connect clicks with HTML/CSS.
 */
export function setupFlash(opts: { onOpenCode: () => void; isCodeVisible: () => boolean }) {
  const stage = document.querySelector('.stage') as HTMLElement;
  const toggle = document.getElementById('btn-flash')!;
  let enabled = true;
  try {
    enabled = localStorage.getItem(KEY) !== 'off';
  } catch {}
  const sync = () => toggle.setAttribute('aria-pressed', String(enabled));
  sync();
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    sync();
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off');
    } catch {}
    if (!enabled) card?.remove();
  });

  const pending = new Map<string, { before: string; after: string }>();
  let timer = 0;
  let hideTimer = 0;
  let card: HTMLElement | null = null;

  function onCodeChange(file: string, before: string, after: string) {
    if (!enabled || opts.isCodeVisible()) return;
    const p = pending.get(file);
    pending.set(file, { before: p ? p.before : before, after });
    clearTimeout(timer);
    timer = window.setTimeout(show, 260);
  }

  function show() {
    const parts: (HTMLElement | string)[] = [];
    for (const [file, { before, after }] of pending) {
      const { removed, added } = lineDiff(before, after);
      if (!removed.length && !added.length) continue;
      // Very large changes (a template, a big paste) are not worth a flash.
      if (removed.length + added.length > 40) continue;
      const more = Math.max(0, removed.length - MAX_LINES) + Math.max(0, added.length - MAX_LINES);
      parts.push(
        h('div', { class: 'cf-file' }, file),
        ...removed.slice(0, MAX_LINES).map((l) => h('span', { class: 'cf-del' }, l)),
        ...added.slice(0, MAX_LINES).map((l) => h('span', { class: 'cf-add' }, l)),
        more ? h('span', { class: 'cf-file', style: 'color:#8b93a9;font-weight:500' }, `… +${more}`) : '',
      );
    }
    pending.clear();
    if (!parts.length) return;

    stage.querySelectorAll('.change-flash').forEach((el) => el.remove());
    card = h('div', { class: 'change-flash', role: 'status' },
      h('header', {},
        h('span', { class: 'cf-icon', html: icon(I.Code, 16) }),
        h('span', { class: 'cf-title' }, t('whatChanged')),
        h('button', { type: 'button', title: t('split'), html: icon(I.PanelsTopLeft, 15), onclick: opts.onOpenCode }),
        h('button', { type: 'button', title: t('close'), html: icon(I.X, 15), onclick: () => hide(true) }),
      ),
      h('pre', { dir: 'ltr' }, ...parts),
    );
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', () => scheduleHide());
    stage.append(card);
    scheduleHide();
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => hide(false), 5000);
  }

  function hide(now: boolean) {
    const c = card;
    if (!c) return;
    card = null;
    if (now) return c.remove();
    c.classList.add('leaving');
    c.addEventListener('animationend', () => c.remove(), { once: true });
  }

  return { onCodeChange };
}
