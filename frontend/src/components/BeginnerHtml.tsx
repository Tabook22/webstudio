import { useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { applyGuide, guideCss, guideHtml, type Guide } from "../editor/coach";
import { toLive } from "../editor/html";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

export const LEARN_PAGE = "first.html";

const STYLE_START = /^[ \t\r\n]*<style>([\s\S]*?)<\/style>[ \t\r\n]*/i;

export function splitLearn(html: string) {
  const match = html.match(STYLE_START);
  if (!match) return { css: "", html };
  return { css: match[1].replace(/^\n/, "").replace(/\n$/, ""), html: html.slice(match[0].length) };
}

export function joinLearn(css: string, html: string) {
  const style = css.trim();
  if (!style) return html;
  return `<style>\n${style}\n</style>\n${html}`;
}

type Sample = {
  id: string;
  en: string;
  ar: string;
  show: string;
  done?: (html: string, css: string) => boolean;
  apply: (html: string, css: string) => { html: string; css: string } | null;
  clear?: (html: string, css: string) => { html: string; css: string };
};

type LessonGroup = { en: string; ar: string; items: Sample[] };

function append(current: string, line: string) {
  return current.trim() ? `${current.replace(/\s*$/, "")}\n${line}\n` : `${line}\n`;
}

function lastBlock(html: string, tag: string) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) last = match;
  return last;
}

function replaceBlock(html: string, block: RegExpExecArray, next: string) {
  return html.slice(0, block.index) + next + html.slice(block.index + block[0].length);
}

function addListItem(html: string) {
  const lists = [...html.matchAll(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi)];
  const item = "  <li>Another item</li>\n";
  if (!lists.length) return append(html, `<ul>\n  <li>One thing</li>\n${item}</ul>`);
  const last = lists[lists.length - 1];
  return replaceBlock(html, last, last[0].replace(/<\/(ul|ol)>/i, `${item}</$1>`));
}

function addRow(html: string) {
  const table = lastBlock(html, "table");
  const row = "  <tr>\n    <td>Monday</td>\n    <td>HTML</td>\n  </tr>\n";
  if (!table) return append(html, `<table>\n  <tr>\n    <th>Day</th>\n    <th>Subject</th>\n  </tr>\n  <tr>\n    <td>Sunday</td>\n    <td>Web Design</td>\n  </tr>\n${row}</table>`);
  const width = rowWidth(table[0]);
  const cells = Array.from({ length: Math.max(width, 1) }, () => "<td>New</td>").join("");
  return replaceBlock(html, table, table[0].replace(/<\/table>/i, `  <tr>${cells}</tr>\n</table>`));
}

function addColumn(html: string) {
  const table = lastBlock(html, "table");
  if (!table) return append(html, "<table>\n  <tr>\n    <td>One</td>\n    <td>Two</td>\n  </tr>\n</table>");
  const next = table[0].replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
    const cell = /<th\b/i.test(row) ? "<th>New</th>" : "<td>New</td>";
    return row.replace(/<\/tr>/i, `${cell}</tr>`);
  });
  return replaceBlock(html, table, next);
}

function rowWidth(html: string) {
  const row = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  return row ? (row[0].match(/<t[dh]\b/gi) || []).length : 0;
}

function mapTable(html: string, change: (table: string) => string, css: string) {
  const table = lastBlock(html, "table");
  if (!table) return null;
  const next = change(table[0]);
  if (next === table[0]) return null;
  return { html: replaceBlock(html, table, next), css };
}

function dropRow(table: string) {
  const rows = [...table.matchAll(/[ \t]*<tr\b[^>]*>[\s\S]*?<\/tr>[ \t]*\n?/gi)];
  const last = rows[rows.length - 1];
  if (!last || last.index === undefined) return table;
  return table.slice(0, last.index) + table.slice(last.index + last[0].length);
}

function dropColumn(table: string) {
  return table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi)];
    const cell = cells[cells.length - 1];
    if (!cell || cell.index === undefined) return row;
    return row.slice(0, cell.index) + row.slice(cell.index + cell[0].length);
  });
}

function tagAt(text: string, index: number) {
  if (text[index] !== "<") return null;
  if (text.startsWith("<!--", index)) {
    const end = text.indexOf("-->", index + 4);
    return { name: "", close: false, self: false, end: end < 0 ? text.length : end + 3, comment: true };
  }
  const gt = text.indexOf(">", index + 1);
  if (gt < 0) return null;
  const raw = text.slice(index + 1, gt).trim();
  const close = raw.startsWith("/");
  const self = raw.endsWith("/");
  const name = (close ? raw.slice(1) : raw).replace(/\/$/, "").trim().split(/\s+/)[0]?.toLowerCase() || "";
  return { name, close, self, end: gt + 1, comment: false };
}

function matchingEnd(text: string, name: string, from: number) {
  let depth = 1;
  let j = from;
  const lower = text.toLowerCase();
  while (j < text.length && depth > 0) {
    const next = lower.indexOf("<", j);
    if (next < 0) return -1;
    const tag = tagAt(text, next);
    if (!tag) return -1;
    if (!tag.comment && tag.name === name) {
      if (tag.close) depth -= 1;
      else if (!tag.self) depth += 1;
      if (depth === 0) return tag.end;
    }
    j = tag.end;
  }
  return -1;
}

function cutElements(html: string, names: string[]) {
  const wanted = new Set(names);
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.toLowerCase().indexOf("<", i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    const tag = tagAt(html, lt);
    if (!tag) { out += html.slice(lt); break; }
    const whole = !tag.comment && !tag.close && !tag.self && wanted.has(tag.name);
    if (!whole) { out += html.slice(lt, tag.end); i = tag.end; continue; }
    const end = matchingEnd(html, tag.name, tag.end);
    i = end < 0 ? (html.indexOf("\n", lt) < 0 ? html.length : html.indexOf("\n", lt) + 1) : end;
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function dropWrapped(html: string, tags: string) {
  const names = tags === "h[1-3]" ? ["h1", "h2", "h3"] : tags.split("|");
  return cutElements(html, names);
}

function dropBlocks(html: string, tag: string) {
  return cutElements(html, [tag]);
}

function dropImages(html: string) {
  return html.replace(/\s*<img\b[^>]*>\s*/gi, "\n").replace(/\n{3,}/g, "\n\n");
}

function clearExtraRows(html: string) {
  let next = html;
  while ((next.match(/<tr\b/gi) || []).length >= 3) {
    const table = lastBlock(next, "table");
    if (!table) break;
    const cut = dropRow(table[0]);
    if (cut === table[0]) break;
    next = replaceBlock(next, table, cut);
  }
  return next;
}

function clearExtraColumns(html: string) {
  let next = html;
  while (rowWidth(next) >= 3) {
    const table = lastBlock(next, "table");
    if (!table) break;
    const cut = dropColumn(table[0]);
    if (cut === table[0]) break;
    next = replaceBlock(next, table, cut);
  }
  return next;
}

function clearExtraItems(html: string) {
  let next = html;
  for (let guard = 0; guard < 40 && /<(ul|ol)\b[^>]*>[\s\S]*?<li\b[\s\S]*?<li\b[\s\S]*?<\/\1>/i.test(next); guard++) {
    const lists = [...next.matchAll(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi)];
    const list = lists.reverse().find((item) => (item[0].match(/<li\b/gi) || []).length >= 2);
    if (!list || list.index === undefined) break;
    const items = [...list[0].matchAll(/[ \t]*<li\b[^>]*>[\s\S]*?<\/li>[ \t]*\n?/gi)];
    const last = items[items.length - 1];
    if (!last || last.index === undefined) break;
    const start = list.index + last.index;
    next = next.slice(0, start) + next.slice(start + last[0].length);
  }
  return next;
}

function dropProp(css: string, prop: string) {
  const without = css.replace(new RegExp(`(^|[\\n;{])[ \\t]*${prop}\\s*:[^;\\n}]*;?`, "gim"), "$1");
  return without.replace(/[^{}@]+\{[ \t\n]*\}/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function lessonGroups(photo: string): LessonGroup[] {
  const table = "<table>\n  <tr>\n    <th>Day</th>\n    <th>Subject</th>\n  </tr>\n  <tr>\n    <td>Sunday</td>\n    <td>Web Design</td>\n  </tr>\n</table>";
  return [
    {
      en: "Words",
      ar: "الكلمات",
      items: [
        { id: "h", en: "Write a heading", ar: "اكتب عنوانًا", show: "<h1>Hello</h1>", done: (html) => /<h[1-3]\b/i.test(html), apply: (html, css) => ({ html: append(html, "<h1>Hello</h1>"), css }), clear: (html, css) => ({ html: dropWrapped(html, "h[1-3]"), css }) },
        { id: "p", en: "Add a paragraph", ar: "أضف فقرة", show: "<p>My name is …</p>", done: (html) => /<p\b/i.test(html), apply: (html, css) => ({ html: append(html, "<p>My name is …</p>"), css }), clear: (html, css) => ({ html: dropWrapped(html, "p"), css }) },
        { id: "b", en: "Make text bold", ar: "اجعل النص عريضًا", show: "<b>bold</b>", done: (html) => /<(b|strong)\b/i.test(html), apply: (html, css) => ({ html: append(html, "<p>This word is <b>bold</b>.</p>"), css }), clear: (html, css) => ({ html: dropWrapped(html, "b|strong"), css }) },
        { id: "i", en: "Make text italic", ar: "اجعل النص مائلًا", show: "<i>italic</i>", done: (html) => /<(i|em)\b/i.test(html), apply: (html, css) => ({ html: append(html, "<p>This word is <i>italic</i>.</p>"), css }), clear: (html, css) => ({ html: dropWrapped(html, "i|em"), css }) },
        { id: "u", en: "Underline text", ar: "ضع خطًا تحت النص", show: "<u>underlined</u>", done: (html) => /<u\b/i.test(html), apply: (html, css) => ({ html: append(html, "<p>This word is <u>underlined</u>.</p>"), css }), clear: (html, css) => ({ html: dropWrapped(html, "u"), css }) },
        { id: "a", en: "Add a link", ar: "أضف رابطًا", show: '<a href="https://example.com">A link</a>', done: (html) => /<a\b/i.test(html), apply: (html, css) => ({ html: append(html, '<p><a href="https://example.com">A link</a></p>'), css }), clear: (html, css) => ({ html: dropWrapped(html, "a"), css }) },
      ],
    },
    {
      en: "Lists",
      ar: "القوائم",
      items: [
        { id: "ul", en: "Unordered list", ar: "قائمة غير مرتبة", show: "<ul><li>One thing</li></ul>", done: (html) => /<ul\b/i.test(html), apply: (html, css) => ({ html: append(html, "<ul>\n  <li>One thing</li>\n</ul>"), css }), clear: (html, css) => ({ html: dropBlocks(html, "ul"), css }) },
        { id: "ol", en: "Ordered list", ar: "قائمة مرتبة", show: "<ol><li>First</li></ol>", done: (html) => /<ol\b/i.test(html), apply: (html, css) => ({ html: append(html, "<ol>\n  <li>First</li>\n</ol>"), css }), clear: (html, css) => ({ html: dropBlocks(html, "ol"), css }) },
        { id: "li", en: "Add a list item", ar: "أضف عنصر قائمة", show: "<li>Another item</li>", done: (html) => /<(ul|ol)\b[^>]*>[\s\S]*?<li\b[\s\S]*?<li\b[\s\S]*?<\/\1>/i.test(html), apply: (html, css) => ({ html: addListItem(html), css }), clear: (html, css) => ({ html: clearExtraItems(html), css }) },
      ],
    },
    {
      en: "Picture",
      ar: "صورة",
      items: [
        { id: "img", en: "Add a picture", ar: "أضف صورة", show: `<img src="${photo}" alt="My picture">`, done: (html) => /<img\b/i.test(html), apply: (html, css) => ({ html: append(html, `<img src="${photo}" alt="My picture">`), css }), clear: (html, css) => ({ html: dropImages(html), css }) },
      ],
    },
    {
      en: "Table",
      ar: "جدول",
      items: [
        { id: "table", en: "Add a table", ar: "أضف جدولًا", show: "<table><tr><td>Sunday</td></tr></table>", done: (html) => /<table\b/i.test(html), apply: (html, css) => ({ html: append(html, table), css }), clear: (html, css) => ({ html: dropBlocks(html, "table"), css }) },
        { id: "row", en: "Add a row", ar: "أضف صفًا", show: "<tr><td>Monday</td><td>HTML</td></tr>", done: (html) => (html.match(/<tr\b/gi) || []).length >= 3, apply: (html, css) => ({ html: addRow(html), css }), clear: (html, css) => ({ html: clearExtraRows(html), css }) },
        { id: "col", en: "Add a column", ar: "أضف عمودًا", show: "<td>New</td>", done: (html) => rowWidth(html) >= 3, apply: (html, css) => ({ html: addColumn(html), css }), clear: (html, css) => ({ html: clearExtraColumns(html), css }) },
        { id: "del-row", en: "Delete a row", ar: "احذف صفًا", show: "Erase one <tr> … </tr>", apply: (html, css) => mapTable(html, dropRow, css) },
        { id: "del-col", en: "Delete a column", ar: "احذف عمودًا", show: "Erase the last cell in every row", apply: (html, css) => mapTable(html, dropColumn, css) },
        { id: "del-table", en: "Delete the table", ar: "احذف الجدول", show: "Erase <table> … </table>", apply: (html, css) => mapTable(html, () => "", css) },
      ],
    },
    {
      en: "Look",
      ar: "المظهر",
      items: [
        { id: "color", en: "Change the font color", ar: "غيّر لون الخط", show: "h1 { color: teal; }", done: (_html, css) => /color\s*:/i.test(css), apply: (html, css) => ({ html, css: append(css, "h1 {\n  color: teal;\n}") }), clear: (html, css) => ({ html, css: dropProp(css, "color") }) },
        { id: "size", en: "Change the font size", ar: "غيّر حجم الخط", show: "p { font-size: 18px; }", done: (_html, css) => /font-size\s*:/i.test(css), apply: (html, css) => ({ html, css: append(css, "p {\n  font-size: 18px;\n}") }), clear: (html, css) => ({ html, css: dropProp(css, "font-size") }) },
        { id: "face", en: "Change the font", ar: "غيّر نوع الخط", show: "p { font-family: Georgia, serif; }", done: (_html, css) => /font-family\s*:/i.test(css), apply: (html, css) => ({ html, css: append(css, "p {\n  font-family: Georgia, serif;\n}") }), clear: (html, css) => ({ html, css: dropProp(css, "font-family") }) },
      ],
    },
  ];
}

export function BeginnerHtml({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const project = studio.project;
  const raw = studio.pagePath === LEARN_PAGE ? studio.pageHtml : "";
  const parts = splitLearn(raw);
  const photo = project?.assets.find((asset) => asset.mime.startsWith("image/"))?.path || "images/photo.jpg";
  const groups = lessonGroups(photo);
  const checks = groups.flatMap((group) => group.items).filter((item) => item.done);
  const done = checks.filter((item) => item.done!(parts.html, parts.css)).length;
  const htmlGuide = guideHtml(parts.html);
  const cssGuide = guideCss(parts.css);
  const htmlMirror = useRef<HTMLPreElement>(null);
  const cssMirror = useRef<HTMLPreElement>(null);
  const htmlBox = useRef<HTMLTextAreaElement>(null);
  const cssBox = useRef<HTMLTextAreaElement>(null);
  const history = useRef({ past: [] as { html: string; css: string }[], future: [] as { html: string; css: string }[] });
  const partsRef = useRef(parts);
  const lastTyped = useRef(0);
  const [steps, setSteps] = useState(0);
  partsRef.current = parts;
  const preview = useMemo(() => {
    if (!project) return "";
    const dir = project.site_lang === "ar" ? "rtl" : "ltr";
    const css = toLive(parts.css, project.id);
    const html = toLive(parts.html, project.id);
    return `<!DOCTYPE html><html lang="${project.site_lang}" dir="${dir}"><head><meta charset="utf-8"><style>body{margin:28px;font-family:Georgia,"Segoe UI",Tahoma,sans-serif;line-height:1.55;color:#1c1917}img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #d6d3d1;padding:6px 10px}${css}</style></head><body>${html}</body></html>`;
  }, [parts.css, parts.html, project]);

  if (!project) return null;

  const canUndo = steps >= 0 && history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;
  const applyLesson = (html: string, css: string) => {
    if (studio.pagePath !== LEARN_PAGE) studio.openPage(LEARN_PAGE);
    studio.edit("html", joinLearn(css, html));
  };
  const write = (html: string, css: string) => {
    const current = partsRef.current;
    if (html === current.html && css === current.css) return;
    const now = Date.now();
    const burst = now - lastTyped.current < 700 && Math.abs(html.length - current.html.length) + Math.abs(css.length - current.css.length) < 12;
    if (!burst) {
      history.current.past.push({ html: current.html, css: current.css });
      if (history.current.past.length > 80) history.current.past.shift();
    }
    history.current.future = [];
    lastTyped.current = now;
    partsRef.current = { html, css };
    applyLesson(html, css);
    setSteps((count) => count + 1);
  };
  const undoLesson = () => {
    const previous = history.current.past.pop();
    if (!previous) return;
    history.current.future.push({ html: partsRef.current.html, css: partsRef.current.css });
    lastTyped.current = 0;
    partsRef.current = previous;
    applyLesson(previous.html, previous.css);
    setSteps((count) => count + 1);
  };
  const redoLesson = () => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push({ html: partsRef.current.html, css: partsRef.current.css });
    lastTyped.current = 0;
    partsRef.current = next;
    applyLesson(next.html, next.css);
    setSteps((count) => count + 1);
  };
  const useSample = (item: Sample) => {
    const next = item.apply(parts.html, parts.css);
    if (!next) {
      studio.setToast(tx("Nothing there to remove yet. Add a table first.", "لا يوجد شيء لحذفه بعد. أضف جدولًا أولًا."));
      return;
    }
    write(next.html, next.css);
  };
  const clearSample = (item: Sample) => {
    if (!item.clear) return;
    const next = item.clear(parts.html, parts.css);
    write(next.html, next.css);
  };
  const cheer = done === 0
    ? tx("A blank page is a good start. Type your first tag.", "الصفحة الفارغة بداية جيدة. اكتب أول وسم.")
    : done < 5
      ? tx("Good. The page is starting to appear.", "جيد. الصفحة بدأت تظهر.")
      : done < checks.length
        ? tx("You are writing a real page by hand.", "أنت تكتب صفحة حقيقية بيدك.")
        : tx("You can write HTML and CSS yourself.", "تستطيع كتابة HTML و CSS بنفسك.");

  return (
    <div className="beginner">
      <header className="begin-top">
        <div>
          <p className="begin-kicker">{tx("Beginning HTML", "بداية HTML")}</p>
          <h1>{tx("Write the page yourself", "اكتب الصفحة بنفسك")}</h1>
        </div>
        <div className="begin-actions">
          <IconButton name="undo" label={tx("Undo", "تراجع")} disabled={!canUndo} onClick={undoLesson} />
          <IconButton name="redo" label={tx("Redo", "إعادة")} disabled={!canRedo} onClick={redoLesson} />
          <IconButton name="clear" label={tx("Clean the page", "تنظيف الصفحة")} danger onClick={() => { if (window.confirm(tx("Clean the whole page? The HTML and CSS will be erased.", "تنظيف الصفحة كلها؟ سيُمسح HTML و CSS."))) write("", ""); }} />
          <IconButton name="save" label={tx("Save", "حفظ")} onClick={() => void studio.saveNow()} />
          <IconButton name="back" label={tx("Back to design", "العودة إلى التصميم")} flip={lang === "ar"} primary onClick={studio.closeBeginner} />
        </div>
      </header>
      <p className="begin-cheer">{cheer}</p>
      <div className="begin-grid">
        <aside className="begin-steps">
          <strong>{tx("Try these, one at a time", "جرّب هذه، واحدة واحدة")}</strong>
          {groups.map((group) => (
            <section key={group.en} className="begin-group">
              <h2>{tx(group.en, group.ar)}</h2>
              <ol>
                {group.items.map((item, index) => {
                  const on = item.done?.(parts.html, parts.css) ?? false;
                  return (
                    <li key={item.id} className={on ? "begin-step on" : item.done ? "begin-step" : "begin-step how"}>
                      {on ? (
                        <button type="button" className="begin-hit" title={tx("Remove this tag", "احذف هذا الوسم")} onClick={() => clearSample(item)}>
                          <span className="begin-mark">✓</span>
                          <span>
                            <b>{tx(item.en, item.ar)}</b>
                            <code>{item.show}</code>
                          </span>
                        </button>
                      ) : (
                        <>
                          <span className="begin-mark">{item.done ? index + 1 : "–"}</span>
                          <span>
                            <b>{tx(item.en, item.ar)}</b>
                            <code>{item.show}</code>
                            <button type="button" onClick={() => useSample(item)}>{item.done ? tx("Try this", "جرّب هذا") : tx("Remove it", "نفّذ الحذف")}</button>
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p>{tx("Click a tick to delete that tag from its start to its end, including everything inside.", "انقر العلامة لحذف الوسم من بدايته إلى نهايته، مع كل ما بداخله.")}</p>
          <p>{tx("Type the tags yourself. Use a line only when you want a nudge.", "اكتب الوسوم بنفسك. استخدم السطر فقط حين تحتاج تلميحًا.")}</p>
          <p>{tx("Saved as first.html. This CSS changes only this page.", "تُحفظ في first.html. هذا التنسيق يغيّر هذه الصفحة فقط.")}</p>
        </aside>
        <section className="begin-code">
          <CodeBox
            id="begin-html"
            name="HTML"
            value={parts.html}
            placeholder={"<h1>Hello</h1>\n<p>I am learning HTML.</p>"}
            guide={htmlGuide}
            boxRef={htmlBox}
            mirrorRef={htmlMirror}
            onChange={(value) => write(value, parts.css)}
            onUndo={undoLesson}
            onRedo={redoLesson}
            onFix={() => htmlGuide && write(applyGuide(parts.html, htmlGuide), parts.css)}
          />
          <CodeBox
            id="begin-css"
            name="CSS"
            value={parts.css}
            placeholder={"h1 {\n  color: teal;\n}"}
            guide={cssGuide}
            boxRef={cssBox}
            mirrorRef={cssMirror}
            onChange={(value) => write(parts.html, value)}
            onUndo={undoLesson}
            onRedo={redoLesson}
            onFix={() => cssGuide && write(parts.html, applyGuide(parts.css, cssGuide))}
          />
        </section>
        <section className="begin-stage">
          <header>{tx("Your page", "صفحتك")}</header>
          {parts.html.trim() || parts.css.trim()
            ? <iframe title={tx("Your page", "صفحتك")} sandbox="" srcDoc={preview} />
            : <div className="begin-wait"><p>{tx("Nothing here yet. Type a heading in the HTML box.", "لا شيء هنا بعد. اكتب عنوانًا في صندوق HTML.")}</p></div>}
        </section>
      </div>
    </div>
  );
}

function IconButton({ name, label, onClick, disabled, primary, danger, flip }: {
  name: "undo" | "redo" | "clear" | "save" | "back";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  flip?: boolean;
}) {
  return (
    <button type="button" className={`tb icon${primary ? " primary" : ""}${danger ? " danger" : ""}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      <LearnIcon name={name} flip={flip} />
    </button>
  );
}

function LearnIcon({ name, flip }: { name: "undo" | "redo" | "clear" | "save" | "back"; flip?: boolean }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      {name === "undo" && <><path {...common} d="M8.2 7.2 3.5 12l4.7 4.8" /><path {...common} d="M3.5 12H12a5.5 5.5 0 0 1 0 11H10" /></>}
      {name === "redo" && <><path {...common} d="M15.8 7.2 20.5 12l-4.7 4.8" /><path {...common} d="M20.5 12H12a5.5 5.5 0 0 0 0 11H14" /></>}
      {name === "clear" && <><path {...common} d="M4 7h16" /><path {...common} d="M9 7V4.5h6V7" /><path {...common} d="M7 7l1 13h8l1-13" /></>}
      {name === "save" && <><path {...common} d="M5 4h11l3 3v13H5z" /><path {...common} d="M8 4v5h7M8 20v-6h8v6" /></>}
      {name === "back" && <><path {...common} d="M15 6 9 12l6 6" /><path {...common} d="M9 12h11" /></>}
    </svg>
  );
}

function CodeBox({ id, name, value, placeholder, guide, boxRef, mirrorRef, onChange, onUndo, onRedo, onFix }: {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  guide: Guide | null;
  boxRef: RefObject<HTMLTextAreaElement | null>;
  mirrorRef: RefObject<HTMLPreElement | null>;
  onChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFix: () => void;
}) {
  const { tx } = useI18n();
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");
  const sync = (box: HTMLTextAreaElement) => {
    const mirror = mirrorRef.current;
    const gutter = gutterRef.current;
    if (mirror) {
      mirror.scrollTop = box.scrollTop;
      mirror.scrollLeft = box.scrollLeft;
    }
    if (gutter) gutter.scrollTop = box.scrollTop;
  };
  const show = () => {
    const box = boxRef.current;
    if (!box || !guide) return;
    box.focus();
    const end = Math.max(guide.markFrom, guide.markTo);
    box.setSelectionRange(guide.markFrom, end);
    const before = value.slice(0, guide.markFrom);
    const line = before.split("\n").length - 1;
    box.scrollTop = Math.max(0, line * 23 - 28);
    sync(box);
  };
  return (
    <div className="begin-box">
      <label htmlFor={id}>{name}</label>
      <div className="begin-field" data-bad={guide ? "true" : "false"}>
        <div className="begin-gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, index) => (
            <span key={index} className={guide?.line === index + 1 ? "on" : undefined}>{index + 1}</span>
          ))}
        </div>
        <pre className="begin-mirror" ref={mirrorRef} aria-hidden="true">
          {lines.map((item, index) => (
            <span key={index} className={guide?.line === index + 1 ? "begin-bad" : undefined}>{item || " "}</span>
          ))}
        </pre>
        <textarea
          id={id}
          ref={boxRef}
          className="begin-input"
          dir="ltr"
          wrap="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && (key === "z" || key === "y")) {
              event.preventDefault();
              if (key === "y" || event.shiftKey) onRedo();
              else onUndo();
              return;
            }
            indent(event);
          }}
          onScroll={(event) => sync(event.currentTarget)}
        />
      </div>
      {guide ? (
        <p className="begin-coach" role="status">
          <b>{tx("Line", "سطر")} {guide.line}</b>
          {tx(guide.en, guide.ar)}
          <span className="begin-coach-actions">
            <button type="button" onClick={show}>{tx("Show me", "أرني")}</button>
            <button type="button" onClick={onFix}>{tx(guide.fixEn, guide.fixAr)}</button>
          </span>
        </p>
      ) : value.trim() ? <p className="begin-ok">{tx("This looks right.", "هذا مكتوب بشكل صحيح.")}</p> : null}
    </div>
  );
}

function indent(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const box = event.currentTarget;
  const start = box.selectionStart;
  const end = box.selectionEnd;
  const next = `${box.value.slice(0, start)}  ${box.value.slice(end)}`;
  const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  proto?.set?.call(box, next);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.setSelectionRange(start + 2, start + 2);
}
