import { memo, useEffect, useMemo, useState, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { CATS } from "../editor/blocks";
import { SNIPPETS } from "../editor/blocks";
import { locateElement, scrollCode } from "../editor/locate";
import { toLive } from "../editor/html";
import { FONTS, GRADIENTS, MISSIONS, SWATCHES, TAG_HELP, missionContext, passes } from "../editor/learn";
import { FileIcon } from "./FileIcon";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

const PALETTE: { id: (typeof CATS)[number]["id"]; label: [string, string]; blurb: [string, string] }[] = [
  { id: "ready", label: ["Page parts", "أجزاء الصفحة"], blurb: ["Drop these in to shape a whole page.", "أسقطها لتشكيل الصفحة كاملة."] },
  { id: "layout", label: ["Layout", "التخطيط"], blurb: ["Boxes, columns, and cards.", "صناديق وأعمدة وبطاقات."] },
  { id: "text", label: ["Text", "النصوص"], blurb: ["Headings, paragraphs, links, and buttons.", "عناوين وفقرات وروابط وأزرار."] },
  { id: "media", label: ["Pictures", "الصور"], blurb: ["Images, video, maps, and galleries.", "صور وفيديو وخرائط ومعارض."] },
  { id: "lists", label: ["Lists", "القوائم"], blurb: ["Bullets and numbered steps.", "نقاط وخطوات مرقمة."] },
  { id: "table", label: ["Tables", "الجداول"], blurb: ["Rows and columns of information.", "صفوف وأعمدة من المعلومات."] },
  { id: "forms", label: ["Forms", "النماذج"], blurb: ["Fields a visitor can fill in.", "حقول يملؤها الزائر."] },
  { id: "html5", label: ["HTML pieces", "قطع HTML"], blurb: ["The real tags behind a web page.", "الوسوم الحقيقية خلف صفحة الويب."] },
];

function partName(tag: string, tx: (en: string, ar: string) => string) {
  const names: Record<string, [string, string]> = {
    img: ["Picture", "صورة"],
    h1: ["Main heading", "عنوان رئيسي"],
    h2: ["Heading", "عنوان"],
    h3: ["Small heading", "عنوان صغير"],
    h4: ["Small heading", "عنوان صغير"],
    h5: ["Small heading", "عنوان صغير"],
    h6: ["Small heading", "عنوان صغير"],
    p: ["Paragraph", "فقرة"],
    a: ["Link", "رابط"],
    button: ["Button", "زر"],
    section: ["Section", "قسم"],
    ul: ["Bullet list", "قائمة نقطية"],
    ol: ["Numbered list", "قائمة مرقمة"],
    li: ["List item", "بند"],
    table: ["Table", "جدول"],
    div: ["Box", "صندوق"],
    nav: ["Menu", "قائمة"],
    header: ["Top of the page", "أعلى الصفحة"],
    footer: ["Footer", "تذييل"],
    main: ["Main area", "المحتوى"],
    figure: ["Picture group", "مجموعة صور"],
    figcaption: ["Caption", "تعليق"],
    td: ["Cell", "خلية"],
    th: ["Heading cell", "خلية عنوان"],
    tr: ["Row", "صف"],
    form: ["Form", "نموذج"],
    input: ["Field", "حقل"],
    textarea: ["Text box", "صندوق نص"],
    video: ["Video", "فيديو"],
    span: ["Words", "كلمات"],
  };
  const pair = names[tag];
  return pair ? tx(pair[0], pair[1]) : `<${tag}>`;
}

export function LeftPanel({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const pair = (value: [string, string]) => value[lang === "ar" ? 1 : 0];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ ready: true });
  const needle = query.trim().toLowerCase();
  const rails = [
    { id: "blocks" as const, label: tx("HTML", "HTML") },
    { id: "images" as const, label: tx("Pictures", "صور") },
    { id: "structure" as const, label: tx("Layers", "الطبقات") },
    { id: "missions" as const, label: tx("Learn", "تعلّم") },
  ];
  return (
    <aside className="panel left">
      <div className="ew-caption">{tx("Toolbox", "صندوق الأدوات")}</div>
      <nav className="rail" aria-label={tx("Toolbox", "صندوق الأدوات")}>
        {rails.map((item) => (
          <button
            key={item.id}
            type="button"
            className={studio.tab === item.id ? "on" : ""}
            data-spot={item.id === "images" ? "tab-images" : undefined}
            aria-current={studio.tab === item.id ? "page" : undefined}
            onClick={() => studio.setTab(item.id)}
          >
            <Glyph id={item.id === "blocks" ? "hero" : item.id === "images" ? "image" : item.id === "structure" ? "cols3" : "mission"} />
            <span>{item.label}</span>
            {item.id === "missions" && studio.mission.badges.length > 0 && <i className="rail-count">{studio.mission.badges.length}</i>}
          </button>
        ))}
      </nav>
      <div className="rail-body">
        {studio.tab === "blocks" && (
          <div className="tab-scroll">
            <label className="search">
              <span className="sr">{tx("Search parts", "ابحث عن جزء")}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tx("Find a tag…", "ابحث عن وسم…")} />
            </label>
            {PALETTE.map((cat) => {
              const blocks = studio.blocks.filter((block) => block.cat === cat.id && (!needle || pair(block.label).toLowerCase().includes(needle) || block.label[0].toLowerCase().includes(needle) || block.label[1].includes(query.trim())));
              if (!blocks.length) return null;
              const isOpen = Boolean(needle) || Boolean(open[cat.id]);
              return (
                <section key={cat.id} className="palette">
                  <button type="button" className="palette-head" aria-expanded={isOpen} onClick={() => setOpen((current) => ({ ...current, [cat.id]: !current[cat.id] }))}>
                    <span>
                      <span className="palette-title">{pair(cat.label)}</span>
                      {isOpen && <small>{pair(cat.blurb)}</small>}
                    </span>
                    <b aria-hidden="true">{isOpen ? "–" : "+"}</b>
                  </button>
                  {isOpen && (
                    <div className="block-grid">
                      {blocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          className="block"
                          data-spot={`block-${block.id}`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", `wd-block:${block.id}`);
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => studio.insertBlock(block.id, studio.selection?.path || null, studio.selection?.tag || "")}
                        >
                          <Glyph id={block.id} />
                          <b>{pair(block.label)}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
        {studio.tab === "images" && <Images studio={studio} />}
        {studio.tab === "structure" && studio.project && (
          <Structure html={studio.project.html} projectId={studio.project.id} selected={studio.selection?.path || null} onSelect={(path) => studio.command({ cmd: "select", path })} />
        )}
        {studio.tab === "missions" && <Missions studio={studio} />}
      </div>
    </aside>
  );
}

export function Glyph({ id }: { id: string }) {
  return (
    <svg className="glyph" viewBox="0 0 32 32" aria-hidden="true">
      {glyphBody(id)}
    </svg>
  );
}

function glyphBody(id: string): ReactNode {
  if (/^h[1-6]$/.test(id)) return <text x="4" y="22" fontSize="14" fontWeight="700">{id.toUpperCase()}</text>;
  switch (id) {
    case "p":
    case "quote":
      return <><rect x="6" y="8" width="20" height="2.2" rx="1" /><rect x="6" y="14" width="16" height="2.2" rx="1" /><rect x="6" y="20" width="18" height="2.2" rx="1" /></>;
    case "hero":
      return <><rect x="4" y="6" width="24" height="20" rx="3" /><rect x="8" y="12" width="16" height="2.4" rx="1" /><rect x="11" y="17" width="10" height="2" rx="1" /></>;
    case "navbar":
      return <><rect x="4" y="7" width="24" height="6" rx="2" /><rect x="7" y="18" width="5" height="2" /><rect x="14" y="18" width="5" height="2" /><rect x="21" y="18" width="5" height="2" /></>;
    case "features":
    case "cols2":
    case "cols3":
    case "cols4":
    case "structure":
      return <><rect x="4" y="8" width="7" height="16" rx="2" /><rect x="12.5" y="8" width="7" height="16" rx="2" /><rect x="21" y="8" width="7" height="16" rx="2" /></>;
    case "footer":
      return <rect x="4" y="20" width="24" height="6" rx="2" />;
    case "image":
    case "gallery":
    case "images":
      return <><rect x="5" y="7" width="22" height="18" rx="3" /><rect x="9" y="16" width="5" height="5" /><rect x="16" y="12" width="7" height="9" /></>;
    case "button":
    case "link":
      return <rect x="6" y="11" width="20" height="10" rx="5" />;
    case "card":
    case "section":
      return <><rect x="6" y="6" width="20" height="20" rx="3" /><rect x="10" y="11" width="12" height="2" /><rect x="10" y="16" width="8" height="2" /></>;
    case "ul":
    case "ol":
    case "nested":
      return <><rect x="7" y="9" width="3" height="3" rx="1" /><rect x="7" y="15" width="3" height="3" rx="1" /><rect x="7" y="21" width="3" height="3" rx="1" /><rect x="12" y="9.5" width="12" height="2" /><rect x="12" y="15.5" width="12" height="2" /><rect x="12" y="21.5" width="10" height="2" /></>;
    case "table":
      return <><rect x="5" y="7" width="22" height="18" rx="2" /><rect x="5" y="7" width="22" height="4" /><rect x="12" y="7" width="1.5" height="18" /><rect x="20" y="7" width="1.5" height="18" /></>;
    case "form":
    case "input":
    case "textarea":
    case "select":
      return <><rect x="6" y="7" width="20" height="5" rx="1.5" /><rect x="6" y="15" width="20" height="5" rx="1.5" /><rect x="6" y="23" width="10" height="3" rx="1.5" /></>;
    case "video":
    case "youtube":
    case "audio":
      return <><rect x="5" y="8" width="22" height="16" rx="3" /><polygon points="13,12 21,16 13,20" /></>;
    case "mission":
      return <polygon points="16,5 19.2,12 27,13 21.4,18.2 23,26 16,22 9,26 10.6,18.2 5,13 12.8,12" />;
    default:
      return <rect x="7" y="7" width="18" height="18" rx="4" />;
  }
}

function Images({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const project = studio.project;
  if (!project) return null;
  return (
    <div className="tab-scroll">
      <label
        className="dropzone"
        data-spot="media-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
          if (files.length) void studio.uploadFiles(files, null, "", false);
        }}
      >
        <input hidden type="file" accept="image/*" multiple onChange={(event) => void studio.uploadFiles([...(event.target.files || [])], studio.selection?.path || null, studio.selection?.tag || "", false)} />
        <strong>{tx("Drop images here, or click to upload", "أسقط الصور هنا، أو انقر للرفع")}</strong>
        <span>{tx("Drag a photo onto the page. Click it, then drag the corner to resize.", "اسحب الصورة إلى الصفحة. انقر عليها، ثم اسحب الزاوية لتغيير الحجم.")}</span>
      </label>
      {project.assets.length === 0 && <p className="hint">{tx("No images yet.", "لا توجد صور بعد.")}</p>}
      <div className="media-grid">
        {project.assets.map((asset) => (
          <figure key={asset.path}>
            <img
              src={asset.url}
              alt=""
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", `wd-image:${asset.path}`);
                event.dataTransfer.effectAllowed = "copy";
              }}
            />
            <figcaption>
              <button type="button" onClick={() => studio.insertMarkup(`<img src="${asset.path}" alt="" style="max-width:100%">`, undefined, studio.selection?.path || null, studio.selection?.tag || "")}>{tx("Insert", "إدراج")}</button>
              <button type="button" onClick={() => studio.useAssetBackground(asset.path)}>{tx("Background", "خلفية")}</button>
              <button type="button" onClick={() => { if (confirm(tx("Delete this image?", "حذف هذه الصورة؟"))) void studio.removeAsset(asset.path); }}>{tx("Delete", "حذف")}</button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Structure({ html, projectId, selected, onSelect }: { html: string; projectId: string; selected: number[] | null; onSelect: (path: number[]) => void }) {
  const { tx } = useI18n();
  const tree = useMemo(() => new DOMParser().parseFromString(`<body>${toLive(html, projectId)}</body>`, "text/html").body, [html, projectId]);
  return (
    <div className="tab-scroll">
      <p className="hint">{tx("Your page, drawn as blocks. Click a block to select it.", "صفحتك مرسومة ككتل. انقر كتلة لتحديدها.")}</p>
      <div className="wire-page">
        <WireNodes parent={tree} path={[]} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  );
}

function directText(el: HTMLElement) {
  return [...el.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isColumns(el: HTMLElement) {
  if (el.classList.contains("row")) return true;
  const kids = [...el.children];
  return kids.length >= 2 && kids.every((kid) => kid.classList.contains("col") || kid.classList.contains("card"));
}

function blockTitle(el: HTMLElement, tx: (en: string, ar: string) => string) {
  if (el.classList.contains("card")) return tx("Card", "بطاقة");
  if (el.classList.contains("col")) return tx("Column", "عمود");
  if (el.classList.contains("row")) return tx("Side by side", "جنبًا إلى جنب");
  if (el.classList.contains("hero")) return tx("Banner", "واجهة");
  return partName(el.tagName.toLowerCase(), tx);
}

function WireNodes({ parent, path, selected, onSelect }: { parent: HTMLElement; path: number[]; selected: number[] | null; onSelect: (path: number[]) => void }) {
  return (
    <>
      {[...parent.children].map((child, index) => {
        const tag = child.tagName.toLowerCase();
        if (tag === "script" || tag === "style") return null;
        return <WireBlock key={[...path, index].join("-")} el={child as HTMLElement} path={[...path, index]} selected={selected} onSelect={onSelect} />;
      })}
    </>
  );
}

function WireBlock({ el, path, selected, onSelect }: { el: HTMLElement; path: number[]; selected: number[] | null; onSelect: (path: number[]) => void }) {
  const { tx } = useI18n();
  const tag = el.tagName.toLowerCase();
  const on = selected?.join("-") === path.join("-");
  const title = blockTitle(el, tx);
  const text = directText(el);
  const pick = () => onSelect(path);

  if (tag === "img") {
    const src = el.getAttribute("src") || "";
    return (
      <button type="button" className={`wire-pic${on ? " on" : ""}`} title={title} onClick={pick}>
        {src ? <img src={src} alt="" /> : <span className="wire-missing">{title}</span>}
        <em>{el.getAttribute("alt") || title}</em>
      </button>
    );
  }

  if (/^h[1-6]$/.test(tag)) {
    return (
      <button type="button" className={`wire-h wire-${tag}${on ? " on" : ""}`} onClick={pick}>
        {text || title}
      </button>
    );
  }

  if (tag === "p" || tag === "blockquote" || tag === "figcaption") {
    return (
      <button type="button" className={`wire-copy${on ? " on" : ""}`} onClick={pick}>
        {text || title}
      </button>
    );
  }

  if (tag === "a" || tag === "button") {
    return (
      <button type="button" className={`wire-pill${on ? " on" : ""}`} onClick={pick}>
        {text || title}
      </button>
    );
  }

  if (tag === "hr") {
    return <button type="button" className={`wire-rule${on ? " on" : ""}`} onClick={pick} aria-label={title} />;
  }

  if (tag === "ul" || tag === "ol") {
    return (
      <div className={`wire wire-list${on ? " on" : ""}`}>
        <button type="button" className="wire-cap" onClick={pick}>{title}</button>
        <div className="wire-items">
          {[...el.children].map((child, index) => {
            if (child.tagName !== "LI") return null;
            const itemPath = [...path, index];
            const itemOn = selected?.join("-") === itemPath.join("-");
            return (
              <button key={itemPath.join("-")} type="button" className={`wire-li${itemOn ? " on" : ""}`} onClick={() => onSelect(itemPath)}>
                {(child.textContent || "").trim().replace(/\s+/g, " ").slice(0, 42) || tx("List item", "بند")}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (tag === "table") {
    const rows = tableRows(el, path);
    return (
      <div className={`wire wire-table${on ? " on" : ""}`}>
        <button type="button" className="wire-cap" onClick={pick}>{title}</button>
        <div className="wire-grid">
          {rows.slice(0, 4).map((row) => (
            <div key={row.map((cell) => cell.path.join("-")).join("|")} className="wire-grid-row" style={{ gridTemplateColumns: `repeat(${Math.min(row.length, 4)}, minmax(0, 1fr))` }}>
              {row.slice(0, 4).map((cell) => (
                <button key={cell.path.join("-")} type="button" className={`wire-cell${cell.head ? " head" : ""}${selected?.join("-") === cell.path.join("-") ? " on" : ""}`} onClick={() => onSelect(cell.path)}>
                  {cell.text || "·"}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tag === "input" || tag === "textarea" || tag === "select") {
    return (
      <button type="button" className={`wire-field${on ? " on" : ""}`} onClick={pick}>
        {el.getAttribute("placeholder") || title}
      </button>
    );
  }

  const columns = isColumns(el);
  const kids = [...el.children].filter((child) => child.tagName !== "SCRIPT" && child.tagName !== "STYLE");
  return (
    <div className={`wire wire-frame${on ? " on" : ""}${columns ? " is-row" : ""}`}>
      <button type="button" className="wire-cap" onClick={pick}>{title}</button>
      {text && <p className="wire-note">{text.slice(0, 80)}</p>}
      {kids.length > 0 && (
        <div className={columns ? "wire-cols" : "wire-stack"}>
          <WireNodes parent={el} path={path} selected={selected} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

function tableRows(table: HTMLElement, tablePath: number[]) {
  const rows: { text: string; path: number[]; head: boolean }[][] = [];
  const walk = (node: HTMLElement, path: number[]) => {
    const tag = node.tagName.toLowerCase();
    if (tag === "tr") {
      rows.push([...node.children].map((cell, index) => ({
        text: (cell.textContent || "").trim().replace(/\s+/g, " ").slice(0, 16),
        path: [...path, index],
        head: cell.tagName === "TH",
      })));
      return;
    }
    if (tag === "thead" || tag === "tbody" || tag === "tfoot") {
      [...node.children].forEach((child, index) => walk(child as HTMLElement, [...path, index]));
    }
  };
  [...table.children].forEach((child, index) => walk(child as HTMLElement, [...tablePath, index]));
  return rows;
}

function Missions({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const pair = (value: [string, string]) => value[lang === "ar" ? 1 : 0];
  const active = MISSIONS.find((item) => item.id === studio.mission.active);
  return (
    <div className="tab-scroll">
      <p className="hint">{tx("Missions are checked automatically as you work.", "تُفحص المهام تلقائيًا أثناء عملك.")}</p>
      {studio.mission.badges.length > 0 && (
        <div className="badge-row">
          {studio.mission.badges.map((id) => {
            const mission = MISSIONS.find((item) => item.id === id);
            if (!mission) return null;
            return <span key={id} className="badge" style={{ background: mission.badge.color }}>{mission.badge.emoji} {pair(mission.badge.name)}</span>;
          })}
        </div>
      )}
      {MISSIONS.map((mission) => {
        const ctx = studio.project ? missionContext(studio.project, studio.mission.events) : null;
        const done = ctx ? mission.steps.filter((step) => passes(step, ctx)).length : 0;
        const earned = studio.mission.badges.includes(mission.id);
        return (
          <article key={mission.id} className={`mission${active?.id === mission.id ? " on" : ""}`}>
            <header>
              <span>{mission.badge.emoji}</span>
              <div>
                <strong>{pair(mission.title)}</strong>
                <small>{pair(mission.topic)} · {mission.steps.length} {tx("steps", "خطوات")}</small>
              </div>
            </header>
            <div className="meter"><span style={{ width: `${(done / mission.steps.length) * 100}%` }} /></div>
            <button type="button" className="tb" onClick={() => studio.setModal({ type: "mission", id: mission.id })}>
              {earned ? tx("Practice again", "تدرّب مجددًا") : active?.id === mission.id ? tx("Restart", "ابدأ من جديد") : tx("Start mission", "ابدأ المهمة")}
            </button>
          </article>
        );
      })}
      <button type="button" className="text-btn" onClick={() => { if (confirm(tx("Clear all mission progress?", "مسح كل تقدم المهام؟"))) { studio.setMission({ active: null, badges: [], events: [] }); } }}>{tx("Reset all progress", "إعادة ضبط كل التقدم")}</button>
    </div>
  );
}

export function MissionBanner({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const pair = (value: [string, string]) => value[lang === "ar" ? 1 : 0];
  const mission = MISSIONS.find((item) => item.id === studio.mission.active);
  if (!mission || !studio.project) return null;
  const ctx = missionContext(studio.project, studio.mission.events);
  const flags = mission.steps.map((step) => passes(step, ctx));
  const index = flags.findIndex((ok) => !ok);
  const done = index === -1;
  const step = mission.steps[done ? mission.steps.length - 1 : index];
  return (
    <div className={`banner${done ? " done" : ""}`}>
      <div>
        <strong>{done ? tx("Mission complete", "اكتملت المهمة") : `${tx("Step", "الخطوة")} ${index + 1} ${tx("of", "من")} ${mission.steps.length}`}</strong>
        <span>{pair(step.title)}</span>
      </div>
      <p>{pair(step.hint)}</p>
      <div className="banner-actions">
        {step.spot && !done && <button type="button" className="tb" onClick={() => studio.showMe(step.spot!.id, step.spot)}>{tx("Show me", "أرني")}</button>}
        <button type="button" className="text-btn" onClick={() => studio.setMission({ ...studio.mission, active: null })}>{tx("Leave", "مغادرة")}</button>
      </div>
    </div>
  );
}

function PictureTools({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const sel = studio.selection;
  const widthText = sel?.style.width || "";
  const parsed = /^(\d+(?:\.\d+)?)%$/.exec(widthText);
  const current = parsed ? Math.round(Number(parsed[1])) : 100;
  const pathKey = sel?.path.join("-") || "";
  const [draft, setDraft] = useState(current);
  useEffect(() => { setDraft(current); }, [pathKey, current]);
  if (!sel || sel.tag !== "img") return null;
  const commit = (value: number) => {
    studio.command({ cmd: "styles", path: sel.path, props: { width: `${value}%`, height: "auto", maxWidth: "100%" } });
  };
  const margin = (sel.style.margin || "").replace(/\s+/g, " ");
  const side = /^12px 0 /.test(margin) ? "right" : / 0$/.test(margin) ? "left" : margin.includes("auto") ? "center" : "";
  const across = sel.style.display !== "inline-block" ? "one" : current <= 34 ? "three" : "two";
  const valign = sel.style.verticalAlign || "";
  const place = (where: "left" | "center" | "right") => {
    const next = where === "left" ? "12px auto 12px 0" : where === "right" ? "12px 0 12px auto" : "12px auto";
    studio.command({ cmd: "styles", path: sel.path, props: { display: "block", float: "none", margin: next, height: "auto" } });
  };
  return (
    <div className="card picture-card">
      <div className="mini">{tx("Picture", "الصورة")}</div>
      <p className="hint">{tx("Drag the corner on the picture to resize it.", "اسحب زاوية الصورة لتغيير حجمها.")}</p>
      <label className="stack">{tx("Size", "الحجم")} <strong className="picture-readout">{draft}%</strong>
        <input className="picture-size" type="range" min={15} max={100} value={draft}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onChange={(event) => {
            const value = Number(event.target.value);
            setDraft(value);
            studio.command({ cmd: "style-live", path: sel.path, prop: "width", value: `${value}%`, prop2: "height", value2: "auto" });
          }}
          onPointerUp={(event) => commit(Number(event.currentTarget.value))}
          onKeyUp={(event) => commit(Number(event.currentTarget.value))} />
      </label>
      <div className="chip-row">
        {[25, 50, 75, 100].map((size) => (
          <button key={size} type="button" className={current === size ? "on" : ""} onClick={() => commit(size)}>{size}%</button>
        ))}
      </div>
      <div className="mini">{tx("Place on the page", "مكانها في الصفحة")}</div>
      <div className="chip-row">
        <button type="button" className={side === "left" ? "on" : ""} onClick={() => place("left")}>{tx("Left", "يسار")}</button>
        <button type="button" className={side === "center" ? "on" : ""} onClick={() => place("center")}>{tx("Center", "وسط")}</button>
        <button type="button" className={side === "right" ? "on" : ""} onClick={() => place("right")}>{tx("Right", "يمين")}</button>
      </div>
      <div className="mini">{tx("Several photos", "عدة صور")}</div>
      <div className="chip-row">
        <button type="button" className={across === "one" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: "100%", valign: "top" })}>{tx("One per row", "صورة في كل صف")}</button>
        <button type="button" className={across === "two" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: "46%", valign: "top" })}>{tx("Two side by side", "صورتان جنبًا إلى جنب")}</button>
        <button type="button" className={across === "three" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: "30%", valign: "top" })}>{tx("Three side by side", "ثلاث صور جنبًا إلى جنب")}</button>
      </div>
      <div className="chip-row">
        <button type="button" className={valign === "top" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: sel.style.display === "inline-block" && widthText ? widthText : "46%", valign: "top" })}>{tx("Line up tops", "محاذاة الأعلى")}</button>
        <button type="button" className={valign === "middle" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: sel.style.display === "inline-block" && widthText ? widthText : "46%", valign: "middle" })}>{tx("Line up middles", "محاذاة المنتصف")}</button>
        <button type="button" className={valign === "bottom" ? "on" : ""} onClick={() => studio.command({ cmd: "picture-row", path: sel.path, width: sel.style.display === "inline-block" && widthText ? widthText : "46%", valign: "bottom" })}>{tx("Line up bottoms", "محاذاة الأسفل")}</button>
      </div>
      <label className="stack">{tx("Describe the picture", "صف الصورة")}
        <input value={sel.attrs.alt || ""} placeholder={tx("A photo of…", "صورة لـ…")} onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "alt", value: event.target.value })} />
      </label>
    </div>
  );
}

type MarginSide = "top" | "right" | "bottom" | "left";

function splitSize(value: string) {
  const match = /^(\d+(?:\.\d+)?)(px|%)$/.exec(value.trim());
  if (!match) return { num: "", unit: "px" as const };
  return { num: String(Math.round(Number(match[1]))), unit: match[2] as "px" | "%" };
}

function TableTools({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const sel = studio.selection;
  const box = sel?.table;
  const path = sel?.path.join("-") || "";
  const width = splitSize(box?.width || "");
  const height = splitSize(box?.height || "");
  const incoming = {
    top: box?.marginTop || "0",
    right: box?.marginRight || "0",
    bottom: box?.marginBottom || "0",
    left: box?.marginLeft || "0",
  };
  const [widthNum, setWidthNum] = useState(width.num);
  const [widthUnit, setWidthUnit] = useState(width.unit);
  const [heightNum, setHeightNum] = useState(height.num);
  const [heightUnit, setHeightUnit] = useState(height.unit);
  const [margins, setMargins] = useState(incoming);
  const widthFocus = useRef(false);
  const heightFocus = useRef(false);
  const marginFocus = useRef<MarginSide | null>(null);
  useEffect(() => {
    if (!widthFocus.current) {
      setWidthNum(width.num);
      setWidthUnit(width.unit);
    }
    if (!heightFocus.current) {
      setHeightNum(height.num);
      setHeightUnit(height.unit);
    }
    setMargins((prev) => ({
      top: marginFocus.current === "top" ? prev.top : incoming.top,
      right: marginFocus.current === "right" ? prev.right : incoming.right,
      bottom: marginFocus.current === "bottom" ? prev.bottom : incoming.bottom,
      left: marginFocus.current === "left" ? prev.left : incoming.left,
    }));
  }, [path, box?.width, box?.height, box?.marginTop, box?.marginRight, box?.marginBottom, box?.marginLeft, width.num, width.unit, height.num, height.unit, incoming.top, incoming.right, incoming.bottom, incoming.left]);
  if (!sel) return null;
  const commit = (kind: "width" | "height", num: string, unit: "px" | "%") => {
    const value = Number(num);
    if (!num.trim() || !Number.isFinite(value) || value <= 0) return;
    studio.command({ cmd: "table-box", path: sel.path, [kind]: `${Math.round(value)}${unit}` });
  };
  const commitMargin = (side: MarginSide, raw: string) => {
    if (!raw.trim()) {
      if (incoming[side] === "auto") return;
      studio.command({ cmd: "table-box", path: sel.path, margin: side, marginValue: "0" });
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    studio.command({ cmd: "table-box", path: sel.path, margin: side, marginValue: String(Math.round(value)) });
  };
  const align = (where: "left" | "center" | "right") => studio.command({ cmd: "table-box", path: sel.path, align: where });
  const colour = box?.scope === "row"
    ? tx("Row colour", "لون الصف")
    : box?.scope === "col"
      ? tx("Column colour", "لون العمود")
      : box && box.count > 1
        ? tx("Selected cells", "الخلايا المحددة")
        : tx("Cell colour", "لون الخلية");
  const marginField = (side: MarginSide, label: string) => (
    <label className={`m-${side}`}>
      <span>{label}</span>
      <input dir="ltr" inputMode="numeric" placeholder={incoming[side] === "auto" ? "auto" : "0"}
        value={margins[side] === "auto" ? "" : margins[side]}
        onFocus={() => { marginFocus.current = side; }}
        onChange={(event) => setMargins((prev) => ({ ...prev, [side]: event.target.value.replace(/[^\d]/g, "") }))}
        onBlur={(event) => { marginFocus.current = null; commitMargin(side, event.currentTarget.value); }}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    </label>
  );
  return (
    <div className="table-sheet">
      {box && (
        <Fold tone="blue" open title={tx("Size", "الحجم")} icon={<Mark d="M3 13V3h10M6 13v-3M9 13V7M12 13V5" />}>
          <label className="measure">
            <span>{tx("Width", "العرض")}</span>
            <input dir="ltr" inputMode="numeric" value={widthNum}
              onFocus={() => { widthFocus.current = true; }}
              onChange={(event) => setWidthNum(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={(event) => { widthFocus.current = false; commit("width", event.currentTarget.value, widthUnit); }}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
            <select value={widthUnit} onChange={(event) => {
              const unit = event.target.value as "px" | "%";
              const num = event.currentTarget.previousElementSibling instanceof HTMLInputElement ? event.currentTarget.previousElementSibling.value : widthNum;
              setWidthUnit(unit);
              commit("width", num, unit);
            }}>
              <option value="px">px</option>
              <option value="%">%</option>
            </select>
          </label>
          <label className="measure">
            <span>{tx("Height", "الارتفاع")}</span>
            <input dir="ltr" inputMode="numeric" value={heightNum}
              onFocus={() => { heightFocus.current = true; }}
              onChange={(event) => setHeightNum(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={(event) => { heightFocus.current = false; commit("height", event.currentTarget.value, heightUnit); }}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
            <select value={heightUnit} onChange={(event) => {
              const unit = event.target.value as "px" | "%";
              const num = event.currentTarget.previousElementSibling instanceof HTMLInputElement ? event.currentTarget.previousElementSibling.value : heightNum;
              setHeightUnit(unit);
              commit("height", num, unit);
            }}>
              <option value="px">px</option>
              <option value="%">%</option>
            </select>
          </label>
          <div className="align-row">
            <button type="button" className={`tb${box.align === "left" ? " on" : ""}`} onClick={() => align("left")}>{tx("Left", "يسار")}</button>
            <button type="button" className={`tb${box.align === "center" ? " on" : ""}`} onClick={() => align("center")}>{tx("Center", "وسط")}</button>
            <button type="button" className={`tb${box.align === "right" ? " on" : ""}`} onClick={() => align("right")}>{tx("Right", "يمين")}</button>
          </div>
        </Fold>
      )}
      {box && (
        <Fold tone="teal" title={tx("Margins", "الهوامش")} icon={<Mark d="M8 2v12M2 8h12" />}>
          <div className="margin-pad" dir="ltr">
            {marginField("top", tx("Top", "أعلى"))}
            {marginField("left", tx("Left", "يسار"))}
            <span className="m-page" aria-hidden="true" />
            {marginField("right", tx("Right", "يمين"))}
            {marginField("bottom", tx("Bottom", "أسفل"))}
          </div>
        </Fold>
      )}
      {box && (
        <Fold tone="amber" open title={tx("Rows and columns", "الصفوف والأعمدة")} icon={<Mark d="M2.5 2.5h11v11h-11zM2.5 6h11M2.5 9.5h11M6 2.5v11M9.5 2.5v11" />}>
          <div className="mini">{tx("Rows", "الصفوف")}</div>
          <div className="icon-tools">
            <Tip title={box.scope === "row" && !box.all ? tx(`Row ${box.row}`, `صف ${box.row}`) : tx("Select row", "تحديد الصف")} on={box.scope === "row" && !box.all} onClick={() => studio.command({ cmd: "table-scope", path: sel.path, scope: "row" })}><GlyphRow /></Tip>
            <Tip title={tx("Row above", "صف أعلى")} onClick={() => studio.command({ cmd: "row-above", path: sel.path })}><GlyphAbove /></Tip>
            <Tip title={tx("Row below", "صف أسفل")} onClick={() => studio.command({ cmd: "row-below", path: sel.path })}><GlyphBelow /></Tip>
            <Tip title={tx("Delete row", "حذف الصف")} danger onClick={() => studio.command({ cmd: "del-row", path: sel.path })}><GlyphRowOff /></Tip>
          </div>
          <div className="mini">{tx("Columns", "الأعمدة")}</div>
          <div className="icon-tools">
            <Tip title={box.scope === "col" && !box.all ? tx(`Column ${box.col}`, `عمود ${box.col}`) : tx("Select column", "تحديد العمود")} on={box.scope === "col" && !box.all} onClick={() => studio.command({ cmd: "table-scope", path: sel.path, scope: "col" })}><GlyphCol /></Tip>
            <Tip title={tx("Column to the left", "عمود إلى اليسار")} onClick={() => studio.command({ cmd: "col-before", path: sel.path })}><GlyphLeft /></Tip>
            <Tip title={tx("Column to the right", "عمود إلى اليمين")} onClick={() => studio.command({ cmd: "col-after", path: sel.path })}><GlyphRight /></Tip>
            <Tip title={tx("Delete column", "حذف العمود")} danger onClick={() => studio.command({ cmd: "del-col", path: sel.path })}><GlyphColOff /></Tip>
          </div>
          <div className="icon-tools table-all">
            <Tip title={tx("Select table", "تحديد الجدول")} on={Boolean(box.all)} onClick={() => studio.command({ cmd: "table-scope", path: sel.path, scope: "all" })}><GlyphTable /></Tip>
            <Tip title={tx("Delete table", "حذف الجدول")} danger onClick={() => studio.command({ cmd: "del-table", path: sel.path })}><GlyphTableOff /></Tip>
            <span>{tx("Whole table", "الجدول كله")}</span>
          </div>
        </Fold>
      )}
      <Fold tone="rose" title={colour} icon={<Mark d="M8 2.5a4 4 0 0 1 4 5c0 2.4-2 4-2.4 6.2H6.4C6 11.5 4 9.9 4 7.5a4 4 0 0 1 4-5z" />}>
        <div className="table-colour">
          <input type="color" aria-label={tx("Background", "الخلفية")} value={toHex(sel.style.backgroundColor, "#ffffff")} onChange={(event) => goPaint(studio, sel.path, event.target.value)} />
          <button type="button" className="tb" onClick={() => goPaint(studio, sel.path, "")}>{tx("Clear", "بدون لون")}</button>
        </div>
        <div className="swatches">
          {SWATCHES.map((color) => <button key={color} type="button" style={{ background: color }} aria-label={color} onClick={() => goPaint(studio, sel.path, color)} />)}
        </div>
      </Fold>
      <p className="hint">{tx("Right-click a cell for rows, columns, and merge. Drag across cells, or Shift-click, to select more than one.", "انقر بزر الفأرة الأيمن على خلية للصفوف والأعمدة والدمج. اسحب عبر الخلايا، أو انقر مع Shift، لتحديد أكثر من خلية.")}</p>
    </div>
  );
}

function Tip({ title, on, danger, onClick, children }: { title: string; on?: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`tip${on ? " on" : ""}${danger ? " danger" : ""}`} title={title} aria-label={title} onClick={onClick}>
      {children}
    </button>
  );
}

function GlyphTable() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 6h13M1.5 10.5h13M6 1.5v13M10.5 1.5v13" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function GlyphTableOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.2" y="1.2" width="9.2" height="9.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.2 4.2h9.2M1.2 7.2h9.2M4.2 1.2v9.2M7.4 1.2v9.2" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M10.2 10.2 14.6 14.6M14.6 10.2 10.2 14.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function GlyphRow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 5.2h13M1.5 10.8h13" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.2" y="5.8" width="11.6" height="4.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function GlyphAbove() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.6v4.2M5.6 4.2 8 1.6l2.4 2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 8.2h12M2 11.2h12M2 14.2h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function GlyphBelow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 1.8h12M2 4.8h12M2 7.8h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 10.2v4.2M5.6 12.2 8 14.4l2.4-2.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GlyphRowOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 3.2h12M2 6.4h12M2 9.6h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4.5 11.2 11.5 14.6M11.5 11.2 4.5 14.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function GlyphCol() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 1.5v13M10.8 1.5v13" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5.8" y="2.2" width="4.4" height="11.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function GlyphLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.6 8h4.2M4.2 5.6 1.6 8l2.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.2 2v12M11.2 2v12M14.2 2v12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function GlyphRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.8 2v12M4.8 2v12M7.8 2v12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.2 8h4.2M12.2 5.6 14.4 8l-2.2 2.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GlyphColOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 2v12M6.4 2v12M9.6 2v12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11.2 4.5 14.6 11.5M14.6 4.5 11.2 11.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function goPaint(studio: Studio, path: number[], value: string) {
  studio.command({ cmd: "table-paint", path, value });
}

function Fold({ title, tone, open, icon, children }: { title: string; tone: "blue" | "teal" | "amber" | "rose" | "violet"; open?: boolean; icon: ReactNode; children: ReactNode }) {
  const [shown, setShown] = useState(Boolean(open));
  return (
    <details className={`fold tone-${tone}`} open={shown} onToggle={(event) => setShown(event.currentTarget.open)}>
      <summary>
        <i className="fold-ico">{icon}</i>
        {title}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

function Mark({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Inspector({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const sel = studio.selection;
  const help = sel ? TAG_HELP[sel.tag] : undefined;
  const [pane, setPane] = useState<"write" | "look" | "place">("write");
  const classes = new Set((sel?.className || "").split(/\s+/).filter(Boolean));
  const style = (prop: string, value: string) => {
    if (!sel) return;
    if (prop === "backgroundColor" && sel.table && (sel.table.scope !== "cell" || sel.tag === "td" || sel.tag === "th")) {
      studio.command({ cmd: "table-paint", path: sel.path, value });
      return;
    }
    studio.command({ cmd: "style", path: sel.path, prop, value });
  };
  return (
    <aside className="panel right">
      <div className="ew-caption">{tx("Tag Properties", "خصائص الوسم")}</div>
      <div className="inspect-head">
        <div className="panel-title">
          {sel ? partName(sel.tag, tx) : tx("Your page", "صفحتك")}
          {sel && <small>&lt;{sel.tag}&gt;</small>}
        </div>
        {sel && (
          <div className="prop-actions">
            <IconButton title={tx("Outside", "ما حوله")} onClick={() => studio.command({ cmd: "parent", path: sel.path })}><Mark d="M8 12V4M5 7l3-3 3 3M3 14h10" /></IconButton>
            <IconButton title={tx("Copy", "نسخ")} onClick={() => studio.command({ cmd: "duplicate", path: sel.path })}><Mark d="M6 5h7v9H6zM3 3h7v2" /></IconButton>
            <IconButton title={tx("Delete", "حذف")} danger onClick={() => studio.command({ cmd: "delete", path: sel.path })}><Mark d="M3.5 4.5h9M6 4.5V3h4v1.5M5 6.5l.6 6h4.8l.6-6" /></IconButton>
          </div>
        )}
      </div>
      {sel && (
        <div className="prop-tabs" role="tablist">
          <button type="button" role="tab" data-tone="blue" aria-selected={pane === "write"} onClick={() => setPane("write")}>
            <Mark d="M5 4.5 2.5 8 5 11.5M11 4.5 13.5 8 11 11.5" />
            {tx("Tag", "الوسم")}
          </button>
          <button type="button" role="tab" data-tone="teal" aria-selected={pane === "look"} onClick={() => setPane("look")}>
            <Mark d="M8 3.2c2.4 2.6 3.6 4.2 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1.8 1.2-3.4 3.6-6z" />
            {tx("CSS", "CSS")}
          </button>
          <button type="button" role="tab" data-tone="amber" aria-selected={pane === "place"} onClick={() => setPane("place")}>
            <Mark d="M3 3h10v10H3zM3 7h10M7 3v10" />
            {tx("Box", "الصندوق")}
          </button>
        </div>
      )}
      <div className="tab-scroll">
        {sel?.tag === "img" && <PictureTools studio={studio} />}
        {!sel && (
          <p className="hint page-hint">{tx("Click a part to change it. Colour and Picture below change the whole page.", "انقر على جزء لتغييره. اللون والصورة أدناه يغيّران الصفحة كلها.")}</p>
        )}
        {sel && help && sel.tag !== "img" && <p className="hint">{help[lang === "ar" ? 1 : 0]}</p>}
        {sel && pane === "write" && (
          <>
            {sel.tag !== "img" && (
              <Fold tone="blue" open title={tx("Text", "النص")} icon={<Mark d="M3 3.5h10M8 3.5v9M5.5 12.5h5" />}>
                <div className="tool-row">
                  <IconButton title={tx("Bold", "عريض")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "bold" })}><Mark d="M4 3h4.2a2.6 2.6 0 0 1 0 5.2H4zM4 8.2h5a2.5 2.5 0 0 1 0 5H4z" /></IconButton>
                  <IconButton title={tx("Italic", "مائل")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "italic" })}><Mark d="M9.5 3 6.5 13M7 3h5M4 13h5" /></IconButton>
                  <IconButton title={tx("Underline", "تسطير")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "underline" })}><Mark d="M4.5 3v5a3.5 3.5 0 0 0 7 0V3M3.5 13.5h9" /></IconButton>
                  <IconButton title={tx("Strike", "شطب")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "strikeThrough" })}><Mark d="M3 8h10M6 4.5h4a2 2 0 0 1 0 4M6 11.5h4" /></IconButton>
                  <IconButton title={tx("Align left", "يسار")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "justifyLeft" })}><Mark d="M3 4h10M3 8h7M3 12h10" /></IconButton>
                  <IconButton title={tx("Center", "توسيط")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "justifyCenter" })}><Mark d="M3 4h10M4.5 8h7M3 12h10" /></IconButton>
                  <IconButton title={tx("Align right", "يمين")} onClick={() => studio.command({ cmd: "format", path: sel.path, name: "justifyRight" })}><Mark d="M3 4h10M6 8h7M3 12h10" /></IconButton>
                </div>
                {sel.canEditText && (
                  <label className="stack">{tx("Words", "الكلمات")}
                    <textarea rows={3} value={sel.text} onChange={(event) => studio.command({ cmd: "text", path: sel.path, value: event.target.value })} />
                  </label>
                )}
              </Fold>
            )}
            {(sel.tag === "a" || sel.tag === "button" || (sel.tag !== "img" && sel.tag !== "html")) && (
              <Fold tone="teal" open={sel.tag === "a" || sel.tag === "button"} title={tx("Link", "الرابط")} icon={<Mark d="M6.5 9.5 5 11a2.2 2.2 0 0 1-3-3l2-2a2.2 2.2 0 0 1 3 0M9.5 6.5 11 5a2.2 2.2 0 0 1 3 3l-2 2a2.2 2.2 0 0 1-3 0" />}>
                {(sel.tag === "a" || sel.tag === "button") ? (
                  <>
                    <label className="stack">{tx("Link address", "عنوان الرابط")}
                      <input dir="ltr" value={sel.attrs.href || ""} placeholder="https://" onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "href", value: event.target.value })} />
                    </label>
                    <label className="check"><input type="checkbox" checked={sel.attrs.target === "_blank"} onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "target", value: event.target.checked ? "_blank" : "" })} /> {tx("Open in a new tab", "فتح في تبويب جديد")}</label>
                  </>
                ) : (
                  <button type="button" className="text-btn" onClick={() => {
                    const href = prompt(tx("Link address", "عنوان الرابط"), "https://");
                    if (href) studio.command({ cmd: "wrap-link", path: sel.path, href });
                  }}>{tx("Make this a link", "اجعل هذا رابطًا")}</button>
                )}
              </Fold>
            )}
            {(sel.tag === "ul" || sel.tag === "ol" || sel.tag === "li") && (
              <Fold tone="amber" open title={tx("List", "القائمة")} icon={<Mark d="M3 4.5h2M7 4.5h6M3 8h2M7 8h6M3 11.5h2M7 11.5h6" />}>
                <div className="tool-row">
                  <IconButton title={tx("Add item", "إضافة بند")} onClick={() => studio.command({ cmd: "list-add", path: sel.path })}><Mark d="M8 3v10M3 8h10" /></IconButton>
                  <IconButton title={tx("Remove item", "حذف البند")} danger onClick={() => studio.command({ cmd: "list-remove", path: sel.path })}><Mark d="M3 8h10" /></IconButton>
                </div>
                <div className="tool-row">
                  {LIST_MARKS.map((mark) => (
                    <IconButton key={mark.id} title={tx(mark.label[0], mark.label[1])} pressed={listMarker(sel) === mark.id} onClick={() => studio.command({ cmd: "list-marker", path: sel.path, value: mark.id })}>
                      <ListMark kind={mark.id} />
                    </IconButton>
                  ))}
                </div>
              </Fold>
            )}
            {(sel.table || ["table", "tr", "td", "th", "thead", "tbody"].includes(sel.tag)) && <TableTools studio={studio} />}
          </>
        )}
        {sel && pane === "look" && (
          <>
            <Fold tone="rose" open title={tx("Colours", "الألوان")} icon={<Mark d="M8 2.5a4 4 0 0 1 4 5c0 2.4-2 4-2.4 6.2H6.4C6 11.5 4 9.9 4 7.5a4 4 0 0 1 4-5zM6.2 13.5h3.6" />}>
              <div className="color-pair">
                <label>{tx("Text", "النص")}
                  <input type="color" value={toHex(sel.style.color)} onChange={(event) => style("color", event.target.value)} />
                </label>
                <label>{tx("Fill", "التعبئة")}
                  <input type="color" value={toHex(sel.style.backgroundColor, "#ffffff")} onChange={(event) => style("backgroundColor", event.target.value)} />
                </label>
              </div>
              <div className="swatches">
                {SWATCHES.map((color) => <button key={color} type="button" style={{ background: color }} aria-label={color} onClick={() => style("color", color)} />)}
              </div>
            </Fold>
            <Fold tone="violet" title={tx("Type", "الخط")} icon={<Mark d="M3 13 8 3l5 10M5 9.5h6" />}>
              <label className="stack">{tx("Font", "الخط")}
                <select value={sel.style.fontFamily || ""} onChange={(event) => {
                  const font = FONTS.find((item) => item.value === event.target.value);
                  studio.setFont(font?.family || "", event.target.value);
                }}>
                  <option value="">{tx("Same as the page", "مثل الصفحة")}</option>
                  {FONTS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
                </select>
              </label>
              <div className="chip-row">
                {["16px", "20px", "28px", "40px", "56px"].map((size) => (
                  <button key={size} type="button" className={sel.style.fontSize === size ? "on" : ""} onClick={() => style("fontSize", size)}>{size.replace("px", "")}</button>
                ))}
              </div>
              <details className="more-type">
                <summary>{tx("Another size", "حجم آخر")}</summary>
                <input value={sel.style.fontSize || ""} placeholder="18px" onChange={(event) => style("fontSize", event.target.value)} />
              </details>
            </Fold>
            <Fold tone="amber" title={tx("Effects", "تأثيرات")} icon={<Mark d="M8 2.2 9.4 6H13l-2.8 2.2 1 3.8L8 10l-3.2 2 1-3.8L3 6h3.6z" />}>
              <div className="chip-row">
                {([
                  ["rounded", tx("Rounded", "دائري")],
                  ["shadow", tx("Shadow", "ظل")],
                  ["bordered", tx("Border", "إطار")],
                  ["center", tx("Center", "توسيط")],
                  ["grow", tx("Grow", "تكبير")],
                  ["lift", tx("Lift", "رفع")],
                ] as const).map(([name, label]) => (
                  <button key={name} type="button" className={classes.has(name) ? "on" : ""} onClick={() => studio.toggleFx(name)}>{label}</button>
                ))}
                <button type="button" onClick={() => studio.command({ cmd: "clear-fx", path: sel.path })}>{tx("Clear", "مسح")}</button>
              </div>
            </Fold>
            <Fold tone="teal" title={tx("Whole page", "الصفحة كلها")} icon={<Mark d="M2.5 3.5h11v9h-11zM2.5 6h11" />}>
              <PageBackground studio={studio} nested />
            </Fold>
          </>
        )}
        {sel && pane === "place" && (
          <>
            <Fold tone="amber" open title={tx("Space inside", "المسافة الداخلية")} icon={<Mark d="M3 3h10v10H3zM5.5 5.5h5v5h-5z" />}>
              <div className="chip-row">
                {([
                  ["0", tx("None", "بدون")],
                  ["12px", tx("Small", "صغيرة")],
                  ["24px", tx("Medium", "متوسطة")],
                  ["48px", tx("Large", "كبيرة")],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" className={sel.style.padding === value ? "on" : ""} onClick={() => style("padding", value)}>{label}</button>
                ))}
              </div>
            </Fold>
            <Fold tone="blue" open title={tx("Space outside", "المسافة الخارجية")} icon={<Mark d="M1.5 1.5h13v13h-13zM4.5 4.5h7v7h-7z" />}>
              <div className="chip-row">
                {([
                  ["0", tx("None", "بدون")],
                  ["16px 0", tx("Small", "صغيرة")],
                  ["32px 0", tx("Large", "كبيرة")],
                  ["0 auto", tx("Center", "وسط")],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" className={sel.style.margin === value ? "on" : ""} onClick={() => style("margin", value)}>{label}</button>
                ))}
              </div>
            </Fold>
            <Fold tone="violet" title={tx("Corners", "الزوايا")} icon={<Mark d="M3 7V3h4M13 9v4H9" />}>
              <div className="chip-row">
                {([
                  ["0", tx("Square", "مربع")],
                  ["8px", tx("Soft", "ناعمة")],
                  ["16px", tx("Round", "دائرية")],
                  ["999px", tx("Pill", "حبّة")],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" className={sel.style.borderRadius === value ? "on" : ""} onClick={() => style("borderRadius", value)}>{label}</button>
                ))}
              </div>
            </Fold>
            <Fold tone="teal" title={tx("More options", "خيارات أكثر")} icon={<Mark d="M3 4.5h10M3 8h10M3 11.5h6" />}>
              <div className="style-grid">
                <label>{tx("Padding", "الحشوة")}<input value={sel.style.padding || ""} placeholder="16px" onChange={(event) => style("padding", event.target.value)} /></label>
                <label>{tx("Margin", "الهامش")}<input value={sel.style.margin || ""} placeholder="12px 0" onChange={(event) => style("margin", event.target.value)} /></label>
                {sel.tag !== "img" && <label>{tx("Width", "العرض")}<input value={sel.style.width || ""} placeholder="100%" onChange={(event) => style("width", event.target.value)} /></label>}
                <label>{tx("Radius", "الاستدارة")}<input value={sel.style.borderRadius || ""} placeholder="12px" onChange={(event) => style("borderRadius", event.target.value)} /></label>
              </div>
              <label className="stack">{tx("Classes", "الفئات")}
                <input dir="ltr" value={sel.className} onChange={(event) => studio.command({ cmd: "class", path: sel.path, value: event.target.value })} />
              </label>
              <label className="stack">{tx("id", "id")}
                <input dir="ltr" value={sel.id} onChange={(event) => studio.command({ cmd: "attr", path: sel.path, name: "id", value: event.target.value })} />
              </label>
              <CodeLinkCard studio={studio} />
            </Fold>
          </>
        )}
        {!sel && (
          <Fold tone="teal" open title={tx("Whole page", "الصفحة كلها")} icon={<Mark d="M2.5 3.5h11v9h-11zM2.5 6h11" />}>
            <PageBackground studio={studio} nested />
          </Fold>
        )}
      </div>
    </aside>
  );
}

type GradStop = { color: string; at: number };

function splitGradient(value: string) {
  const inner = value.trim().match(/^linear-gradient\((.*)\)$/i)?.[1];
  if (!inner) return null;
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseGradient(value: string) {
  const parts = splitGradient(value);
  if (!parts || parts.length < 2) return null;
  let angle = 180;
  let colors = parts;
  const deg = parts[0].match(/^(-?\d+(?:\.\d+)?)deg$/i);
  if (deg) {
    angle = ((Math.round(Number(deg[1])) % 360) + 360) % 360;
    colors = parts.slice(1);
  } else if (/^to\b/i.test(parts[0])) {
    angle = /right/i.test(parts[0]) ? 90 : /left/i.test(parts[0]) ? 270 : /top/i.test(parts[0]) ? 0 : 180;
    colors = parts.slice(1);
  }
  if (colors.length < 2) return null;
  const stops: GradStop[] = colors.map((part, index) => {
    const found = part.match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)%)?\s*$/);
    const color = (found?.[1] || part).trim();
    const at = found?.[2] != null ? Number(found[2]) : Math.round((index / (colors.length - 1)) * 100);
    return { color, at: Math.max(0, Math.min(100, Math.round(at))) };
  });
  return { angle, stops };
}

function formatGradient(angle: number, stops: GradStop[]) {
  return `linear-gradient(${angle}deg, ${stops.map((stop) => `${stop.color} ${stop.at}%`).join(", ")})`;
}

function mixHex(a: string, b: string) {
  const left = asHex(a).slice(1);
  const right = asHex(b).slice(1);
  const channel = (index: number) => Math.round((parseInt(left.slice(index, index + 2), 16) + parseInt(right.slice(index, index + 2), 16)) / 2);
  return `#${[0, 2, 4].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
}

function GradientEditor({ gradient, onChange }: { gradient: string; onChange: (value: string, history?: boolean) => void }) {
  const { tx } = useI18n();
  const parsed = parseGradient(gradient);
  const drag = useRef(false);
  if (!parsed) return null;
  const { angle, stops } = parsed;
  const paint = (nextAngle: number, nextStops: GradStop[], history: boolean) => onChange(formatGradient(nextAngle, nextStops), history);
  const slide = (nextAngle: number, nextStops: GradStop[]) => {
    paint(nextAngle, nextStops, !drag.current);
    drag.current = true;
  };
  const moveStop = (index: number, at: number) => {
    const min = index === 0 ? 0 : stops[index - 1].at;
    const max = index === stops.length - 1 ? 100 : stops[index + 1].at;
    const next = stops.map((stop, i) => (i === index ? { ...stop, at: Math.max(min, Math.min(max, at)) } : stop));
    slide(angle, next);
  };
  const addStop = () => {
    let gap = 0;
    let index = 0;
    for (let i = 0; i < stops.length - 1; i += 1) {
      const size = stops[i + 1].at - stops[i].at;
      if (size > gap) {
        gap = size;
        index = i;
      }
    }
    const next = [...stops];
    next.splice(index + 1, 0, { color: mixHex(stops[index].color, stops[index + 1].color), at: Math.round((stops[index].at + stops[index + 1].at) / 2) });
    paint(angle, next, true);
  };
  return (
    <div className="grad-edit">
      <div className="mini">{tx("Change the blend", "غيّر التدرج")}</div>
      <div className="grad-preview" style={{ background: formatGradient(angle, stops) }} />
      <label className="grad-line">{tx("Direction", "الاتجاه")} <b>{angle}°</b>
        <input type="range" min={0} max={360} value={angle} aria-label={tx("Direction", "الاتجاه")}
          onPointerDown={() => { drag.current = false; }}
          onChange={(event) => slide(Number(event.target.value), stops)}
          onPointerUp={() => { drag.current = false; }}
          onKeyUp={() => { drag.current = false; }} />
      </label>
      {stops.map((stop, index) => (
        <div className="grad-stop" key={`${index}-${stops.length}`}>
          <input type="color" value={asHex(stop.color)} aria-label={tx("Colour", "لون")} onChange={(event) => {
            const next = stops.map((item, i) => (i === index ? { ...item, color: event.target.value } : item));
            paint(angle, next, true);
          }} />
          <input type="range" min={index === 0 ? 0 : stops[index - 1].at} max={index === stops.length - 1 ? 100 : stops[index + 1].at} value={stop.at} aria-label={tx("How far this colour reaches", "إلى أين يصل هذا اللون")}
            onPointerDown={() => { drag.current = false; }}
            onChange={(event) => moveStop(index, Number(event.target.value))}
            onPointerUp={() => { drag.current = false; }}
            onKeyUp={() => { drag.current = false; }} />
          <span className="pct">{stop.at}%</span>
          {stops.length > 2 && <button type="button" className="grad-x" aria-label={tx("Remove this colour", "أزل هذا اللون")} onClick={() => paint(angle, stops.filter((_, i) => i !== index), true)}>×</button>}
        </div>
      ))}
      {stops.length < 4 && <button type="button" className="text-btn" onClick={addStop}>{tx("Add a colour", "أضف لوناً")}</button>}
    </div>
  );
}

function bodyValue(css: string, prop: string) {
  const marked = css.match(/\/\* page-bg \*\/\s*body\s*\{([^}]*)\}/)?.[1];
  const body = marked || css.match(/(^|\n)\s*body\s*\{([^}]*)\}/)?.[2] || "";
  const found = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  return found?.[1].trim() || "";
}

function PageBackground({ studio, nested }: { studio: Studio; nested?: boolean }) {
  const { tx } = useI18n();
  const project = studio.project;
  const css = project?.css || "";
  const image = bodyValue(css, "background-image").match(/url\((['"]?)([^'")]+)/)?.[2] || "";
  const fill = bodyValue(css, "background") || bodyValue(css, "background-color");
  const [choice, setChoice] = useState<"colour" | "picture">(image ? "picture" : "colour");
  return (
    <section className={`page-bg${nested ? " bare" : ""}`}>
      {!nested && <div className="mini">{tx("Whole page", "الصفحة كلها")}</div>}
      <div className="seg page-choice" role="tablist">
        <button type="button" role="tab" aria-selected={choice === "colour"} onClick={() => setChoice("colour")}>{tx("Colour", "لون")}</button>
        <button type="button" role="tab" aria-selected={choice === "picture"} onClick={() => setChoice("picture")}>{tx("Picture", "صورة")}</button>
      </div>
      {choice === "colour" ? (
        <>
          <div className="page-swatches">
            {SWATCHES.map((color) => (
              <button key={color} type="button" className={fill === color ? "on" : ""} style={{ background: color }} aria-label={color} onClick={() => studio.setPageBackground(color)} />
            ))}
          </div>
          <label className="custom-colour">{tx("Your own colour", "لونك أنت")}
            <input type="color" value={toHex(fill.startsWith("#") ? fill : "", "#ffffff")} onChange={(event) => studio.setPageBackground(event.target.value)} />
          </label>
          <div className="grad-row">
            {GRADIENTS.map((gradient) => (
              <button key={gradient} type="button" className={fill === gradient ? "on" : ""} style={{ background: gradient }} aria-label={tx("Gradient", "تدرج")} onClick={() => studio.setPageBackground(gradient)} />
            ))}
          </div>
          {parseGradient(fill) && <GradientEditor gradient={fill} onChange={studio.setPageBackground} />}
        </>
      ) : (
        <>
          <p className="hint">{tx("It fills the whole page, behind everything.", "تملأ الصفحة كلها، خلف كل شيء.")}</p>
          <label className="dropzone slim">
            <input hidden type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void studio.uploadFiles([file], null, "", false).then((asset) => {
                if (asset) studio.useAssetBackground(asset.path);
              });
            }} />
            <strong>{tx("Upload a picture", "ارفع صورة")}</strong>
          </label>
          {project && project.assets.length > 0 && (
            <div className="bg-photos">
              {project.assets.map((asset) => (
                <button key={asset.path} type="button" className={image.includes(asset.path) ? "on" : ""} aria-label={tx("Use as page background", "اجعلها خلفية الصفحة")} onClick={() => studio.useAssetBackground(asset.path)}>
                  <img src={asset.url} alt="" />
                </button>
              ))}
            </div>
          )}
          {image && <button type="button" className="text-btn" onClick={() => studio.setPageBackground("#ffffff")}>{tx("Remove the picture", "أزل الصورة")}</button>}
        </>
      )}
    </section>
  );
}

function CodeLinkCard({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const project = studio.project;
  const selection = studio.selection;
  const link = useMemo(() => {
    if (!project || !selection) return null;
    return locateElement(project.html, project.css, selection);
  }, [project, selection]);
  if (!link || !selection) return null;
  return (
    <div className="code-link">
      <div className="mini">{tx("In the code", "في الكود")}</div>
      <p className="hint">{link.explain[lang === "ar" ? 1 : 0]}</p>
      <p className="where" dir="ltr">index.html · {link.startLine === link.endLine ? `line ${link.startLine}` : `lines ${link.startLine}–${link.endLine}`}</p>
      <pre dir="ltr">{link.snippet}</pre>
      {link.rules.map((rule) => (
        <pre key={`${rule.start}-${rule.selector}`} dir="ltr">{`${rule.selector} {\n  ${rule.body}\n}`}</pre>
      ))}
      <button type="button" className="tb" onClick={studio.showCode}>{tx("Show in code", "أظهره في الكود")}</button>
    </div>
  );
}

function IconButton({ title, onClick, children, danger, pressed }: { title: string; onClick: () => void; children: ReactNode; danger?: boolean; pressed?: boolean }) {
  return <button type="button" className={`tool${danger ? " danger" : ""}${pressed ? " on" : ""}`} title={title} aria-label={title} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}

const LIST_MARKS: { id: string; label: [string, string] }[] = [
  { id: "disc", label: ["Filled circles", "دوائر ممتلئة"] },
  { id: "circle", label: ["Circles", "دوائر"] },
  { id: "square", label: ["Squares", "مربعات"] },
  { id: "none", label: ["No marker", "بدون علامة"] },
  { id: "decimal", label: ["Numbers", "أرقام"] },
  { id: "decimal-leading-zero", label: ["Numbers with a zero", "أرقام تبدأ بصفر"] },
  { id: "lower-alpha", label: ["Small letters", "حروف صغيرة"] },
  { id: "upper-alpha", label: ["Capital letters", "حروف كبيرة"] },
  { id: "lower-roman", label: ["Small Roman numbers", "أرقام رومانية صغيرة"] },
  { id: "upper-roman", label: ["Capital Roman numbers", "أرقام رومانية كبيرة"] },
];

function listMarker(sel: { tag: string; style: Record<string, string> }) {
  const raw = (sel.style.listStyleType || "").toLowerCase().replace(/['"]/g, "");
  if (LIST_MARKS.some((mark) => mark.id === raw)) return raw;
  return sel.tag === "ol" ? "decimal" : "disc";
}

function ListMark({ kind }: { kind: string }) {
  const line = "M7.2 4.2h6M7.2 8h6M7.2 11.8h6";
  if (kind === "disc" || kind === "circle" || kind === "square") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {kind === "square" ? (
          <>
            <rect x="2.2" y="2.8" width="2.6" height="2.6" fill="currentColor" />
            <rect x="2.2" y="6.7" width="2.6" height="2.6" fill="currentColor" />
            <rect x="2.2" y="10.6" width="2.6" height="2.6" fill="currentColor" />
          </>
        ) : [3.9, 8, 12.1].map((y) => (
          <circle key={y} cx="3.4" cy={y} r="1.35" fill={kind === "disc" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" />
        ))}
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  const glyph = kind === "decimal" ? "1" : kind === "decimal-leading-zero" ? "01" : kind === "lower-alpha" ? "a" : kind === "upper-alpha" ? "A" : kind === "lower-roman" ? "i" : kind === "upper-roman" ? "I" : "";
  if (glyph) {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <text x="0.4" y="7.1" fill="currentColor" fontSize={glyph.length > 1 ? 5.2 : 6.4} fontFamily="Segoe UI, sans-serif">{glyph}</text>
        <text x="0.4" y="12.6" fill="currentColor" fontSize={glyph.length > 1 ? 5.2 : 6.4} fontFamily="Segoe UI, sans-serif">{glyph === "1" ? "2" : glyph === "01" ? "02" : glyph === "a" ? "b" : glyph === "A" ? "B" : glyph === "i" ? "ii" : "II"}</text>
        <path d="M8 4.6h5.5M8 10.2h5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.2 4.2h3.2M2.2 8h3.2M2.2 11.8h3.2M7.2 4.2h6M7.2 8h6M7.2 11.8h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function asHex(value: string) {
  const hex = toHex(value, "#888888");
  if (/^#[0-9a-f]{3}$/i.test(hex)) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#888888";
}

function toHex(value?: string, fallback = "#1c1917") {
  if (!value) return fallback;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "#1c1917";
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

export function CodePane({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const project = studio.project;
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);
  const seenReveal = useRef(0);
  const link = useMemo(() => {
    if (!project || !studio.selection) return null;
    return locateElement(studio.pageHtml, project.css, studio.selection);
  }, [studio.pageHtml, project, studio.selection]);
  useEffect(() => {
    if (!link || studio.mode === "visual") return;
    const jumped = studio.reveal !== seenReveal.current;
    seenReveal.current = studio.reveal;
    scrollCode(htmlRef.current, link.htmlStart, jumped ? link.openEnd : undefined);
    if (link.rules[0]) scrollCode(cssRef.current, link.rules[0].start);
  }, [link, studio.mode, studio.reveal]);
  if (!project) return null;
  const extra = studio.extraPath ? (project.files || []).find((file) => file.path === studio.extraPath && !file.folder) : null;
  if (extra) {
    return (
      <div className="code-pane">
        <div className="code-grid one">
          <section>
            <header>
              <FileIcon name={extra.path} />
              {extra.path}
              <button type="button" className="text-btn" onClick={() => { studio.closeExtra(); studio.setMode("visual"); }}>{tx("Back to the page", "العودة إلى الصفحة")}</button>
            </header>
            <textarea className="code-input" dir="ltr" spellCheck={false} value={extra.content} onChange={(event) => studio.editFile(extra.path, event.target.value)} onKeyDown={onTab} />
          </section>
        </div>
      </div>
    );
  }
  return (
    <div className="code-pane">
      <div className="code-grid">
        <section>
          <header>
            <FileIcon name={studio.pagePath} />
            {studio.pagePath.split("/").pop()}
            {link && <em>{link.startLine === link.endLine ? ` · ${link.startLine}` : ` · ${link.startLine}–${link.endLine}`}</em>}
          </header>
          <textarea ref={htmlRef} className="code-input" dir="ltr" spellCheck={false} value={studio.pageHtml} onChange={(event) => studio.edit("html", event.target.value)} onKeyDown={onTab} />
        </section>
        <section>
          <header className="code-tabs">
            <button type="button" className={studio.codeTab === "css" ? "on" : ""} onClick={() => studio.setCodeTab("css")}><FileIcon name="style.css" />style.css</button>
            <button type="button" data-spot="code-js" className={studio.codeTab === "js" ? "on" : ""} onClick={() => studio.setCodeTab("js")}><FileIcon name="script.js" />script.js</button>
            <button type="button" className={studio.codeTab === "console" ? "on" : ""} onClick={() => studio.setCodeTab("console")}>{tx("Console", "وحدة التحكم")}</button>
          </header>
          {studio.codeTab === "css" && <textarea ref={cssRef} className="code-input" dir="ltr" spellCheck={false} value={project.css} onChange={(event) => studio.edit("css", event.target.value)} onKeyDown={onTab} />}
          {studio.codeTab === "js" && (
            <div className="js-wrap">
              <div className="js-bar">
                <button type="button" className="tb primary" data-spot="btn-run" onClick={() => studio.run()}>{tx("Run", "تشغيل")}</button>
                <select data-spot="js-snippets" defaultValue="" onChange={(event) => {
                  const snippet = SNIPPETS.find((item) => item.label[0] === event.target.value);
                  if (!snippet) return;
                  const sample = lang === "ar" && snippet.codeAr ? snippet.codeAr : snippet.code;
                  studio.edit("js", `${project.js.trim()}\n\n${sample}`.trim() + "\n");
                  event.target.value = "";
                }}>
                  <option value="">{tx("Insert example…", "إدراج مثال…")}</option>
                  {SNIPPETS.map((snippet) => <option key={snippet.label[0]} value={snippet.label[0]}>{snippet.label[lang === "ar" ? 1 : 0]}</option>)}
                </select>
              </div>
              <textarea className="code-input" dir="ltr" spellCheck={false} value={project.js} onChange={(event) => studio.edit("js", event.target.value)} onKeyDown={onTab} />
            </div>
          )}
          {studio.codeTab === "console" && (
            <div className="console">
              <button type="button" className="text-btn" onClick={studio.clearConsole}>{tx("Clear", "مسح")}</button>
              {studio.consoleLines.length === 0 && <p className="hint">{tx("Press Run. Messages from console.log and errors appear here.", "اضغط تشغيل. تظهر هنا رسائل console.log والأخطاء.")}</p>}
              {studio.consoleLines.map((line, index) => <div key={index} data-level={line.level}>{line.text}</div>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function onTab(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const el = event.currentTarget;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const next = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
  const native = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  native?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.selectionStart = el.selectionEnd = start + 2;
}

export const StageFrame = memo(function StageFrame({ frameKey, srcDoc, frameRef }: { frameKey: string; srcDoc: string; frameRef: RefObject<HTMLIFrameElement | null> }) {
  const { tx } = useI18n();
  return <iframe key={frameKey} ref={frameRef} className="page-frame" title={tx("Website page", "صفحة الموقع")} srcDoc={srcDoc} />;
}, (prev, next) => prev.frameKey === next.frameKey);
