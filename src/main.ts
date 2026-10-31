import 'grapesjs/dist/css/grapes.min.css';
import './styles.css';
import type { Component } from 'grapesjs';
import { applyI18n, lang, setLang, t } from './i18n';
import * as Icons from './icons';
import { icon } from './icons';
import { createEditor } from './editor';
import { CodePanel } from './code';
import { setupTools } from './tools';
import { $, debounce, h, modal, toast } from './ui';
import { addAsset, clearAssets, fileToDataUrl, fromCode, listAssets } from './assets';
import { serializeBody, type PageMeta } from './serialize';
import {
  BASE_CSS, canUseFolders, createProject, deleteProject, downloadZip, getCurrentId, importFolderHandle,
  importLooseFiles, importZip, listProjects, loadProject, newId, saveProject, saveToFolder,
  type ImportedSite, type Project, type TemplateId,
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

const meta = (): PageMeta => ({ title: project.title, siteLang: project.siteLang });

const code = new CodePanel({
  editor,
  htmlParent: $('#code-html'),
  cssParent: $('#code-css'),
  getMeta: meta,
  setMeta: (m) => {
    Object.assign(project, m);
    applySiteDir();
    markDirty();
  },
});

setupTools(editor);
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

function usedAssets(html: string, css: string) {
  return listAssets().filter((a) => html.includes(a.path) || css.includes(a.path));
}

function snapshot(): Project {
  const { css } = code.files();
  const html = serializeBody(editor.getWrapper()!, css);
  return { ...project, html, css, assets: usedAssets(html, css) };
}

function siteFiles() {
  const { indexHtml, css } = code.files();
  return { indexHtml, css, assets: usedAssets(indexHtml, css) };
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
  const tpls: [TemplateId, Parameters<typeof t>[0], string][] = [
    ['blank', 'tplBlank', Icons.Square],
    ['personal', 'tplPersonal', Icons.IdCard],
    ['landing', 'tplLanding', Icons.LayoutTemplate],
  ];
  const grid = h('div', { class: 'tpl-grid' },
    ...tpls.map(([id, key, svg], i) =>
      h('label', { class: 'tpl' },
        h('input', { type: 'radio', name: 'tpl', value: id, checked: i === 0 }),
        h('span', { class: 'tpl-icon', html: icon(svg, 28) }),
        h('span', {}, t(key)),
      ),
    ),
  );
  const ok = await modal({
    title: t('newProject'),
    okLabel: t('create'),
    body: h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', {}, t('projectName')), name),
      h('div', { class: 'field' }, h('span', {}, t('chooseTemplate')), grid),
      h('label', { class: 'field' }, h('span', {}, t('siteLang')), siteLang),
    ),
  });
  if (!ok) return;
  if (dirty) await save(true);
  const tpl = (grid.querySelector('input:checked') as HTMLInputElement).value as TemplateId;
  const p = createProject(name.value.trim() || t('newProject'), tpl, siteLang.value as 'en' | 'ar');
  load(p);
  await save(true);
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
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.error(err);
      toast(String(err?.message || err), 'error');
    }
  }
}

function preview() {
  const { indexHtml, css } = siteFiles();
  const html = fromCode(indexHtml).replace('<link rel="stylesheet" href="style.css">', `<style>\n${fromCode(css)}</style>`);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
});
$('#btn-preview').addEventListener('click', preview);
$('#btn-paste').addEventListener('click', pasteHtmlDialog);
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
