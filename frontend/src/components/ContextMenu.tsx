import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

const PARTS: Record<string, [string, string]> = {
  p: ["Paragraph", "فقرة"],
  h1: ["Heading", "عنوان"],
  h2: ["Heading", "عنوان"],
  h3: ["Heading", "عنوان"],
  h4: ["Heading", "عنوان"],
  div: ["Box", "صندوق"],
  section: ["Section", "قسم"],
  header: ["Header", "ترويسة"],
  footer: ["Footer", "تذييل"],
  nav: ["Navigation", "تنقل"],
  button: ["Button", "زر"],
  span: ["Text", "نص"],
  li: ["List item", "بند"],
  figure: ["Picture", "صورة"],
};

export function ContextMenu({ studio, at }: { studio: Studio; at: { x: number; y: number } }) {
  const { tx } = useI18n();
  const sel = studio.selection;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(8, Math.min(at.x, window.innerWidth - rect.width - 8));
    const y = Math.max(8, Math.min(at.y, window.innerHeight - rect.height - 8));
    setPos({ x, y });
  }, [at]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && ref.current?.contains(target)) return;
      studio.closeContext();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") studio.closeContext();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [studio]);
  if (!sel) return null;
  const table = sel.table;
  const many = (table?.count || 0) > 1;
  const part = ["table", "tr", "td", "th", "thead", "tbody"].includes(sel.tag);
  const run = (cmd: string, extra?: Record<string, unknown>) => {
    studio.command({ cmd, path: sel.path, ...extra });
    studio.closeContext();
  };
  const placePicture = (where: "left" | "center" | "right") => {
    const margin = where === "left" ? "12px auto 12px 0" : where === "right" ? "12px 0 12px auto" : "12px auto";
    studio.command({ cmd: "styles", path: sel.path, props: { display: "block", float: "none", margin, height: "auto" } });
    studio.closeContext();
  };
  return (
    <div ref={ref} className="ctx" style={{ left: pos.x, top: pos.y }} role="menu">
      {table && (
        <>
          <div className="ctx-label">{tx("Table", "الجدول")}</div>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { studio.openTableWindow(); studio.closeContext(); }}>{tx("Table properties…", "خصائص الجدول…")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("table-scope", { scope: "all" })}>{tx("Select table", "تحديد الجدول")}</button>
          <hr />
          {many ? (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("merge-selection")}>{tx("Merge cells", "دمج الخلايا")}</button>
          ) : (
            <>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("merge")}>{tx("Merge with cell to the right", "دمج مع الخلية اليمنى")}</button>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("merge-down")}>{tx("Merge with cell below", "دمج مع الخلية السفلى")}</button>
            </>
          )}
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("split")}>{tx("Unmerge", "فك الدمج")}</button>
          <hr />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("row-above")}>{tx("Row above", "صف أعلى")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("row-below")}>{tx("Row below", "صف أسفل")}</button>
          <button type="button" className="danger" onMouseDown={(event) => event.preventDefault()} onClick={() => run("del-row")}>{tx("Delete row", "حذف الصف")}</button>
          <hr />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("col-before")}>{tx("Column to the left", "عمود إلى اليسار")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("col-after")}>{tx("Column to the right", "عمود إلى اليمين")}</button>
          <button type="button" className="danger" onMouseDown={(event) => event.preventDefault()} onClick={() => run("del-col")}>{tx("Delete column", "حذف العمود")}</button>
          <hr />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("table-box", { align: "left" })}>{tx("Align table left", "محاذاة الجدول لليسار")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("table-box", { align: "center" })}>{tx("Center table", "توسيط الجدول")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("table-box", { align: "right" })}>{tx("Align table right", "محاذاة الجدول لليمين")}</button>
          <hr />
          <button type="button" className="danger with-ico" onMouseDown={(event) => event.preventDefault()} onClick={() => run("del-table")}>
            <TableOffIcon />
            {tx("Delete table", "حذف الجدول")}
          </button>
        </>
      )}
      {sel.tag === "img" && (
        <>
          <div className="ctx-label">{tx("Picture", "الصورة")}</div>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => placePicture("left")}>{tx("Place left", "إلى اليسار")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => placePicture("center")}>{tx("Place in the center", "في الوسط")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => placePicture("right")}>{tx("Place right", "إلى اليمين")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("styles", { props: { width: "50%", height: "auto", maxWidth: "100%" } })}>{tx("Half size", "نصف الحجم")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("styles", { props: { width: "100%", height: "auto", maxWidth: "100%" } })}>{tx("Full width", "العرض كامل")}</button>
        </>
      )}
      {sel.tag === "a" && (
        <>
          <div className="ctx-label">{tx("Link", "الرابط")}</div>
          <label className="ctx-field">{tx("Address", "العنوان")}
            <input dir="ltr" value={sel.attrs.href || ""} placeholder="https://" onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "href", value: event.target.value })} />
          </label>
          <label className="ctx-check">
            <input type="checkbox" checked={sel.attrs.target === "_blank"} onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "target", value: event.target.checked ? "_blank" : "" })} />
            {tx("Open in a new tab", "فتح في تبويب جديد")}
          </label>
        </>
      )}
      {(sel.tag === "ul" || sel.tag === "ol" || sel.tag === "li") && (
        <>
          <div className="ctx-label">{tx("List", "القائمة")}</div>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-add")}>{tx("Add item", "إضافة بند")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-remove")}>{tx("Remove item", "حذف البند")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "disc" })}>{tx("Filled circles", "دوائر ممتلئة")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "circle" })}>{tx("Circles", "دوائر")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "square" })}>{tx("Squares", "مربعات")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "none" })}>{tx("No marker", "بدون علامة")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "decimal" })}>{tx("Numbers", "أرقام")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "decimal-leading-zero" })}>{tx("Numbers with a zero", "أرقام تبدأ بصفر")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "lower-alpha" })}>{tx("Small letters", "حروف صغيرة")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "upper-alpha" })}>{tx("Capital letters", "حروف كبيرة")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "lower-roman" })}>{tx("Small Roman numbers", "أرقام رومانية صغيرة")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("list-marker", { value: "upper-roman" })}>{tx("Capital Roman numbers", "أرقام رومانية كبيرة")}</button>
        </>
      )}
      {!part && sel.tag !== "img" && (
        <>
          <div className="ctx-label">{tx(...(PARTS[sel.tag] || [sel.tag, sel.tag]))}</div>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "bold" })}>{tx("Bold", "عريض")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "italic" })}>{tx("Italic", "مائل")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "underline" })}>{tx("Underline", "تسطير")}</button>
          <hr />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "justifyLeft" })}>{tx("Align left", "محاذاة لليسار")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "justifyCenter" })}>{tx("Center", "توسيط")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("format", { name: "justifyRight" })}>{tx("Align right", "محاذاة لليمين")}</button>
          {sel.tag !== "a" && (
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
              const href = prompt(tx("Link address", "عنوان الرابط"), sel.attrs.href || "https://");
              if (href) run("wrap-link", { href });
              else studio.closeContext();
            }}>{tx("Make this a link", "اجعل هذا رابطًا")}</button>
          )}
        </>
      )}
      {!part && (
        <>
          <hr />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { studio.cutEdit(); studio.closeContext(); }}>{tx("Cut", "قص")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { studio.copyEdit(); studio.closeContext(); }}>{tx("Copy", "نسخ")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { void studio.pasteEdit(false); studio.closeContext(); }}>{tx("Paste", "لصق")}</button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run("duplicate")}>{tx("Duplicate", "تكرار")}</button>
          <button type="button" className="danger" onMouseDown={(event) => event.preventDefault()} onClick={() => run("delete")}>{tx("Delete", "حذف")}</button>
        </>
      )}
    </div>
  );
}

function TableOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.2" y="1.2" width="9.2" height="9.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.2 4.2h9.2M1.2 7.2h9.2M4.2 1.2v9.2M7.4 1.2v9.2" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M10.2 10.2 14.6 14.6M14.6 10.2 10.2 14.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
