import { apiUrl } from "../api";
import type { Project } from "../types";

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const escapeText = (value: string) => value.replace(/[&<>]/g, (ch) => ESCAPE[ch] ?? ch);

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

export function toLive(text: string, projectId: string) {
  const base = apiUrl(`/api/projects/${projectId}/assets/`);
  return text
    .replace(/url\((['"]?)(?!https?:|\/|data:|#)([^'")]+?\.(?:png|jpe?g|gif|webp|svg|ico|bmp|avif))\1\)/gi, (_match, quote, path) => `url(${quote}${base}${path}${quote})`)
    .replace(/(src|href)=(['"])(?!https?:|\/|data:|#)([^'"]+?\.(?:png|jpe?g|gif|webp|svg|ico|bmp|avif))\2/gi, (_match, attr, quote, path) => `${attr}=${quote}${base}${path}${quote}`);
}

export function toStored(text: string, projectId: string) {
  const prefix = apiUrl(`/api/projects/${projectId}/assets/`).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:https?:\\/\\/[^"'\\)\\s]+)?${prefix}`, "g");
  return text.replace(re, "");
}

/** HTML placed in the editor frame: real image URLs, no student scripts. */
export function editorHtml(html: string, projectId: string) {
  return toLive(html, projectId)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function editorCss(css: string, projectId: string) {
  return toLive(css, projectId);
}

export function mergeScripts(previous: string, next: string) {
  const scripts = previous.match(/<script[\s\S]*?<\/script>/gi) ?? [];
  let out = next.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
  for (const script of scripts) {
    if (!out.includes(script.trim())) out += `\n${script.trim()}`;
  }
  return out.trim();
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function formatNode(node: Node, depth: number): string {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    return text ? pad + esc(text) : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === "script") return pad + el.outerHTML;
  const attrs = [...el.attributes]
    .filter((attr) => attr.name !== "contenteditable" && !attr.name.startsWith("data-wd"))
    .map((attr) => ` ${attr.name}="${escAttr(attr.value)}"`)
    .join("");
  if (VOID.has(tag)) return `${pad}<${tag}${attrs}>`;
  const kids = [...el.childNodes];
  if (!kids.length) return `${pad}<${tag}${attrs}></${tag}>`;
  if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE) {
    const text = (kids[0].textContent ?? "").replace(/\s+/g, " ").trim();
    return `${pad}<${tag}${attrs}>${esc(text)}</${tag}>`;
  }
  const inner = kids.map((kid) => formatNode(kid, depth + 1)).filter(Boolean).join("\n");
  return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`;
}

export function prettyHtml(html: string) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return [...doc.body.childNodes].map((node) => formatNode(node, 0)).filter(Boolean).join("\n").trim();
}

/** A body rule at the end of the file, so it paints over an earlier theme rule. */
export function setPageLayer(css: string, declarations: Record<string, string>) {
  const base = css.replace(/\/\* page-bg \*\/\s*body\s*\{[^}]*\}\s*/g, "").trim();
  const lines = Object.entries(declarations)
    .filter(([, value]) => value)
    .map(([key, value]) => `  ${key}: ${value};`);
  if (!lines.length) return `${base}\n`;
  return `${base}\n\n/* page-bg */\nbody {\n${lines.join("\n")}\n}\n`;
}

export function upsertRule(css: string, selector: string, declarations: Record<string, string>) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|\\n)[ \\t]*${escaped}[ \\t]*\\{([^}]*)\\}`);
  const match = css.match(re);
  const map = new Map<string, string>();
  if (match) {
    for (const part of match[2].split(";")) {
      const idx = part.indexOf(":");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) map.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(declarations)) {
    if (!value) map.delete(key);
    else map.set(key, value);
  }
  const body = [...map.entries()].map(([key, value]) => `  ${key}: ${value};`).join("\n");
  const block = `${selector} {\n${body}\n}`;
  if (!match || match.index === undefined) return `${css.trim()}\n\n${block}\n`;
  const lead = match[1] ?? "";
  return css.slice(0, match.index) + lead + block + css.slice(match.index + match[0].length);
}

export function applyKitCss(css: string, kitCss: string) {
  const imports = [...kitCss.matchAll(/@import\s+url\([^)]+\)\s*;/g)].map((match) => match[0]);
  const block = kitCss.replace(/@import\s+url\([^)]+\)\s*;/g, "").trim();
  let next = css.replace(/\/\* kit:start \*\/[\s\S]*?\/\* kit:end \*\//, "");
  next = next.replace(/@import\s+url\(["']https:\/\/fonts\.googleapis\.com[^)]+\)\s*;/g, "");
  next = next.trim();
  return `${imports.join("\n")}${imports.length ? "\n\n" : ""}${block}\n\n${next}\n`.replace(/\n{3,}/g, "\n\n");
}

export function ensureCss(css: string, snippet?: string) {
  if (!snippet?.trim()) return css;
  const marker = snippet.match(/\/\* (?:block|fx):[\w-]+ \*\//)?.[0];
  if (marker && css.includes(marker)) return css;
  if (!marker && css.includes(snippet.trim())) return css;
  return `${css.trim()}\n\n${snippet.trim()}\n`;
}

const FONT_SPEC: Record<string, string> = {
  Inter: "Inter:wght@400;600;700",
  Poppins: "Poppins:wght@400;600;700",
  Montserrat: "Montserrat:wght@600;700",
  "Open Sans": "Open+Sans:wght@400;700",
  Lato: "Lato:wght@400;700",
  Merriweather: "Merriweather:wght@700",
  Amiri: "Amiri:wght@700",
  Tajawal: "Tajawal:wght@400;700",
  Changa: "Changa:wght@500;700",
  "IBM Plex Sans Arabic": "IBM+Plex+Sans+Arabic:wght@400;600;700",
};

export function ensureFontImport(css: string, family: string) {
  const spec = FONT_SPEC[family];
  if (!spec) return css;
  const href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  if (css.includes(`family=${spec.split(":")[0]}`)) return css;
  return `@import url("${href}");\n${css}`;
}

export const FX_CSS = `/* fx:library */
.rounded { border-radius: 16px; }
.shadow { box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); }
.bordered { border: 2px solid currentColor; }
.pad { padding: 24px; }
.center { text-align: center; }
.grow { transition: transform 0.2s ease; }
.grow:hover { transform: scale(1.05); }
.lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.lift:hover { transform: translateY(-6px); box-shadow: 0 14px 28px rgba(15, 23, 42, 0.16); }
`;

const CONSOLE_BRIDGE = `(function () {
  function send(level, args) {
    try {
      var text = Array.prototype.map.call(args, function (value) {
        if (value instanceof Error) return value.message;
        if (typeof value === "object") { try { return JSON.stringify(value); } catch (e) { return String(value); } }
        return String(value);
      }).join(" ");
      var target = window.opener || (window.parent !== window ? window.parent : null);
      if (target) target.postMessage({ __webStudio: true, level: level, text: text }, "*");
    } catch (e) {}
  }
  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level];
    console[level] = function () { send(level, arguments); if (original) original.apply(console, arguments); };
  });
  window.addEventListener("error", function (event) {
    send("error", [event.message + (event.lineno ? " (line " + event.lineno + ")" : "")]);
  });
})();`;

export function previewDocument(project: Project) {
  const origin = location.origin;
  const live = apiUrl(`/api/projects/${project.id}/assets/`);
  const abs = (value: string) => value.replaceAll(live, `${origin}${live}`);
  const css = abs(editorCss(project.css, project.id));
  const html = abs(editorHtml(project.html, project.id));
  const dir = project.site_lang === "ar" ? "rtl" : "ltr";
  const script = project.js.trim()
    ? `<script>${project.js.replace(/<\/script/gi, "<\\/script")}<\/script>`
    : "";
  return `<!DOCTYPE html>
<html lang="${project.site_lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(project.title)}</title>
<script>${CONSOLE_BRIDGE}<\/script>
<style>
${css}
</style>
</head>
<body>
${html}
${script}
</body>
</html>`;
}

export function folderDocument(project: Project) {
  const dir = project.site_lang === "ar" ? "rtl" : "ltr";
  const title = escapeText(project.title);
  const script = project.js.trim() ? '\n  <script src="script.js"></script>' : "";
  return `<!DOCTYPE html>
<html lang="${project.site_lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${project.html}${script}
</body>
</html>
`;
}

export function templatePreview(html: string, css: string, images: { path: string; data_url: string }[], rtl: boolean) {
  let page = html;
  let style = css;
  for (const image of images) {
    page = page.split(image.path).join(image.data_url);
    style = style.split(image.path).join(image.data_url);
  }
  return `<!DOCTYPE html><html dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>${style}</style></head><body>${page}</body></html>`;
}
