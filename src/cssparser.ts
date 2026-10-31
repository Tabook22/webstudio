/**
 * A small CSS parser for GrapesJS that keeps declarations exactly as written.
 * The browser's parser (GrapesJS default) expands shorthands such as
 * `padding: 8px 16px` into four lines and turns colours into rgb(), which is
 * confusing for students reading the code.
 */
export interface ParsedRule {
  selectors: string;
  style: Record<string, string>;
  atRule?: string;
  params?: string;
}

/** Split on `sep` at the top level (outside quotes and parentheses). */
function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseDeclarations(body: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const decl of splitTop(body, ';')) {
    const i = decl.indexOf(':');
    if (i < 1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim().replace(/\s+/g, ' ');
    if (prop && value) style[prop] = value;
  }
  return style;
}

/** Find the `}` matching the `{` at `open`. */
function matchBrace(css: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === quote && css[i - 1] !== '\\') quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return css.length;
}

function parseBlock(css: string, out: ParsedRule[], atRule?: string, params?: string) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const prelude = css.slice(i, open).trim();
    const close = matchBrace(css, open);
    const inner = css.slice(open + 1, close);
    i = close + 1;
    if (!prelude) continue;
    if (prelude.startsWith('@')) {
      const m = /^@([\w-]+)\s*(.*)$/s.exec(prelude);
      const name = m?.[1].toLowerCase() ?? '';
      const p = m?.[2].trim() ?? '';
      if (name === 'media' || name === 'supports' || name === 'container') parseBlock(inner, out, name, p);
      else if (name === 'font-face' || name === 'page') out.push({ selectors: '', style: parseDeclarations(inner), atRule: name });
      // other at-rules (keyframes, …) are not editable visually in this version
      continue;
    }
    out.push({ selectors: prelude.replace(/\s+/g, ' '), style: parseDeclarations(inner), atRule, params });
  }
}

export function parseCss(css: string): ParsedRule[] {
  const out: ParsedRule[] = [];
  parseBlock(css.replace(/\/\*[\s\S]*?\*\//g, ''), out);
  return out;
}
