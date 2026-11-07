import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { DEFAULT_EXAM } from "../editor/exam";
import { localizeError, useI18n } from "../i18n";
import type { Studio } from "../studio";
import type { CourseRecord } from "../types";

const empty = { name: "", course_code: "", section: "1", pin: "" };

export function CourseSettings({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const token = studio.session?.role === "teacher" ? studio.session.token : "";
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [selected, setSelected] = useState(studio.session?.classId || "");
  const [form, setForm] = useState(empty);
  const [questions, setQuestions] = useState("");
  const [questionsAr, setQuestionsAr] = useState("");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function fill(course: CourseRecord | null) {
    setSelected(course?.id || "");
    setForm(course
      ? { name: course.name, course_code: course.course_code, section: course.section, pin: "" }
      : empty);
    setNote("");
    setError("");
  }

  async function load(prefer?: string) {
    if (!token) return [];
    const list = await api.listCourses(token);
    setCourses(list);
    const id = prefer || selected || studio.session?.classId || "";
    const course = list.find((item) => item.id === id) || list[0] || null;
    if (!course) {
      fill(null);
      return list;
    }
    setSelected(course.id);
    setForm({ name: course.name, course_code: course.course_code, section: course.section, pin: "" });
    const paper = await api.courseExam(token, course.id);
    setQuestions(paper.exam?.questions || "");
    setQuestionsAr(paper.exam?.questionsAr || "");
    setHtml(paper.exam?.html || "");
    return list;
  }

  useEffect(() => {
    let gone = false;
    load().catch((err) => {
      if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    });
    return () => { gone = true; };
    // The list loads once when the lecturer opens settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function pick(course: CourseRecord) {
    fill(course);
    if (!token) return;
    setBusy(true);
    try {
      const paper = await api.courseExam(token, course.id);
      setQuestions(paper.exam?.questions || "");
      setQuestionsAr(paper.exam?.questionsAr || "");
      setHtml(paper.exam?.html || "");
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    const numbers = courses
      .filter((item) => item.course_code === form.course_code)
      .map((item) => Number(item.section))
      .filter((item) => Number.isFinite(item));
    const next = numbers.length ? String(Math.max(...numbers) + 1) : "1";
    setSelected("");
    setForm({ name: form.name, course_code: form.course_code, section: next, pin: "" });
    setQuestions("");
    setQuestionsAr("");
    setHtml("");
    setNote("");
    setError("");
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const saved = await api.saveCourse(token, form, selected || undefined);
      if (saved.id === studio.session?.classId) studio.openSection(saved);
      await load(saved.id);
      setNote(tx("Course saved.", "تم حفظ المقرر."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  async function saveExam() {
    if (!token || !selected) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      await api.saveCourseExam(token, selected, { questions, questionsAr, html });
      await load(selected);
      setNote(tx("Exam saved for this section.", "تم حفظ الاختبار لهذه الشعبة."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!token || !selected) return;
    const course = courses.find((item) => item.id === selected);
    const label = course ? `${course.course_code} ${tx("section", "الشعبة")} ${course.section}` : "";
    if (!window.confirm(tx(`Remove ${label}? Students in that section lose the page list.`, `حذف ${label}؟ يفقد طلاب هذه الشعبة قائمة الصفحات.`))) return;
    setBusy(true);
    setError("");
    try {
      const current = selected === studio.session?.classId;
      await api.removeCourse(token, selected);
      if (current) {
        await studio.leaveClass();
        return;
      }
      setSelected("");
      await load();
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="course-settings">
      <div className="course-side">
        <button type="button" className="tb" onClick={startNew}>{tx("Add a section", "إضافة شعبة")}</button>
        <ul className="course-list">
          {courses.map((course) => (
            <li key={course.id}>
              <button type="button" aria-pressed={course.id === selected} onClick={() => void pick(course)}>
                <strong dir="auto">{course.name}</strong>
                <span dir="ltr">{course.course_code} · {course.section}</span>
                {course.has_exam && <em>{tx("Exam", "اختبار")}</em>}
              </button>
            </li>
          ))}
        </ul>
        {courses.length === 0 && <p className="hint">{tx("Create the first course on the right.", "أنشئ المقرر الأول من النموذج.")}</p>}
      </div>
      <div className="course-editor">
        <form className="stack-form" onSubmit={(event) => void saveCourse(event)}>
          <p className="hint">{tx("One course title and one course code can have many sections. Section 1 and section 2 stay separate.", "عنوان واحد ورمز واحد يمكن أن يكون لهما عدة شعب. الشعبة 1 والشعبة 2 منفصلتان.")}</p>
          <label>{tx("Course title", "عنوان المقرر")}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} dir="auto" /></label>
          <div className="form-row">
            <label>{tx("Course code", "رمز المقرر")}<input dir="ltr" value={form.course_code} onChange={(event) => setForm({ ...form, course_code: event.target.value.toUpperCase() })} placeholder="CMPS100A" /></label>
            <label>{tx("Section", "الشعبة")}<input dir="ltr" inputMode="numeric" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} /></label>
          </div>
          <label>{tx(selected ? "New PIN, or leave blank to keep it" : "PIN you will remember", selected ? "رقم سري جديد، أو اتركه فارغًا للإبقاء عليه" : "رقم سري تتذكره")}<input dir="ltr" inputMode="numeric" type="password" value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} autoComplete="new-password" /></label>
          <div className="form-actions">
            <button className="tb primary" type="submit" disabled={busy}>{selected ? tx("Save course", "حفظ المقرر") : tx("Create course", "إنشاء المقرر")}</button>
            {selected && <button className="tb" type="button" disabled={busy} onClick={() => { const course = courses.find((item) => item.id === selected); if (course) studio.openSection(course); }}>{tx("Open this section", "افتح هذه الشعبة")}</button>}
            {selected && <button className="tb danger" type="button" disabled={busy} onClick={() => void remove()}>{tx("Remove", "حذف")}</button>}
          </div>
        </form>
        <form className="stack-form exam-fields" onSubmit={(event) => { event.preventDefault(); void saveExam(); }}>
          <h3>{tx("Exam for this section", "اختبار هذه الشعبة")}</h3>
          <p className="hint">{tx("Students in this section see these questions and this example when they open HTML exam.", "يرى طلاب هذه الشعبة هذه الأسئلة وهذا المثال عندما يفتحون اختبار HTML.")}</p>
          <label>{tx("Questions in English", "الأسئلة بالإنجليزية")}<textarea rows={5} value={questions} onChange={(event) => setQuestions(event.target.value)} /></label>
          <label>{tx("Questions in Arabic", "الأسئلة بالعربية")}<textarea rows={5} dir="rtl" value={questionsAr} onChange={(event) => setQuestionsAr(event.target.value)} /></label>
          <label>{tx("Example HTML", "مثال HTML")}<textarea rows={8} dir="ltr" spellCheck={false} value={html} onChange={(event) => setHtml(event.target.value)} /></label>
          <div className="form-actions">
            <button className="tb primary" type="submit" disabled={busy || !selected}>{tx("Save exam", "حفظ الاختبار")}</button>
            <button className="tb" type="button" disabled={busy} onClick={() => { setQuestions(DEFAULT_EXAM.questions); setQuestionsAr(DEFAULT_EXAM.questionsAr || ""); setHtml(DEFAULT_EXAM.html); }}>{tx("Use the sample exam", "استخدم الاختبار النموذجي")}</button>
          </div>
        </form>
        {error && <p className="form-error">{error}</p>}
        {note && <p className="hint">{note}</p>}
      </div>
    </div>
  );
}
