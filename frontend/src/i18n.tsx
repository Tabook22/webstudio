import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "./types";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tx: (en: string, ar: string) => string;
};

const Ctx = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  tx: (en) => en,
});

function initialLang(): Lang {
  const saved = localStorage.getItem("webstudio:lang");
  if (saved === "ar" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("webstudio:lang", lang);
    if (!document.title.includes("·")) document.title = lang === "ar" ? "استوديو الويب" : "Web Studio";
  }, [lang]);
  const tx = (en: string, ar: string) => (lang === "ar" ? ar : en);
  return <Ctx.Provider value={{ lang, setLang, tx }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

const ERRORS: Record<string, string> = {
  "Request failed": "تعذر تنفيذ الطلب",
  "Upload failed": "تعذر رفع الصورة",
  "Export failed": "تعذر التنزيل",
  "Choose how to open the studio": "اختر طريقة فتح الاستوديو",
  "Sign in to the class again": "سجّل الدخول إلى الصف مرة أخرى",
  "That website is not in your class": "هذا الموقع ليس في صفك",
  "Website not found": "الموقع غير موجود",
  "Join the class to open this website": "انضم إلى الصف لفتح هذا الموقع",
  "That website belongs to another student": "هذا الموقع لطالب آخر",
  "Open the studio on this computer first": "افتح الاستوديو على هذا الحاسوب أولًا",
  "Language must be en or ar": "اللغة يجب أن تكون العربية أو الإنجليزية",
  "This page is too large to store": "هذه الصفحة أكبر من أن تُحفظ",
  "This browser needs an id": "هذا المتصفح يحتاج إلى معرّف",
  "Mission progress belongs to the student": "تقدم المهام خاص بالطالب",
  "Only the lecturer can leave a note": "المحاضر فقط يمكنه كتابة ملاحظة",
  "Image not found": "الصورة غير موجودة",
  "That ZIP could not be read": "تعذر قراءة ملف ZIP",
  "Only the lecturer can do that": "هذا الإجراء للمحاضر فقط",
  "Join the class as a student to start a lesson": "انضم إلى الصف كطالب لتبدأ الدرس",
  "The PIN must be 4 to 8 digits.": "الرقم السري من 4 إلى 8 أرقام.",
  "Give the class a name.": "اكتب اسمًا للصف.",
  "Give the course a title.": "اكتب عنوان المقرر.",
  "The course code uses letters and numbers, up to 16.": "رمز المقرر حروف وأرقام، وبحد أقصى 16.",
  "The section is a number such as 1, 2, or 3.": "الشعبة رقم مثل 1 أو 2 أو 3.",
  "That course code already has this section. Use another section.": "رمز المقرر مستخدم لهذه الشعبة. اختر شعبة أخرى.",
  "That class code or PIN is not right.": "رمز الصف أو الرقم السري غير صحيح.",
  "That course code, section, or PIN is not right.": "رمز المقرر أو الشعبة أو الرقم السري غير صحيح.",
  "Type your name so the lecturer can see it.": "اكتب اسمك ليراه المحاضر.",
  "Type the course code.": "اكتب رمز المقرر.",
  "Choose your course.": "اختر مقررك.",
  "No course is open yet. Ask your lecturer.": "لا يوجد مقرر مفتوح بعد. اسأل المحاضر.",
  "No course is open yet.": "لا يوجد مقرر مفتوح بعد.",
  "Type the section number.": "اكتب رقم الشعبة.",
  "Type your student ID.": "اكتب رقمك الجامعي.",
  "Fill in every box, then press Enter class.": "املأ كل الخانات، ثم اضغط ادخل إلى الصف.",
  "The student ID uses letters and numbers, from 2 to 32.": "الرقم الجامعي حروف وأرقام، من 2 إلى 32.",
  "That student ID is saved with a different name.": "هذا الرقم الجامعي محفوظ باسم مختلف.",
  "No class uses that code.": "لا يوجد صف بهذا الرمز.",
  "No class uses that code and section.": "لا يوجد صف بهذا الرمز وهذه الشعبة.",
  "That course was not found.": "المقرر غير موجود.",
  "Write the questions and the example page.": "اكتب الأسئلة وصفحة المثال.",
  "That exam is too long.": "هذا الاختبار أطول من الحد المسموح.",
  "The username needs at least 3 characters.": "اسم المستخدم يحتاج 3 أحرف على الأقل.",
  "The username uses letters, numbers, dots, or dashes.": "اسم المستخدم حروف وأرقام ونقاط أو شرطات.",
  "The password needs 8 to 80 characters.": "كلمة المرور من 8 إلى 80 حرفًا.",
  "That username or password is not right.": "اسم المستخدم أو كلمة المرور غير صحيح.",
  "That username is already used.": "اسم المستخدم مستخدم من قبل.",
  "Choose admin or coordinator.": "اختر مديرًا أو منسق مقرر.",
  "The admin account cannot be turned off.": "لا يمكن إيقاف حساب المدير الوحيد.",
  "The current password is not right.": "كلمة المرور الحالية غير صحيحة.",
  "The name is too long.": "الاسم أطول من الحد المسموح.",
  "That account was not found.": "الحساب غير موجود.",
  "You cannot turn off the account you are using.": "لا يمكنك إيقاف الحساب الذي تستخدمه الآن.",
  "Sign in as a coordinator or admin.": "سجّل الدخول كمنسق مقرر أو مدير.",
  "Only an admin can do that.": "هذا الإجراء للمدير فقط.",
  "One of the welcome lines is too long.": "أحد أسطر نافذة الترحيب أطول من الحد المسموح.",
  "Give the lesson a title.": "اكتب عنوانًا للدرس.",
  "Language must be English, Arabic, or the student's choice.": "اللغة يجب أن تكون الإنجليزية أو العربية أو اختيار الطالب.",
  "Choose at least one mission.": "اختر مهمة واحدة على الأقل.",
  "That lesson is not in this class.": "هذا الدرس ليس في هذا الصف.",
  "That lesson is not in your class.": "هذا الدرس ليس في صفك.",
  "Only PNG, JPEG, GIF, WebP and SVG images can be stored.": "يمكن حفظ صور PNG و JPEG و GIF و WebP و SVG فقط.",
  "That image is larger than 6 MB.": "هذه الصورة أكبر من 6 ميغابايت.",
  "Choose a ZIP, an HTML file, or a folder.": "اختر ملف ZIP أو HTML أو مجلدًا.",
  "No HTML file was found.": "لم يُعثر على ملف HTML.",
};

export function localizeError(message: string, lang: Lang) {
  if (lang !== "ar") return message;
  return ERRORS[message] || message;
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="seg lang-switch" role="group" aria-label={lang === "ar" ? "اللغة" : "Language"}>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
      <button type="button" aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>العربية</button>
    </div>
  );
}
