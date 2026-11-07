import type { Session } from "./types";

const KEY = "webstudio:session";

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Session;
    if (!data || (data.role !== "learner" && data.role !== "teacher") || !data.token) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (!session) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(session));
}

export function deviceId() {
  return localStorage.getItem("webstudio:device");
}

export function ensureDevice() {
  let id = localStorage.getItem("webstudio:device");
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    localStorage.setItem("webstudio:device", id);
  }
  return id;
}
