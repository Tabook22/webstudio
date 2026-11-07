import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CHAPTERS, chapterText, type Chapter, type FigId, type HelpBlock } from "../help/book";
import { useI18n } from "../i18n";

export function HelpBook({ onClose, chapter }: { onClose: () => void; chapter?: string }) {
  const { tx, lang } = useI18n();
  const index = lang === "ar" ? 1 : 0;
  const [current, setCurrent] = useState(chapter && CHAPTERS.some((item) => item.id === chapter) ? chapter : CHAPTERS[0].id);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () => CHAPTERS.filter((item) => !needle || chapterText(item, index).toLowerCase().includes(needle)),
    [needle, index],
  );
  const shown = matches.find((item) => item.id === current) || matches[0] || CHAPTERS[0];
  const groups = matches.reduce<{ name: string; items: Chapter[] }[]>((list, item) => {
    const name = item.group[index];
    const found = list.find((group) => group.name === name);
    if (found) found.items.push(item);
    else list.push({ name, items: [item] });
    return list;
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-back help-back" onMouseDown={onClose}>
      <div className="help-book" role="dialog" aria-modal="true" aria-label={tx("Web Studio Help", "دليل استوديو الويب")} onMouseDown={(event) => event.stopPropagation()}>
        <aside className="help-index">
          <header>
            <strong>{tx("Web Studio Help", "دليل استوديو الويب")}</strong>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={tx("Close", "إغلاق")}>×</button>
          </header>
          <label className="help-search">
            <span className="sr">{tx("Search the guide", "ابحث في الدليل")}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tx("Search tools and topics", "ابحث عن أداة أو موضوع")} />
          </label>
          <nav aria-label={tx("Guide index", "فهرس الدليل")}>
            {groups.length === 0 && <p className="hint">{tx("Nothing in the guide matches that.", "لا شيء في الدليل يطابق هذا.")}</p>}
            {groups.map((group) => (
              <section key={group.name}>
                <h2>{group.name}</h2>
                {group.items.map((item) => (
                  <button key={item.id} type="button" aria-current={item.id === shown.id ? "page" : undefined} onClick={() => setCurrent(item.id)}>
                    {item.title[index]}
                  </button>
                ))}
              </section>
            ))}
          </nav>
        </aside>
        <article className="help-read" key={shown.id}>
          <p className="help-kicker">{shown.group[index]}</p>
          <h1>{shown.title[index]}</h1>
          <p className="help-lead">{shown.lead[index]}</p>
          {shown.blocks.map((block, at) => <Block key={at} block={block} index={index} />)}
        </article>
      </div>
    </div>
  );
}

function Block({ block, index }: { block: HelpBlock; index: 0 | 1 }) {
  const { tx } = useI18n();
  if (block.k === "p") return <p>{block.t[index]}</p>;
  if (block.k === "h") return <h2>{block.t[index]}</h2>;
  if (block.k === "note") return <p className="help-note">{block.t[index]}</p>;
  if (block.k === "code") return <pre className="help-code" dir="ltr">{block.text}</pre>;
  if (block.k === "steps") {
    return (
      <ol className="help-steps">
        {block.items.map((item) => <li key={item[index]}>{item[index]}</li>)}
      </ol>
    );
  }
  if (block.k === "fig") {
    return (
      <figure className="help-figure">
        <Figure id={block.id} />
        <figcaption>{block.cap[index]}</figcaption>
      </figure>
    );
  }
  return (
    <div className="help-tools">
      {block.items.map((item) => (
        <section key={item.name[index]}>
          <h3>{item.name[index]}</h3>
          <p className="help-where">{item.where[index]}</p>
          <p>{item.what[index]}</p>
          <p className="help-ex"><b>{tx("Example", "مثال")}</b> {item.ex[index]}</p>
        </section>
      ))}
    </div>
  );
}

function Figure({ id }: { id: FigId }) {
  const { tx } = useI18n();
  if (id === "roles") return <Roles tx={tx} />;
  if (id === "select") return <SelectFig tx={tx} />;
  if (id === "toolbox") return <ToolboxFig tx={tx} />;
  if (id === "picture") return <PictureFig tx={tx} />;
  if (id === "table") return <TableFig tx={tx} />;
  if (id === "learn") return <LearnFig tx={tx} />;
  if (id === "exam") return <ExamFig tx={tx} />;
  if (id === "course") return <CourseFig tx={tx} />;
  return <WindowFig tx={tx} />;
}

type Tx = (en: string, ar: string) => string;

function Plate({ children }: { children: ReactNode }) {
  return (
    <svg className="hb-fig" viewBox="0 0 720 300" role="img">
      <rect width="720" height="300" rx="14" fill="#f3f3f3" />
      <rect x="1" y="1" width="718" height="298" rx="13" fill="none" stroke="#cfcfcf" />
      {children}
    </svg>
  );
}

function WindowFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="18" y="16" width="684" height="28" rx="4" fill="#e7e7e7" />
      <text x="32" y="35" fill="#333" fontSize="12" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("File   Edit   View   Insert   Format   Tools   Table   Site   Panels   Help", "ملف   تحرير   عرض   إدراج   تنسيق   أدوات   جدول   موقع   لوحات   تعليمات")}</text>
      <rect x="18" y="50" width="684" height="32" fill="#f7f7f7" stroke="#ddd" />
      <text x="32" y="71" fill="#444" fontSize="12" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("New   Open   Save   Page    Undo  Redo    Preview   Download   Visual Aids   Check   Learn HTML", "جديد   فتح   حفظ   الصفحة    تراجع  إعادة    معاينة   تنزيل   مساعدات مرئية   فحص   تعلّم HTML")}</text>
      <rect x="18" y="92" width="168" height="188" rx="4" fill="#fff" stroke="#d5d5d5" />
      <text x="30" y="114" fill="#666" fontSize="12" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Folder List", "قائمة المجلدات")}</text>
      <text x="30" y="140" fill="#1c1917" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">index.html</text>
      <text x="30" y="162" fill="#1c1917" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">style.css</text>
      <text x="30" y="184" fill="#1c1917" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">script.js</text>
      <text x="30" y="214" fill="#666" fontSize="12" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Tag Properties", "خصائص الوسم")}</text>
      <rect x="198" y="92" width="330" height="188" rx="4" fill="#fff" stroke="#d5d5d5" />
      <text x="214" y="122" fill="#1c1917" fontSize="22" fontFamily="Georgia, serif">{tx("Hello", "مرحبًا")}</text>
      <text x="214" y="150" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("A short sentence on the page.", "جملة قصيرة على الصفحة.")}</text>
      <rect x="214" y="176" width="120" height="64" rx="6" fill="#dbeafe" />
      <rect x="540" y="92" width="162" height="188" rx="4" fill="#fff" stroke="#d5d5d5" />
      <text x="554" y="114" fill="#666" fontSize="12" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Toolbox", "صندوق الأدوات")}</text>
      <rect x="554" y="128" width="134" height="22" rx="4" fill="#f3f3f3" />
      <text x="562" y="143" fill="#666" fontSize="11" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Heading 1", "عنوان 1")}</text>
      <rect x="554" y="156" width="134" height="22" rx="4" fill="#f3f3f3" />
      <text x="562" y="171" fill="#666" fontSize="11" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Paragraph", "فقرة")}</text>
      <rect x="554" y="184" width="134" height="22" rx="4" fill="#f3f3f3" />
      <text x="562" y="199" fill="#666" fontSize="11" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Picture", "صورة")}</text>
    </Plate>
  );
}

function Roles({ tx }: { tx: Tx }) {
  const cards: [string, string, string][] = [
    ["1", tx("Student", "طالب"), tx("ID, name, code, section, PIN", "رقم، اسم، رمز، شعبة، رقم سري")],
    ["2", tx("Lecturer", "محاضر"), tx("Code, section, 4–8 digit PIN", "رمز، شعبة، رقم من 4 إلى 8")],
    ["3", tx("Coordinator", "منسق"), tx("Username and password", "اسم مستخدم وكلمة مرور")],
  ];
  return (
    <Plate>
      {cards.map((card, i) => {
        const x = 36 + i * 228;
        return (
          <g key={card[0]}>
            <rect x={x} y="48" width="208" height="180" rx="12" fill="#fff" stroke="#d5d5d5" />
            <circle cx={x + 28} cy="84" r="14" fill="#1a6fb5" />
            <text x={x + 28} y="89" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{card[0]}</text>
            <text x={x + 52} y="89" fill="#1c1917" fontSize="18" fontFamily="Segoe UI, Tahoma, sans-serif">{card[1]}</text>
            <text x={x + 20} y="140" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{card[2]}</text>
          </g>
        );
      })}
      <text x="36" y="268" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("The section PIN never opens Course settings. The password never opens the lecturer board.", "الرقم السري للشعبة لا يفتح إعدادات المقررات. كلمة المرور لا تفتح لوحة المحاضر.")}</text>
    </Plate>
  );
}

function SelectFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="70" y="36" width="420" height="220" rx="8" fill="#fff" stroke="#d5d5d5" />
      <text x="96" y="78" fill="#1c1917" fontSize="22" fontFamily="Georgia, serif">{tx("Hello, I'm Sara", "مرحبًا، أنا سارة")}</text>
      <rect x="90" y="100" width="300" height="36" fill="none" stroke="#1a6fb5" strokeDasharray="4 3" />
      <text x="100" y="124" fill="#333" fontSize="15" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Click once to select.", "انقر مرة للتحديد.")}</text>
      <rect x="90" y="156" width="250" height="34" rx="4" fill="#fff7cc" stroke="#1a6fb5" />
      <text x="100" y="178" fill="#1c1917" fontSize="15" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Double-click to type|", "انقر مرتين للكتابة|")}</text>
      <text x="510" y="120" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Tag bar", "شريط الوسوم")}</text>
      <text x="510" y="146" fill="#1a6fb5" fontSize="14" fontFamily="Consolas, monospace">&lt;body&gt;</text>
      <text x="510" y="170" fill="#1a6fb5" fontSize="14" fontFamily="Consolas, monospace">&lt;p&gt;</text>
    </Plate>
  );
}

function ToolboxFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="40" y="40" width="200" height="210" rx="8" fill="#fff" stroke="#d5d5d5" />
      <text x="56" y="68" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Toolbox", "صندوق الأدوات")}</text>
      <rect x="56" y="84" width="168" height="26" rx="4" fill="#e8f2fb" stroke="#1a6fb5" />
      <text x="68" y="102" fill="#1c1917" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Heading 1", "عنوان 1")}</text>
      <text x="56" y="140" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Paragraph", "فقرة")}</text>
      <text x="56" y="166" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Bulleted list", "قائمة نقطية")}</text>
      <text x="56" y="192" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Table", "جدول")}</text>
      <text x="56" y="218" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Picture", "صورة")}</text>
      <path d="M250 96 H330" stroke="#1a6fb5" strokeWidth="2" />
      <path d="M320 88 l12 8 l-12 8" fill="none" stroke="#1a6fb5" strokeWidth="2" />
      <rect x="348" y="40" width="320" height="210" rx="8" fill="#fff" stroke="#d5d5d5" />
      <text x="372" y="100" fill="#1c1917" fontSize="26" fontFamily="Georgia, serif">{tx("Main heading", "عنوان رئيسي")}</text>
      <text x="372" y="150" fill="#888" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("The tag lands where you drop it.", "ينزل الوسم حيث تسقطه.")}</text>
    </Plate>
  );
}

function PictureFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="48" y="40" width="280" height="180" rx="8" fill="#dbeafe" stroke="#93c5fd" />
      <circle cx="120" cy="100" r="22" fill="#fde68a" />
      <path d="M70 190 L140 120 L190 170 L250 110 L310 190 Z" fill="#86efac" />
      <rect x="300" y="192" width="18" height="18" fill="#fff" stroke="#1a6fb5" />
      <text x="360" y="80" fill="#1c1917" fontSize="16" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Drag the corner", "اسحب الزاوية")}</text>
      <text x="360" y="112" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Size  46%", "الحجم  46%")}</text>
      <text x="360" y="150" fill="#1c1917" fontSize="16" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Describe the picture", "صف الصورة")}</text>
      <rect x="360" y="166" width="280" height="32" rx="6" fill="#fff" stroke="#d5d5d5" />
      <text x="372" y="187" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Students at the wheel", "طلاب على الدولاب")}</text>
    </Plate>
  );
}

function TableFig({ tx }: { tx: Tx }) {
  const labels = [tx("Day", "اليوم"), tx("Subject", "المادة"), tx("Room", "القاعة")];
  return (
    <Plate>
      <text x="40" y="36" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Choose 4 × 3, with a header row", "اختر 4 × 3، مع صف عناوين")}</text>
      {[0, 1, 2, 3].map((row) => [0, 1, 2].map((col) => {
        const x = 40 + col * 120;
        const y = 52 + row * 48;
        const head = row === 0;
        const on = row === 1 && col === 1;
        return (
          <g key={`${row}-${col}`}>
            <rect x={x} y={y} width="116" height="44" fill={on ? "#e8f2fb" : head ? "#f5f5f4" : "#fff"} stroke={on ? "#1a6fb5" : "#d6d3d1"} strokeWidth={on ? 2 : 1} />
            <text x={x + 10} y={y + 27} fill="#1c1917" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{head ? labels[col] : row === 1 && col === 0 ? tx("Sunday", "الأحد") : ""}</text>
          </g>
        );
      }))}
      <text x="420" y="120" fill="#1c1917" fontSize="15" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Click a cell", "انقر خلية")}</text>
      <text x="420" y="150" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Row below", "صف أسفل")}</text>
      <text x="420" y="176" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Column to the right", "عمود إلى اليمين")}</text>
      <text x="420" y="202" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Merge   Delete", "دمج   حذف")}</text>
    </Plate>
  );
}

function LearnFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="24" y="36" width="180" height="230" rx="8" fill="#fff" stroke="#d5d5d5" />
      <text x="38" y="64" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Try these", "جرّب هذه")}</text>
      <text x="38" y="100" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Write a heading", "اكتب عنوانًا")}</text>
      <text x="38" y="128" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Add a paragraph", "أضف فقرة")}</text>
      <text x="38" y="156" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Add a picture", "أضف صورة")}</text>
      <text x="38" y="184" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Add a table", "أضف جدولًا")}</text>
      <rect x="216" y="36" width="240" height="230" rx="8" fill="#1c1917" />
      <text x="232" y="70" fill="#a8a29e" fontSize="13" fontFamily="Consolas, monospace">&lt;h1&gt;Hello&lt;/h1&gt;</text>
      <text x="232" y="98" fill="#f5f5f4" fontSize="13" fontFamily="Consolas, monospace">&lt;p&gt;My name is …&lt;/p&gt;</text>
      <rect x="468" y="36" width="228" height="230" rx="8" fill="#fff" stroke="#d5d5d5" />
      <text x="486" y="80" fill="#1c1917" fontSize="20" fontFamily="Georgia, serif">Hello</text>
      <text x="486" y="112" fill="#444" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("My name is …", "اسمي …")}</text>
    </Plate>
  );
}

function ExamFig({ tx }: { tx: Tx }) {
  const cols = [
    [tx("Questions", "الأسئلة"), tx("1. Write a heading.", "١. اكتب عنوانًا.")],
    [tx("Example", "المثال"), "<h1>Hello</h1>"],
    [tx("Your answer", "إجابتك"), tx("Type the page.", "اكتب الصفحة.")],
    [tx("Preview", "المعاينة"), "Hello"],
  ];
  return (
    <Plate>
      {cols.map((col, i) => {
        const x = 20 + i * 176;
        return (
          <g key={col[0]}>
            <rect x={x} y="40" width="164" height="210" rx="8" fill={i === 1 || i === 2 ? "#1c1917" : "#fff"} stroke="#d5d5d5" />
            <text x={x + 12} y="68" fill={i === 1 || i === 2 ? "#fdba74" : "#9a3412"} fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{col[0]}</text>
            <text x={x + 12} y="110" fill={i === 1 || i === 2 ? "#f5f5f4" : "#1c1917"} fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{col[1]}</text>
          </g>
        );
      })}
    </Plate>
  );
}

function CourseFig({ tx }: { tx: Tx }) {
  return (
    <Plate>
      <rect x="36" y="36" width="300" height="220" rx="10" fill="#fff" stroke="#d5d5d5" />
      <text x="54" y="70" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Course title", "عنوان المقرر")}</text>
      <text x="54" y="96" fill="#1c1917" fontSize="15" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Introduction to Technical Computing", "مقدمة في الحوسبة التقنية")}</text>
      <text x="54" y="140" fill="#666" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Course code", "رمز المقرر")}</text>
      <text x="54" y="166" fill="#1c1917" fontSize="18" fontFamily="Consolas, monospace">CMPS100A</text>
      <rect x="370" y="36" width="140" height="220" rx="10" fill="#fff" stroke="#1a6fb5" />
      <text x="388" y="70" fill="#1a6fb5" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Section 1", "الشعبة 1")}</text>
      <text x="388" y="110" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own PIN", "رقمه السري")}</text>
      <text x="388" y="140" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own exam", "اختباره")}</text>
      <text x="388" y="170" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own students", "طلابه")}</text>
      <rect x="528" y="36" width="150" height="220" rx="10" fill="#fff" stroke="#d5d5d5" />
      <text x="546" y="70" fill="#1c1917" fontSize="14" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Section 2", "الشعبة 2")}</text>
      <text x="546" y="110" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own PIN", "رقمه السري")}</text>
      <text x="546" y="140" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own exam", "اختباره")}</text>
      <text x="546" y="170" fill="#444" fontSize="13" fontFamily="Segoe UI, Tahoma, sans-serif">{tx("Own students", "طلابه")}</text>
    </Plate>
  );
}
