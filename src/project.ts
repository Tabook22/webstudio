import { get, set, del } from 'idb-keyval';
import JSZip from 'jszip';
import type { Asset } from './assets';
import { dataUrlToBlob, fileToDataUrl, isImageFile } from './assets';
import { parseDocument, formatCss } from './serialize';
import { STARTER_CSS, placeholderImage } from './blocks';

export interface Project {
  id: string;
  name: string;
  title: string;
  siteLang: 'en' | 'ar';
  /** Inside of <body>, code form (images as images/… paths). */
  html: string;
  css: string;
  assets: Asset[];
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

const INDEX_KEY = 'projects';
const CURRENT_KEY = 'webdesigner:current';

export const BASE_CSS = `body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif;
  line-height: 1.6;
  color: #1e293b;
}

img {
  max-width: 100%;
}
`;

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export async function listProjects(): Promise<ProjectSummary[]> {
  const list = ((await get(INDEX_KEY)) as ProjectSummary[] | undefined) ?? [];
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  return get(`project:${id}`);
}

export async function saveProject(p: Project) {
  p.updatedAt = Date.now();
  await set(`project:${p.id}`, p);
  const list = (await listProjects()).filter((s) => s.id !== p.id);
  list.push({ id: p.id, name: p.name, updatedAt: p.updatedAt });
  await set(INDEX_KEY, list);
  setCurrentId(p.id);
}

export async function deleteProject(id: string) {
  await del(`project:${id}`);
  await del(`dir:${id}`);
  await set(INDEX_KEY, (await listProjects()).filter((s) => s.id !== id));
}

export function getCurrentId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

function setCurrentId(id: string) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {}
}

/* ---------- starter templates ---------- */

export type TemplateId = 'blank' | 'personal' | 'landing';

const cssOf = (...parts: string[]) =>
  formatCss(parts.map((p) => p.replace(/<\/?style>/g, '')).join(''));

export function createProject(name: string, template: TemplateId, siteLang: 'en' | 'ar'): Project {
  const p: Project = {
    id: newId(), name, title: name, siteLang, html: '', css: BASE_CSS, assets: [], updatedAt: Date.now(),
  };
  if (template === 'personal') {
    p.assets = [{ path: 'images/me.svg', dataUrl: placeholderImage('Me') }];
    p.html = `<section class="section">
  <img src="images/me.svg" alt="A photo of me" style="width:180px;height:180px;object-fit:cover;border-radius:50%;">
  <h1>Hello, I'm Sara</h1>
  <p>I am a student learning how to design websites. This is my first page.</p>
  <h2>My hobbies</h2>
  <ul>
    <li>Reading</li>
    <li>Photography</li>
    <li>Football</li>
  </ul>
  <h2>My timetable</h2>
  <table class="table">
    <thead><tr><th>Day</th><th>Subject</th></tr></thead>
    <tbody><tr><td>Sunday</td><td>Web Design</td></tr><tr><td>Monday</td><td>Databases</td></tr></tbody>
  </table>
</section>`;
    p.css = BASE_CSS + '\n' + cssOf(STARTER_CSS.section, STARTER_CSS.table);
  } else if (template === 'landing') {
    p.html = `<nav class="navbar"><a class="brand" href="#">My Brand</a><ul><li><a href="#">Home</a></li><li><a href="#">Features</a></li><li><a href="#">Contact</a></li></ul></nav>
<header class="hero"><h1>Build something great</h1><p>One clear sentence that explains your idea.</p><a class="btn" href="#" style="background:#ffffff;color:#4f46e5;">Get started</a></header>
<section class="section"><div class="row"><div class="card"><h3>Fast</h3><p>Explain the first idea.</p></div><div class="card"><h3>Simple</h3><p>Explain the second idea.</p></div><div class="card"><h3>Friendly</h3><p>Explain the third idea.</p></div></div></section>
<footer class="footer"><p>© 2026 My Brand</p></footer>`;
    p.css = BASE_CSS + '\n' + cssOf(STARTER_CSS.nav, STARTER_CSS.hero, STARTER_CSS.btn, STARTER_CSS.section, STARTER_CSS.cols, STARTER_CSS.card, STARTER_CSS.footer);
  }
  return p;
}

/* ---------- export ---------- */

export interface SiteFiles {
  indexHtml: string;
  css: string;
  assets: Asset[];
}

export async function downloadZip(name: string, files: SiteFiles) {
  const zip = new JSZip();
  const folder = zip.folder(slug(name))!;
  folder.file('index.html', files.indexHtml);
  folder.file('style.css', files.css);
  for (const a of files.assets) folder.file(a.path, dataUrlToBlob(a.dataUrl));
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${slug(name)}.zip`);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'my-website';

/* ---------- save into a real folder (Chrome / Edge) ---------- */

type DirHandle = FileSystemDirectoryHandle & {
  requestPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
  queryPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>;
};

export const canUseFolders = () => 'showDirectoryPicker' in window;

export async function saveToFolder(projectId: string, files: SiteFiles, pickNew = false) {
  let dir = pickNew ? undefined : ((await get(`dir:${projectId}`)) as DirHandle | undefined);
  if (dir && (await dir.queryPermission?.({ mode: 'readwrite' })) !== 'granted') {
    if ((await dir.requestPermission?.({ mode: 'readwrite' })) !== 'granted') dir = undefined;
  }
  if (!dir) {
    dir = await (window as any).showDirectoryPicker({ id: 'webdesigner', mode: 'readwrite' });
    await set(`dir:${projectId}`, dir);
  }
  const write = async (d: FileSystemDirectoryHandle, name: string, data: Blob | string) => {
    const fh = await d.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close();
  };
  await write(dir!, 'index.html', files.indexHtml);
  await write(dir!, 'style.css', files.css);
  for (const a of files.assets) {
    const parts = a.path.split('/');
    let d: FileSystemDirectoryHandle = dir!;
    for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
    await write(d, parts[parts.length - 1], dataUrlToBlob(a.dataUrl));
  }
  return dir!.name;
}

/* ---------- import ---------- */

export interface ImportedSite {
  name: string;
  title?: string;
  siteLang?: 'en' | 'ar';
  html: string;
  css: string;
  assets: Asset[];
}

interface LooseFile {
  path: string;
  read: () => Promise<string>;
  blob: () => Promise<Blob>;
}

async function importFromFiles(files: LooseFile[], fallbackName: string): Promise<ImportedSite> {
  const htmlFiles = files.filter((f) => /\.html?$/i.test(f.path) && !f.path.includes('__MACOSX'));
  if (!htmlFiles.length) throw new Error('no html');
  htmlFiles.sort((a, b) => {
    const ai = /(^|\/)index\.html?$/i.test(a.path) ? 0 : 1;
    const bi = /(^|\/)index\.html?$/i.test(b.path) ? 0 : 1;
    return ai - bi || a.path.split('/').length - b.path.split('/').length;
  });
  const main = htmlFiles[0];
  const base = main.path.includes('/') ? main.path.slice(0, main.path.lastIndexOf('/') + 1) : '';
  const rel = (p: string) => (p.startsWith(base) ? p.slice(base.length) : p);

  const raw = await main.read();
  const parsed = parseDocument(raw);
  const linkHrefs = [...raw.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
    .filter((h): h is string => !!h && !/^https?:/i.test(h))
    .map((h) => h.replace(/^\.\//, ''));
  const cssFiles = files.filter((f) => /\.css$/i.test(f.path));
  const chosenCss = linkHrefs.length
    ? cssFiles.filter((f) => linkHrefs.includes(rel(f.path)))
    : cssFiles.filter((f) => rel(f.path).split('/').length === 1);
  const cssParts = await Promise.all(chosenCss.map((f) => f.read()));
  if (parsed.headCss.trim()) cssParts.push(parsed.headCss);

  const assets: Asset[] = [];
  for (const f of files.filter((f) => isImageFile(f.path) && f.path.startsWith(base))) {
    assets.push({ path: rel(f.path), dataUrl: await fileToDataUrl(await f.blob()) });
  }
  const folderName = base.replace(/\/$/, '').split('/').pop();
  return {
    name: parsed.title || folderName || fallbackName,
    title: parsed.title,
    siteLang: parsed.siteLang,
    html: parsed.body.replace(/(src|href)=(["'])\.\//g, '$1=$2'),
    css: cssParts.join('\n'),
    assets,
  };
}

export async function importZip(file: File): Promise<ImportedSite> {
  const zip = await JSZip.loadAsync(file);
  const files: LooseFile[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    files.push({ path, read: () => entry.async('string'), blob: () => entry.async('blob') });
  });
  return importFromFiles(files, file.name.replace(/\.zip$/i, ''));
}

export async function importLooseFiles(list: File[]): Promise<ImportedSite> {
  const files: LooseFile[] = list.map((f) => ({
    path: ((f as any).webkitRelativePath as string) || f.name,
    read: () => f.text(),
    blob: async () => f,
  }));
  return importFromFiles(files, list[0]?.name.replace(/\.html?$/i, '') || 'Imported site');
}

export async function importFolderHandle(dir: FileSystemDirectoryHandle): Promise<ImportedSite> {
  const files: LooseFile[] = [];
  const walk = async (d: FileSystemDirectoryHandle, prefix: string, depth: number) => {
    for await (const [name, h] of (d as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
      if (h.kind === 'directory') {
        if (depth < 4 && !name.startsWith('.') && name !== 'node_modules') {
          await walk(h as FileSystemDirectoryHandle, `${prefix}${name}/`, depth + 1);
        }
      } else {
        const fh = h as FileSystemFileHandle;
        files.push({ path: prefix + name, read: async () => (await fh.getFile()).text(), blob: () => fh.getFile() });
      }
    }
  };
  await walk(dir, '', 0);
  const site = await importFromFiles(files, dir.name);
  if (!site.title) site.name = dir.name;
  return site;
}
