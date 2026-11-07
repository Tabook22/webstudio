export type Lang = "en" | "ar";
export type Mode = "visual" | "split" | "code";
export type Device = "desktop" | "tablet" | "phone";
export type SideTab = "blocks" | "images" | "structure" | "missions";
export type CodeTab = "css" | "js" | "console";

export type Asset = { path: string; mime: string; url: string };
export type SiteFile = { path: string; folder: boolean; content: string };

export type Project = {
  id: string;
  name: string;
  title: string;
  site_lang: Lang;
  html: string;
  css: string;
  js: string;
  created_at: number;
  updated_at: number;
  assets: Asset[];
  files?: SiteFile[];
  class_id?: string | null;
  learner_id?: string | null;
  lesson_id?: string | null;
  note?: string;
  mission?: MissionState;
};

export type ProjectSummary = {
  id: string;
  name: string;
  title: string;
  site_lang: Lang;
  lesson_id?: string | null;
  updated_at: number;
};

export type Lesson = {
  id: string;
  title: string;
  brief_en: string;
  brief_ar: string;
  template_id: string;
  site_lang: "en" | "ar" | "ask";
  mission_ids: string[];
  created_at: number;
};

export type CourseInfo = {
  id: string;
  name: string;
  join_code: string;
  course_code: string;
  section: string;
};

export type CourseRecord = CourseInfo & {
  has_exam: boolean;
  teacher_token: string;
};

export type Session =
  | {
      role: "learner";
      token: string;
      classId: string;
      className: string;
      joinCode: string;
      courseCode?: string;
      section?: string;
      name: string;
      learnerId: string;
    }
  | {
      role: "teacher";
      token: string;
      classId: string;
      className: string;
      joinCode: string;
      courseCode?: string;
      section?: string;
    };

export type ClassProject = {
  id: string;
  name: string;
  title: string;
  site_lang: Lang;
  lesson_id: string | null;
  updated_at: number;
  note: string;
  mission: { active: string | null; badges: string[] };
};

export type ClassLearner = {
  id: string;
  name: string;
  joined_at: number;
  projects: ClassProject[];
};

export type ClassHome =
  | {
      role: "teacher";
      class: CourseInfo;
      lessons: Lesson[];
      learners: ClassLearner[];
    }
  | {
      role: "learner";
      class: CourseInfo;
      learner: { id: string; name: string };
      lessons: Lesson[];
    };

export type Pair = { en: string; ar: string };

export type TemplateInfo = {
  id: string;
  name: Pair;
  desc: Pair;
  kit: string | null;
  html: string;
  html_ar: string;
  css: string;
  images: { path: string; data_url: string }[];
  rtl: boolean;
};

export type Kit = {
  id: string;
  name: Pair;
  mood: Pair;
  vars: Record<string, string>;
  css: string;
};

export type Crumb = { tag: string; path: number[] };

export type TableSelection = {
  scope: "cell" | "row" | "col" | "range";
  colspan: number;
  rowspan: number;
  cols: number;
  rows: number;
  count: number;
  col: number;
  row: number;
  width: string;
  height: string;
  align: "left" | "center" | "right";
  all: boolean;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  border: string;
  borderColor: string;
  pad: string;
  spacing: string;
  background: string;
  cellColor: string;
  cellAlign: "" | "left" | "center" | "right";
  cellValign: "" | "top" | "middle" | "bottom";
  rowHeight: string;
  colWidth: string;
};

export type Selection = {
  path: number[];
  tag: string;
  id: string;
  className: string;
  text: string;
  canEditText: boolean;
  attrs: Record<string, string>;
  style: Record<string, string>;
  crumbs: Crumb[];
  table?: TableSelection | null;
  html?: string;
  whole?: boolean;
};

export type MissionState = {
  active: string | null;
  badges: string[];
  events: string[];
};

export type ConsoleLine = { level: string; text: string };

export type ModalState =
  | null
  | { type: "new" }
  | { type: "projects" }
  | { type: "open" }
  | { type: "kits" }
  | { type: "page" }
  | { type: "paste" }
  | { type: "find"; replace?: boolean }
  | { type: "check" }
  | { type: "links" }
  | { type: "details" }
  | { type: "run" }
  | { type: "table"; path: number[] | null; tag: string }
  | { type: "mission"; id: string }
  | { type: "class" };
