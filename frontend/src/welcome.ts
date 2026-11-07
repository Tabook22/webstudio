import type { WelcomeCopy } from "./types";

/** Original welcome window. Keep this aligned with WELCOME_DEFAULTS in backend/app/main.py. */
export const WELCOME_DEFAULTS: WelcomeCopy = {
  version: "Version 1.0",
  title_en: "Web Studio",
  title_ar: "استوديو الويب",
  credit_en: "Designed by Nasser Tabook",
  credit_ar: "تصميم ناصر طابوق",
  line1_en: "A classroom for learning how to build a real website.",
  line2_en: "Design the page, write the HTML, then check and save your work.",
  line1_ar: "صف لتعلّم كيف يُبنى موقع حقيقي.",
  line2_ar: "صمّم الصفحة، واكتب HTML، ثم افحص عملك واحفظه.",
};

export function readWelcome(value: Partial<WelcomeCopy> | null | undefined): WelcomeCopy {
  const next = { ...WELCOME_DEFAULTS };
  if (!value) return next;
  (Object.keys(WELCOME_DEFAULTS) as (keyof WelcomeCopy)[]).forEach((key) => {
    const item = value[key];
    if (typeof item === "string") next[key] = item;
  });
  return next;
}
