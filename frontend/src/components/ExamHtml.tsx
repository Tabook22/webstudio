import { useEffect, useRef, useState } from "react";
import { DEFAULT_EXAM, EXAM_FILE, examPreview, examQuestions, readExam, type ExamPaper } from "../editor/exam";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";

const draftKey = (id: string) => `webstudio:exam-answer:${id}`;

export function ExamHtml({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const project = studio.project;
  const saved = project ? readExam(project.files) : null;
  const paper = saved ?? DEFAULT_EXAM;
  const learner = studio.session?.role === "learner";
  const [editing, setEditing] = useState(false);
  const [questions, setQuestions] = useState(paper.questions);
  const [questionsAr, setQuestionsAr] = useState(paper.questionsAr || "");
  const [template, setTemplate] = useState(paper.html);
  const [answer, setAnswer] = useState(() => (project ? localStorage.getItem(draftKey(project.id)) || "" : ""));
  const [seen, setSeen] = useState(project?.id ?? "");
  const [steps, setSteps] = useState(0);
  const [zoom, setZoom] = useState<null | "example" | "answer">(null);
  const [draft, setDraft] = useState("");
  const history = useRef({ past: [] as string[], future: [] as string[] });
  const answerRef = useRef(answer);
  const lastTyped = useRef(0);
  answerRef.current = answer;

  if (project && project.id !== seen) {
    setSeen(project.id);
    setEditing(false);
    setQuestions(paper.questions);
    setQuestionsAr(paper.questionsAr || "");
    setTemplate(paper.html);
    setAnswer(localStorage.getItem(draftKey(project.id)) || "");
    history.current = { past: [], future: [] };
  }

  function remember(next: string) {
    const current = answerRef.current;
    if (next === current) return;
    const now = Date.now();
    const burst = now - lastTyped.current < 700 && Math.abs(next.length - current.length) < 12;
    if (!burst) {
      history.current.past.push(current);
      if (history.current.past.length > 80) history.current.past.shift();
    }
    history.current.future = [];
    lastTyped.current = now;
    setAnswer(next);
    setSteps((count) => count + 1);
  }

  function undoAnswer() {
    const previous = history.current.past.pop();
    if (previous === undefined) return;
    history.current.future.push(answerRef.current);
    lastTyped.current = 0;
    setAnswer(previous);
    setSteps((count) => count + 1);
  }

  function redoAnswer() {
    const next = history.current.future.pop();
    if (next === undefined) return;
    history.current.past.push(answerRef.current);
    lastTyped.current = 0;
    setAnswer(next);
    setSteps((count) => count + 1);
  }

  const canUndo = steps >= 0 && history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;

  useEffect(() => {
    if (!project || project.id !== seen) return;
    localStorage.setItem(draftKey(project.id), answer);
  }, [answer, project, seen]);

  if (!project) return null;

  const shown: ExamPaper = editing ? { questions, html: template } : paper;
  const previewSource = editing ? template : answer;

  function giveExam() {
    const next = (project!.files || []).filter((file) => file.path !== EXAM_FILE);
    next.push({
      path: EXAM_FILE,
      folder: false,
      content: JSON.stringify({
        questions: questions.trim() ? questions : DEFAULT_EXAM.questions,
        questionsAr: questionsAr.trim() || DEFAULT_EXAM.questionsAr,
        html: template,
      }),
    });
    studio.changeFiles(next);
    setEditing(false);
    studio.setToast(tx("The exam is ready. Students type their own page.", "الاختبار جاهز. يكتب الطالب صفحته بنفسه."));
  }

  async function saveAnswer() {
    const text = answer.replace(/\s+$/, "") + "\n";
    if (!answer.trim()) {
      studio.setToast(tx("Type the page first.", "اكتب الصفحة أولًا."));
      return;
    }
    const suggested = `${(project!.name || "exam").replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "exam"}-exam.html`;
    const picker = (window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        startIn?: string;
        types?: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<{ name: string; createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }> }>;
    }).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: suggested,
          startIn: "documents",
          types: [{ description: "HTML page", accept: { "text/html": [".html"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        studio.setToast(tx(`Saved in the folder you chose: ${handle.name}`, `حُفظ في المجلد الذي اخترته: ${handle.name}`));
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const blob = new Blob([text], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggested;
    link.click();
    URL.revokeObjectURL(url);
    studio.setToast(tx("The answer file is downloading. Put it in the student's folder.", "ملف الإجابة يتنزّل. ضعه في مجلد الطالب."));
  }

  return (
    <section className="exam">
      <header className="begin-top">
        <div>
          <p className="begin-kicker">{tx("HTML exam", "اختبار HTML")}</p>
          <p className="begin-cheer">{tx("Read the questions beside the example, then type the whole page yourself.", "اقرأ الأسئلة بجانب المثال، ثم اكتب الصفحة كاملة بنفسك.")}</p>
        </div>
        <div className="begin-actions">
          {!editing && (
            <>
              <IconButton name="undo" label={tx("Undo", "تراجع")} disabled={!canUndo} onClick={undoAnswer} />
              <IconButton name="redo" label={tx("Redo", "إعادة")} disabled={!canRedo} onClick={redoAnswer} />
            </>
          )}
          {!learner && !editing && (
            <IconButton name="write" label={tx("Write the exam", "كتابة الاختبار")} onClick={() => {
              setQuestions(paper.questions);
              setQuestionsAr(paper.questionsAr || (paper.questions.trim() === DEFAULT_EXAM.questions.trim() ? DEFAULT_EXAM.questionsAr || "" : ""));
              setTemplate(paper.html);
              setEditing(true);
            }} />
          )}
          {editing && (
            <>
              <IconButton name="back" label={tx("Cancel", "إلغاء")} onClick={() => setEditing(false)} />
              <IconButton name="check" label={tx("Give this exam", "تسليم الاختبار")} primary onClick={giveExam} />
            </>
          )}
          {!editing && (
            <>
              <IconButton name="clear" label={tx("Clear my answer", "مسح إجابتي")} danger onClick={() => {
                if (!answer.trim() || window.confirm(tx("Clear everything you typed?", "مسح كل ما كتبته؟"))) remember("");
              }} />
              <IconButton name="save" label={tx("Save my answer…", "حفظ إجابتي…")} primary onClick={() => void saveAnswer()} />
            </>
          )}
          <IconButton name="back" label={tx("Back to design", "العودة للتصميم")} flip={lang === "ar"} onClick={studio.closeExam} />
        </div>
      </header>
      <div className="exam-grid">
        <aside className="exam-questions">
          <h2>{tx("Questions", "الأسئلة")}</h2>
          {editing ? (
            <>
              <label className="pair">
                {tx("English", "English")}
                <textarea dir="ltr" value={questions} spellCheck={false} onChange={(event) => setQuestions(event.target.value)} aria-label={tx("Exam questions in English", "أسئلة الاختبار بالإنجليزية")} />
              </label>
              <label className="pair">
                {tx("Arabic", "العربية")}
                <textarea dir="rtl" value={questionsAr} spellCheck={false} onChange={(event) => setQuestionsAr(event.target.value)} aria-label={tx("Exam questions in Arabic", "أسئلة الاختبار بالعربية")} />
              </label>
            </>
          ) : (
            <QuestionList {...examQuestions(shown, lang)} />
          )}
          {!editing && <p>{tx("The example stays as it was given. Change only Your answer.", "المثال يبقى كما أُعطي. غيّر إجابتك فقط.")}</p>}
        </aside>
        <div className="exam-work">
          <div className="exam-pane example">
            <div className="exam-pane-head">
              <h2>{editing ? tx("Example the students will see", "المثال الذي يراه الطالب") : tx("Example", "المثال")}</h2>
              <button type="button" className="exam-zoom" title={tx("Open this window", "افتح هذه النافذة")} aria-label={tx("Open the example in a window", "افتح المثال في نافذة")} onClick={() => { setDraft(editing ? template : shown.html); setZoom("example"); }}>
                <ExamIcon name="expand" />
              </button>
            </div>
            {editing ? (
              <textarea className="exam-template" value={template} spellCheck={false} wrap="off" onChange={(event) => setTemplate(event.target.value)} aria-label={tx("Example HTML", "مثال HTML")} />
            ) : (
              <Sample html={shown.html} />
            )}
          </div>
          {!editing && (
            <div className="exam-pane answer">
              <div className="exam-pane-head">
                <h2>{tx("Your answer", "إجابتك")}</h2>
                <button type="button" className="exam-zoom" title={tx("Open this window", "افتح هذه النافذة")} aria-label={tx("Open your answer in a window", "افتح إجابتك في نافذة")} onClick={() => { setDraft(answer); setZoom("answer"); }}>
                  <ExamIcon name="expand" />
                </button>
              </div>
              <Answer
                value={answer}
                onChange={remember}
                onUndo={undoAnswer}
                onRedo={redoAnswer}
                onPaste={() => studio.setToast(tx("Type the page yourself.", "اكتب الصفحة بنفسك."))}
              />
            </div>
          )}
        </div>
        <div className="begin-stage">
          <header>{editing ? tx("Example page", "صفحة المثال") : tx("Your page", "صفحتك")}</header>
          {previewSource.trim() ? (
            <iframe title={tx("Exam preview", "معاينة الاختبار")} sandbox="" srcDoc={examPreview(previewSource, project.id)} />
          ) : (
            <div className="begin-wait"><p>{tx("Your page appears here as you type.", "تظهر صفحتك هنا وأنت تكتب.")}</p></div>
          )}
        </div>
      </div>
      {zoom && (
        <CodeWindow
          title={zoom === "answer" ? tx("Your answer", "إجابتك") : tx("Example", "المثال")}
          value={draft}
          write={zoom === "answer" || editing}
          onChange={setDraft}
          onPaste={() => studio.setToast(tx("Type the page yourself.", "اكتب الصفحة بنفسك."))}
          onSave={() => {
            if (zoom === "answer") remember(draft);
            else if (editing) setTemplate(draft);
            setZoom(null);
            studio.setToast(tx("Saved in the window.", "حُفظ في النافذة."));
          }}
          onClose={() => setZoom(null)}
        />
      )}
    </section>
  );
}

function IconButton({ name, label, onClick, disabled, primary, danger, flip }: {
  name: "undo" | "redo" | "write" | "clear" | "save" | "back" | "check";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  flip?: boolean;
}) {
  return (
    <button type="button" className={`tb icon${primary ? " primary" : ""}${danger ? " danger" : ""}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      <ExamIcon name={name} flip={flip} />
    </button>
  );
}

function ExamIcon({ name, flip }: { name: "undo" | "redo" | "write" | "clear" | "save" | "back" | "check" | "expand"; flip?: boolean }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      {name === "undo" && <><path {...common} d="M8.2 7.2 3.5 12l4.7 4.8" /><path {...common} d="M3.5 12H12a5.5 5.5 0 0 1 0 11H10" /></>}
      {name === "redo" && <><path {...common} d="M15.8 7.2 20.5 12l-4.7 4.8" /><path {...common} d="M20.5 12H12a5.5 5.5 0 0 0 0 11H14" /></>}
      {name === "write" && <><path {...common} d="M14.2 5.2l4.6 4.6L8.4 20H4v-4.4L14.2 5.2z" /><path {...common} d="M12 7.4l4.6 4.6" /></>}
      {name === "clear" && <><path {...common} d="M4 7h16" /><path {...common} d="M9 7V4.5h6V7" /><path {...common} d="M7 7l1 13h8l1-13" /></>}
      {name === "save" && <><path {...common} d="M5 4h11l3 3v13H5z" /><path {...common} d="M8 4v5h7M8 20v-6h8v6" /></>}
      {name === "back" && <><path {...common} d="M15 6 9 12l6 6" /><path {...common} d="M9 12h11" /></>}
      {name === "check" && <path {...common} d="M5 12.5l4 4 10-10" />}
      {name === "expand" && <><path {...common} d="M14 4h6v6M20 4l-7 7" /><path {...common} d="M10 20H4v-6M4 20l7-7" /></>}
    </svg>
  );
}

function CodeWindow({ title, value, write, onChange, onPaste, onSave, onClose }: {
  title: string;
  value: string;
  write: boolean;
  onChange: (value: string) => void;
  onPaste: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { tx } = useI18n();
  const lines = Math.max(1, value.replace(/\n$/, "").split("\n").length);
  return (
    <div className="exam-pop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="exam-pop-card" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="exam-zoom" title={tx("Close", "إغلاق")} aria-label={tx("Close", "إغلاق")} onClick={onClose}>×</button>
        </header>
        <div className="exam-field pop">
          <div className="begin-gutter" aria-hidden="true">
            {Array.from({ length: lines }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
          <textarea
            value={value}
            spellCheck={false}
            wrap="off"
            dir="ltr"
            readOnly={!write}
            aria-label={title}
            autoFocus
            onChange={(event) => write && onChange(event.target.value)}
            onPaste={(event) => { if (write) { event.preventDefault(); onPaste(); } }}
            onDrop={(event) => event.preventDefault()}
            onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
            onScroll={(event) => {
              const gutter = event.currentTarget.previousElementSibling as HTMLElement | null;
              if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
            }}
          />
        </div>
        <footer>
          {!write && <p>{tx("Read the example here. Type your own page in Your answer.", "اقرأ المثال هنا. اكتب صفحتك في إجابتك.")}</p>}
          {write && <button type="button" className="tb primary" onClick={onSave}>{tx("Save", "حفظ")}</button>}
          <button type="button" className="tb" onClick={onClose}>{tx("Close", "إغلاق")}</button>
        </footer>
      </div>
    </div>
  );
}

function QuestionList({ text, dir }: { text: string; dir: "ltr" | "rtl" }) {
  const items = text.split(/\n+/).map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
  return (
    <ol dir={dir}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ol>
  );
}

function Sample({ html }: { html: string }) {
  const lines = html.replace(/\n$/, "").split("\n");
  return (
    <pre className="exam-sample" aria-hidden={false}>
      {lines.map((line, index) => (
        <span key={index}><i>{index + 1}</i>{line || " "}</span>
      ))}
    </pre>
  );
}

function Answer({ value, onChange, onUndo, onRedo, onPaste }: {
  value: string;
  onChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPaste: () => void;
}) {
  const lines = Math.max(1, value.split("\n").length);
  return (
    <div className="exam-field">
      <div className="begin-gutter" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => <span key={index}>{index + 1}</span>)}
      </div>
      <textarea
        value={value}
        spellCheck={false}
        wrap="off"
        dir="ltr"
        aria-label="Your answer"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          const key = event.key.toLowerCase();
          if (!(event.ctrlKey || event.metaKey)) return;
          if (key === "z") {
            event.preventDefault();
            if (event.shiftKey) onRedo();
            else onUndo();
          } else if (key === "y") {
            event.preventDefault();
            onRedo();
          }
        }}
        onPaste={(event) => { event.preventDefault(); onPaste(); }}
        onDrop={(event) => event.preventDefault()}
        onScroll={(event) => {
          const gutter = event.currentTarget.previousElementSibling as HTMLElement | null;
          if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
        }}
      />
    </div>
  );
}
