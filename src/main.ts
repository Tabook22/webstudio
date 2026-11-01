import 'grapesjs/dist/css/grapes.min.css';
import './styles.css';
import './panels.css';
import './theme.css';
import './missions.css';
import './table.css';
import type { Component } from 'grapesjs';
import { applyI18n, lang, setLang, t } from './i18n';
import * as Icons from './icons';
import { icon } from './icons';
import { createEditor } from './editor';
import { CodePanel } from './code';
import { setupTools } from './tools';
import { setupMedia } from './media';
import { showCheck } from './checker';
import { syncCanvasFonts } from './fonts';
import { openPreview, setupScripting } from './scripting';
import { setupFloatBar } from './floatbar';
import { setupXray } from './xray';
import { setupFlash } from './flash';
import { setupMissions } from './missions';
import { setupTableInsert } from './table';
import { KITS, applyKit, currentKitId, kitLabel, kitMood } from './kits';
import { RTL_TEMPLATES, TEMPLATES, templatePreviewHtml } from './templates';
import { $, debounce, h, modal, toast } from './ui';
import { addAsset, clearAssets, fileToDataUrl, fromCode, listAssets } from './assets';
import { serializeBody, type PageMeta } from './serialize';
import {
  BASE_CSS, canUseFolders, createProject, deleteProject, downloadZip, getCurrentId, importFolderHandle,
  importLooseFiles, importZip, listProjects, loadProject, newId, saveProject, saveToFolder,
  type ImportedSite, type Project,
} from './project';

/* ---------- chrome ---------- */

document.documentElement.lang = lang;
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
applyI18n();
document.querySelectorAll<HTMLElement>('i[data-icon]').forEach((el) => {
  el.outerHTML = icon((Icons as any)[el.dataset.icon!] ?? '', 18);
});

const editor = createEditor();
if (import.meta.env.DEV) (window as any).editor = editor;
let project: Project;

const meta = (): PageMeta => ({ title: project.title, siteLang: project.siteLang, hasScript: !!project.js?.trim() });

const code = new CodePanel({
  editor,
  htmlParent: $('#code-html'),
  cssParent: $('#code-css'),
  jsParent: $('#code-js'),
  getMeta: meta,
  onJs: (js) => {
    const hadScript = !!project.js?.trim();
    project.js = js;
    if (hadScript !== !!js.trim()) code.refresh();
    markDirty();
  },
  onCss: (css) => syncCanvasFonts(editor.Canvas.getDocument(), css),
  onCodeChange: (file, before, after) => flash?.onCodeChange(file, before, after),
  setMeta: (m) => {
    Object.assign(project, m);
    applySiteDir();
    markDirty();
  },
});

const tools = setupTools(editor);
setupFloatBar(editor, tools);
setupXray(editor);
setupTableInsert(editor);
setupMedia(editor, {
  insert: (content) => insertAndSelect(content),
  isUsed: (path) => {
    const f = code.files();
    return f.indexHtml.includes(path) || f.css.includes(path);
  },
});
setupScripting(code, () => preview());
if (import.meta.env.DEV) (window as any).code = code;

/* ---------- project state ---------- */

const nameInput = $<HTMLInputElement>('#project-name');
const statusSave = $('#status-save');
let dirty = false;
let loading = false;

function setStatus(text: string, kind = '') {
  statusSave.textContent = text;
  statusSave.dataset.kind = kind;
}

function applySiteDir() {
  const d = editor.Canvas.getDocument();
  if (!d || !project) return;
  d.documentElement.lang = project.siteLang;
  d.documentElement.dir = project.siteLang === 'ar' ? 'rtl' : 'ltr';
}
editor.on('canvas:frame:load', applySiteDir);

function snapshot(): Project {
  const { css } = code.files();
  const html = serializeBody(editor.getWrapper()!, css);
  // The whole image library is kept, used or not, like a real images/ folder.
  return { ...project, html, css, js: code.jsView.state.doc.toString(), assets: listAssets() };
}

function siteFiles() {
  const { indexHtml, css } = code.files();
  return { indexHtml, css, js: project.js ?? '', assets: listAssets() };
}

async function save(quiet = false) {
  setStatus(t('saving'));
  project = snapshot();
  await saveProject(project);
  dirty = false;
  setStatus(`${t('saved')} · ${new Date().toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
  if (!quiet) toast(t('saved'));
}

const autosave = debounce(() => save(true), 1500);

function markDirty() {
  if (loading) return;
  dirty = true;
  setStatus(t('unsaved'), 'warn');
  autosave();
}
editor.on('update', markDirty);

function load(p: Project) {
  loading = true;
  project = p;
  clearAssets();
  editor.Assets.getAll().reset();
  for (const a of p.assets) {
    addAsset(a.dataUrl, undefined, a.path);
    editor.Assets.add({ src: a.dataUrl, name: a.path } as any);
  }
  editor.select(undefined as any);
  // Styles first: inline style="" attributes in the HTML become extra rules.
  editor.setStyle(fromCode(p.css));
  editor.setComponents(fromCode(p.html));
  editor.UndoManager.clear();
  code.setJs(p.js ?? '');
  nameInput.value = p.name;
  document.title = `${p.name} · ${t('appName')}`;
  applySiteDir();
  code.reset();
  dirty = false;
  setStatus(t('saved'), 'ok');
  setTimeout(() => (loading = false), 300);
}

nameInput.addEventListener('change', () => {
  const name = nameInput.value.trim() || project.name;
  nameInput.value = name;
  if (project.title === project.name) project.title = name;
  project.name = name;
  document.title = `${name} · ${t('appName')}`;
  code.refresh();
  markDirty();
});

function fromImport(site: ImportedSite): Project {
  return {
    id: newId(),
    name: site.name,
    title: site.title || site.name,
    siteLang: site.siteLang || 'en',
    html: site.html,
    css: site.css.trim() ? site.css : BASE_CSS,
    js: site.js ?? '',
    assets: site.assets,
    updatedAt: Date.now(),
  };
}

/* ---------- modes, devices, history ---------- */

const workspace = $('#workspace');
const MODE_KEY = 'webdesigner:mode';

function setMode(mode: string) {
  workspace.dataset.mode = mode;
  document.querySelectorAll<HTMLButtonElement>('#mode-switch button').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.mode === mode)),
  );
  code.visible = mode !== 'visual';
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {}
  requestAnimationFrame(() => {
    editor.refresh();
    code.htmlView.requestMeasure();
    code.cssView.requestMeasure();
    code.highlightSelected();
  });
}
document.querySelectorAll<HTMLButtonElement>('#mode-switch button').forEach((b) =>
  b.addEventListener('click', () => setMode(b.dataset.mode!)),
);

function setDevice(id: string) {
  editor.setDevice(id);
  document.querySelectorAll<HTMLButtonElement>('#device-switch button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.device === id)),
  );
}
document.querySelectorAll<HTMLButtonElement>('#device-switch button').forEach((b) =>
  b.addEventListener('click', () => setDevice(b.dataset.device!)),
);

$('#btn-undo').addEventListener('click', () => editor.UndoManager.undo());
$('#btn-redo').addEventListener('click', () => editor.UndoManager.redo());

/* split view: drag the bar between page and code */
const splitter = $('#splitter');
splitter.addEventListener('pointerdown', (e) => {
  const center = splitter.parentElement!;
  const rect = center.getBoundingClientRect();
  splitter.setPointerCapture(e.pointerId);
  const move = (ev: PointerEvent) => {
    const pct = Math.min(80, Math.max(20, ((ev.clientY - rect.top) / rect.height) * 100));
    center.style.setProperty('--stage-size', `${pct}%`);
  };
  const up = () => {
    splitter.removeEventListener('pointermove', move);
    editor.refresh();
  };
  splitter.addEventListener('pointermove', move);
  splitter.addEventListener('pointerup', up, { once: true });
});

/* left panel tabs */
document.querySelectorAll<HTMLButtonElement>('.panel.left .tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.panel.left .tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll<HTMLElement>('[data-tab-body]').forEach((el) => (el.hidden = el.dataset.tabBody !== b.dataset.tab));
  }),
);

/* breadcrumb of the selected element */
const crumbs = $('#status-path');
editor.on('component:toggled', () => {
  const parts: Component[] = [];
  for (let c = editor.getSelected(); c && c.get('type') !== 'wrapper'; c = c.parent()) parts.unshift(c);
  crumbs.replaceChildren(
    h('span', {}, 'body'),
    ...parts.flatMap((c) => [
      h('span', { class: 'sep' }, '›'),
      h('button', { type: 'button', onclick: () => editor.select(c) }, String(c.get('tagName') || 'div')),
    ]),
  );
});

/* ---------- file actions ---------- */

async function newProjectDialog() {
  const name = h('input', { type: 'text', value: t('newProject'), dir: 'auto', required: true });
  const siteLang = h('select', {}, h('option', { value: 'en' }, 'English'), h('option', { value: 'ar' }, 'العربية'));
  siteLang.value = lang;
  const tx = (p: [string, string]) => p[lang === 'ar' ? 1 : 0];
  const gallery = h('div', { class: 'tpl-gallery' },
    ...TEMPLATES.map((tpl, i) =>
      h('label', { class: 'tpl-card' },
        h('input', { type: 'radio', name: 'tpl', value: tpl.id, checked: i === 0 }),
        h('div', { class: 'tpl-thumb' },
          tpl.html
            ? h('iframe', { srcdoc: templatePreviewHtml(tpl), loading: 'lazy', tabindex: '-1', 'aria-hidden': 'true', sandbox: '' })
            : h('div', { class: 'tpl-blank', html: icon(Icons.FilePlus, 36) }),
        ),
        h('div', { class: 'tpl-meta' }, h('strong', {}, tx(tpl.name)), h('small', {}, tx(tpl.desc))),
      ),
    ),
  );
  gallery.addEventListener('change', () => {
    const id = (gallery.querySelector('input:checked') as HTMLInputElement).value;
    if (RTL_TEMPLATES.has(id)) siteLang.value = 'ar';
  });
  const ok = await modal({
    title: t('newProject'),
    okLabel: t('create'),
    className: 'gallery',
    body: h('div', { class: 'stack' },
      h('div', { class: 'new-row' },
        h('label', { class: 'field' }, h('span', {}, t('projectName')), name),
        h('label', { class: 'field' }, h('span', {}, t('siteLang')), siteLang),
      ),
      h('div', { class: 'field' }, h('span', {}, t('chooseTemplate')), gallery),
    ),
  });
  if (!ok) return;
  if (dirty) await save(true);
  const tpl = (gallery.querySelector('input:checked') as HTMLInputElement).value;
  const p = createProject(name.value.trim() || t('newProject'), tpl, siteLang.value as 'en' | 'ar');
  load(p);
  await save(true);
}

async function kitsDialog() {
  const current = currentKitId(editor);
  let close: () => void = () => {};
  const grid = h('div', { class: 'kit-grid' },
    ...KITS.map((k) => {
      const v = k.vars;
      return h('button', {
        type: 'button', class: `kit${k.id === current ? ' on' : ''}`,
        onclick: () => {
          applyKit(editor, k);
          toast(`${t('kitApplied')}: ${kitLabel(k)}`);
          close();
        },
      },
        h('div', {
          class: 'kit-preview',
          style: `background:${v['--color-bg']};color:${v['--color-text']};border:1px solid rgba(0,0,0,.08);font-family:${v['--font-body']};border-radius:${v['--radius']}`,
        },
          h('b', { style: `font-family:${v['--font-heading']};color:${v['--color-heading']}` }, kitLabel(k)),
          h('span', {}, kitMood(k)),
          h('i', { style: `background:${v['--color-primary']};color:${v['--color-on-primary']};border-radius:${v['--radius']}` }, 'Button'),
        ),
        h('div', { class: 'kit-name' },
          h('div', { class: 'kit-dots' },
            ...['--color-primary', '--color-secondary', '--color-surface', '--color-dark'].map((key) => h('span', { style: `background:${v[key]}` })),
          ),
          k.id === current ? h('span', { html: icon(Icons.Check, 16), style: 'color:var(--accent)' }) : '',
        ),
      );
    }),
  );
  const fontsLink = h('link', {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Montserrat:wght@700&family=Merriweather:wght@700&family=Amiri:wght@700&family=Changa:wght@700&family=Open+Sans&family=Lato&family=Tajawal&display=swap',
  });
  const p = modal({
    title: t('designKits'),
    wide: true,
    body: h('div', {},
      fontsLink,
      h('p', { class: 'kit-note', html: `${t('kitsNote')} <code dir="ltr">:root { --color-primary: … }</code>` }),
      grid,
    ),
  });
  close = () => (document.querySelector('dialog.modal header .icon-btn') as HTMLButtonElement | null)?.click();
  await p;
}

async function projectsDialog() {
  if (dirty) await save(true);
  const list = await listProjects();
  const body = h('div', { class: 'project-list' });
  let closeFn: (() => void) | null = null;
  const render = (items: typeof list) => {
    body.replaceChildren(
      ...(items.length
        ? items.map((s) =>
            h('div', { class: `project-row${s.id === project.id ? ' current' : ''}` },
              h('button', {
                type: 'button', class: 'project-open',
                onclick: async () => {
                  const p = await loadProject(s.id);
                  if (p) load(p);
                  closeFn?.();
                },
              },
                h('strong', { dir: 'auto' }, s.name),
                h('small', {}, `${t('edited')}: ${new Date(s.updatedAt).toLocaleString(lang === 'ar' ? 'ar' : 'en')}`),
              ),
              s.id === project.id
                ? null
                : h('button', {
                    type: 'button', class: 'icon-btn danger', title: t('delete'), html: icon(Icons.Trash2, 16),
                    onclick: async () => {
                      if (!confirm(t('deleteProjectConfirm'))) return;
                      await deleteProject(s.id);
                      render(await listProjects());
                    },
                  }),
            ),
          )
        : [h('p', { class: 'hint' }, t('noProjects'))]),
    );
  };
  render(list);
  const p = modal({ title: t('myProjects'), body });
  closeFn = () => (document.querySelector('dialog.modal') as HTMLDialogElement | null)?.querySelector<HTMLButtonElement>('header .icon-btn')?.click();
  await p;
}

async function openSite(site: ImportedSite) {
  if (dirty) await save(true);
  load(fromImport(site));
  await save(true);
  toast(t('imported'));
}

async function openDialog() {
  const fileInput = h('input', { type: 'file', accept: '.zip,.html,.htm,.css,image/*', multiple: true, hidden: true });
  const dirInput = h('input', { type: 'file', hidden: true, webkitdirectory: true, multiple: true });
  const done = async (fn: () => Promise<ImportedSite>) => {
    try {
      const site = await fn();
      (document.querySelector('dialog.modal header .icon-btn') as HTMLButtonElement | null)?.click();
      await openSite(site);
    } catch (err) {
      console.error(err);
      toast(t('importFailed'), 'error');
    }
  };
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files ?? [])];
    const zip = files.find((f) => /\.zip$/i.test(f.name));
    done(() => (zip ? importZip(zip) : importLooseFiles(files)));
  });
  dirInput.addEventListener('change', () => done(() => importLooseFiles([...(dirInput.files ?? [])])));
  await modal({
    title: t('open'),
    body: h('div', { class: 'stack' },
      h('p', { class: 'hint' }, t('openFiles')),
      h('div', { class: 'big-choices' },
        h('button', { type: 'button', class: 'big-choice', onclick: () => fileInput.click(), html: `${icon(Icons.Upload, 28)}<span>${t('openZip')}</span>` }),
        h('button', {
          type: 'button', class: 'big-choice',
          onclick: async () => {
            if (!canUseFolders()) return dirInput.click();
            try {
              const dir = await (window as any).showDirectoryPicker({ id: 'webdesigner-open' });
              done(() => importFolderHandle(dir));
            } catch {}
          },
          html: `${icon(Icons.FolderOpen, 28)}<span>${t('openFolder')}</span>`,
        }),
      ),
      fileInput, dirInput,
    ),
  });
}

async function saveFolder(pickNew = false) {
  if (!canUseFolders()) {
    toast(t('folderUnsupported'), 'error');
    return;
  }
  try {
    await save(true);
    const name = await saveToFolder(project.id, siteFiles(), pickNew);
    toast(`${t('savedFolder')}: ${name}`);
    missions.event('folder');
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.error(err);
      toast(String(err?.message || err), 'error');
    }
  }
}

function preview() {
  const { indexHtml, css, js } = siteFiles();
  openPreview(fromCode(indexHtml), fromCode(css), js);
  missions.event('preview');
}

async function pasteHtmlDialog() {
  const area = h('textarea', { rows: 12, class: 'mono', dir: 'ltr', placeholder: '<h2>Hello</h2>\n<p>…</p>' });
  const ok = await modal({
    title: t('pasteHtml'), okLabel: t('insert'), wide: true,
    body: h('div', { class: 'stack' }, h('p', { class: 'hint' }, t('pasteHtmlHint')), area),
  });
  if (ok && area.value.trim()) insertHtml(area.value);
}

function insertAfterSelected(content: any) {
  const c = editor.getSelected();
  const parent = c?.parent();
  if (c && parent && c.get('type') !== 'wrapper') {
    return parent.components().add(content, { at: c.index() + 1 });
  }
  return editor.getWrapper()!.append(content);
}

function insertAndSelect(content: any) {
  const added = insertAfterSelected(content);
  const first = Array.isArray(added) ? added[0] : added;
  if (first) editor.select(first);
}

function insertHtml(html: string) {
  const added = insertAfterSelected(fromCode(html));
  const first = Array.isArray(added) ? added[0] : added;
  if (first) editor.select(first);
}

async function pageDialog() {
  const title = h('input', { type: 'text', value: project.title, dir: 'auto' });
  const siteLang = h('select', {}, h('option', { value: 'en' }, 'English (left → right)'), h('option', { value: 'ar' }, 'العربية (من اليمين ← لليسار)'));
  siteLang.value = project.siteLang;
  const ok = await modal({
    title: t('pageSettings'), okLabel: t('apply'),
    body: h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', {}, t('pageTitle')), title),
      h('label', { class: 'field' }, h('span', {}, t('siteLang')), siteLang),
    ),
  });
  if (!ok) return;
  project.title = title.value.trim() || project.name;
  project.siteLang = siteLang.value as 'en' | 'ar';
  applySiteDir();
  code.refresh();
  markDirty();
}

$('#btn-new').addEventListener('click', newProjectDialog);
$('#btn-projects').addEventListener('click', projectsDialog);
$('#btn-open').addEventListener('click', openDialog);
$('#btn-save').addEventListener('click', () => save());
$('#btn-folder').addEventListener('click', (e) => saveFolder((e as MouseEvent).shiftKey));
$('#btn-zip').addEventListener('click', async () => {
  await save(true);
  await downloadZip(project.name, siteFiles());
  missions.event('zip');
});
$('#btn-preview').addEventListener('click', preview);
$('#btn-paste').addEventListener('click', pasteHtmlDialog);
$('#btn-check').addEventListener('click', () => {
  missions.event('check');
  showCheck(editor, project.title);
});
$('#btn-kits').addEventListener('click', kitsDialog);

/* the ⋯ menu */
const moreBtn = $('#btn-more');
const moreMenu = $('#more-menu');
function closeMore() {
  moreMenu.hidden = true;
  moreBtn.setAttribute('aria-expanded', 'false');
}
moreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!moreMenu.hidden) return closeMore();
  const r = moreBtn.getBoundingClientRect();
  moreMenu.hidden = false;
  moreMenu.style.top = `${r.bottom + 6}px`;
  const w = moreMenu.offsetWidth;
  moreMenu.style.left = `${Math.min(Math.max(8, lang === 'ar' ? r.left : r.right - w), innerWidth - w - 8)}px`;
  moreBtn.setAttribute('aria-expanded', 'true');
});
moreMenu.addEventListener('click', closeMore);
document.addEventListener('click', (e) => {
  if (!moreMenu.hidden && !moreMenu.contains(e.target as Node)) closeMore();
});
window.addEventListener('keydown', (e) => e.key === 'Escape' && closeMore());

const missions = setupMissions(editor, {
  context: () => {
    const f = code.files();
    return { editor, all: editor.getWrapper()!.find('*'), html: f.indexHtml, css: f.css, js: code.jsView.state.doc.toString(), meta: meta() };
  },
  startOnNewPage: async (name) => {
    if (dirty) await save(true);
    load(createProject(name, 'blank', lang));
    await save(true);
  },
});

const flash = setupFlash({
  onOpenCode: () => setMode('split'),
  isCodeVisible: () => workspace.dataset.mode !== 'visual',
});

/* light / dark editor theme */
const themeBtn = $('#btn-theme');
function setTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('webdesigner:theme', theme);
  } catch {}
  const dark = theme === 'dark';
  themeBtn.innerHTML = icon(dark ? Icons.Sun : Icons.Moon, 18);
  themeBtn.title = t(dark ? 'lightMode' : 'darkMode');
  themeBtn.setAttribute('aria-label', themeBtn.title);
}
setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#btn-page').addEventListener('click', pageDialog);
$('#btn-lang').addEventListener('click', async () => {
  if (dirty) await save(true);
  setLang(lang === 'ar' ? 'en' : 'ar');
  location.reload();
});

const BIG_KEY = 'webdesigner:big';
function setBig(on: boolean) {
  document.documentElement.classList.toggle('big', on);
  $('#btn-big').setAttribute('aria-pressed', String(on));
  try {
    localStorage.setItem(BIG_KEY, on ? '1' : '');
  } catch {}
  requestAnimationFrame(() => editor.refresh());
}
$('#btn-big').addEventListener('click', () => setBig(!document.documentElement.classList.contains('big')));

/* ---------- keyboard + clipboard ---------- */

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});

async function onPaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest?.('.cm-editor, input, textarea, dialog')) return;
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  for (const f of files) {
    const dataUrl = await fileToDataUrl(f);
    const path = addAsset(dataUrl, f.name && f.name !== 'image.png' ? f.name : `pasted-${Date.now().toString(36)}.png`);
    editor.Assets.add({ src: dataUrl, name: path } as any);
    const added = insertAfterSelected({ type: 'image', src: dataUrl, attributes: { alt: '' }, style: { 'max-width': '100%' } });
    const first = Array.isArray(added) ? added[0] : added;
    if (first) editor.select(first);
  }
  toast(t('pastedImage'));
}
document.addEventListener('paste', onPaste);
editor.on('canvas:frame:load', ({ window: win }: { window: Window }) => win.document.addEventListener('paste', onPaste));

window.addEventListener('beforeunload', () => {
  if (dirty) save(true);
});

/* ---------- start ---------- */

async function start() {
  let mode = 'visual';
  try {
    mode = localStorage.getItem(MODE_KEY) || 'visual';
    setBig(localStorage.getItem(BIG_KEY) === '1');
  } catch {}
  setMode(mode);
  setDevice('desktop');
  const id = getCurrentId();
  const existing = id ? await loadProject(id) : undefined;
  if (existing) load(existing);
  else {
    load(createProject(lang === 'ar' ? 'موقعي الأول' : 'My first website', 'personal', lang));
    await save(true);
  }
}

editor.onReady(start);
