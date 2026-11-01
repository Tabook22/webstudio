/**
 * Images live inside the project as data URLs (so the canvas can show them
 * without a server), but students always see them as real files such as
 * `images/photo.png` in the code and in downloads.
 */
export interface Asset {
  path: string;
  dataUrl: string;
}

const byPath = new Map<string, string>();
const byData = new Map<string, string>();

const listeners = new Set<() => void>();
let notifyQueued = false;

/** Called (batched) whenever the image library changes. */
export function onAssetsChange(fn: () => void) {
  listeners.add(fn);
}

function notify() {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    listeners.forEach((fn) => fn());
  });
}

export function getAssetData(path: string) {
  return byPath.get(path.replace(/^\.\//, ''));
}

export function removeAsset(path: string) {
  const data = byPath.get(path);
  if (!data) return;
  byPath.delete(path);
  byData.delete(data);
  notify();
}

const DATA_URL_RE = /data:image\/[a-z0-9+.-]+[;,][^"'\s)]*/gi;

const EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
  'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp', 'image/x-icon': 'ico',
};

export function clearAssets() {
  byPath.clear();
  byData.clear();
  notify();
}

export function listAssets(): Asset[] {
  return [...byPath].map(([path, dataUrl]) => ({ path, dataUrl }));
}

function cleanName(name: string) {
  const base = name.toLowerCase().replace(/\\/g, '/').split('/').pop() || 'image';
  return base.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
}

function uniquePath(name: string) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let path = `images/${stem}${ext}`;
  for (let i = 2; byPath.has(path); i++) path = `images/${stem}-${i}${ext}`;
  return path;
}

/** Register an image; returns its project path. Reuses the path if already known. */
export function addAsset(dataUrl: string, name?: string, exactPath?: string): string {
  // Brackets and quotes would end a CSS url(...) early; keep data URLs safe.
  dataUrl = dataUrl.replace(/[()']/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const known = byData.get(dataUrl);
  if (known) return known;
  let path: string;
  if (exactPath) {
    path = exactPath.replace(/^\.\//, '');
  } else {
    const mime = dataUrl.slice(5, dataUrl.search(/[;,]/));
    let file = cleanName(name || 'image');
    if (!/\.[a-z0-9]+$/.test(file)) file += '.' + (EXT[mime] || 'png');
    path = uniquePath(file);
  }
  byPath.set(path, dataUrl);
  byData.set(dataUrl, path);
  notify();
  return path;
}

/** Replace embedded data URLs with their file paths (what students see). */
export function toCode(str: string): string {
  return str.replace(DATA_URL_RE, (m) => byData.get(m) ?? addAsset(m));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace file paths with data URLs (what the canvas needs). */
export function fromCode(str: string): string {
  let out = str;
  for (const [path, dataUrl] of byPath) {
    const re = new RegExp(`(["'(]\\s*)(?:\\./)?${escapeRe(path)}(\\s*["')])`, 'g');
    out = out.replace(re, (_m, a, b) => `${a}${dataUrl}${b}`);
  }
  return out;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, comma);
  const data = dataUrl.slice(comma + 1);
  const mime = meta.split(';')[0] || 'application/octet-stream';
  if (meta.includes(';base64')) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(data)], { type: mime });
}

export const isImageFile = (name: string) => /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(name);
