import type { Asset, ClassHome, Kit, Lesson, MissionState, Project, ProjectSummary, TemplateInfo } from "./types";

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

async function read<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : detail;
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
  createClass: (body: { name: string; pin: string }) =>
    fetch(apiUrl("/api/classes"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<{ id: string; name: string; join_code: string; teacher_token: string }>(res),
    ),
  enterClass: (body: { join_code: string; pin: string }) =>
    fetch(apiUrl("/api/classes/enter"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<{ id: string; name: string; join_code: string; teacher_token: string }>(res),
    ),
  joinClass: (body: { join_code: string; name: string }) =>
    fetch(apiUrl("/api/classes/join"), { method: "POST", headers: headers(true, null), body: JSON.stringify(body) }).then((res) =>
      read<{ token: string; learner: { id: string; name: string }; class: { id: string; name: string; join_code: string }; lessons: Lesson[] }>(res),
    ),
  classHome: (token: string) => fetch(apiUrl("/api/classes/home"), { headers: headers(false, token) }).then((res) => read<ClassHome>(res)),
  createLesson: (token: string, body: { title: string; brief_en: string; brief_ar: string; template_id: string; site_lang: string; mission_ids: string[] }) =>
    fetch(apiUrl("/api/classes/lessons"), { method: "POST", headers: headers(true, token), body: JSON.stringify(body) }).then((res) => read<Lesson>(res)),
  removeLesson: (token: string, id: string) =>
    fetch(apiUrl(`/api/classes/lessons/${id}`), { method: "DELETE", headers: headers(false, token) }).then((res) => read(res)),
  startLesson: (id: string, siteLang: string) =>
    fetch(apiUrl(`/api/lessons/${id}/start`), { method: "POST", headers: headers(true), body: JSON.stringify({ site_lang: siteLang }) }).then((res) => read<Project>(res)),
};
