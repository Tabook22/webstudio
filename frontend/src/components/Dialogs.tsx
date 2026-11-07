import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminDialog } from "./AdminDesk";
import { ClassDialog } from "./ClassRoom";
import { HelpBook } from "./HelpBook";
import { previewDocument, templatePreview } from "../editor/html";
import { FONTS, GRADIENTS, MISSIONS, SWATCHES, checkLinks, checkPage, pageFacts } from "../editor/learn";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

export function Dialogs({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const modal = studio.modal;
  if (!modal) return null;
  if (modal.type === "class") return <ClassDialog studio={studio} />;
  if (modal.type === "admin") return <AdminDialog studio={studio} />;
  if (modal.type === "help") return <HelpBook chapter={modal.chapter} onClose={() => studio.setModal(null)} />;
  if (modal.type === "new") return <NewDialog studio={studio} />;
  if (modal.type === "projects") return <ProjectsDialog studio={studio} />;
  if (modal.type === "open") return <OpenDialog studio={studio} />;
  if (!studio.project) return null;
  const close = () => studio.setModal(null);

  if (modal.type === "kits") return <KitsDialog studio={studio} />;
  if (modal.type === "page") return <PageDialog studio={studio} />;
  if (modal.type === "paste") return <PasteDialog studio={studio} />;
  if (modal.type === "find") return <FindDialog studio={studio} />;
  if (modal.type === "check") return <CheckDialog studio={studio} />;
  if (modal.type === "links") return <LinksDialog studio={studio} />;
  if (modal.type === "details") return <DetailsDialog studio={studio} />;
  if (modal.type === "table") return <TableDialog studio={studio} path={modal.path} tag={modal.tag} />;
  if (modal.type === "mission") return <MissionStart studio={studio} id={modal.id} />;
  if (modal.type === "run") {
    return (
      <Modal title={tx("Run", "تشغيل")} onClose={close} wide>
        <p className="hint">{tx("JavaScript runs here. console.log appears in the Console tab.", "يعمل JavaScript هنا. تظهر console.log في وحدة التحكم.")}</p>
        <iframe className="run-frame" title="Run" sandbox="allow-scripts allow-modals allow-forms allow-popups" srcDoc={previewDocument(studio.project)} />
      </Modal>
    );
  }
  return null;
}

function Modal({ title, onClose, children, wide, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const { tx } = useI18n();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={`modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={tx("Close", "إغلاق")}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

function NewDialog({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const [name, setName] = useState(tx("My website", "موقعي"));
  const [siteLang, setSiteLang] = useState<"en" | "ar">(lang);
  const [templateId, setTemplateId] = useState("blank");
  const examples = studio.templates.filter((tpl) => tpl.id !== "blank");
  return (
    <Modal
      title={tx("New project", "مشروع جديد")}
      wide
      onClose={() => studio.setModal(null)}
      footer={<button className="tb primary" onClick={() => void studio.createSite(name.trim() || tx("My website", "موقعي"), templateId, siteLang)}>{tx("Create project", "أنشئ المشروع")}</button>}
    >
      <p className="hint">{tx("Your current website stays saved. This opens a fresh project.", "موقعك الحالي يبقى محفوظًا. هذا يفتح مشروعًا جديدًا.")}</p>
      <div className="form-row">
        <label>{tx("Project name", "اسم المشروع")}<input value={name} onChange={(event) => setName(event.target.value)} dir="auto" /></label>
        <label>{tx("Website language", "لغة الموقع")}
          <select value={siteLang} onChange={(event) => setSiteLang(event.target.value as "en" | "ar")}>
            <option value="en">{tx("English", "الإنجليزية")}</option>
            <option value="ar">{tx("Arabic", "العربية")}</option>
          </select>
        </label>
      </div>
      <button type="button" className={`fresh${templateId === "blank" ? " on" : ""}`} onClick={() => setTemplateId("blank")}>
        <strong>{tx("Fresh empty project", "مشروع فارغ جديد")}</strong>
        <span>{tx("A blank page. The student builds every part.", "صفحة فارغة. يبني الطالب كل جزء.")}</span>
      </button>
      <p className="hint">{tx("Or start from a ready example", "أو ابدأ من مثال جاهز")}</p>
      <div className="tpl-gallery">
        {examples.map((tpl) => (
          <button key={tpl.id} type="button" className={`tpl${templateId === tpl.id ? " on" : ""}`} onClick={() => { setTemplateId(tpl.id); if (tpl.rtl) setSiteLang("ar"); }}>
            <div className="tpl-thumb">
              {(siteLang === "ar" && tpl.html_ar ? tpl.html_ar : tpl.html) ? <iframe title={tpl.name[lang]} sandbox="" srcDoc={templatePreview(siteLang === "ar" && tpl.html_ar ? tpl.html_ar : tpl.html, tpl.css, tpl.images, siteLang === "ar" || tpl.rtl)} /> : <span>{tx("Blank", "فارغة")}</span>}
            </div>
            <strong>{tpl.name[lang]}</strong>
            <small>{tpl.desc[lang]}</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function ProjectsDialog({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  return (
    <Modal title={tx("Your websites", "مواقعك")} onClose={() => studio.setModal(null)}>
      <div className="dialog-actions">
        <button type="button" className="tb primary" onClick={() => studio.setModal({ type: "new" })}>{tx("New project", "مشروع جديد")}</button>
        <button type="button" className="tb" onClick={() => studio.setModal({ type: "open" })}>{tx("Open a file or folder", "فتح ملف أو مجلد")}</button>
      </div>
      <div className="project-list">
        {studio.projects.length === 0 && <p className="hint">{tx("No saved websites yet.", "لا توجد مواقع محفوظة بعد.")}</p>}
        {studio.projects.map((item) => (
          <div key={item.id} className={`project-row${item.id === studio.project?.id ? " current" : ""}`}>
            <button type="button" onClick={() => void studio.openProject(item.id)}>
              <strong dir="auto">{item.name}</strong>
              <small>{new Date(item.updated_at).toLocaleString(lang === "ar" ? "ar" : "en")}</small>
            </button>
            {item.id !== studio.project?.id && (
              <button type="button" className="icon-btn danger" onClick={() => { if (confirm(tx("Delete this website?", "حذف هذا الموقع؟"))) void studio.deleteSite(item.id); }} aria-label={tx("Delete", "حذف")}>×</button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function OpenDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  return (
    <Modal title={tx("Open", "فتح")} onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("Open a ZIP, an HTML file, or a folder.", "افتح ملف ZIP أو HTML أو مجلدًا.")}</p>
      <div className="choice-row">
        <label className="choice">
          {tx("ZIP or HTML", "ZIP أو HTML")}
          <input hidden type="file" accept=".zip,.html,.htm,.css,.js,image/*" multiple onChange={(event) => { const files = [...(event.target.files || [])]; if (files.length) void studio.importSite(files).catch((error) => studio.setToast(error.message)); }} />
        </label>
        <label className="choice">
          {tx("Folder", "مجلد")}
          <input hidden type="file" multiple onChange={(event) => { const files = [...(event.target.files || [])]; if (files.length) void studio.importSite(files).catch((error) => studio.setToast(error.message)); }} {...{ webkitdirectory: "", directory: "" }} />
        </label>
      </div>
    </Modal>
  );
}

function KitsDialog({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  return (
    <Modal title={tx("Design kits", "أطقم التصميم")} wide onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("A kit sets colours, fonts and corners for the whole site with CSS variables in :root.", "يضبط الطقم الألوان والخطوط والزوايا للموقع كله بمتغيرات CSS في :root.")}</p>
      <div className="kit-grid">
        {studio.kits.map((kit) => (
          <button key={kit.id} type="button" className="kit" onClick={() => studio.applyKit(kit)}>
            <div className="kit-preview" style={{ background: kit.vars["--color-bg"], color: kit.vars["--color-text"], borderRadius: kit.vars["--radius"] }}>
              <b style={{ color: kit.vars["--color-heading"], fontFamily: kit.vars["--font-heading"] }}>{kit.name[lang]}</b>
              <span>{kit.mood[lang]}</span>
              <i style={{ background: kit.vars["--color-primary"], color: kit.vars["--color-on-primary"], borderRadius: kit.vars["--radius"] }}>{tx("Button", "زر")}</i>
            </div>
            <span className="dots">
              {["--color-primary", "--color-secondary", "--color-surface", "--color-dark"].map((key) => <i key={key} style={{ background: kit.vars[key] }} />)}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function PageDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const project = studio.project!;
  const [title, setTitle] = useState(project.title);
  const [siteLang, setSiteLang] = useState(project.site_lang);
  return (
    <Modal title={tx("Page settings", "إعدادات الصفحة")} onClose={() => studio.setModal(null)} footer={<button className="tb primary" onClick={() => studio.setMeta(title.trim() || project.name, siteLang)}>{tx("Apply", "تطبيق")}</button>}>
      <label className="stack">{tx("Page title", "عنوان الصفحة")}<input value={title} dir="auto" onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="stack">{tx("Website language", "لغة الموقع")}
        <select value={siteLang} onChange={(event) => setSiteLang(event.target.value as "en" | "ar")}>
          <option value="en">{tx("English, left to right", "الإنجليزية، من اليسار إلى اليمين")}</option>
          <option value="ar">{tx("Arabic, right to left", "العربية، من اليمين إلى اليسار")}</option>
        </select>
      </label>
    </Modal>
  );
}

function FindDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const queryRef = useRef<HTMLInputElement>(null);
  useEffect(() => { queryRef.current?.focus(); }, []);
  return (
    <Modal
      title={tx("Find and replace", "بحث واستبدال")}
      onClose={() => studio.setModal(null)}
      footer={
        <>
          <button type="button" className="tb" onClick={() => studio.findNext(query)}>{tx("Find next", "بحث عن التالي")}</button>
          <button type="button" className="tb" onClick={() => studio.replaceEdit(query, value, false)}>{tx("Replace", "استبدال")}</button>
          <button type="button" className="tb primary" onClick={() => studio.replaceEdit(query, value, true)}>{tx("Replace all", "استبدال الكل")}</button>
        </>
      }
    >
      <label className="stack">{tx("Find", "بحث")}
        <input ref={queryRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") studio.findNext(query); }} />
      </label>
      <label className="stack">{tx("Replace with", "استبدال بـ")}
        <input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") studio.replaceEdit(query, value, false); }} />
      </label>
      <p className="hint">{tx("Find looks through the words on the page. In Code view it looks through the file you are editing.", "البحث يمر على كلمات الصفحة. في عرض الكود يبحث في الملف الذي تحرره.")}</p>
    </Modal>
  );
}

function PasteDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const [value, setValue] = useState("");
  const sel = studio.selection;
  return (
    <Modal title={tx("Paste HTML", "لصق HTML")} wide onClose={() => studio.setModal(null)} footer={<button className="tb primary" onClick={() => { if (value.trim()) studio.insertMarkup(value, undefined, sel?.path || null, sel?.tag || ""); studio.setModal(null); }}>{tx("Insert", "إدراج")}</button>}>
      <p className="hint">{tx("Paste HTML. It becomes part of the page you can edit.", "الصق HTML ليصبح جزءًا من الصفحة ويمكنك تعديله.")}</p>
      <textarea className="code-input tall" dir="ltr" value={value} onChange={(event) => setValue(event.target.value)} placeholder={tx("<h2>Hello</h2>", "<h2>مرحبًا</h2>")} />
    </Modal>
  );
}

function CheckDialog({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const page = studio.pagePath || "index.html";
  const issues = checkPage(studio.pageHtml, studio.project!.title).map((issue) => ({ ...issue, page }));
  return (
    <Modal title={tx(`Check ${page}`, `فحص ${page}`)} onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("Looks at this page for a main heading, picture descriptions, empty links, buttons, and form labels.", "يفحص هذه الصفحة: العنوان الرئيسي، ووصف الصور، والروابط الفارغة، والأزرار، وتسميات النماذج.")}</p>
      <IssueList studio={studio} issues={issues} empty={tx("This page looks good.", "هذه الصفحة جيدة.")} />
    </Modal>
  );
}

function LinksDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const issues = studio.project ? checkLinks(studio.project) : [];
  return (
    <Modal title={tx("Check links", "فحص الروابط")} onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("Looks through every page for links that go nowhere and pictures that are missing from the website.", "يمر على كل الصفحات بحثًا عن روابط لا تذهب إلى مكان وصور غير موجودة في الموقع.")}</p>
      <IssueList studio={studio} issues={issues} empty={tx("Every link and picture points somewhere in the website.", "كل رابط وصورة يشير إلى شيء داخل الموقع.")} />
    </Modal>
  );
}

function DetailsDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const facts = pageFacts(studio.pageHtml);
  const page = studio.pagePath || "index.html";
  const rows: [string, number][] = [
    [tx("Words", "كلمات"), facts.words],
    [tx("Headings", "عناوين"), facts.headings],
    [tx("Paragraphs", "فقرات"), facts.paragraphs],
    [tx("Pictures", "صور"), facts.pictures],
    [tx("Links", "روابط"), facts.links],
    [tx("Tables", "جداول"), facts.tables],
  ];
  return (
    <Modal title={tx(`Page details — ${page}`, `تفاصيل الصفحة — ${page}`)} onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("A quick count of what is on the page you are editing.", "عدّ سريع لما يوجد في الصفحة التي تحررها.")}</p>
      <div className="page-facts">
        {rows.map(([label, value]) => (
          <div key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </div>
    </Modal>
  );
}

function IssueList({ studio, issues, empty }: { studio: Studio; issues: { level: "error" | "warn" | "tip"; en: string; ar: string; path?: number[]; page?: string }[]; empty: string }) {
  const { tx, lang } = useI18n();
  const problems = issues.filter((issue) => issue.level !== "tip");
  const show = (issue: (typeof issues)[number]) => {
    if (issue.page && issue.page !== studio.pagePath) studio.openPage(issue.page);
    if (issue.path) studio.command({ cmd: "select", path: issue.path });
    studio.setModal(null);
  };
  if (!issues.length) return <p className="ok">{empty}</p>;
  return (
    <>
      <ul className="issues">
        {issues.map((issue, index) => (
          <li key={index} data-level={issue.level}>
            <span>{issue.page && issue.page !== studio.pagePath ? `${issue.page}: ` : ""}{lang === "ar" ? issue.ar : issue.en}</span>
            {(issue.path || issue.page) && <button type="button" onClick={() => show(issue)}>{tx("Show", "عرض")}</button>}
          </li>
        ))}
      </ul>
      {problems.length === 0 && <p className="ok">{tx("Only gentle tips left.", "بقيت تلميحات لطيفة فقط.")}</p>}
    </>
  );
}

function TableDialog({ studio, path, tag }: { studio: Studio; path: number[] | null; tag: string }) {
  const { tx } = useI18n();
  const [hover, setHover] = useState({ c: 3, r: 3 });
  const [header, setHeader] = useState(true);
  return (
    <Modal title={tx("Choose the table size", "اختر حجم الجدول")} onClose={() => studio.setModal(null)}>
      <p className="hint">{tx("Move over the grid and click.", "مرّر فوق الشبكة وانقر.")}</p>
      <div className="size-grid" onMouseLeave={() => setHover({ c: 3, r: 3 })}>
        {Array.from({ length: 6 }, (_, r) => (
          <div key={r}>
            {Array.from({ length: 8 }, (_, c) => (
              <button key={c} type="button" className={c < hover.c && r < hover.r ? "on" : ""} onMouseEnter={() => setHover({ c: c + 1, r: r + 1 })} onClick={() => studio.confirmTable(c + 1, r + 1, header, path, tag)} />
            ))}
          </div>
        ))}
      </div>
      <p>{hover.c} × {hover.r}</p>
      <label className="check"><input type="checkbox" checked={header} onChange={(event) => setHeader(event.target.checked)} /> {tx("Header row", "صف العناوين")}</label>
    </Modal>
  );
}

function MissionStart({ studio, id }: { studio: Studio; id: string }) {
  const { tx, lang } = useI18n();
  const mission = MISSIONS.find((item) => item.id === id);
  if (!mission) return null;
  return (
    <Modal title={mission.title[lang === "ar" ? 1 : 0]} onClose={() => studio.setModal(null)}>
      <p>{tx("Where do you want to work?", "أين تريد أن تعمل؟")}</p>
      <div className="choice-row">
        <button className="choice" onClick={() => void studio.startMission(id, true)}>
          <strong>{tx("On a new blank page", "في صفحة فارغة جديدة")}</strong>
          <small>{tx("Your current website is saved.", "يتم حفظ موقعك الحالي.")}</small>
        </button>
        <button className="choice" onClick={() => void studio.startMission(id, false)}>
          <strong>{tx("On my current page", "في صفحتي الحالية")}</strong>
          <small>{tx("Steps you already did count straight away.", "الخطوات التي أنجزتها تُحتسب فورًا.")}</small>
        </button>
      </div>
    </Modal>
  );
}

export { Modal, FONTS, SWATCHES, GRADIENTS };
