import { useLayoutEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

const COLOURS = ["#ffffff", "#f5f5f4", "#fff7ed", "#f0fdf4", "#eff6ff", "#0f766e", "#1d4ed8", "#b91c1c", "#1c1917"];

export function TableWindow({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const sel = studio.selection;
  const box = sel?.table;
  const [pos, setPos] = useState({ x: 280, y: 96 });
  useLayoutEffect(() => {
    const stage = document.querySelector(".stage");
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(560, Math.max(320, rect.width - 24));
    setPos({
      x: Math.max(8, rect.left + (rect.width - width) / 2),
      y: Math.max(64, rect.top + 8),
    });
  }, []);
  if (!sel || !box) return null;
  const drag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button")) return;
    const origin = { ...pos };
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (next: PointerEvent) => {
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - 80, origin.x + next.clientX - startX)),
        y: Math.max(48, Math.min(window.innerHeight - 48, origin.y + next.clientY - startY)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const who = box.all
    ? tx("Every cell", "كل الخلايا")
    : box.scope === "row"
      ? tx(`Row ${box.row}`, `صف ${box.row}`)
      : box.scope === "col"
        ? tx(`Column ${box.col}`, `عمود ${box.col}`)
        : box.count > 1
          ? tx(`${box.count} cells`, `${box.count} خلايا`)
          : tx("This cell", "هذه الخلية");
  const go = (kind: string, extra: Record<string, unknown> = {}) => studio.command({ cmd: "table-detail", path: sel.path, kind, ...extra });
  const boxCmd = (extra: Record<string, unknown>) => studio.command({ cmd: "table-box", path: sel.path, ...extra });
  return (
    <div className="tw" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label={tx("Table properties", "خصائص الجدول")} onKeyDown={(event) => { if (event.key === "Escape") studio.closeTableWindow(); }}>
      <header onPointerDown={drag}>
        <strong>{tx("Table properties", "خصائص الجدول")}</strong>
        <em>{box.rows} × {box.cols}{box.all ? ` · ${tx("whole table", "الجدول كله")}` : ""}</em>
        <button type="button" onClick={() => studio.closeTableWindow()} aria-label={tx("Close", "إغلاق")}>×</button>
      </header>
      <div className="tw-body">
        <fieldset>
          <legend>{tx("Size", "الحجم")}</legend>
          <div className="tw-pair">
            <Num label={tx("Rows", "الصفوف")} value={String(box.rows)} onCommit={(value) => { const n = finite(value); if (n !== null && n >= 1) go("rows", { value: n }); }} />
            <Num label={tx("Columns", "الأعمدة")} value={String(box.cols)} onCommit={(value) => { const n = finite(value); if (n !== null && n >= 1) go("cols", { value: n }); }} />
          </div>
          <SizeField label={tx("Width", "العرض")} value={box.width} onCommit={(value) => boxCmd({ width: value })} />
          <SizeField label={tx("Height", "الارتفاع")} value={box.height} onCommit={(value) => boxCmd({ height: value })} />
        </fieldset>
        <fieldset>
          <legend>{tx("Layout", "التخطيط")}</legend>
          <div className="tw-line">
            <span>{tx("Table", "الجدول")}</span>
            <span className="tw-choice">
              {(["left", "center", "right"] as const).map((where) => (
                <button key={where} type="button" className={box.align === where ? "on" : ""} onClick={() => boxCmd({ align: where })}>
                  {where === "left" ? tx("Left", "يسار") : where === "center" ? tx("Center", "وسط") : tx("Right", "يمين")}
                </button>
              ))}
            </span>
          </div>
          <Num label={tx("Padding", "الحشو")} value={box.pad || "0"} suffix="px" onCommit={(value) => { const n = finite(value); if (n !== null && n >= 0) go("pad", { value: n }); }} />
          <Num label={tx("Spacing", "التباعد")} value={box.spacing || "0"} suffix="px" onCommit={(value) => { const n = finite(value); if (n !== null && n >= 0) go("spacing", { value: n }); }} />
          <div className="tw-line">
            <span>{tx("Border", "الحد")}</span>
            <Num value={box.border || "0"} suffix="px" onCommit={(value) => { const n = finite(value); if (n !== null && n >= 0) go("border", { size: n, color: box.borderColor || "#d6d3d1" }); }} />
            <Colour value={box.borderColor || "#d6d3d1"} onChange={(value) => go("border", { size: box.border || "1", color: value })} />
          </div>
        </fieldset>
        <fieldset>
          <legend>{tx("Background", "الخلفية")}</legend>
          <ColourRow label={tx("Table", "الجدول")} value={box.background} onChange={(value) => go("background", { value })} />
          <ColourRow label={who} value={box.cellColor} onChange={(value) => go("cell-color", { value })} />
        </fieldset>
        <fieldset>
          <legend>{who}</legend>
          <div className="tw-line">
            <span>{tx("Text", "النص")}</span>
            <span className="tw-choice">
              {(["left", "center", "right"] as const).map((where) => (
                <button key={where} type="button" className={box.cellAlign === where ? "on" : ""} onClick={() => go("cell-align", { value: where })}>
                  {where === "left" ? tx("Left", "يسار") : where === "center" ? tx("Center", "وسط") : tx("Right", "يمين")}
                </button>
              ))}
            </span>
          </div>
          <div className="tw-line">
            <span>{tx("Vertical", "رأسي")}</span>
            <span className="tw-choice">
              {(["top", "middle", "bottom"] as const).map((where) => (
                <button key={where} type="button" className={box.cellValign === where ? "on" : ""} onClick={() => go("cell-valign", { value: where })}>
                  {where === "top" ? tx("Top", "أعلى") : where === "middle" ? tx("Middle", "وسط") : tx("Bottom", "أسفل")}
                </button>
              ))}
            </span>
          </div>
          <div className="tw-actions">
            <button type="button" onClick={() => studio.command({ cmd: box.count > 1 ? "merge-selection" : "merge", path: sel.path })}>{tx("Merge", "دمج")}</button>
            <button type="button" onClick={() => studio.command({ cmd: "split", path: sel.path })}>{tx("Unmerge", "فك الدمج")}</button>
          </div>
        </fieldset>
        <fieldset>
          <legend>{box.all ? tx("Every row", "كل الصفوف") : tx(`Row ${box.row}`, `صف ${box.row}`)}</legend>
          <Num label={tx("Height", "الارتفاع")} value={box.rowHeight || "0"} suffix="px" onCommit={(value) => { const n = finite(value); if (n !== null && n >= 24) go("row-height", { value: n }); }} />
          <div className="tw-actions">
            <button type="button" onClick={() => studio.command({ cmd: "row-above", path: sel.path })}>{tx("Above", "أعلى")}</button>
            <button type="button" onClick={() => studio.command({ cmd: "row-below", path: sel.path })}>{tx("Below", "أسفل")}</button>
            <button type="button" className="danger" onClick={() => studio.command({ cmd: "del-row", path: sel.path })}>{tx("Delete", "حذف")}</button>
          </div>
        </fieldset>
        <fieldset>
          <legend>{box.all ? tx("Every column", "كل الأعمدة") : tx(`Column ${box.col}`, `عمود ${box.col}`)}</legend>
          <Num label={tx("Width", "العرض")} value={box.colWidth || "0"} suffix="px" onCommit={(value) => { const n = finite(value); if (n !== null && n >= 36) go("col-width", { value: n }); }} />
          <div className="tw-actions">
            <button type="button" onClick={() => studio.command({ cmd: "col-before", path: sel.path })}>{tx("Left", "يسار")}</button>
            <button type="button" onClick={() => studio.command({ cmd: "col-after", path: sel.path })}>{tx("Right", "يمين")}</button>
            <button type="button" className="danger" onClick={() => studio.command({ cmd: "del-col", path: sel.path })}>{tx("Delete", "حذف")}</button>
          </div>
        </fieldset>
        <fieldset className="tw-wide">
          <legend>{tx("Margins", "الهوامش")}</legend>
          <div className="tw-margins">
            <Num label={tx("Top", "أعلى")} value={box.marginTop === "auto" ? "" : box.marginTop} placeholder="auto" onCommit={(value) => boxCmd({ margin: "top", marginValue: value.trim() === "" ? "auto" : value })} />
            <Num label={tx("Left", "يسار")} value={box.marginLeft === "auto" ? "" : box.marginLeft} placeholder="auto" onCommit={(value) => boxCmd({ margin: "left", marginValue: value.trim() === "" ? "auto" : value })} />
            <Num label={tx("Right", "يمين")} value={box.marginRight === "auto" ? "" : box.marginRight} placeholder="auto" onCommit={(value) => boxCmd({ margin: "right", marginValue: value.trim() === "" ? "auto" : value })} />
            <Num label={tx("Bottom", "أسفل")} value={box.marginBottom === "auto" ? "" : box.marginBottom} placeholder="auto" onCommit={(value) => boxCmd({ margin: "bottom", marginValue: value.trim() === "" ? "auto" : value })} />
          </div>
        </fieldset>
        <button type="button" className="tw-delete" onClick={() => studio.command({ cmd: "del-table", path: sel.path })}>
          <TableOffIcon />
          {tx("Delete table", "حذف الجدول")}
        </button>
      </div>
    </div>
  );
}

function finite(raw: string) {
  const n = Number(raw.trim());
  return Number.isFinite(n) ? Math.round(n) : null;
}

function Num({ label, value, suffix, placeholder, onCommit }: { label?: string; value: string; suffix?: string; placeholder?: string; onCommit: (value: string) => void }) {
  return (
    <label className="tw-num">
      {label && <span>{label}</span>}
      <input
        key={value + (placeholder || "")}
        defaultValue={value}
        placeholder={placeholder}
        inputMode="decimal"
        onBlur={(event) => onCommit(event.currentTarget.value)}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
      {suffix && <i>{suffix}</i>}
    </label>
  );
}

function SizeField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const unit: "px" | "%" = value.endsWith("%") ? "%" : "px";
  const num = value.endsWith("%") ? value.slice(0, -1) : value.endsWith("px") ? value.slice(0, -2) : value;
  return (
    <div className="tw-line">
      <span>{label}</span>
      <Num value={num} onCommit={(next) => { const n = finite(next); if (n !== null && n > 0) onCommit(`${n}${unit}`); }} />
      <select value={unit} onChange={(event) => { const n = finite(num); if (n !== null && n > 0) onCommit(`${n}${event.target.value}`); }} aria-label={label}>
        <option value="px">px</option>
        <option value="%">%</option>
      </select>
    </div>
  );
}

function Colour({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const paint = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return <input type="color" value={paint} aria-label={paint} onChange={(event) => onChange(event.target.value)} />;
}

function ColourRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { tx } = useI18n();
  return (
    <div className="tw-colour">
      <div className="tw-line">
        <span>{label}</span>
        <Colour value={value} onChange={onChange} />
        <button type="button" onClick={() => onChange("")}>{tx("None", "بدون")}</button>
      </div>
      <div className="tw-swatch">
        {COLOURS.map((colour) => (
          <button key={colour} type="button" style={{ background: colour }} aria-label={colour} className={value.toLowerCase() === colour ? "on" : ""} onClick={() => onChange(colour)} />
        ))}
      </div>
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
