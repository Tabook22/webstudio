import { t } from './i18n';
import { X, icon } from './icons';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, any> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null && c !== false) el.append(c);
  return el;
}

let toastTimer = 0;
export function toast(message: string, kind: 'ok' | 'error' = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
}

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  okLabel?: string;
  onOk?: () => boolean | void | Promise<boolean | void>;
  wide?: boolean;
}

/** Simple accessible dialog. Resolves true when confirmed. */
export function modal(opts: ModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: `modal${opts.wide ? ' wide' : ''}` });
    const close = (ok: boolean) => {
      dlg.close();
      dlg.remove();
      resolve(ok);
    };
    const okBtn = opts.okLabel
      ? h('button', { class: 'btn primary', type: 'submit' }, opts.okLabel)
      : null;
    const form = h(
      'form',
      {
        method: 'dialog',
        onsubmit: async (e: Event) => {
          e.preventDefault();
          if (opts.onOk && (await opts.onOk()) === false) return;
          close(true);
        },
      },
      h('header', {},
        h('h2', {}, opts.title),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('close'), html: icon(X), onclick: () => close(false) }),
      ),
      h('div', { class: 'modal-body' }, opts.body),
      okBtn &&
        h('footer', {},
          h('button', { type: 'button', class: 'btn', onclick: () => close(false) }, t('cancel')),
          okBtn,
        ),
    );
    dlg.append(form);
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(false);
    });
    document.body.append(dlg);
    dlg.showModal();
    (dlg.querySelector('input, textarea, select') as HTMLElement | null)?.focus();
  });
}

/** Ask for one line of text. */
export async function askText(title: string, label: string, value = ''): Promise<string | null> {
  const input = h('input', { type: 'text', value, dir: 'auto' });
  const ok = await modal({
    title,
    okLabel: t('apply'),
    body: h('label', { class: 'field' }, h('span', {}, label), input),
  });
  return ok ? input.value.trim() : null;
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let id = 0;
  const run = (...a: A) => {
    clearTimeout(id);
    id = window.setTimeout(() => fn(...a), ms);
  };
  run.cancel = () => clearTimeout(id);
  return run;
}
