import type { Component, Editor } from 'grapesjs';
import { lang, t } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { h, modal } from './ui';
import { Grid } from './table';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

interface Issue {
  level: 'error' | 'warn' | 'tip';
  text: Pair;
  comp?: Component;
}

const tagOf = (c: Component) => String(c.get('tagName') || '').toLowerCase();
const textOf = (c: Component) => (c.getEl()?.textContent || '').trim();

/** Look for common beginner mistakes in the page's HTML. */
export function checkPage(editor: Editor, title: string): Issue[] {
  const wrapper = editor.getWrapper()!;
  const all = wrapper.find('*');
  const issues: Issue[] = [];
  const add = (level: Issue['level'], text: Pair, comp?: Component) => issues.push({ level, text, comp });

  if (!all.length) add('tip', ['The page is empty. Drag some blocks onto it.', 'الصفحة فارغة. اسحب بعض العناصر إليها.']);
  if (!title.trim() || /^(my first website|new website|موقعي الأول|موقع جديد)$/i.test(title.trim())) {
    add('tip', ['Give the page a real title (⚙ Page settings). It shows in the browser tab and in Google.', 'اكتب عنوانًا حقيقيًا للصفحة (⚙ إعدادات الصفحة). يظهر في تبويب المتصفح وفي جوجل.']);
  }

  const h1s = all.filter((c) => tagOf(c) === 'h1');
  if (all.length && !h1s.length) add('warn', ['There is no <h1>. Every page should have one main heading.', 'لا يوجد <h1>. يجب أن تحتوي كل صفحة على عنوان رئيسي واحد.']);
  h1s.slice(1).forEach((c) => add('warn', ['More than one <h1>. Use <h2> for section headings.', 'يوجد أكثر من <h1>. استخدم <h2> لعناوين الأقسام.'], c));

  let last = 0;
  for (const c of all.filter((c) => /^h[1-6]$/.test(tagOf(c)))) {
    const level = Number(tagOf(c)[1]);
    if (last && level > last + 1) {
      add('warn', [`Heading jumps from <h${last}> to <h${level}>. Don't skip levels.`, `العنوان يقفز من <h${last}> إلى <h${level}>. لا تتخطَّ المستويات.`], c);
    }
    if (!textOf(c)) add('warn', ['Empty heading.', 'عنوان فارغ.'], c);
    last = level;
  }

  for (const c of all) {
    const tag = tagOf(c);
    const attrs = c.getAttributes() as Record<string, string>;
    if (tag === 'img' && !(attrs.alt || '').trim()) {
      add('error', ['Image without alt text. Describe the picture for blind visitors and search engines.', 'صورة بدون نص بديل (alt). صف الصورة للمكفوفين ولمحركات البحث.'], c);
    }
    if (tag === 'a') {
      const href = (attrs.href || '').trim();
      if (!href || href === '#') add('tip', ['Link goes nowhere (href="#"). Set its address in Settings.', 'الرابط لا يذهب إلى أي مكان (href="#"). عيّن عنوانه في الإعدادات.'], c);
      if (!textOf(c) && !c.find('img').length) add('error', ['Link has no text.', 'رابط بدون نص.'], c);
    }
    if (tag === 'button' && !textOf(c)) add('error', ['Button has no text.', 'زر بدون نص.'], c);
    if (tag === 'p' && !textOf(c) && !c.components().length) add('tip', ['Empty paragraph — delete it or add text.', 'فقرة فارغة — احذفها أو أضف نصًا.'], c);
    if (['input', 'textarea', 'select'].includes(tag) && attrs.type !== 'submit' && attrs.type !== 'hidden') {
      const id = attrs.id;
      const labelled =
        (id && all.some((l) => tagOf(l) === 'label' && (l.getAttributes() as any).for === id)) ||
        !!closestTag(c, 'label') || !!attrs['aria-label'];
      if (!labelled) add('warn', ['Form field without a <label>. Visitors may not know what to type.', 'حقل نموذج بدون <label>. قد لا يعرف الزائر ماذا يكتب.'], c);
    }
    if (tag === 'table' && !c.find('th').length) add('tip', ['Table has no header cells (<th>).', 'الجدول بدون خلايا عناوين (<th>).'], c);
    if (tag === 'table' && new Grid(c).unevenRows()) {
      add('warn', ['Some rows of this table have a different number of cells. A merge (colspan/rowspan) may be wrong.', 'بعض صفوف هذا الجدول فيها عدد مختلف من الخلايا. قد يكون الدمج (colspan/rowspan) خاطئًا.'], c);
    }
  }

  const seen = new Map<string, Component>();
  for (const c of all) {
    const id = (c.get('attributes') as any)?.id as string | undefined;
    if (!id) continue;
    if (seen.has(id)) add('error', [`The id "${id}" is used twice. Each id must be unique.`, `المعرف "${id}" مستخدم مرتين. يجب أن يكون كل معرف فريدًا.`], c);
    seen.set(id, c);
  }
  return issues;
}

function closestTag(c: Component, tag: string) {
  for (let p = c.parent(); p; p = p.parent()) if (tagOf(p) === tag) return p;
  return undefined;
}

export async function showCheck(editor: Editor, title: string) {
  const issues = checkPage(editor, title);
  const ICON = { error: I.X, warn: I.Info, tip: I.Info };
  let close: () => void = () => {};
  const body = issues.length
    ? h('div', { class: 'issues' },
        h('p', { class: 'hint' }, `${issues.length} ${t('problems')}`),
        ...issues.map((i) =>
          h('div', { class: `issue ${i.level}` },
            h('span', { class: 'issue-icon', html: icon(ICON[i.level], 16) }),
            h('span', { class: 'issue-text', dir: 'auto' }, tx(i.text)),
            i.comp
              ? h('button', {
                  type: 'button', class: 'btn small',
                  onclick: () => {
                    editor.select(i.comp!);
                    editor.Canvas.scrollTo(i.comp!, { behavior: 'smooth', block: 'center' } as any);
                    close();
                  },
                }, t('show'))
              : null,
          ),
        ),
      )
    : h('div', { class: 'check-ok', html: `${icon(I.SquareCheck, 40)}<strong>${t('checkOk')}</strong>` });
  const p = modal({ title: t('check'), body, wide: true });
  close = () => (document.querySelector('dialog.modal header .icon-btn') as HTMLButtonElement | null)?.click();
  await p;
}
