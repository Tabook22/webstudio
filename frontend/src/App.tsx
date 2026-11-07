import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BeginnerHtml } from "./components/BeginnerHtml";
import { ExamHtml } from "./components/ExamHtml";
import { LessonCard, StudioGate } from "./components/ClassRoom";
import { Dialogs } from "./components/Dialogs";
import { ContextMenu } from "./components/ContextMenu";
import { FileIcon } from "./components/FileIcon";
import { FolderList } from "./components/FolderList";
import { TableWindow } from "./components/TableWindow";
import { CodePane, Glyph, Inspector, LeftPanel, MissionBanner, StageFrame } from "./components/Panels";
import { FONTS } from "./editor/learn";
import { I18nProvider, LangSwitch, useI18n } from "./i18n";
import { useStudio } from "./studio";
import type { Mode } from "./types";

export default function App() {
  return (
    <I18nProvider>
      <StudioShell />
    </I18nProvider>
  );
}

function StudioShell() {
  const { lang, tx } = useI18n();
  const studio = useStudio(lang);
  const [hand, setHand] = useState<"add" | "page" | "edit">("page");
  const seenHtml = useRef(studio.project?.html);

  useEffect(() => {
    document.querySelectorAll(".spot").forEach((el) => el.classList.remove("spot"));
    if (!studio.spot) return;
    const el = document.querySelector(`[data-spot="${CSS.escape(studio.spot)}"]`);
    el?.classList.add("spot");
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [studio.spot, studio.tab, studio.mode, studio.codeTab]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "F1") return;
      event.preventDefault();
      studio.setModal({ type: "help" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [studio]);

  useEffect(() => {
    if (!studio.toast) return;
    const timer = window.setTimeout(studio.clearToast, 2600);
    return () => window.clearTimeout(timer);
  }, [studio.toast, studio.clearToast]);

  useEffect(() => {
    if (studio.project) document.title = `${studio.project.name} - ${tx("Web Studio", "استوديو الويب")}`;
  }, [studio.project, lang, tx]);

  const html = studio.project?.html;
  useEffect(() => {
    if (seenHtml.current !== undefined && seenHtml.current !== html && hand === "add" && window.matchMedia("(max-width: 860px)").matches) setHand("page");
    seenHtml.current = html;
  }, [html, hand]);

  const selKey = studio.selection?.path.join("-") ?? "";
  useEffect(() => {
    if (!selKey || hand !== "page" || !window.matchMedia("(max-width: 860px)").matches) return;
    setHand("edit");
  }, [selKey, hand]);

  if (studio.needsGate) {
    return (
      <>
        <StudioGate studio={studio} />
        <Dialogs studio={studio} />
      </>
    );
  }
  if (studio.booting) {
    return <div className="boot"><div className="mark" /><p>{tx("Opening the studio…", "جارٍ فتح الاستوديو…")}</p></div>;
  }
  if (studio.offline) {
    const installed = window.location.port !== "5173";
    return (
      <div className="boot">
        <h1>{tx("Web Studio", "استوديو الويب")}</h1>
        <p>{installed
          ? tx("Web Studio could not open its files. Close this window and start Web Studio again.", "تعذر على استوديو الويب فتح ملفاته. أغلق النافذة ثم افتح استوديو الويب من جديد.")
          : tx("The Python server is not running. Start it, then try again.", "خادم بايثون لا يعمل. شغّله ثم أعد المحاولة.")}</p>
        {!installed && <code dir="ltr">cd backend && .venv\Scripts\python -m uvicorn app.main:app --port 8001</code>}
        <button className="tb primary" onClick={studio.retry}>{tx("Try again", "حاول مجددًا")}</button>
      </div>
    );
  }
  if (!studio.project) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>{studio.session?.role === "learner" ? studio.session.name : studio.session?.className || tx("Your class", "صفك")}</h1>
          <p className="hint" dir="ltr">{studio.session?.role === "learner" ? [studio.session.studentId, studio.session.courseCode, studio.session.section].filter(Boolean).join(" · ") : ""}</p>
          <p>{tx("This workspace belongs to your student ID. Your saved websites and folders are listed here so you can continue them.", "مساحة العمل هذه لرقمك الجامعي. مواقعك ومجلداتك المحفوظة ظاهرة هنا لتتابعها.")}</p>
          <div className="project-list">
            {studio.projects.length === 0 && <p className="hint">{tx("No saved work yet. Create a website, or choose a folder from your computer.", "لا يوجد عمل محفوظ بعد. أنشئ موقعًا، أو اختر مجلدًا من حاسوبك.")}</p>}
            {studio.projects.map((item) => (
              <div key={item.id} className="project-row">
                <button type="button" onClick={() => void studio.openProject(item.id)}>
                  <strong dir="auto">{item.name}</strong>
                  <small>{new Date(item.updated_at).toLocaleString(lang === "ar" ? "ar" : "en")}</small>
                </button>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="tb primary" onClick={() => studio.setModal({ type: "new" })}>{tx("New website", "موقع جديد")}</button>
            <button className="tb" onClick={() => studio.setModal({ type: "open" })}>{tx("Choose a folder", "اختر مجلدًا")}</button>
            <button className="tb" onClick={() => studio.setModal({ type: "help" })}>{tx("Help", "تعليمات")}</button>
          </div>
          {studio.lessons.length > 0 && (
            <div className="lesson-list">
              {studio.lessons.map((lesson) => <LessonCard key={lesson.id} studio={studio} lesson={lesson} />)}
            </div>
          )}
        </div>
        <Dialogs studio={studio} />
      </div>
    );
  }

  const project = studio.project;
  const statusText = studio.status === "saving" ? tx("Saving…", "جارٍ الحفظ…")
    : studio.status === "unsaved" ? tx("Unsaved changes", "تغييرات غير محفوظة")
    : studio.status === "error" ? tx("Could not save", "تعذر الحفظ")
    : tx("Saved", "تم الحفظ");

  const sel = studio.selection;
  const inTable = Boolean(sel && (sel.table || ["table", "tr", "td", "th", "thead", "tbody"].includes(sel.tag)));
  const place = (id: string) => {
    studio.insertBlock(id, sel?.path || null, sel?.tag || "");
    setHand("page");
  };

  return (
    <div className="shell">
      <header className="ew-chrome">
        <div className="ew-menu">
          <EwMenus studio={studio} setHand={setHand} place={place} inTable={inTable} />
          <div className="ew-menu-end">
            <button type="button" className="ew-class" onClick={() => studio.setModal({ type: "class" })}>{studio.session ? studio.session.className : tx("Classroom", "الصف الدراسي")}</button>
            <button type="button" className="ew-class" onClick={() => studio.setModal({ type: "admin" })}>{studio.staff?.role === "admin" ? tx("Admin", "المدير") : studio.staff ? tx("Course settings", "إعدادات المقررات") : tx("Coordinator", "منسق المقرر")}</button>
            <LangSwitch />
          </div>
        </div>
        <div className="ew-bar">
          <button type="button" title={tx("New page", "صفحة جديدة")} onClick={() => studio.setModal({ type: "new" })}><MenuIcon name="plus" />{tx("New", "جديد")}</button>
          <button type="button" title={tx("Open a website", "فتح موقع")} onClick={() => studio.setModal({ type: "projects" })}><MenuIcon name="open" />{tx("Open", "فتح")}</button>
          <button type="button" title={tx("Save", "حفظ")} onClick={() => void studio.saveNow()}><MenuIcon name="save" />{tx("Save", "حفظ")}</button>
          <button type="button" data-spot="btn-more" title={tx("Page settings", "إعدادات الصفحة")} onClick={() => studio.setModal({ type: "page" })}><MenuIcon name="site" />{tx("Page", "الصفحة")}</button>
          <i className="ew-sep" />
          <button type="button" title={tx("Undo", "تراجع")} disabled={!studio.canUndo} onClick={studio.undo}><MenuIcon name="undo" /></button>
          <button type="button" title={tx("Redo", "إعادة")} disabled={!studio.canRedo} onClick={studio.redo}><MenuIcon name="redo" /></button>
          <i className="ew-sep" />
          <button type="button" data-spot="btn-preview" title={tx("Preview in browser", "معاينة في المتصفح")} onClick={studio.preview}><MenuIcon name="eye" />{tx("Preview", "معاينة")}</button>
          <button type="button" data-spot="btn-zip" title={tx("Download the website", "تنزيل الموقع")} onClick={() => void studio.exportZip().catch((error) => studio.setToast(error.message))}><MenuIcon name="download" />{tx("Download", "تنزيل")}</button>
          <i className="ew-sep" />
          <button type="button" data-spot="btn-xray" aria-pressed={studio.xray} title={tx("Show the boxes around each tag", "أظهر الصناديق حول كل وسم")} onClick={() => studio.setXray(!studio.xray)}><MenuIcon name="xray" />{tx("Visual Aids", "مساعدات مرئية")}</button>
          <button type="button" data-spot="btn-check" title={tx("Check the page", "افحص الصفحة")} onClick={() => { studio.addEvent("check"); studio.setModal({ type: "check" }); }}><MenuIcon name="check" />{tx("Check", "فحص")}</button>
          <button type="button" data-spot="btn-learn" aria-pressed={studio.beginner} title={tx("Write a simple page by typing HTML", "اكتب صفحة بسيطة بكتابة HTML")} onClick={studio.beginner ? studio.closeBeginner : studio.openBeginner}><MenuIcon name="code" />{tx("Learn HTML", "تعلّم HTML")}</button>
          <button type="button" data-spot="btn-exam" aria-pressed={studio.examMode} title={tx("Type an HTML page from the teacher's example and questions", "اكتب صفحة HTML من مثال المعلم وأسئلته")} onClick={studio.examMode ? studio.closeExam : studio.openExam}><MenuIcon name="exam" />{tx("HTML exam", "اختبار HTML")}</button>
          <button type="button" data-spot="btn-kits" title={tx("Apply a style", "طبّق نمطًا")} onClick={() => studio.setModal({ type: "kits" })}><MenuIcon name="themes" />{tx("Styles", "أنماط")}</button>
          <span className="ew-save" data-kind={studio.status}>{statusText}</span>
        </div>
        {!studio.beginner && !studio.examMode && <FormatBar studio={studio} />}
      </header>

      {studio.examMode ? <ExamHtml studio={studio} /> : studio.beginner ? <BeginnerHtml studio={studio} /> : <>
      <NextStep studio={studio} />

      <main className="workspace" data-mode={studio.mode} data-hand={hand}>
        <aside className="left-dock">
          <FolderList studio={studio} />
          <Inspector studio={studio} />
        </aside>
        <section className="center">
          {studio.helping && <HelpBanner studio={studio} />}
          {studio.session?.role === "learner" && studio.project.note && (
            <div className="banner note">
              <strong>{tx("Note from your lecturer", "ملاحظة من المحاضر")}</strong>
              <p dir="auto">{studio.project.note}</p>
            </div>
          )}
          <LessonStrip studio={studio} />
          <MissionBanner studio={studio} />
          <div className="doc-tabs">
            {studio.pages.map((page) => {
              const label = page.split("/").pop() || page;
              const same = studio.pages.filter((item) => (item.split("/").pop() || item) === label).length > 1;
              return (
                <div key={page} className={studio.pagePath === page ? "page-tab on" : "page-tab"} title={page}>
                  <button type="button" className="page-tab-main" onClick={() => studio.openPage(page)}>
                    <FileIcon name={label} />
                    <span>{same ? page : label}</span>
                  </button>
                  <button type="button" className="page-tab-x" aria-label={tx("Close", "إغلاق")} title={tx("Close", "إغلاق")} onClick={() => studio.closePage(page)}>×</button>
                </div>
              );
            })}
            <label className="doc-name">
              <span className="sr">{tx("Website name", "اسم الموقع")}</span>
              <input dir="auto" value={project.name} aria-label={tx("Website name", "اسم الموقع")} onChange={(event) => studio.rename(event.target.value)} />
            </label>
          </div>
          <div className="tagbar" dir="ltr">
            <button type="button" onClick={() => sel && studio.command({ cmd: "select", path: [] })}>&lt;body&gt;</button>
            {sel?.crumbs.map((crumb) => (
              <button key={crumb.path.join("-")} type="button" onClick={() => studio.command({ cmd: "select", path: crumb.path })}>&lt;{crumb.tag}&gt;</button>
            ))}
          </div>
          <div className="stage">
            <div className={`device ${studio.device}`}>
              {!studio.pagePath && <div className="page-closed"><p>{tx("Open a page from the Folder List.", "افتح صفحة من قائمة المجلدات.")}</p></div>}
              {studio.pagePath && !studio.pageHtml.trim() && <EmptyCanvas studio={studio} />}
              <StageFrame frameKey={`${project.id}:${project.site_lang}`} srcDoc={studio.srcDoc} frameRef={studio.frameRef} />
            </div>
          </div>
          <div
            className="splitter"
            onPointerDown={(event) => {
              const center = event.currentTarget.parentElement!;
              const rect = center.getBoundingClientRect();
              const move = (ev: PointerEvent) => {
                const pct = Math.min(78, Math.max(24, ((ev.clientY - rect.top) / rect.height) * 100));
                center.style.setProperty("--stage", `${pct}%`);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
            }}
          />
          <CodePane studio={studio} />
          <div className="view-switch" role="tablist" aria-label={tx("Page view", "عرض الصفحة")}>
            {(["visual", "split", "code"] as Mode[]).map((mode) => (
              <button key={mode} type="button" role="tab" aria-selected={studio.mode === mode} onClick={() => { studio.setMode(mode); setHand("page"); }}>
                {mode === "visual" ? tx("Design", "تصميم") : mode === "split" ? tx("Split", "مقسوم") : tx("Code", "كود")}
              </button>
            ))}
            <span className="view-size">
              <button type="button" data-spot="device-desktop" aria-pressed={studio.device === "desktop"} onClick={() => studio.setDevice("desktop")}>{tx("Computer", "حاسوب")}</button>
              <button type="button" aria-pressed={studio.device === "tablet"} onClick={() => studio.setDevice("tablet")}>{tx("Tablet", "لوحي")}</button>
              <button type="button" data-spot="device-phone" aria-pressed={studio.device === "phone"} onClick={() => studio.setDevice("phone")}>{tx("Phone", "هاتف")}</button>
            </span>
          </div>
        </section>
        <aside className="right-dock">
          <LeftPanel studio={studio} />
        </aside>
      </main>

      <footer className="statusbar">
        <span className="status-hint">{sel ? `<${sel.tag}>` : tx("Click the page to change it. Double-click words to type. Drag a tag from the Toolbox.", "انقر الصفحة لتغييرها. انقر مرتين على الكلمات لتكتب. اسحب وسمًا من صندوق الأدوات.")}</span>
        <span className="status-side" data-kind={studio.status}>{statusText}</span>
      </footer>

      <nav className="phone-nav" aria-label={tx("Choose where to work", "اختر مكان العمل")}>
        <button type="button" aria-pressed={hand === "add"} onClick={() => setHand("add")}>{tx("Toolbox", "الأدوات")}</button>
        <button type="button" aria-pressed={hand === "page"} onClick={() => setHand("page")}>{tx("Page", "الصفحة")}</button>
        <button type="button" aria-pressed={hand === "edit"} onClick={() => setHand("edit")}>{tx("Properties", "الخصائص")}</button>
      </nav>
      </>}

      {studio.toast && <div className="toast" role="status">{studio.toast}</div>}
      {studio.celebrate && <Confetti />}
      {studio.contextAt && <ContextMenu studio={studio} at={studio.contextAt} />}
      {studio.tableWindow && <TableWindow studio={studio} />}
      <Dialogs studio={studio} />
    </div>
  );
}

function MenuIcon({ name }: { name: "site" | "save" | "plus" | "open" | "class" | "eye" | "layout" | "split" | "code" | "desktop" | "tablet" | "phone" | "undo" | "redo" | "themes" | "check" | "xray" | "download" | "folder" | "more" | "exam" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="menu-ico" viewBox="0 0 24 24" aria-hidden="true">
      {name === "site" && <><rect {...common} x="3" y="4" width="18" height="14" rx="2" /><path {...common} d="M3 8h18M8 20h8" /></>}
      {name === "save" && <><path {...common} d="M5 4h11l3 3v13H5z" /><path {...common} d="M8 4v5h7M8 20v-6h8v6" /></>}
      {name === "plus" && <path {...common} d="M12 5v14M5 12h14" />}
      {name === "open" && <><path {...common} d="M3 7h6l2 2h10v9H3z" /><path {...common} d="M3 7V5h5l2 2" /></>}
      {name === "class" && <><path {...common} d="M4 9l8-4 8 4-8 4z" /><path {...common} d="M8 12v4c0 1.2 1.8 2.5 4 2.5s4-1.3 4-2.5v-4" /></>}
      {name === "eye" && <><path {...common} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle {...common} cx="12" cy="12" r="2.5" /></>}
      {name === "layout" && <><rect {...common} x="3" y="3" width="8" height="8" rx="1.5" /><rect {...common} x="13" y="3" width="8" height="5" rx="1.5" /><rect {...common} x="13" y="10" width="8" height="11" rx="1.5" /><rect {...common} x="3" y="13" width="8" height="8" rx="1.5" /></>}
      {name === "split" && <><rect {...common} x="3" y="4" width="18" height="16" rx="2" /><path {...common} d="M12 4v16" /></>}
      {name === "code" && <path {...common} d="M9 8l-4 4 4 4M15 8l4 4-4 4" />}
      {name === "desktop" && <><rect {...common} x="3" y="4" width="18" height="12" rx="2" /><path {...common} d="M8 20h8M12 16v4" /></>}
      {name === "tablet" && <><rect {...common} x="5" y="3" width="14" height="18" rx="2" /><path {...common} d="M11 18h2" /></>}
      {name === "phone" && <><rect {...common} x="7" y="2" width="10" height="20" rx="2" /><path {...common} d="M11 18h2" /></>}
      {name === "undo" && <><path {...common} d="M8.2 7.2 3.5 12l4.7 4.8" /><path {...common} d="M3.5 12H12a5.5 5.5 0 0 1 0 11H10" /></>}
      {name === "redo" && <><path {...common} d="M15.8 7.2 20.5 12l-4.7 4.8" /><path {...common} d="M20.5 12H12a5.5 5.5 0 0 0 0 11H14" /></>}
      {name === "themes" && <><circle {...common} cx="12" cy="12" r="8" /><circle cx="9" cy="10" r="1.2" fill="currentColor" /><circle cx="14" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="14" r="1.2" fill="currentColor" /></>}
      {name === "check" && <path {...common} d="M5 12.5l4 4 10-10" />}
      {name === "xray" && <><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>}
      {name === "download" && <path {...common} d="M12 4v10M8 10l4 4 4-4M5 19h14" />}
      {name === "folder" && <path {...common} d="M3 7h6l2 2h10v9H3z" />}
      {name === "more" && <><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></>}
      {name === "exam" && <><rect {...common} x="6" y="3" width="12" height="18" rx="1.5" /><path {...common} d="M9 8h6M9 12h6M9 16h4" /></>}
    </svg>
  );
}

function EwMenus({ studio, setHand, place, inTable }: { studio: ReturnType<typeof useStudio>; setHand: (hand: "add" | "page" | "edit") => void; place: (id: string) => void; inTable: boolean }) {
  const { tx } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const sel = studio.selection;
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && document.querySelector(".ew-menu")?.contains(target)) return;
      setOpen(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const go = (mode: Mode) => { studio.setMode(mode); setHand("page"); setOpen(null); };
  const run = (action: () => void) => { setOpen(null); action(); };
  const table = (cmd: string) => { if (sel) studio.command({ cmd, path: sel.path }); };
  const alignTable = (align: "left" | "center" | "right") => { if (sel) studio.command({ cmd: "table-box", path: sel.path, align }); };
  return (
    <>
      <Drop name="file" label={tx("File", "ملف")} open={open} setOpen={setOpen}>
        <Item label={tx("New website", "موقع جديد")} onClick={() => run(() => studio.setModal({ type: "new" }))} />
        <Item label={tx("Open…", "فتح…")} onClick={() => run(() => studio.setModal({ type: "projects" }))} />
        <Item label={tx("Open a folder…", "فتح مجلد…")} onClick={() => run(() => studio.setModal({ type: "open" }))} />
        <hr />
        <Item label={tx("Save", "حفظ")} onClick={() => run(() => void studio.saveNow())} />
        <Item label={tx("Save to my computer…", "حفظ في حاسوبي…")} onClick={() => run(() => void studio.saveFolder())} />
        <Item label={tx("Download website", "تنزيل الموقع")} onClick={() => run(() => void studio.exportZip().catch((error) => studio.setToast(error.message)))} />
        <hr />
        <Item label={tx("Page settings…", "إعدادات الصفحة…")} onClick={() => run(() => studio.setModal({ type: "page" }))} />
        <Item label={tx("Preview in browser", "معاينة في المتصفح")} onClick={() => run(studio.preview)} />
      </Drop>
      <Drop name="edit" label={tx("Edit", "تحرير")} open={open} setOpen={setOpen}>
        <Item label={tx("Undo", "تراجع")} keys="Ctrl+Z" disabled={!studio.canUndo} onClick={() => run(studio.undo)} />
        <Item label={tx("Redo", "إعادة")} keys="Ctrl+Y" disabled={!studio.canRedo} onClick={() => run(studio.redo)} />
        <hr />
        <Item label={tx("Cut", "قص")} keys="Ctrl+X" disabled={!sel && studio.mode !== "code"} onClick={() => run(studio.cutEdit)} />
        <Item label={tx("Copy", "نسخ")} keys="Ctrl+C" onClick={() => run(studio.copyEdit)} />
        <Item label={tx("Paste", "لصق")} keys="Ctrl+V" onClick={() => run(() => void studio.pasteEdit(false))} />
        <Item label={tx("Paste Text", "لصق كنص")} onClick={() => run(() => void studio.pasteEdit(true))} />
        <Item label={tx("Paste HTML…", "لصق HTML…")} onClick={() => run(() => studio.setModal({ type: "paste" }))} />
        <hr />
        <Item label={tx("Duplicate", "تكرار")} disabled={!sel || studio.mode === "code"} onClick={() => run(() => sel && studio.command({ cmd: "duplicate", path: sel.path }))} />
        <Item label={tx("Delete", "حذف")} keys="Del" disabled={!sel && studio.mode !== "code"} onClick={() => run(studio.deleteEdit)} />
        <hr />
        <Item label={tx("Select All", "تحديد الكل")} keys="Ctrl+A" onClick={() => run(studio.selectAllEdit)} />
        <hr />
        <Item label={tx("Find…", "بحث…")} keys="Ctrl+F" onClick={() => run(() => studio.setModal({ type: "find" }))} />
        <Item label={tx("Replace…", "استبدال…")} keys="Ctrl+H" onClick={() => run(() => studio.setModal({ type: "find", replace: true }))} />
      </Drop>
      <Drop name="view" label={tx("View", "عرض")} open={open} setOpen={setOpen}>
        <Item label={tx("Design", "تصميم")} onClick={() => go("visual")} />
        <Item label={tx("Split", "مقسوم")} onClick={() => go("split")} />
        <Item label={tx("Code", "كود")} onClick={() => go("code")} />
        <hr />
        <Item label={tx("Computer", "حاسوب")} onClick={() => run(() => studio.setDevice("desktop"))} />
        <Item label={tx("Tablet", "لوحي")} onClick={() => run(() => studio.setDevice("tablet"))} />
        <Item label={tx("Phone", "هاتف")} onClick={() => run(() => studio.setDevice("phone"))} />
        <hr />
        <Item label={tx("Visual Aids", "مساعدات مرئية")} onClick={() => run(() => studio.setXray(!studio.xray))} />
        <Item label={tx("Projector size", "حجم العرض")} onClick={() => run(() => studio.setBig(!studio.big))} />
      </Drop>
      <Drop name="insert" label={tx("Insert", "إدراج")} open={open} setOpen={setOpen}>
        <Item label={tx("Heading 1", "عنوان 1")} onClick={() => run(() => place("h1"))} />
        <Item label={tx("Heading 2", "عنوان 2")} onClick={() => run(() => place("h2"))} />
        <Item label={tx("Paragraph", "فقرة")} onClick={() => run(() => place("p"))} />
        <Item label={tx("Hyperlink", "ارتباط تشعبي")} onClick={() => run(() => place("link"))} />
        <hr />
        <Item label={tx("Picture", "صورة")} onClick={() => run(() => { studio.setTab("images"); setHand("add"); })} />
        <Item label={tx("Bulleted list", "قائمة نقطية")} onClick={() => run(() => place("ul"))} />
        <Item label={tx("Numbered list", "قائمة مرقمة")} onClick={() => run(() => place("ol"))} />
        <Item label={tx("Table…", "جدول…")} onClick={() => run(() => place("table"))} />
        <Item label={tx("Form", "نموذج")} onClick={() => run(() => place("form"))} />
        <Item label={tx("Horizontal line", "خط أفقي")} onClick={() => run(() => place("hr"))} />
        <hr />
        <Item label={tx("Navigation", "شريط التنقل")} onClick={() => run(() => place("navbar"))} />
        <Item label={tx("Footer", "تذييل")} onClick={() => run(() => place("footer"))} />
      </Drop>
      <Drop name="format" label={tx("Format", "تنسيق")} open={open} setOpen={setOpen}>
        <Item label={tx("Bold", "عريض")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "bold" }))} />
        <Item label={tx("Italic", "مائل")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "italic" }))} />
        <Item label={tx("Underline", "تسطير")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "underline" }))} />
        <hr />
        <Item label={tx("Align left", "محاذاة لليسار")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "justifyLeft" }))} />
        <Item label={tx("Center", "توسيط")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "justifyCenter" }))} />
        <Item label={tx("Align right", "محاذاة لليمين")} disabled={!sel} onClick={() => run(() => sel && studio.command({ cmd: "format", path: sel.path, name: "justifyRight" }))} />
        <hr />
        <Item label={tx("Apply styles…", "تطبيق الأنماط…")} onClick={() => run(() => studio.setModal({ type: "kits" }))} />
      </Drop>
      <Drop name="tools" label={tx("Tools", "أدوات")} open={open} setOpen={setOpen}>
        <Item label={tx("Beginning HTML", "بداية HTML")} onClick={() => run(studio.openBeginner)} />
        <Item label={tx("HTML exam", "اختبار HTML")} onClick={() => run(studio.openExam)} />
        <hr />
        <Item label={tx("Check this page", "فحص هذه الصفحة")} disabled={!studio.pagePath} onClick={() => run(() => { studio.addEvent("check"); studio.setModal({ type: "check" }); })} />
        <Item label={tx("Check links", "فحص الروابط")} onClick={() => run(() => studio.setModal({ type: "links" }))} />
        <Item label={tx("Page details…", "تفاصيل الصفحة…")} disabled={!studio.pagePath} onClick={() => run(() => studio.setModal({ type: "details" }))} />
        <hr />
        <Item label={tx("Preview in browser", "معاينة في المتصفح")} onClick={() => run(studio.preview)} />
        <Item label={tx("Page settings…", "إعدادات الصفحة…")} onClick={() => run(() => studio.setModal({ type: "page" }))} />
        <Item label={tx("Style kit…", "حزمة التنسيق…")} onClick={() => run(() => studio.setModal({ type: "kits" }))} />
        <hr />
        <Item label={tx("Run the script", "تشغيل السكربت")} onClick={() => run(studio.run)} />
        <hr />
        <Item label={tx("Classroom…", "الصف الدراسي…")} onClick={() => run(() => studio.setModal({ type: "class" }))} />
        <Item label={studio.staff?.role === "admin" ? tx("Admin…", "المدير…") : tx("Course settings…", "إعدادات المقررات…")} onClick={() => run(() => studio.setModal({ type: "admin" }))} />
      </Drop>
      <Drop name="table" label={tx("Table", "جدول")} open={open} setOpen={setOpen}>
        <Item label={tx("Insert table…", "إدراج جدول…")} onClick={() => run(() => place("table"))} />
        <Item label={tx("Table properties…", "خصائص الجدول…")} disabled={!inTable} onClick={() => run(() => studio.openTableWindow())} />
        <hr />
        <Item label={tx("Insert row below", "إدراج صف أسفل")} disabled={!inTable} onClick={() => run(() => table("row-below"))} />
        <Item label={tx("Insert column to the right", "إدراج عمود إلى اليمين")} disabled={!inTable} onClick={() => run(() => table("col-after"))} />
        <Item label={tx("Delete row", "حذف الصف")} disabled={!inTable} onClick={() => run(() => table("del-row"))} />
        <Item label={tx("Delete column", "حذف العمود")} disabled={!inTable} onClick={() => run(() => table("del-col"))} />
        <Item label={tx("Delete table", "حذف الجدول")} disabled={!inTable} onClick={() => run(() => table("del-table"))} />
        <hr />
        <Item label={tx("Merge cells", "دمج الخلايا")} disabled={!inTable} onClick={() => run(() => table("merge"))} />
        <Item label={tx("Unmerge cells", "فك دمج الخلايا")} disabled={!inTable} onClick={() => run(() => table("split"))} />
        <hr />
        <Item label={tx("Align left", "محاذاة لليسار")} disabled={!inTable} onClick={() => run(() => alignTable("left"))} />
        <Item label={tx("Center", "توسيط")} disabled={!inTable} onClick={() => run(() => alignTable("center"))} />
        <Item label={tx("Align right", "محاذاة لليمين")} disabled={!inTable} onClick={() => run(() => alignTable("right"))} />
      </Drop>
      <Drop name="site" label={tx("Site", "موقع")} open={open} setOpen={setOpen}>
        <Item label={tx("My websites", "مواقعي")} onClick={() => run(() => studio.setModal({ type: "projects" }))} />
        <Item label={tx("New website", "موقع جديد")} onClick={() => run(() => studio.setModal({ type: "new" }))} />
        <Item label={tx("Open a folder…", "فتح مجلد…")} onClick={() => run(() => studio.setModal({ type: "open" }))} />
      </Drop>
      <Drop name="panels" label={tx("Panels", "لوحات")} open={open} setOpen={setOpen} align="end">
        <Item label={tx("Toolbox", "صندوق الأدوات")} onClick={() => run(() => { studio.setTab("blocks"); setHand("add"); })} />
        <Item label={tx("Pictures", "صور")} onClick={() => run(() => { studio.setTab("images"); setHand("add"); })} />
        <Item label={tx("Layers", "الطبقات")} onClick={() => run(() => { studio.setTab("structure"); setHand("add"); })} />
        <Item label={tx("Learn", "تعلّم")} onClick={() => run(() => { studio.setTab("missions"); setHand("add"); })} />
        <Item label={tx("Tag Properties", "خصائص الوسم")} onClick={() => run(() => setHand("edit"))} />
      </Drop>
      <Drop name="help" label={tx("Help", "تعليمات")} open={open} setOpen={setOpen} align="end">
        <Item label={tx("Web Studio Help", "دليل استوديو الويب")} keys="F1" onClick={() => run(() => studio.setModal({ type: "help" }))} />
        <Item label={tx("How to edit a page", "كيف أحرر الصفحة")} onClick={() => run(() => studio.setModal({ type: "help", chapter: "editing" }))} />
      </Drop>
    </>
  );
}

function Drop({ name, label, open, setOpen, align, children }: { name: string; label: string; open: string | null; setOpen: (name: string | null) => void; align?: "end"; children: ReactNode }) {
  const on = open === name;
  return (
    <div className="ew-item" data-align={align || undefined}>
      <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : name)}>{label}</button>
      {on && <div className="ew-drop" role="menu">{children}</div>}
    </div>
  );
}

function Item({ label, keys, onClick, disabled }: { label: string; keys?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick}>
      <span>{label}</span>
      {keys ? <span className="ew-keys">{keys}</span> : null}
    </button>
  );
}

function FormatBar({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { tx } = useI18n();
  const sel = studio.selection;
  const off = !sel || sel.tag === "img";
  const fmt = (name: string) => { if (sel) studio.command({ cmd: "format", path: sel.path, name }); };
  const paint = (prop: string, value: string) => { if (sel) studio.command({ cmd: "style", path: sel.path, prop, value }); };
  return (
    <div className="ew-bar format">
      <span className="ew-style" dir="ltr">{sel ? `<${sel.tag}>` : tx("Style", "النمط")}</span>
      <select
        aria-label={tx("Font", "الخط")}
        disabled={!sel}
        value={sel?.style.fontFamily || ""}
        onChange={(event) => {
          const font = FONTS.find((item) => item.value === event.target.value);
          studio.setFont(font?.family || "", event.target.value);
        }}
      >
        <option value="">{tx("Font", "الخط")}</option>
        {FONTS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
      </select>
      <select
        aria-label={tx("Size", "الحجم")}
        disabled={!sel}
        value={sel?.style.fontSize || ""}
        onChange={(event) => paint("fontSize", event.target.value)}
      >
        <option value="">{tx("Size", "الحجم")}</option>
        {["12px", "14px", "16px", "18px", "24px", "36px", "48px"].map((size) => <option key={size} value={size}>{size.replace("px", "")}</option>)}
      </select>
      <i className="ew-sep" />
      <button type="button" className="ew-mark" disabled={off} title={tx("Bold", "عريض")} onClick={() => fmt("bold")}>B</button>
      <button type="button" className="ew-mark italic" disabled={off} title={tx("Italic", "مائل")} onClick={() => fmt("italic")}>I</button>
      <button type="button" className="ew-mark under" disabled={off} title={tx("Underline", "تسطير")} onClick={() => fmt("underline")}>U</button>
      <i className="ew-sep" />
      <button type="button" disabled={off} title={tx("Align left", "يسار")} onClick={() => fmt("justifyLeft")}>≡</button>
      <button type="button" disabled={off} title={tx("Center", "توسيط")} onClick={() => fmt("justifyCenter")}>≣</button>
      <button type="button" disabled={off} title={tx("Align right", "يمين")} onClick={() => fmt("justifyRight")}>≡</button>
      <i className="ew-sep" />
      <label className="ew-color" title={tx("Font colour", "لون الخط")}>A
        <input type="color" disabled={!sel} value={hexOf(sel?.style.color)} onChange={(event) => paint("color", event.target.value)} />
      </label>
      <label className="ew-color fill" title={tx("Highlight", "تمييز")}>
        <input type="color" disabled={!sel} value={hexOf(sel?.style.backgroundColor, "#ffffff")} onChange={(event) => paint("backgroundColor", event.target.value)} />
      </label>
    </div>
  );
}

function hexOf(value?: string, fallback = "#1c1917") {
  if (!value) return fallback;
  if (/^#([0-9a-f]{6})$/i.test(value)) return value;
  if (/^#([0-9a-f]{3})$/i.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return fallback;
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function NextStep({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { tx } = useI18n();
  const project = studio.project;
  const signals = useMemo(() => {
    if (!project) return null;
    const doc = new DOMParser().parseFromString(`<body>${project.html}</body>`, "text/html");
    const paragraph = [...doc.querySelectorAll("p")].some((el) => (el.textContent || "").trim().length > 12);
    return {
      banner: Boolean(doc.querySelector("h1, header, .hero")),
      story: paragraph,
      photo: Boolean(doc.querySelector("img")),
      sections: Boolean(doc.querySelector("section, nav, footer, .row")),
      look: /background|font-family|--color-primary/.test(project.css),
    };
  }, [project]);
  if (!project || !signals || studio.mission.active) return null;
  const place = (id: string) => studio.insertBlock(id, null, "");
  const steps = [
    { id: "banner", text: tx("Add a welcome banner", "أضف واجهة ترحيب"), go: () => place("hero") , done: signals.banner },
    { id: "story", text: tx("Write a short story", "اكتب قصة قصيرة"), go: () => place("p"), done: signals.story },
    { id: "photo", text: tx("Add a photo", "أضف صورة"), go: () => studio.setTab("images"), done: signals.photo },
    { id: "sections", text: tx("Add a row of cards", "أضف صف بطاقات"), go: () => place("features"), done: signals.sections },
    { id: "look", text: tx("Choose colours", "اختر الألوان"), go: () => studio.setModal({ type: "kits" }), done: signals.look },
    { id: "phone", text: tx("See it on a phone", "شاهده على الهاتف"), go: () => studio.setDevice("phone"), done: studio.mission.events.includes("phone") },
    { id: "check", text: tx("Check the page", "افحص الصفحة"), go: () => { studio.addEvent("check"); studio.setModal({ type: "check" }); }, done: studio.mission.events.includes("check") },
    { id: "preview", text: tx("Preview the website", "عاين الموقع"), go: () => studio.preview(), done: studio.mission.events.includes("preview") },
  ];
  const next = steps.find((step) => !step.done);
  if (!next) return null;
  const at = steps.findIndex((step) => step.id === next.id) + 1;
  return (
    <div className="next-step">
      <p><b>{tx("Next", "التالي")}</b> {next.text}</p>
      <span>{at} / {steps.length}</span>
      <button type="button" className="tb primary" onClick={next.go}>{tx("Do this", "افعل هذا")}</button>
    </div>
  );
}

function EmptyCanvas({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { tx } = useI18n();
  const place = (id: string) => studio.insertBlock(id, null, "");
  const starters = [
    { id: "hero", title: tx("Welcome banner", "واجهة ترحيب"), detail: tx("A big title and a button", "عنوان كبير وزر") },
    { id: "navbar", title: tx("Menu bar", "شريط القائمة"), detail: tx("Home, About, Contact", "الرئيسية، عنّي، تواصل") },
    { id: "features", title: tx("Three ideas", "ثلاث أفكار"), detail: tx("Cards sitting side by side", "بطاقات بجانب بعضها") },
    { id: "footer", title: tx("Footer", "تذييل"), detail: tx("The closing line of the page", "السطر الختامي للصفحة") },
  ];
  return (
    <div className="empty-start">
      <p>{tx("Drag a tag from the Toolbox, or choose one below.", "اسحب وسمًا من صندوق الأدوات، أو اختر واحدًا أدناه.")}</p>
      <div className="starter-grid">
        {starters.map((item) => (
          <button key={item.id} type="button" onClick={() => place(item.id)}>
            <Glyph id={item.id} />
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function LessonStrip({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { tx, lang } = useI18n();
  if (studio.session?.role !== "learner") return null;
  const newest = studio.lessons[0];
  if (!newest || newest.id === studio.project?.lesson_id) return null;
  const brief = lang === "ar" && newest.brief_ar ? newest.brief_ar : newest.brief_en;
  const started = studio.projects.some((item) => item.lesson_id === newest.id);
  const siteLang = newest.site_lang === "ask" ? lang : newest.site_lang;
  return (
    <div className="banner lesson">
      <strong>{newest.title}</strong>
      {brief && <p dir="auto">{brief}</p>}
      <div className="banner-actions">
        <button type="button" className="tb primary" onClick={() => void studio.startLesson(newest.id, siteLang)}>
          {started ? tx("Continue lesson", "متابعة الدرس") : tx("Start lesson", "ابدأ الدرس")}
        </button>
      </div>
    </div>
  );
}

function HelpBanner({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { tx } = useI18n();
  const [note, setNote] = useState(studio.project?.note || "");
  useEffect(() => setNote(studio.project?.note || ""), [studio.project?.id, studio.project?.note]);
  return (
    <div className="banner help">
      <strong>{tx("Helping", "تساعد")} {studio.helping}</strong>
      <p>{tx("You are looking at this student's page. A note you save appears on their screen.", "أنت ترى صفحة هذا الطالب. الملاحظة التي تحفظها تظهر عنده.")}</p>
      <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} dir="auto" />
      <div className="banner-actions">
        <button type="button" className="tb primary" onClick={() => void studio.saveNote(note)}>{tx("Save note", "حفظ الملاحظة")}</button>
        <button type="button" className="tb" onClick={() => void studio.stopHelping()}>{tx("Back to my page", "العودة إلى صفحتي")}</button>
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
    </div>
  );
}
