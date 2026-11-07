import { toLive } from "./html";

export const EXAM_FILE = "exam.json";

export type ExamPaper = { questions: string; questionsAr?: string; html: string };

export const DEFAULT_EXAM: ExamPaper = {
  questions: `1. Type the whole page yourself in Your answer. Look at the example, then type it. Pasting is turned off.
2. Change the heading from Welcome to your own name.
3. Change the label from City to Campus.
4. Change the heading color from black to red, and its size from 24px to 32px.
5. Change the font of the page from Arial to Georgia.
6. Change the bullet list into a numbered list, and add two items so the list reads One, Two, Three, Four.
7. Make the word One in the list a link to your university website.
8. Change the first choice in the drop-down list from One to Salalah.
9. Change the background of the whole page from white to light yellow.
10. Make the picture 150 pixels wide.`,
  questionsAr: `1. اكتب الصفحة كاملة بنفسك في خانة إجابتك. انظر إلى المثال، ثم اكتبه. اللصق متوقف.
2. غيّر العنوان من Welcome إلى اسمك.
3. غيّر التسمية من City إلى Campus.
4. غيّر لون العنوان من الأسود إلى الأحمر، وحجمه من 24px إلى 32px.
5. غيّر خط الصفحة من Arial إلى Georgia.
6. حوّل القائمة المنقّطة إلى قائمة مرقّمة، وأضف عنصرين لتصبح One ثم Two ثم Three ثم Four.
7. اجعل كلمة One في القائمة رابطًا إلى موقع جامعتك.
8. غيّر الخيار الأول في القائمة المنسدلة من One إلى Salalah.
9. غيّر خلفية الصفحة كلها من الأبيض إلى الأصفر الفاتح.
10. اجعل عرض الصورة 150 بكسل.`,
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>My page</title>
  <style>
    body { background: white; color: black; font-family: Arial; }
    h1 { color: black; font-size: 24px; }
  </style>
</head>
<body>
  <header>
    <h1>Welcome</h1>
  </header>
  <p>
    <label for="place">City</label>
    <select id="place">
      <option>One</option>
      <option>Two</option>
    </select>
  </p>
  <ul>
    <li>One</li>
    <li>Two</li>
  </ul>
  <p><a href="https://example.com">A link</a></p>
  <img src="images/photo.jpg" alt="A picture" width="300">
</body>
</html>
`,
};

export function readExam(files: { path: string; folder: boolean; content: string }[] | undefined): ExamPaper | null {
  const file = (files || []).find((item) => item.path === EXAM_FILE && !item.folder);
  if (!file?.content.trim()) return null;
  try {
    const data = JSON.parse(file.content) as Partial<ExamPaper>;
    if (typeof data.questions !== "string" || typeof data.html !== "string") return null;
    if (!data.questions.trim() && !data.html.trim()) return null;
    const questionsAr = typeof data.questionsAr === "string" ? data.questionsAr : undefined;
    return { questions: data.questions, questionsAr, html: data.html };
  } catch {
    return null;
  }
}

export function examQuestions(paper: ExamPaper, lang: "en" | "ar") {
  const english = paper.questions.trim();
  const storedAr = paper.questionsAr?.trim() || "";
  const arabic = storedAr || (english === DEFAULT_EXAM.questions.trim() ? DEFAULT_EXAM.questionsAr?.trim() || "" : "");
  if (lang === "ar") {
    const text = arabic || english;
    return { text, dir: arabic || /[\u0600-\u06FF]/.test(text) ? "rtl" as const : "ltr" as const };
  }
  return { text: english || arabic, dir: "ltr" as const };
}

export function examPreview(text: string, projectId: string) {
  const live = toLive(text, projectId);
  if (/<html[\s>]/i.test(live)) return live;
  if (/<body[\s>]/i.test(live)) return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>${live}</html>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${live}</body></html>`;
}
