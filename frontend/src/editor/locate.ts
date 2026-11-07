import { TAG_HELP } from "./learn";
import type { Selection } from "../types";

export type CssHit = { selector: string; start: number; end: number; body: string };
export type CodeLink = {
  htmlStart: number;
  htmlEnd: number;
  openEnd: number;
  startLine: number;
  endLine: number;
  snippet: string;
  rules: CssHit[];
  explain: [string, string];
};

const VOID = new Set("area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr".split(","));

function tagEnd(html: string, start: number) {
  let quote = "";
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return i + 1;
  }
  return html.length;
}

function skipNoise(html: string, index: number) {
  if (html.startsWith("<!--", index)) {
    const end = html.indexOf("-->", index);
    return end < 0 ? html.length : end + 3;
  }
  if (html.startsWith("<!", index) || html.startsWith("<?", index)) {
    return tagEnd(html, index);
  }
  return index;
}

function readTag(html: string, index: number) {
  const end = tagEnd(html, index);
  const raw = html.slice(index, end);
  const name = /^<\s*([A-Za-z][\w:-]*)/.exec(raw)?.[1]?.toLowerCase() || "";
  const selfClosing = /\/\s*>$/.test(raw) || VOID.has(name);
  return { end, raw, name, selfClosing };
}

function elementEnd(html: string, from: number) {
  let depth = 1;
  let i = from;
  while (i < html.length && depth > 0) {
    const next = html.indexOf("<", i);
    if (next < 0) return html.length;
    const skipped = skipNoise(html, next);
    if (skipped !== next) {
      i = skipped;
      continue;
    }
    if (html.startsWith("</", next)) {
      depth -= 1;
      const end = tagEnd(html, next);
      if (depth === 0) return end;
      i = end;
      continue;
    }
    const tag = readTag(html, next);
    if (tag.name && !tag.selfClosing) depth += 1;
    i = tag.end;
  }
  return html.length;
}

function samePath(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function findElement(html: string, path: number[]) {
  if (!path.length) return null;
  const ancestors: number[] = [];
  const nextChild = [0];
  let i = 0;
  while (i < html.length) {
    const next = html.indexOf("<", i);
    if (next < 0) return null;
    const skipped = skipNoise(html, next);
    if (skipped !== next) {
      i = skipped;
      continue;
    }
    if (html.startsWith("</", next)) {
      ancestors.pop();
      i = tagEnd(html, next);
      continue;
    }
    const tag = readTag(html, next);
    if (!tag.name) {
      i = tag.end;
      continue;
    }
    const depth = ancestors.length;
    const index = nextChild[depth] || 0;
    nextChild[depth] = index + 1;
    const childPath = [...ancestors, index];
    if (samePath(childPath, path)) {
      const close = tag.selfClosing ? tag.end : elementEnd(html, tag.end);
      return { start: next, openEnd: tag.end, end: close };
    }
    if (!tag.selfClosing) {
      ancestors.push(index);
      nextChild[depth + 1] = 0;
    }
    i = tag.end;
  }
  return null;
}

function compoundMatches(compound: string, selection: Selection) {
  const clean = compound.replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, "").trim();
  if (!clean || clean === "*") return clean === "*";
  const classes = [...clean.matchAll(/\.([A-Za-z_-][\w-]*)/g)].map((match) => match[1]);
  const id = clean.match(/#([A-Za-z_-][\w-]*)/)?.[1];
  const tag = clean.match(/^([A-Za-z][\w-]*)/)?.[1]?.toLowerCase();
  if (id && id !== selection.id) return false;
  if (tag && tag !== selection.tag) return false;
  const have = new Set(selection.className.split(/\s+/).filter(Boolean));
  if (classes.some((name) => !have.has(name))) return false;
  return Boolean(tag || id || classes.length);
}

function selectorMatches(selector: string, selection: Selection) {
  const last = selector.trim().split(/\s+/).pop() || "";
  return compoundMatches(last, selection);
}

function specificity(selector: string) {
  return (selector.match(/#[\w-]+/g)?.length || 0) * 100
    + (selector.match(/\.[\w-]+/g)?.length || 0) * 10
    + (selector.match(/^[a-z]+|[\s>+~][a-z]+/gi)?.length || 0);
}

function matchingRules(css: string, selection: Selection): CssHit[] {
  const hits: CssHit[] = [];
  const pattern = /([^{}@]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    const group = match[1];
    if (group.includes("@")) continue;
    const parts = group.split(",").map((part) => part.trim()).filter((part) => part && selectorMatches(part, selection));
    if (!parts.length) continue;
    hits.push({
      selector: parts.join(", "),
      start: match.index,
      end: match.index + match[0].length,
      body: match[2].trim(),
    });
  }
  return hits.sort((a, b) => specificity(b.selector) - specificity(a.selector)).slice(0, 3);
}

function lineOf(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

export function locateElement(html: string, css: string, selection: Selection): CodeLink | null {
  const found = findElement(html, selection.path);
  if (!found) return null;
  const rules = matchingRules(css, selection);
  const raw = html.slice(found.start, found.end).trim();
  const snippet = raw.length > 420 ? `${raw.slice(0, 400).trimEnd()}\n…` : raw;
  const help = TAG_HELP[selection.tag] || [`A <${selection.tag}> element.`, `عنصر <${selection.tag}>.`];
  const names = [...new Set(rules.flatMap((rule) => rule.selector.split(",").map((part) => part.trim())))].join(", ");
  const explain: [string, string] = rules.length
    ? [`${help[0]} style.css styles it with ${names}.`, `${help[1]} ينسّقه style.css عبر ${names}.`]
    : [`${help[0]} No CSS rule targets it yet.`, `${help[1]} لا توجد قاعدة CSS تستهدفه بعد.`];
  return {
    htmlStart: found.start,
    htmlEnd: found.end,
    openEnd: found.openEnd,
    startLine: lineOf(html, found.start),
    endLine: lineOf(html, Math.max(found.start, found.end - 1)),
    snippet,
    rules,
    explain,
  };
}

export function scrollCode(el: HTMLTextAreaElement | null, index: number, selectEnd?: number) {
  if (!el) return;
  const line = el.value.slice(0, index).split("\n").length - 1;
  const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
  el.scrollTop = Math.max(0, line * lineHeight - el.clientHeight / 3);
  if (selectEnd !== undefined) {
    el.focus();
    el.setSelectionRange(index, selectEnd);
  }
}
