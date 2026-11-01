import type { Component } from 'grapesjs';
import { toCode } from './assets';
import { googleFontsHref } from './fonts';

export interface PageMeta {
  title: string;
  siteLang: 'en' | 'ar';
  /** Link script.js before </body> (when the project has JavaScript). */
  hasScript?: boolean;
}

export interface CodeRange {
  comp: Component;
  from: number;
  to: number;
}

const INLINE = new Set([
  'a', 'abbr', 'b', 'br', 'button', 'code', 'em', 'i', 'img', 'input', 'kbd', 'label', 'mark',
  'q', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'select', 'textarea',
]);
const RAW = new Set(['pre', 'textarea', 'script', 'style', 'svg']);
const IND = '  ';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tagOf = (c: Component) => String(c.get('tagName') || 'div').toLowerCase();
const isTextNode = (c: Component) => c.get('type') === 'textnode';
const isInline = (c: Component) => isTextNode(c) || INLINE.has(tagOf(c));

type HtmlOpts = { attributes: (c: Component, attrs: Record<string, any>) => Record<string, any> };

/**
 * GrapesJS gives every element it has ever selected an id. Only print ids the
 * student wrote or that the CSS actually uses, so the code stays clean.
 */
function htmlOpts(css: string): HtmlOpts {
  const used = new Set([...css.matchAll(/#([\w-]+)[^{}]*\{\s*[^}\s]/g)].map((m) => m[1]));
  return {
    attributes: (c, attrs) => {
      if (attrs.id && !used.has(attrs.id) && !(c.get('attributes') as any)?.id) delete attrs.id;
      return attrs;
    },
  };
}

function openTag(c: Component, hasInner: boolean, opts: HtmlOpts) {
  const attr = toCode((c as any).__attrToString(opts));
  const selfClose = !hasInner && c.get('void');
  return `<${tagOf(c)}${attr ? ' ' + attr : ''}${selfClose ? '/' : ''}>`;
}

/**
 * Pretty-print a component tree and remember where every component sits in
 * the text, so the canvas and the code can point at each other.
 */
class Writer {
  out = '';
  ranges: CodeRange[] = [];
  private opts: HtmlOpts;

  constructor(css: string) {
    this.opts = htmlOpts(css);
  }

  /** Write a component on the current line, tracking nested components. */
  inline(c: Component) {
    const start = this.out.length;
    if (isTextNode(c)) {
      this.out += toCode(c.toHTML(this.opts));
      return;
    }
    const kids = c.components();
    if (!kids.length || RAW.has(tagOf(c))) {
      this.out += toCode(c.toHTML(this.opts));
    } else {
      this.out += openTag(c, true, this.opts);
      kids.forEach((k: Component) => this.inline(k));
      this.out += `</${tagOf(c)}>`;
    }
    this.ranges.push({ comp: c, from: start, to: this.out.length });
  }

  block(c: Component, depth: number) {
    const pad = IND.repeat(depth);
    if (isTextNode(c)) {
      const text = c.toHTML(this.opts).replace(/\s+/g, ' ').trim();
      if (text) this.out += pad + toCode(text) + '\n';
      return;
    }
    const kids = c.components();
    const oneLine =
      !kids.length || RAW.has(tagOf(c)) || c.is('text') || kids.every((k: Component) => isInline(k));
    if (oneLine) {
      this.out += pad;
      this.inline(c);
      this.out += '\n';
      return;
    }
    const start = this.out.length + pad.length;
    this.out += pad + openTag(c, true, this.opts) + '\n';
    kids.forEach((k: Component) => this.block(k, depth + 1));
    this.out += `${pad}</${tagOf(c)}>`;
    this.ranges.push({ comp: c, from: start, to: this.out.length });
    this.out += '\n';
  }
}

export function serializeDocument(wrapper: Component, meta: PageMeta, css: string) {
  const w = new Writer(css);
  const dir = meta.siteLang === 'ar' ? 'rtl' : 'ltr';
  const fonts = googleFontsHref(css);
  w.out =
    `<!DOCTYPE html>\n<html lang="${meta.siteLang}" dir="${dir}">\n<head>\n` +
    `${IND}<meta charset="UTF-8">\n` +
    `${IND}<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
    `${IND}<title>${escHtml(meta.title)}</title>\n` +
    (fonts ? `${IND}<link rel="stylesheet" href="${fonts.replace(/&/g, '&amp;')}">\n` : '') +
    `${IND}<link rel="stylesheet" href="style.css">\n</head>\n<body>\n`;
  wrapper.components().forEach((c: Component) => w.block(c, 1));
  if (meta.hasScript) w.out += `${IND}<script src="script.js"></script>\n`;
  w.out += '</body>\n</html>\n';
  return { code: w.out, ranges: w.ranges };
}

/** Just the inside of <body>, in code form (paths instead of data URLs). */
export function serializeBody(wrapper: Component, css: string) {
  const w = new Writer(css);
  wrapper.components().forEach((c: Component) => w.block(c, 0));
  return w.out;
}

/** Find the innermost component whose code contains `pos`. */
export function componentAt(ranges: CodeRange[], pos: number): Component | null {
  let best: CodeRange | null = null;
  for (const r of ranges) {
    if (pos >= r.from && pos <= r.to && (!best || r.to - r.from < best.to - best.from)) best = r;
  }
  return best?.comp ?? null;
}

/** Readable CSS: one declaration per line, nested @media blocks indented. */
export function formatCss(css: string): string {
  let out = '';
  let depth = 0;
  let buf = '';
  let quote = '';
  const flush = () => {
    const s = buf.trim();
    buf = '';
    return s;
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      buf += ch;
      if (ch === quote && css[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === '(') {
      // keep url(...) / rgba(...) intact even when they contain ; or :
      let level = 0;
      let j = i;
      for (; j < css.length; j++) {
        if (css[j] === '(') level++;
        else if (css[j] === ')' && --level === 0) break;
      }
      buf += css.slice(i, j + 1);
      i = j;
    } else if (ch === '{') {
      out += IND.repeat(depth) + flush().replace(/\s*,\s*/g, ', ') + ' {\n';
      depth++;
    } else if (ch === ';') {
      const decl = flush();
      if (decl) out += IND.repeat(depth) + decl.replace(/\s*:\s*/, ': ') + ';\n';
    } else if (ch === '}') {
      const decl = flush();
      if (decl) out += IND.repeat(depth) + decl.replace(/\s*:\s*/, ': ') + ';\n';
      depth = Math.max(0, depth - 1);
      out += IND.repeat(depth) + '}\n' + (depth === 0 ? '\n' : '');
    } else {
      buf += ch === '\n' ? ' ' : ch;
    }
  }
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export interface ParsedDoc {
  body: string;
  title?: string;
  siteLang?: 'en' | 'ar';
  headCss: string;
  /** Inline <script> contents. */
  js: string;
  /** src of external scripts (relative files only). */
  scriptSrcs: string[];
}

/** Read a full HTML document (or a fragment) typed or uploaded by a student. */
export function parseDocument(html: string): ParsedDoc {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headCss = [...doc.querySelectorAll('style')].map((s) => s.textContent || '').join('\n');
  const scripts = [...doc.querySelectorAll('script')];
  const js = scripts.filter((s) => !s.src).map((s) => s.textContent || '').join('\n').trim();
  const scriptSrcs = scripts
    .map((s) => s.getAttribute('src') || '')
    .filter((src) => src && !/^(https?:)?\/\//i.test(src))
    .map((src) => src.replace(/^\.\//, ''));
  doc.querySelectorAll('style, script').forEach((s) => s.remove());
  const langAttr = doc.documentElement.getAttribute('lang') || '';
  const dirAttr = doc.documentElement.getAttribute('dir') || '';
  const hasHtmlTag = /<html[\s>]/i.test(html);
  return {
    body: doc.body.innerHTML,
    title: doc.querySelector('title') ? doc.title : undefined,
    siteLang: hasHtmlTag ? (langAttr.startsWith('ar') || dirAttr === 'rtl' ? 'ar' : 'en') : undefined,
    headCss,
    js,
    scriptSrcs,
  };
}
