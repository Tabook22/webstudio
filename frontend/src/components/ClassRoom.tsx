import { useEffect, useState } from "react";
import { api } from "../api";
import { MISSIONS } from "../editor/learn";
import { LangSwitch, localizeError, useI18n } from "../i18n";
import type { Studio } from "../studio";
import type { ClassHome, Lesson, WelcomeCopy } from "../types";
import { WELCOME_DEFAULTS, readWelcome } from "../welcome";
import { StaffSignIn } from "./AdminDesk";

export function StudioGate({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const [welcome, setWelcome] = useState(true);
  return (
    <div className="gate">
      {welcome && <WelcomeSplash onContinue={() => setWelcome(false)} />}
      <div className="gate-card">
        <div className="gate-top">
          <span className="mark" aria-hidden="true" />
          <LangSwitch />
        </div>
        <h1>{tx("Web Studio", "استوديو الويب")}</h1>
        <p>{tx("Build a real website by dragging parts onto the page, then style them and see the code.", "ابنِ موقعًا حقيقيًا بسحب الأجزاء إلى الصفحة، ثم نسّقها وشاهد الكود.")}</p>
        <ol className="welcome-steps">
          <li><strong>1</strong><span>{tx("Add a banner, text, and pictures", "أضف واجهة ونصًا وصورًا")}</span></li>
          <li><strong>2</strong><span>{tx("Paint colours, fonts, and layout", "لوّن الخطوط والألوان والتخطيط")}</span></li>
          <li><strong>3</strong><span>{tx("Check it, preview it, and download it", "افحصه، عاينه، ثم نزّله")}</span></li>
        </ol>
        <button type="button" className="tb help-open" onClick={() => studio.setModal({ type: "help" })}>{tx("Open the guide", "افتح الدليل")}</button>
        <ClassForms studio={studio} gate />
      </div>
    </div>
  );
}

function WelcomeSplash({ onContinue }: { onContinue: () => void }) {
  const { tx } = useI18n();
  const [copy, setCopy] = useState<WelcomeCopy | null>(null);

  useEffect(() => {
    let gone = false;
    const timer = window.setTimeout(() => {
      if (!gone) setCopy((current) => current || WELCOME_DEFAULTS);
    }, 1500);
    api.welcome()
      .then((next) => {
        if (!gone) setCopy(readWelcome(next));
      })
      .catch(() => {
        if (!gone) setCopy(WELCOME_DEFAULTS);
      });
    return () => {
      gone = true;
      window.clearTimeout(timer);
    };
  }, []);

  const text = copy || WELCOME_DEFAULTS;
  const englishPurpose = [text.line1_en, text.line2_en].filter(Boolean);
  const arabicPurpose = [text.line1_ar, text.line2_ar].filter(Boolean);

  return (
    <div className="splash-back">
      <div className="splash" role="dialog" aria-modal="true" aria-labelledby="splash-title">
        <div className="splash-top">
          <span className="mark" aria-hidden="true" />
          <LangSwitch />
        </div>
        <div className={copy ? undefined : "splash-pending"}>
          {text.version && <p className="splash-version" dir="ltr">{text.version}</p>}
          <h1 id="splash-title" dir="ltr">{text.title_en}</h1>
          {text.title_ar && <p className="splash-name" dir="rtl">{text.title_ar}</p>}
          {text.credit_en && <p className="splash-by" dir="ltr">{text.credit_en}</p>}
          {text.credit_ar && <p className="splash-by" dir="rtl">{text.credit_ar}</p>}
          {englishPurpose.length > 0 && (
            <div className="splash-purpose" dir="ltr">
              {englishPurpose.map((line, index) => <p key={index}>{line}</p>)}
            </div>
          )}
          {arabicPurpose.length > 0 && (
            <div className="splash-purpose" dir="rtl">
              {arabicPurpose.map((line, index) => <p key={index}>{line}</p>)}
            </div>
          )}
        </div>
        <button type="button" className="tb primary" autoFocus onClick={onContinue}>{tx("Continue", "متابعة")}</button>
      </div>
    </div>
  );
}

export function ClassDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const close = () => studio.setModal(null);
  return (
    <div className="modal-back" onMouseDown={close}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={tx("Classroom", "الصف الدراسي")} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{studio.session ? studio.session.className : tx("Classroom", "الصف الدراسي")}</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label={tx("Close", "إغلاق")}>×</button>
        </header>
        <div className="modal-body">
          {studio.session?.role === "teacher" && <TeacherBoard studio={studio} />}
          {studio.session?.role === "learner" && <LearnerLessons studio={studio} />}
          {!studio.session && <ClassForms studio={studio} />}
        </div>
      </div>
    </div>
  );
}

function ClassForms({ studio, gate }: { studio: Studio; gate?: boolean }) {
  const { tx, lang } = useI18n();
  const [who, setWho] = useState<"student" | "teacher" | "staff">("student");
  const [courses, setCourses] = useState<{ id: string; name: string; course_code: string; section: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [openPin, setOpenPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let gone = false;
    api.courseChoices()
      .then((list) => {
        if (!gone) setCourses(list);
      })
      .catch(() => {
        if (!gone) setCourses([]);
      });
    return () => {
      gone = true;
    };
  }, []);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="class-forms">
      <div className="seg" role="tablist">
        <button type="button" aria-selected={who === "student"} onClick={() => setWho("student")}>{tx("I'm a student", "أنا طالب")}</button>
        <button type="button" aria-selected={who === "teacher"} onClick={() => setWho("teacher")}>{tx("I'm the lecturer", "أنا المحاضر")}</button>
        <button type="button" aria-selected={who === "staff"} onClick={() => setWho("staff")}>{tx("Coordinator", "منسق المقرر")}</button>
      </div>
      {who === "student" ? (
        <form className="stack-form" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const text = (key: string) => String(data.get(key) || "");
          const picked = courses.find((item) => item.id === text("course_id"));
          if (!picked) {
            setError(localizeError(courses.length ? "Choose your course." : "No course is open yet. Ask your lecturer.", lang));
            return;
          }
          void run(() => studio.joinClass(picked.course_code, picked.section, text("name"), text("pin"), text("student_id")));
        }}>
          <p className="hint">{tx("Choose your course from the list, then enter your student ID, your name, and the PIN for that section. Each section is listed on its own, even when the title and the code are the same.", "اختر مقررك من القائمة، ثم أدخل رقمك الجامعي واسمك والرقم السري لتلك الشعبة. كل شعبة تظهر وحدها، حتى عندما يتطابق العنوان والرمز.")}</p>
          <label>{tx("Your course", "مقررك")}
            <select name="course_id" dir="ltr" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">{courses.length ? tx("Choose your course", "اختر مقررك") : tx("No course is open yet", "لا يوجد مقرر مفتوح بعد")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {`${course.course_code} · ${tx("Section", "الشعبة")} ${course.section} — ${course.name}`}
                </option>
              ))}
            </select>
          </label>
          <label>{tx("Student ID", "الرقم الجامعي")}<input name="student_id" dir="ltr" value={studentId} onChange={(event) => setStudentId(event.target.value.toUpperCase())} autoComplete="off" /></label>
          <label>{tx("Your name", "اسمك")}<input name="name" value={name} onChange={(event) => setName(event.target.value)} dir="auto" autoComplete="name" /></label>
          <label>{tx("PIN from your instructor", "الرقم السري من المحاضر")}<input name="pin" dir="ltr" inputMode="numeric" type="password" value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="off" /></label>
          <button className="tb primary" type="submit" disabled={busy}>{tx("Start learning HTML", "ابدأ تعلّم HTML")}</button>
        </form>
      ) : who === "teacher" ? (
        <form className="stack-form" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const text = (key: string) => String(data.get(key) || "");
          const picked = courses.find((item) => item.id === text("course_id"));
          if (!picked) {
            setError(localizeError(courses.length ? "Choose your course." : "No course is open yet.", lang));
            return;
          }
          void run(() => studio.enterAsTeacher(picked.course_code, picked.section, text("pin")));
        }}>
          <p className="hint">{tx("Choose a section from the list, then enter its 4 to 8 digit PIN. Another section of the same course has a different PIN and a different exam.", "اختر شعبة من القائمة، ثم أدخل رقمها السري من 4 إلى 8 أرقام. الشعبة الأخرى من المقرر نفسه لها رقم سري مختلف واختبار مختلف.")}</p>
          <label>{tx("Your course", "مقررك")}
            <select name="course_id" dir="ltr" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">{courses.length ? tx("Choose your course", "اختر مقررك") : tx("No course is open yet", "لا يوجد مقرر مفتوح بعد")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {`${course.course_code} · ${tx("Section", "الشعبة")} ${course.section} — ${course.name}`}
                </option>
              ))}
            </select>
          </label>
          <label>{tx("Section PIN", "الرقم السري للشعبة")}<input name="pin" dir="ltr" inputMode="numeric" type="password" value={openPin} onChange={(event) => setOpenPin(event.target.value)} autoComplete="off" /></label>
          <button className="tb primary" type="submit" disabled={busy}>{tx("Open lecturer view", "افتح لوحة المحاضر")}</button>
        </form>
      ) : studio.staff ? (
        <div className="stack-form">
          <p className="hint">{tx(`Signed in as ${studio.staff.displayName}.`, `تم الدخول باسم ${studio.staff.displayName}.`)}</p>
          <button className="tb primary" type="button" disabled={busy} onClick={() => void run(async () => { studio.setModal({ type: "admin" }); if (gate) await studio.enterThisComputer(); })}>{tx("Open course settings", "افتح إعدادات المقررات")}</button>
          <button className="tb" type="button" onClick={studio.signOutStaff}>{tx("Sign out", "تسجيل الخروج")}</button>
        </div>
      ) : (
        <StaffSignIn studio={studio} />
      )}
      {error && <p className="form-error">{error}</p>}
      {gate && (
        <button type="button" className="text-btn" disabled={busy} onClick={() => void run(() => studio.enterThisComputer())}>
          {tx("Continue the websites on this computer", "تابع المواقع على هذا الحاسوب")}
        </button>
      )}
    </div>
  );
}

function LearnerLessons({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const [home, setHome] = useState<Extract<ClassHome, { role: "learner" }> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let gone = false;
    studio.loadClass().then((data) => {
      if (!gone && data?.role === "learner") setHome(data);
    }).catch((err) => {
      if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    });
    return () => { gone = true; };
    // The board loads once when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lessons = home?.lessons || studio.lessons;
  return (
    <div className="lesson-list">
      <p className="hint">{tx("Start the lesson your lecturer published. Your page is saved with your name.", "ابدأ الدرس الذي نشره المحاضر. تُحفظ صفحتك مع اسمك.")}</p>
      {error && <p className="form-error">{error}</p>}
      {lessons.length === 0 && <p className="hint">{tx("No lesson yet. You can still make a new website.", "لا يوجد درس بعد. يمكنك إنشاء موقع جديد.")}</p>}
      {lessons.map((lesson) => <LessonCard key={lesson.id} studio={studio} lesson={lesson} />)}
      <button type="button" className="text-btn" onClick={() => void studio.leaveClass()}>{tx("Leave class", "مغادرة الصف")} · <span dir="ltr">{studio.session?.courseCode || studio.session?.joinCode} · {studio.session?.section}</span></button>
    </div>
  );
}

export function LessonCard({ studio, lesson }: { studio: Studio; lesson: Lesson }) {
  const { tx, lang } = useI18n();
  const [siteLang, setSiteLang] = useState<"en" | "ar">(lang);
  const started = studio.projects.some((item) => item.lesson_id === lesson.id);
  const brief = lang === "ar" && lesson.brief_ar ? lesson.brief_ar : lesson.brief_en;
  const missions = MISSIONS.filter((item) => lesson.mission_ids.includes(item.id));
  return (
    <article className="lesson-card">
      <header>
        <strong dir="auto">{lesson.title}</strong>
        <span>{started ? tx("Started", "بدأ") : tx("New", "جديد")}</span>
      </header>
      {brief && <p dir="auto">{brief}</p>}
      <div className="badge-row">
        {missions.map((item) => <span key={item.id} className="chip">{item.title[lang === "ar" ? 1 : 0]}</span>)}
      </div>
      {lesson.site_lang === "ask" && (
        <label className="stack">{tx("Website language", "لغة الموقع")}
          <select value={siteLang} onChange={(event) => setSiteLang(event.target.value as "en" | "ar")}>
            <option value="en">{tx("English", "الإنجليزية")}</option>
            <option value="ar">{tx("Arabic", "العربية")}</option>
          </select>
        </label>
      )}
      <button type="button" className="tb primary" onClick={() => void studio.startLesson(lesson.id, lesson.site_lang === "ar" ? "ar" : lesson.site_lang === "en" ? "en" : siteLang)}>
        {started ? tx("Continue", "متابعة") : tx("Start lesson", "ابدأ الدرس")}
      </button>
    </article>
  );
}

function TeacherBoard({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const [home, setHome] = useState<Extract<ClassHome, { role: "teacher" }> | null>(null);
  const [error, setError] = useState("");
  const [openForm, setOpenForm] = useState(false);

  function reload() {
    return studio.loadClass().then((data) => {
      if (data?.role === "teacher") setHome(data);
    });
  }

  useEffect(() => {
    let gone = false;
    reload().catch((err) => {
      if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    });
    return () => { gone = true; };
    // Loaded once when the board opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="board">
      <div className="join-code course">
        <span>{tx("Students join this section with", "ينضم الطلاب إلى هذه الشعبة بـ")}</span>
        <strong dir="ltr">{studio.session?.courseCode || studio.session?.joinCode} · {studio.session?.section || "1"}</strong>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="board-head">
        <h3>{tx("Lessons", "الدروس")}</h3>
        <button type="button" className="tb" onClick={() => setOpenForm((value) => !value)}>{tx("New lesson", "درس جديد")}</button>
      </div>
      {openForm && <LessonForm studio={studio} onDone={() => { setOpenForm(false); void reload(); }} />}
      <div className="lesson-list">
        {(home?.lessons || []).map((lesson) => (
          <article key={lesson.id} className="lesson-card">
            <header>
              <strong dir="auto">{lesson.title}</strong>
              <button type="button" className="text-btn" onClick={() => void studio.removeLesson(lesson.id).then(() => reload())}>{tx("Remove", "حذف")}</button>
            </header>
            <p dir="auto">{lang === "ar" && lesson.brief_ar ? lesson.brief_ar : lesson.brief_en}</p>
          </article>
        ))}
        {home && home.lessons.length === 0 && <p className="hint">{tx("Publish a lesson and students can start from it.", "انشر درسًا ليبدأ الطلاب منه.")}</p>}
      </div>
      <div className="board-head">
        <h3>{tx("Students", "الطلاب")}</h3>
        <button type="button" className="tb" onClick={() => void reload()}>{tx("Refresh", "تحديث")}</button>
      </div>
      <div className="roster">
        {home && home.learners.length === 0 && <p className="hint">{tx("Nobody has joined yet.", "لم ينضم أحد بعد.")}</p>}
        {home?.learners.map((learner) => (
          <section key={learner.id} className="roster-row">
            <strong dir="auto">{learner.name}{learner.student_id ? ` · ${learner.student_id}` : ""}</strong>
            {learner.projects.length === 0 && <small>{tx("No page yet", "لا توجد صفحة بعد")}</small>}
            {learner.projects.map((item) => {
              const mission = MISSIONS.find((mission) => mission.id === item.mission.active);
              return (
                <div key={item.id} className="roster-project">
                  <div>
                    <b dir="auto">{item.name}</b>
                    <small>
                      {mission ? mission.title[lang === "ar" ? 1 : 0] : tx("No mission", "بلا مهمة")}
                      {" · "}
                      {item.mission.badges.length} {tx("badges", "أوسمة")}
                      {" · "}
                      {new Date(item.updated_at).toLocaleString(lang === "ar" ? "ar" : "en")}
                    </small>
                  </div>
                  <button type="button" className="tb" onClick={() => void studio.openStudent(item.id, learner.name)}>{tx("Open", "فتح")}</button>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <button type="button" className="text-btn" onClick={() => void studio.leaveClass()}>{tx("Sign out of the lecturer view", "الخروج من لوحة المحاضر")}</button>
    </div>
  );
}

function LessonForm({ studio, onDone }: { studio: Studio; onDone: () => void }) {
  const { tx, lang } = useI18n();
  const [title, setTitle] = useState(tx("Today's page", "صفحة اليوم"));
  const [briefEn, setBriefEn] = useState("");
  const [briefAr, setBriefAr] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [siteLang, setSiteLang] = useState<"en" | "ar" | "ask">("ask");
  const [missions, setMissions] = useState<string[]>(["first-page"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setMissions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <form className="lesson-form" onSubmit={(event) => {
      event.preventDefault();
      setBusy(true);
      setError("");
      void studio.publishLesson({ title, brief_en: briefEn, brief_ar: briefAr, template_id: templateId, site_lang: siteLang, mission_ids: missions })
        .then(() => onDone())
        .catch((err) => setError(localizeError(err instanceof Error ? err.message : "Request failed", lang)))
        .finally(() => setBusy(false));
    }}>
      <label>{tx("Title", "العنوان")}<input value={title} onChange={(event) => setTitle(event.target.value)} dir="auto" /></label>
      <label>{tx("Brief in English", "التعليمات بالإنجليزية")}<textarea rows={2} value={briefEn} onChange={(event) => setBriefEn(event.target.value)} /></label>
      <label>{tx("Brief in Arabic", "التعليمات بالعربية")}<textarea rows={2} dir="rtl" value={briefAr} onChange={(event) => setBriefAr(event.target.value)} /></label>
      <div className="form-row">
        <label>{tx("Starting template", "قالب البداية")}
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {studio.templates.map((item) => <option key={item.id} value={item.id}>{item.name[lang]}</option>)}
          </select>
        </label>
        <label>{tx("Website language", "لغة الموقع")}
          <select value={siteLang} onChange={(event) => setSiteLang(event.target.value as "en" | "ar" | "ask")}>
            <option value="ask">{tx("Student chooses", "الطالب يختار")}</option>
            <option value="en">{tx("English", "الإنجليزية")}</option>
            <option value="ar">{tx("Arabic", "العربية")}</option>
          </select>
        </label>
      </div>
      <div className="mission-picks">
        {MISSIONS.map((item) => (
          <label key={item.id} className="check">
            <input type="checkbox" checked={missions.includes(item.id)} onChange={() => toggle(item.id)} />
            {item.title[lang === "ar" ? 1 : 0]}
          </label>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="tb primary" type="submit" disabled={busy}>{tx("Publish lesson", "انشر الدرس")}</button>
    </form>
  );
}
