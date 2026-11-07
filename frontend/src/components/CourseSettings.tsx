import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { DEFAULT_EXAM } from "../editor/exam";
import { localizeError, useI18n } from "../i18n";
import type { Studio } from "../studio";
import type { CourseRecord } from "../types";

const empty = { name: "", course_code: "", section: "1", pin: "" };

export function CourseSettings({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const token = studio.staff?.token || "";
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
      ? { name: course.name, course_code: course.course_code, section: course.section, pin: course.pin || "" }
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
    setForm({ name: course.name, course_code: course.course_code, section: course.section, pin: course.pin || "" });
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

  function clearPaper() {
    setQuestions("");
    setQuestionsAr("");
    setHtml("");
    setNote("");
    setError("");
  }

  function startBlank() {
    setSelected("");
    setForm(empty);
    clearPaper();
  }

  function startNew() {
    const numbers = courses
      .filter((item) => item.course_code === form.course_code.trim().toUpperCase())
      .map((item) => Number(item.section))
      .filter((item) => Number.isFinite(item));
    const next = numbers.length ? String(Math.max(...numbers) + 1) : "1";
    setSelected("");
    setForm({ name: form.name, course_code: form.course_code, section: next, pin: "" });
    clearPaper();
  }

  function draft() {
    const code = form.course_code.trim().toUpperCase();
    const section = String(Number.parseInt(form.section, 10) || form.section.trim());
    const open = courses.find((item) => item.id === selected) || null;
    const adding = !open || (open.course_code === code && open.section !== section);
    return { code, section, open, adding };
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const data = new FormData(event.currentTarget);
    const body = {
      name: String(data.get("name") || ""),
      course_code: String(data.get("course_code") || ""),
      section: String(data.get("section") || ""),
      pin: String(data.get("pin") || ""),
    };
    const code = body.course_code.trim().toUpperCase();
    const section = String(Number.parseInt(body.section, 10) || body.section.trim());
    const open = courses.find((item) => item.id === selected) || null;
    const adding = !open || (open.course_code === code && open.section !== section);
    setBusy(true);
    setError("");
    setNote("");
    try {
      const saved = await api.saveCourse(token, body, adding ? undefined : selected);
      await load(saved.id);
      setNote(adding
        ? tx("Section added. Students use this course code, this section, and this PIN.", "تمت إضافة الشعبة. يستخدم الطلاب رمز المقرر وهذه الشعبة وهذا الرقم السري.")
        : tx("Section saved.", "تم حفظ الشعبة."));
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

  const { code: typedCode, open: current, adding } = draft();
  const sameCode = courses.filter((item) => item.course_code === typedCode);
  const groups = [...courses.reduce((map, course) => {
    const list = map.get(course.course_code) || [];
    list.push(course);
    map.set(course.course_code, list);
    return map;
  }, new Map<string, CourseRecord[]>())];

  return (
    <div className="course-settings">
      <div className="course-side">
        <div className="form-actions">
          <button type="button" className="tb" onClick={startBlank}>{tx("New course", "مقرر جديد")}</button>
          <button type="button" className="tb" onClick={startNew}>{tx("Add a section", "إضافة شعبة")}</button>
        </div>
        <ul className="course-list">
          {groups.map(([code, items]) => (
            <li key={code}>
              <p className="course-group" dir="ltr">{code}</p>
              <ul>
                {items.map((course) => (
                  <li key={course.id}>
                    <button type="button" aria-pressed={course.id === selected} onClick={() => void pick(course)}>
                      <strong dir="auto">{course.name}</strong>
                      <span>{tx("Section", "الشعبة")} {course.section}</span>
                      {course.has_exam && <em>{tx("Exam", "اختبار")}</em>}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {courses.length === 0 && <p className="hint">{tx("Create the first course on the right.", "أنشئ المقرر الأول من النموذج.")}</p>}
      </div>
      <div className="course-editor">
        <form className="stack-form" onSubmit={(event) => void saveCourse(event)}>
          <p className="hint">{tx("The same title and the same course code can be used for many sections. Each section has its own PIN, its own students, and its own exam. A different title or a different code is a different course.", "العنوان نفسه ورمز المقرر نفسه يمكن استخدامهما لعدة شعب. لكل شعبة رقمها السري وطلابها واختبارها. العنوان المختلف أو الرمز المختلف مقرر مختلف.")}</p>
          {sameCode.length > 0 && <p className="hint" dir="ltr">{typedCode} · {sameCode.map((item) => item.section).join(", ")}</p>}
          {adding && current && <p className="hint">{tx("This adds a new section. The section you selected stays as it is.", "هذا يضيف شعبة جديدة. الشعبة التي حددتها تبقى كما هي.")}</p>}
          <label>{tx("Course title", "عنوان المقرر")}<input name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} dir="auto" /></label>
          <div className="form-row">
            <label>{tx("Course code", "رمز المقرر")}<input name="course_code" dir="ltr" value={form.course_code} onChange={(event) => setForm({ ...form, course_code: event.target.value.toUpperCase() })} placeholder="CMPS100A" /></label>
            <label>{tx("Section", "الشعبة")}<input name="section" dir="ltr" inputMode="numeric" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} /></label>
          </div>
          <label>{tx(adding ? "PIN for this section" : "Section PIN", adding ? "الرقم السري لهذه الشعبة" : "الرقم السري للشعبة")}<input name="pin" dir="ltr" inputMode="numeric" value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} autoComplete="off" /></label>
          {!adding && current && !current.pin && <p className="hint">{tx("This section was saved before its PIN could be shown. Type the PIN and save, and it will stay in this box.", "حُفظت هذه الشعبة قبل أن يظهر رقمها السري. اكتب الرقم واحفظه، وسيبقى في هذا المربع.")}</p>}
          {!adding && current?.pin && <p className="hint">{tx("Students and the lecturer type these digits. Change them and save to replace the PIN. Clear the box and save to keep it.", "يكتب الطلاب والمحاضر هذه الأرقام. غيّرها واحفظ لاستبدال الرقم السري. امسح المربع واحفظ للإبقاء عليه.")}</p>}
          <div className="form-actions">
            <button className="tb primary" type="submit" disabled={busy}>{adding ? tx("Add this section", "أضف هذه الشعبة") : tx("Save this section", "احفظ هذه الشعبة")}</button>
            {selected && <button className="tb" type="button" disabled={busy} onClick={() => { const course = courses.find((item) => item.id === selected); if (course) studio.openSection(course); }}>{tx("Open this section", "افتح هذه الشعبة")}</button>}
            {selected && <button className="tb danger" type="button" disabled={busy} onClick={() => void remove()}>{tx("Remove", "حذف")}</button>}
          </div>
        </form>
        <form className="stack-form exam-fields" onSubmit={(event) => { event.preventDefault(); void saveExam(); }}>
          <h3>{tx("Exam for this section", "اختبار هذه الشعبة")}</h3>
          {adding ? (
            <p className="hint">{tx("Add the section first. Then write the exam that belongs only to it.", "أضف الشعبة أولًا. ثم اكتب الاختبار الذي يخصها وحدها.")}</p>
          ) : (
            <p className="hint">{tx("Students in this section see these questions and this example when they open HTML exam. Another section can have a different exam.", "يرى طلاب هذه الشعبة هذه الأسئلة وهذا المثال عندما يفتحون اختبار HTML. يمكن أن يكون لشعبة أخرى اختبار مختلف.")}</p>
          )}
          <label>{tx("Questions in English", "الأسئلة بالإنجليزية")}<textarea rows={5} value={questions} onChange={(event) => setQuestions(event.target.value)} /></label>
          <label>{tx("Questions in Arabic", "الأسئلة بالعربية")}<textarea rows={5} dir="rtl" value={questionsAr} onChange={(event) => setQuestionsAr(event.target.value)} /></label>
          <label>{tx("Example HTML", "مثال HTML")}<textarea rows={8} dir="ltr" spellCheck={false} value={html} onChange={(event) => setHtml(event.target.value)} /></label>
          <div className="form-actions">
            <button className="tb primary" type="submit" disabled={busy || adding || !selected}>{tx("Save exam", "حفظ الاختبار")}</button>
            <button className="tb" type="button" disabled={busy} onClick={() => { setQuestions(DEFAULT_EXAM.questions); setQuestionsAr(DEFAULT_EXAM.questionsAr || ""); setHtml(DEFAULT_EXAM.html); }}>{tx("Use the sample exam", "استخدم الاختبار النموذجي")}</button>
          </div>
        </form>
        {error && <p className="form-error">{error}</p>}
        {note && <p className="hint">{note}</p>}
      </div>
    </div>
  );
}
