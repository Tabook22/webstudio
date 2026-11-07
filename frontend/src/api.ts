import type { Asset, ClassHome, CourseRecord, Kit, Lesson, MissionState, Project, ProjectSummary, StaffAccount, TemplateInfo, WelcomeCopy } from "./types";

type ExamBody = { questions: string; questionsAr?: string; html: string };

/** Empty on the local studio. `/webstudio` when the site is published under that path. */
export function apiUrl(path: string) {
  const root = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${root}${path}`;
}

let bearer: string | null = null;
let deviceId: string | null = localStorage.getItem("webstudio:device");

function headers(json = false, auth?: string | null): Headers {
  const value = auth === undefined ? bearer : auth;
  const result = new Headers();
  if (json) result.set("Content-Type", "application/json");
  if (value) result.set("Authorization", `Bearer ${value}`);
  if (deviceId) result.set("X-Device", deviceId);
  return result;
}

function errorText(detail: unknown, fallback: string) {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((item) => item && typeof item === "object" && "msg" in item);
    if (first && typeof first.msg === "string") {
      const loc = "loc" in first && Array.isArray(first.loc) ? String(first.loc.at(-1) || "") : "";
      if (loc === "pin") return "The PIN must be 4 to 8 digits.";
      return first.msg;
    }
  }
  return fallback;
}

async function read<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = errorText((await res.json()).detail, detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  setToken(value: string | null) {
    bearer = value;
  },
  setDevice(value: string | null) {
    deviceId = value;
    if (value) localStorage.setItem("webstudio:device", value);
  },
  authHeaders: () => headers(),
  health: () => fetch(apiUrl("/api/health")).then((res) => read<{ ok: boolean }>(res)),
  templates: () => fetch(apiUrl("/api/templates")).then((res) => read<TemplateInfo[]>(res)),
  kits: () => fetch(apiUrl("/api/kits")).then((res) => read<Kit[]>(res)),
  claim: (claim: boolean) =>
    fetch(apiUrl("/api/studio/claim"), { method: "POST", headers: headers(true), body: JSON.stringify({ claim }) }).then((res) => read(res)),
  state: () =>
    fetch(apiUrl("/api/state"), { headers: headers() }).then((res) => read<{ current_project_id: string | null; mission: MissionState }>(res)),
  saveState: (body: { current_project_id?: string | null; mission?: MissionState }) =>
    fetch(apiUrl("/api/state"), { method: "PUT", headers: headers(true), body: JSON.stringify(body) }).then((res) => read(res)),
  projects: () => fetch(apiUrl("/api/projects"), { headers: headers() }).then((res) => read<ProjectSummary[]>(res)),
  project: (id: string) => fetch(apiUrl(`/api/projects/${id}`), { headers: headers() }).then((res) => read<Project>(res)),
  create: (body: { name: string; template_id: string; site_lang: string }) =>
    fetch(apiUrl("/api/projects"), { method: "POST", headers: headers(true), body: JSON.stringify(body) }).then((res) => read<Project>(res)),
  update: (id: string, body: Partial<Pick<Project, "name" | "title" | "site_lang" | "html" | "css" | "js" | "files">>) =>
    fetch(apiUrl(`/api/projects/${id}`), { method: "PUT", headers: headers(true), body: JSON.stringify(body) }).then((res) => read<Project>(res)),
  saveMission: (id: string, mission: MissionState) =>
    fetch(apiUrl(`/api/projects/${id}/mission`), { method: "PUT", headers: headers(true), body: JSON.stringify(mission) }).then((res) => read<MissionState>(res)),
  saveNote: (id: string, note: string, token: string) =>
    fetch(apiUrl(`/api/projects/${id}/note`), {
      method: "PUT",
      headers: headers(true, token),
      body: JSON.stringify({ note }),
    }).then((res) => read<{ note: string }>(res)),
  remove: (id: string) => fetch(apiUrl(`/api/projects/${id}`), { method: "DELETE", headers: headers() }).then((res) => read(res)),
  upload: async (id: string, file: File) => {
    const data = new FormData();
    data.append("file", file);
    const res = await fetch(apiUrl(`/api/projects/${id}/assets`), { method: "POST", headers: headers(), body: data });
    return read<{ path: string; mime: string; url: string }>(res);
  },
  removeAsset: (id: string, path: string) =>
    fetch(apiUrl(`/api/projects/${id}/assets/${path}`), { method: "DELETE", headers: headers() }).then((res) => read(res)),
  moveAsset: (id: string, path: string, to: string) =>
    fetch(apiUrl(`/api/projects/${id}/assets/move`), { method: "POST", headers: headers(true), body: JSON.stringify({ path, to }) }).then((res) => read<Asset>(res)),
  exportUrl: (id: string) => apiUrl(`/api/projects/${id}/export`),
  importSite: async (files: File[]) => {
    const data = new FormData();
    for (const file of files) {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      data.append("files", file, rel || file.name);
    }
    const res = await fetch(apiUrl("/api/import"), { method: "POST", headers: headers(), body: data });
    return read<Project>(res);
  },
  createClass: (body: { name: string; course_code: string; section: string; pin: string }) =>
    fetch(apiUrl("/api/classes"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<CourseRecord>(res),
    ),
  enterClass: (body: { course_code: string; section: string; pin: string }) =>
    fetch(apiUrl("/api/classes/enter"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<CourseRecord>(res),
    ),
  joinClass: (body: { course_code: string; section: string; name: string; student_id: string; pin: string }) =>
    fetch(apiUrl("/api/classes/join"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<{ token: string; learner: { id: string; name: string; student_id: string }; class: CourseRecord; lessons: Lesson[] }>(res),
    ),
  listCourses: (token: string) =>
    fetch(apiUrl("/api/admin/courses"), { headers: headers(false, token) }).then((res) => read<CourseRecord[]>(res)),
  saveCourse: (token: string, body: { name: string; course_code: string; section: string; pin: string }, id?: string) =>
    fetch(apiUrl(id ? `/api/admin/courses/${id}` : "/api/admin/courses"), {
      method: id ? "PATCH" : "POST",
      headers: headers(true, token),
      body: JSON.stringify(body),
    }).then((res) => read<CourseRecord>(res)),
  removeCourse: (token: string, id: string) =>
    fetch(apiUrl(`/api/admin/courses/${id}`), { method: "DELETE", headers: headers(false, token) }).then((res) => read(res)),
  courseExam: (token: string, id: string) =>
    fetch(apiUrl(`/api/admin/courses/${id}/exam`), { headers: headers(false, token) }).then((res) => read<{ exam: ExamBody | null }>(res)),
  saveCourseExam: (token: string, id: string, body: ExamBody) =>
    fetch(apiUrl(`/api/admin/courses/${id}/exam`), { method: "PUT", headers: headers(true, token), body: JSON.stringify(body) }).then((res) =>
      read<{ exam: ExamBody | null }>(res),
    ),
  myExam: (token: string) =>
    fetch(apiUrl("/api/classes/exam"), { headers: headers(false, token) }).then((res) => read<{ exam: ExamBody | null }>(res)),
  welcome: () => fetch(apiUrl("/api/welcome")).then((res) => read<WelcomeCopy>(res)),
  saveWelcome: (token: string, body: WelcomeCopy) =>
    fetch(apiUrl("/api/admin/welcome"), { method: "PUT", headers: headers(true, token), body: JSON.stringify(body) }).then((res) =>
      read<WelcomeCopy>(res),
    ),
  staffStatus: () => fetch(apiUrl("/api/staff/status")).then((res) => read<{ needs_setup: boolean }>(res)),
  staffSetup: (body: { username: string; password: string; display_name: string }) =>
    fetch(apiUrl("/api/staff/setup"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) => read<StaffAccount>(res)),
  staffLogin: (body: { username: string; password: string }) =>
    fetch(apiUrl("/api/staff/login"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) => read<StaffAccount>(res)),
  staffMe: (token: string) =>
    fetch(apiUrl("/api/staff/me"), { headers: headers(false, token) }).then((res) => read<StaffAccount>(res)),
  staffPassword: (token: string, body: { current_password: string; password: string }) =>
    fetch(apiUrl("/api/staff/password"), { method: "POST", headers: headers(true, token), body: JSON.stringify(body) }).then((res) => read<StaffAccount>(res)),
  staffAccounts: (token: string) =>
    fetch(apiUrl("/api/staff/accounts"), { headers: headers(false, token) }).then((res) => read<StaffAccount[]>(res)),
  staffCreate: (token: string, body: { username: string; password: string; display_name: string; role: string }) =>
    fetch(apiUrl("/api/staff/accounts"), { method: "POST", headers: headers(true, token), body: JSON.stringify(body) }).then((res) => read<StaffAccount>(res)),
  staffUpdate: (token: string, id: string, body: { display_name?: string; role?: string; active?: boolean; password?: string }) =>
    fetch(apiUrl(`/api/staff/accounts/${id}`), { method: "PATCH", headers: headers(true, token), body: JSON.stringify(body) }).then((res) => read<StaffAccount>(res)),
  classHome: (token: string) => fetch(apiUrl("/api/classes/home"), { headers: headers(false, token) }).then((res) => read<ClassHome>(res)),
  createLesson: (token: string, body: { title: string; brief_en: string; brief_ar: string; template_id: string; site_lang: string; mission_ids: string[] }) =>
    fetch(apiUrl("/api/classes/lessons"), { method: "POST", headers: headers(true, token), body: JSON.stringify(body) }).then((res) => read<Lesson>(res)),
  removeLesson: (token: string, id: string) =>
    fetch(apiUrl(`/api/classes/lessons/${id}`), { method: "DELETE", headers: headers(false, token) }).then((res) => read(res)),
  startLesson: (id: string, siteLang: string) =>
    fetch(apiUrl(`/api/lessons/${id}/start`), { method: "POST", headers: headers(true), body: JSON.stringify({ site_lang: siteLang }) }).then((res) => read<Project>(res)),
};
