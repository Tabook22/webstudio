import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { BLOCKS, blockById, blockMarkup, tableHtml } from "./editor/blocks";
import { buildSrcDoc } from "./editor/bridge";
import {
  FX_CSS,
  applyKitCss,
  editorCss,
  editorHtml,
  ensureCss,
  ensureFontImport,
  folderDocument,
  mergeScripts,
  previewDocument,
  prettyHtml,
  setPageLayer,
  toStored,
} from "./editor/html";
import { MISSIONS, missionContext, passes } from "./editor/learn";
import { localizeError } from "./i18n";
import { deviceId, ensureDevice, readSession, writeSession } from "./session";
import type { Asset, ClassHome, CodeTab, ConsoleLine, Device, Kit, Lesson, MissionState, ModalState, Mode, Project, ProjectSummary, Selection, Session, SideTab, SiteFile, TemplateInfo } from "./types";

type Snap = { html: string; css: string; js: string; files?: SiteFile[]; page?: string };

function isPageFile(path: string) {
  const name = path.toLowerCase();
  return name === "index.html" || name.endsWith(".html") || name.endsWith(".htm");
}

function pageBody(project: Project, path: string) {
  if (!path) return "";
  if (path === "index.html") return project.html;
  return (project.files || []).find((file) => file.path === path && !file.folder)?.content || "";
}

function writePage(project: Project, path: string, html: string): Project {
  if (!path) return project;
  if (path === "index.html") return { ...project, html };
  return { ...project, files: (project.files || []).map((file) => (file.path === path ? { ...file, content: html } : file)) };
}

function shiftPath(path: string, from: string, to: string) {
  if (!path) return path;
  if (path === from) return to;
  if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  return path;
}

function replacePath(text: string, from: string, to: string) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(^|[^\\w./-])${escaped}(?=$|[^\\w./-])`, "g"), `$1${to}`);
}

function listPages(project: Project | null) {
  const extras = (project?.files || []).filter((file) => !file.folder && isPageFile(file.path) && file.path !== "index.html").map((file) => file.path);
  extras.sort((a, b) => a.localeCompare(b));
  return ["index.html", ...extras];
}

const emptyMission = (): MissionState => ({ active: null, badges: [], events: [] });

function filesKey(files: SiteFile[] | undefined) {
  return (files || []).map((file) => `${file.path}\u0000${file.folder ? "1" : "0"}\u0000${file.content}`).join("\n");
}

function missionOf(project: Project | null): MissionState {
  return {
    active: project?.mission?.active ?? null,
    badges: project?.mission?.badges ?? [],
    events: project?.mission?.events ?? [],
  };
}

type Boot = {
  project: Project | null;
  projects: ProjectSummary[];
  templates: TemplateInfo[];
  kits: Kit[];
  mission: MissionState;
  lessons: Lesson[];
  session: Session | null;
};

let bootPromise: Promise<Boot> | null = null;

function summaryOf(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    title: project.title,
    site_lang: project.site_lang,
    lesson_id: project.lesson_id,
    updated_at: project.updated_at,
  };
}

function bootStudio(lang: "en" | "ar") {
  if (!bootPromise) {
    bootPromise = (async () => {
      await api.health();
      const session = readSession();
      const device = deviceId();
      api.setDevice(device);
      if (session?.role === "learner") {
        api.setToken(session.token);
        try {
          const [templates, kits, projects, home] = await Promise.all([
            api.templates(),
            api.kits(),
            api.projects(),
            api.classHome(session.token),
          ]);
          const lessons = home.role === "learner" ? home.lessons : [];
          const saved = localStorage.getItem(`webstudio:open:${session.learnerId}`);
          const chosen = projects.find((item) => item.id === saved) || projects[0];
          let project: Project | null = chosen ? await api.project(chosen.id) : null;
          if (!project && lessons.length === 0) {
            project = await api.create({
              name: lang === "ar" ? "موقعي الأول" : "My first website",
              template_id: "personal",
              site_lang: lang,
            });
          }
          const list = project && !projects.some((item) => item.id === project!.id) ? [summaryOf(project), ...projects] : projects;
          return { project, projects: list, templates, kits, mission: missionOf(project), lessons, session };
        } catch (error) {
          writeSession(null);
          api.setToken(null);
          if (!device) throw error;
        }
      }
      api.setToken(null);
      if (!device) throw new Error("Choose how to open the studio");
      const [templates, kits, state, projects] = await Promise.all([
        api.templates(),
        api.kits(),
        api.state(),
        api.projects(),
      ]);
      let project: Project | null = null;
      if (state.current_project_id && projects.some((item) => item.id === state.current_project_id)) {
        try {
          project = await api.project(state.current_project_id);
        } catch {
          project = null;
        }
      }
      if (!project && projects[0]) project = await api.project(projects[0].id);
      if (!project) {
        project = await api.create({
          name: lang === "ar" ? "موقعي الأول" : "My first website",
          template_id: "personal",
          site_lang: lang,
        });
      }
      const mission = {
        active: state.mission?.active ?? null,
        badges: state.mission?.badges ?? [],
        events: state.mission?.events ?? [],
      };
      const list = projects.some((item) => item.id === project!.id) ? projects : [summaryOf(project!), ...projects];
      const teacher = readSession();
      return { project, projects: list, templates, kits, mission, lessons: [], session: teacher?.role === "teacher" ? teacher : null };
    })().catch((error) => {
      bootPromise = null;
      throw error;
    });
  }
  return bootPromise;
}

export function useStudio(lang: "en" | "ar") {
  const knownComputer = Boolean(deviceId()) || readSession()?.role === "learner";
  const [needsGate, setNeedsGate] = useState(!knownComputer);
  const [booting, setBooting] = useState(knownComputer);
  const [offline, setOffline] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("webstudio:mode") as Mode) || "visual");
  const [device, setDeviceState] = useState<Device>("desktop");
  const [tab, setTab] = useState<SideTab>("blocks");
  const [codeTab, setCodeTab] = useState<CodeTab>("css");
  const [extraPath, setExtraPath] = useState<string | null>(null);
  const [pagePath, setPagePath] = useState("index.html");
  const [beginner, setBeginner] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [closedPages, setClosedPages] = useState<string[]>([]);
  const pageRef = useRef("index.html");
  const closedRef = useRef<string[]>([]);
  const seenProject = useRef(project?.id);
  closedRef.current = closedPages;
  if (project?.id !== seenProject.current) {
    seenProject.current = project?.id;
    pageRef.current = "index.html";
    closedRef.current = [];
    if (pagePath !== "index.html") setPagePath("index.html");
    if (closedPages.length) setClosedPages([]);
    if (beginner) setBeginner(false);
    if (examMode) setExamMode(false);
  } else pageRef.current = pagePath;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [contextAt, setContextAt] = useState<{ x: number; y: number } | null>(null);
  const [tableWindow, setTableWindow] = useState(false);
  const [xray, setXrayState] = useState(false);
  const [big, setBigState] = useState(() => localStorage.getItem("webstudio:big") === "1");
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("webstudio:theme");
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [mission, setMission] = useState<MissionState>(emptyMission);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToastState] = useState<string | null>(null);
  function setToast(message: string | null) {
    setToastState(message ? localizeError(message, langRef.current) : null);
  }
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [spot, setSpot] = useState<string | null>(null);
  const [hist, setHist] = useState(0);
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [helping, setHelping] = useState<string | null>(null);
  const [reveal, setReveal] = useState(0);

  const projectRef = useRef<Project | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const saveTimer = useRef<number>(0);
  const saveGen = useRef(0);
  const codeGate = useRef(false);
  const missionReady = useRef(false);
  const xrayRef = useRef(false);
  const selectionRef = useRef<Selection | null>(null);
  const modeRef = useRef(mode);
  const clipRef = useRef<{ html: string; text: string } | null>(null);
  const codeRef = useRef<HTMLTextAreaElement | null>(null);
  const surfaceRef = useRef<"page" | "code">("page");
  const findRef = useRef({ query: "", at: 0 });
  const passedRef = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;
  const seenMission = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(session);
  const helpingRef = useRef<string | null>(null);
  const soloProjectId = useRef<string | null>(null);
  const soloMission = useRef<MissionState>(emptyMission());
  const missionRef = useRef(mission);
  sessionRef.current = session;
  missionRef.current = mission;
  selectionRef.current = selection;
  modeRef.current = mode;
  projectRef.current = project;
  xrayRef.current = xray;

  const bump = () => setHist((n) => n + 1);

  function post(message: Record<string, unknown>) {
    frameRef.current?.contentWindow?.postMessage({ source: "wd-parent", ...message }, "*");
  }

  function pushHistory(current: Project) {
    past.current.push({ html: current.html, css: current.css, js: current.js, files: current.files, page: pageRef.current });
    if (past.current.length > 60) past.current.shift();
    future.current = [];
    bump();
  }

  const savedMark = useRef("");

  function projectMark(page: Pick<Project, "html" | "css" | "js" | "name" | "title" | "site_lang" | "files">) {
    return `${page.site_lang}\n${page.name}\n${page.title}\n${page.html}\n${page.css}\n${page.js}\n${filesKey(page.files)}`;
  }

  function rememberSaved(page: Project) {
    savedMark.current = projectMark(page);
    setStatus("saved");
  }

  function noteChange(page: Project) {
    setStatus(projectMark(page) === savedMark.current ? "saved" : "unsaved");
  }

  function scheduleSave(next: Project) {
    window.clearTimeout(saveTimer.current);
    noteChange(next);
  }

  async function persist(snapshot: Project) {
    const gen = ++saveGen.current;
    setStatus("saving");
    try {
      const saved = await api.update(snapshot.id, {
        name: snapshot.name,
        title: snapshot.title,
        site_lang: snapshot.site_lang,
        html: snapshot.html,
        css: snapshot.css,
        js: snapshot.js,
        files: snapshot.files || [],
      });
      if (gen !== saveGen.current) return;
      const cur = projectRef.current;
      if (cur && cur.id === saved.id) {
        const sameFiles = filesKey(cur.files) === filesKey(snapshot.files);
        const merged = {
          ...cur,
          assets: saved.assets,
          updated_at: saved.updated_at,
          note: saved.note,
          files: sameFiles ? (saved.files ?? cur.files ?? []) : (cur.files ?? []),
        };
        projectRef.current = merged;
        setProject(merged);
        savedMark.current = projectMark(snapshot);
        const stale = cur.html !== snapshot.html || cur.css !== snapshot.css || cur.js !== snapshot.js || cur.name !== snapshot.name || cur.title !== snapshot.title || cur.site_lang !== snapshot.site_lang || !sameFiles;
        if (stale) noteChange(merged);
        else rememberSaved(merged);
      } else setStatus("saved");
      setProjects((list) => [summaryOf(saved), ...list.filter((item) => item.id !== saved.id)]);
    } catch {
      if (gen === saveGen.current) setStatus("error");
    }
  }

  function commit(recipe: (current: Project) => Project, history = true) {
    const cur = projectRef.current;
    if (!cur) return;
    if (history) pushHistory(cur);
    const next = recipe(cur);
    projectRef.current = next;
    setProject(next);
    scheduleSave(next);
    return next;
  }

  function syncFrame(next: Project, what: "html" | "css" | "both" = "both") {
    if (what !== "css") post({ cmd: "html", html: editorHtml(pageBody(next, pageRef.current), next.id) });
    if (what !== "html") post({ cmd: "css", css: editorCss(next.css, next.id) });
  }

  function acceptCanvas(live: string) {
    const cur = projectRef.current;
    if (!cur || !pageRef.current) return;
    const previous = pageBody(cur, pageRef.current);
    const stored = prettyHtml(mergeScripts(previous, toStored(live, cur.id)));
    if (stored === previous || stored === prettyHtml(previous)) return;
    pushHistory(cur);
    const next = writePage(cur, pageRef.current, stored);
    projectRef.current = next;
    setProject(next);
    scheduleSave(next);
  }

  function insertMarkup(html: string, extraCss: string | undefined, path: number[] | null, tag: string) {
    const cur = projectRef.current;
    if (!cur) return;
    const css = ensureCss(cur.css, extraCss);
    const next = commit((project) => ({ ...project, css }), true);
    if (!next) return;
    if (css !== cur.css) post({ cmd: "css", css: editorCss(css, cur.id) });
    post({ cmd: "insert", html: editorHtml(html, cur.id), path, tag });
  }

  function insertBlock(id: string, path: number[] | null, tag: string) {
    if (id === "table") {
      setModal({ type: "table", path, tag });
      return;
    }
    const block = blockById(id);
    if (!block) return;
    const arabic = langRef.current === "ar" || projectRef.current?.site_lang === "ar";
    insertMarkup(blockMarkup(id, arabic), block.css, path, tag);
  }

  const handlers = useRef({ acceptCanvas, insertBlock, insertMarkup });
  handlers.current = { acceptCanvas, insertBlock, insertMarkup };

  useEffect(() => {
    if (needsGate) return;
    let gone = false;
    bootStudio(langRef.current)
      .then((data) => {
        if (gone) return;
        projectRef.current = data.project;
        if (data.project) rememberSaved(data.project);
        setProject(data.project);
        setProjects(data.projects);
        setTemplates(data.templates);
        setKits(data.kits);
        setMission(data.mission);
        setLessons(data.lessons);
        setSession(data.session);
        sessionRef.current = data.session;
        if (!data.project?.learner_id) soloMission.current = data.mission;
        missionReady.current = true;
        setOffline(false);
      })
      .catch(() => {
        if (!gone) setOffline(true);
      })
      .finally(() => {
        if (!gone) setBooting(false);
      });
    return () => {
      gone = true;
    };
  }, [needsGate]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.__webStudio) {
        setConsoleLines((lines) => [...lines.slice(-180), { level: String(data.level || "log"), text: String(data.text || "") }]);
        return;
      }
      if (!data || data.source !== "wd") return;
      if (data.type === "ready") {
        const current = projectRef.current;
        if (!current) return;
        post({ cmd: "css", css: editorCss(current.css, current.id) });
        post({ cmd: "html", html: editorHtml(pageBody(current, pageRef.current), current.id) });
        post({ cmd: "xray", on: xrayRef.current });
      }
      if (data.type === "select") {
        if (!data.path) {
          setSelection(null);
          setTableWindow(false);
        } else {
          setSelection({
            path: data.path,
            tag: data.tag,
            id: data.id || "",
            className: data.className || "",
            text: data.text || "",
            canEditText: !!data.canEditText,
            attrs: data.attrs || {},
            style: data.style || {},
            crumbs: data.crumbs || [],
            table: data.table || null,
            html: data.html || "",
            whole: !!data.whole,
          });
          if (!data.table) setTableWindow(false);
        }
      }
      if (data.type === "table-window") setTableWindow(true);
      if (data.type === "menu") {
        const frame = frameRef.current?.getBoundingClientRect();
        setContextAt({
          x: (frame?.left || 0) + Number(data.x || 0),
          y: (frame?.top || 0) + Number(data.y || 0),
        });
      }
      if (data.type === "dismiss") setContextAt(null);
      if (data.type === "html") handlers.current.acceptCanvas(String(data.html || ""));
      if (data.type === "clip") clipRef.current = { html: String(data.html || ""), text: String(data.text || "") };
      if (data.type === "find-open") setModal({ type: "find", replace: !!data.replace });
      if (data.type === "found") {
        const count = Number(data.count || 0);
        if (data.kind === "replace") setToast(count ? (langRef.current === "ar" ? `تم استبدال ${count}` : `Replaced ${count}`) : (langRef.current === "ar" ? "لم يُعثر على النص" : "No matches"));
        else if (!data.ok) setToast(langRef.current === "ar" ? "لم يُعثر على النص" : "No matches");
      }
      if (data.type === "drop") {
        const token = String(data.token || "");
        const path = (data.path as number[]) || null;
        const tag = String(data.tag || "");
        if (token.startsWith("wd-block:")) handlers.current.insertBlock(token.slice(9), path, tag);
        if (token.startsWith("wd-image:")) {
          const beside = tag === "img";
          const style = beside
            ? "width:46%;height:auto;max-width:100%;display:inline-block;vertical-align:top;margin:8px 1%"
            : "max-width:100%;height:auto";
          handlers.current.insertMarkup(`<img src="${token.slice(9)}" alt="" style="${style}">`, undefined, path, tag);
          if (beside && path) post({ cmd: "picture-row", path, width: "46%", valign: "top" });
        }
      }
      if (data.type === "files" && data.files?.length) {
        void uploadFiles(data.files as File[], (data.path as number[]) || null, String(data.tag || ""), true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // The listener reads live data through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!missionReady.current || helpingRef.current) return;
    const timer = window.setTimeout(() => {
      const current = projectRef.current;
      if (current?.learner_id) void api.saveMission(current.id, mission);
      else void api.saveState({ mission });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [mission]);

  useEffect(() => {
    if (!project || !mission.active) return;
    const found = MISSIONS.find((item) => item.id === mission.active);
    if (!found) return;
    const ctx = missionContext(project, mission.events);
    const count = found.steps.filter((step) => passes(step, ctx)).length;
    if (seenMission.current !== mission.active) {
      seenMission.current = mission.active;
      passedRef.current = count;
    } else if (count > passedRef.current) {
      passedRef.current = count;
      setToast(lang === "ar" ? "أُنجزت خطوة" : "Step complete");
    } else passedRef.current = count;
    if (count === found.steps.length && !mission.badges.includes(found.id)) {
      setMission((current) => ({ ...current, badges: [...current.badges, found.id] }));
      setCelebrate(found.id);
      window.setTimeout(() => setCelebrate(null), 2800);
    }
  }, [project, mission, lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("big", big);
    localStorage.setItem("webstudio:theme", theme);
    localStorage.setItem("webstudio:big", big ? "1" : "");
    localStorage.setItem("webstudio:mode", mode);
  }, [theme, big, mode]);

  useEffect(() => {
    pageRef.current = "index.html";
    setPagePath("index.html");
    setExtraPath(null);
  }, [project?.id]);

  useEffect(() => {
    if (!extraPath || !isPageFile(extraPath)) return;
    pageRef.current = extraPath;
    setPagePath(extraPath);
    setExtraPath(null);
    setMode("visual");
    const current = projectRef.current;
    if (current) post({ cmd: "html", html: editorHtml(pageBody(current, extraPath), current.id) });
  }, [extraPath]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void actions.current.saveNow();
      }
      const key = event.key.toLowerCase();
      const meta = event.ctrlKey || event.metaKey;
      if (meta && !event.altKey && key === "f") {
        event.preventDefault();
        setModal({ type: "find" });
        return;
      }
      if (meta && !event.altKey && key === "h") {
        event.preventDefault();
        setModal({ type: "find", replace: true });
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (meta && key === "z" && !event.shiftKey) {
        event.preventDefault();
        actions.current.undo();
      } else if (meta && (key === "y" || (event.shiftKey && key === "z"))) {
        event.preventDefault();
        actions.current.redo();
      } else if (meta && key === "c") {
        event.preventDefault();
        actions.current.copy();
      } else if (meta && key === "x") {
        event.preventDefault();
        actions.current.cut();
      } else if (meta && key === "v") {
        event.preventDefault();
        void actions.current.paste(false);
      } else if (meta && key === "a") {
        event.preventDefault();
        actions.current.selectAll();
      }
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.classList.contains("code-input")) {
        codeRef.current = target;
        surfaceRef.current = "code";
      } else if (target instanceof HTMLIFrameElement) surfaceRef.current = "page";
    };
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      const files = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      const sel = selectionRef.current;
      void uploadFiles(files, sel?.path || null, sel?.tag || "", true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("focusin", onFocus);
    window.addEventListener("paste", onPaste);
    const before = (event: BeforeUnloadEvent) => {
      if (statusRef.current === "unsaved") event.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("beforeunload", before);
    };
    // Keyboard handlers call the latest undo/save through refs updated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusRef = useRef(status);
  statusRef.current = status;
  const actions = useRef({
    saveNow: async () => {},
    undo: () => {},
    redo: () => {},
    copy: () => {},
    cut: () => {},
    paste: async (_asPlain?: boolean) => {},
    selectAll: () => {},
  });

  async function saveNow() {
    const open = projectRef.current;
    if (!open) return;
    if (projectMark(open) === savedMark.current && statusRef.current !== "error") return;
    window.clearTimeout(saveTimer.current);
    post({ cmd: "flush" });
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    const current = projectRef.current;
    if (!current) return;
    if (projectMark(current) === savedMark.current && statusRef.current !== "error") return;
    await persist(current);
  }
  actions.current.saveNow = saveNow;

  function undo() {
    const current = projectRef.current;
    const prev = past.current.pop();
    if (!current || !prev) return;
    future.current.push({ html: current.html, css: current.css, js: current.js, files: current.files, page: pageRef.current });
    const next = { ...current, html: prev.html, css: prev.css, js: prev.js, files: prev.files ?? current.files };
    if (prev.page) pageRef.current = prev.page;
    projectRef.current = next;
    setProject(next);
    setPagePath(pageRef.current);
    scheduleSave(next);
    syncFrame(next);
    setSelection(null);
    bump();
  }
  function redo() {
    const current = projectRef.current;
    const nextSnap = future.current.pop();
    if (!current || !nextSnap) return;
    past.current.push({ html: current.html, css: current.css, js: current.js, files: current.files, page: pageRef.current });
    const next = { ...current, html: nextSnap.html, css: nextSnap.css, js: nextSnap.js, files: nextSnap.files ?? current.files };
    if (nextSnap.page) pageRef.current = nextSnap.page;
    projectRef.current = next;
    setProject(next);
    setPagePath(pageRef.current);
    scheduleSave(next);
    syncFrame(next);
    setSelection(null);
    bump();
  }
  actions.current.undo = undo;
  actions.current.redo = redo;

  function codeArea() {
    const current = codeRef.current;
    if (current && document.body.contains(current)) return current;
    const area = document.querySelector("textarea.code-input");
    if (area instanceof HTMLTextAreaElement) {
      codeRef.current = area;
      return area;
    }
    return null;
  }

  function useCode() {
    if (modeRef.current === "visual") return false;
    if (modeRef.current === "split" && surfaceRef.current !== "code") return false;
    return !!codeArea();
  }

  function setAreaValue(area: HTMLTextAreaElement, value: string) {
    const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    proto?.set?.call(area, value);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>]/g, (ch) => (ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;"));
  }

  function asText(value: string) {
    return new DOMParser().parseFromString(value, "text/html").body.textContent || value;
  }

  function markupOf() {
    const sel = selectionRef.current;
    if (sel?.html) return sel.html;
    const cur = projectRef.current;
    return cur ? pageBody(cur, pageRef.current) : "";
  }

  function rememberClip(html: string, text: string) {
    clipRef.current = { html, text };
    void navigator.clipboard.writeText(html).catch(() => undefined);
  }

  function copyEdit() {
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      const text = area.selectionStart === area.selectionEnd ? area.value : area.value.slice(area.selectionStart, area.selectionEnd);
      rememberClip(text, text);
      setToast(langRef.current === "ar" ? "تم النسخ" : "Copied");
      return;
    }
    const html = markupOf();
    if (!html) return;
    rememberClip(html, selectionRef.current?.text || asText(html));
    setToast(langRef.current === "ar" ? "تم النسخ" : "Copied");
  }

  function cutEdit() {
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const text = start === end ? area.value : area.value.slice(start, end);
      rememberClip(text, text);
      setAreaValue(area, start === end ? "" : area.value.slice(0, start) + area.value.slice(end));
      setToast(langRef.current === "ar" ? "تم القص" : "Cut");
      return;
    }
    const html = markupOf();
    const sel = selectionRef.current;
    if (!html || !sel) return;
    rememberClip(html, sel.text || asText(html));
    if (sel.whole) post({ cmd: "clear-body" });
    else post({ cmd: "delete", path: sel.path });
    setToast(langRef.current === "ar" ? "تم القص" : "Cut");
  }

  async function pasteEdit(asPlain = false) {
    let raw = "";
    try {
      raw = await navigator.clipboard.readText();
    } catch {
      raw = "";
    }
    if (!raw) raw = asPlain ? clipRef.current?.text || (clipRef.current ? asText(clipRef.current.html) : "") : clipRef.current?.html || "";
    if (!raw.trim()) {
      setToast(langRef.current === "ar" ? "لا يوجد شيء للصق" : "Nothing to paste");
      return;
    }
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      const insert = asPlain ? asText(raw) : raw;
      setAreaValue(area, area.value.slice(0, area.selectionStart) + insert + area.value.slice(area.selectionEnd));
      return;
    }
    const sel = selectionRef.current;
    const html = asPlain || !raw.includes("<")
      ? `<p>${escapeHtml(asPlain ? asText(raw) : raw)}</p>`
      : new DOMParser().parseFromString(raw, "text/html").body.innerHTML || raw;
    insertMarkup(html, undefined, sel?.path || null, sel?.tag || "");
  }

  function selectAllEdit() {
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      area.focus();
      area.setSelectionRange(0, area.value.length);
      return;
    }
    post({ cmd: "select-all" });
  }

  function deleteEdit() {
    if (useCode()) {
      const area = codeArea();
      if (!area || area.selectionStart === area.selectionEnd) return;
      setAreaValue(area, area.value.slice(0, area.selectionStart) + area.value.slice(area.selectionEnd));
      return;
    }
    const sel = selectionRef.current;
    if (!sel) return;
    if (sel.whole) post({ cmd: "clear-body" });
    else post({ cmd: "delete", path: sel.path });
  }

  function swapPlain(text: string, query: string, value: string, all: boolean) {
    const lower = text.toLowerCase();
    const needle = query.toLowerCase();
    let out = "";
    let i = 0;
    let n = 0;
    while (i < text.length) {
      const at = lower.indexOf(needle, i);
      if (at < 0) {
        out += text.slice(i);
        break;
      }
      out += text.slice(i, at) + value;
      i = at + query.length;
      n += 1;
      if (!all) {
        out += text.slice(i);
        break;
      }
    }
    return { text: out, n };
  }

  function findNext(query: string) {
    const q = query.trim();
    if (!q) return;
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      const hay = area.value.toLowerCase();
      const needle = q.toLowerCase();
      const from = findRef.current.query === needle ? findRef.current.at : 0;
      let at = hay.indexOf(needle, from);
      if (at < 0 && from > 0) at = hay.indexOf(needle);
      if (at < 0) {
        setToast(langRef.current === "ar" ? "لم يُعثر على النص" : "No matches");
        return;
      }
      findRef.current = { query: needle, at: at + needle.length };
      area.focus();
      area.setSelectionRange(at, at + q.length);
      const line = area.value.slice(0, at).split("\n").length;
      area.scrollTop = Math.max(0, (line - 3) * 18);
      return;
    }
    const again = findRef.current.query === q.toLowerCase();
    findRef.current = { query: q.toLowerCase(), at: 1 };
    post({ cmd: "find", query: q, again });
  }

  function replaceEdit(query: string, value: string, all: boolean) {
    const q = query.trim();
    if (!q) return;
    if (useCode()) {
      const area = codeArea();
      if (!area) return;
      const changed = swapPlain(area.value, q, value, all);
      if (!changed.n) {
        setToast(langRef.current === "ar" ? "لم يُعثر على النص" : "No matches");
        return;
      }
      setAreaValue(area, changed.text);
      setToast(langRef.current === "ar" ? `تم استبدال ${changed.n}` : `Replaced ${changed.n}`);
      return;
    }
    post({ cmd: "replace", query: q, value, all });
  }
  actions.current.copy = copyEdit;
  actions.current.cut = cutEdit;
  actions.current.paste = pasteEdit;
  actions.current.selectAll = selectAllEdit;

  function edit(field: "html" | "css" | "js", value: string) {
    const cur = projectRef.current;
    if (!cur || (field === "html" && !pageRef.current)) return;
    if (!codeGate.current) {
      pushHistory(cur);
      codeGate.current = true;
      window.setTimeout(() => {
        codeGate.current = false;
      }, 700);
    }
    const next = field === "html" ? writePage(cur, pageRef.current, value) : { ...cur, [field]: value };
    projectRef.current = next;
    setProject(next);
    scheduleSave(next);
    if (field === "html") post({ cmd: "html", html: editorHtml(value, cur.id) });
    if (field === "css") post({ cmd: "css", css: editorCss(value, cur.id) });
  }

  function addEvent(name: string) {
    setMission((current) => (current.events.includes(name) ? current : { ...current, events: [...current.events, name] }));
  }

  function setDevice(next: Device) {
    setDeviceState(next);
    if (next === "phone") addEvent("phone");
  }

  function setXray(on: boolean) {
    setXrayState(on);
    xrayRef.current = on;
    post({ cmd: "xray", on });
    if (on) addEvent("xray");
  }

  async function uploadFiles(files: File[], path: number[] | null, tag: string, insert: boolean) {
    const cur = projectRef.current;
    if (!cur) return;
    let last: Asset | undefined;
    try {
      for (const file of files) {
        const asset = await api.upload(projectRef.current!.id, file);
        last = asset;
        const latest = projectRef.current!;
        const next = { ...latest, assets: [...latest.assets.filter((item) => item.path !== asset.path), asset] };
        projectRef.current = next;
        setProject(next);
        if (insert) {
          const beside = tag === "img";
          const style = beside
            ? "width:46%;height:auto;max-width:100%;display:inline-block;vertical-align:top;margin:8px 1%"
            : "max-width:100%;height:auto";
          handlers.current.insertMarkup(`<img src="${asset.path}" alt="" style="${style}">`, undefined, path, tag);
          if (beside && path) post({ cmd: "picture-row", path, width: "46%", valign: "top" });
        }
      }
      setToast(lang === "ar" ? "تمت إضافة الصورة" : "Image added");
      return last;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function openProject(id: string) {
    if (projectRef.current && statusRef.current === "unsaved") await saveNow();
    const next = await api.project(id);
    past.current = [];
    future.current = [];
    projectRef.current = next;
    setProject(next);
    setSelection(null);
    rememberSaved(next);
    bump();
    if (next.learner_id) {
      localStorage.setItem(`webstudio:open:${next.learner_id}`, next.id);
      const loaded = missionOf(next);
      setMission(loaded);
      seenMission.current = loaded.active;
    } else if (!helpingRef.current) {
      void api.saveState({ current_project_id: id });
    }
    setModal(null);
  }

  async function createSite(name: string, templateId: string, siteLang: "en" | "ar") {
    if (projectRef.current && statusRef.current === "unsaved") await saveNow();
    const next = await api.create({ name, template_id: templateId, site_lang: siteLang });
    past.current = [];
    future.current = [];
    projectRef.current = next;
    setProject(next);
    setProjects((list) => [summaryOf(next), ...list.filter((item) => item.id !== next.id)]);
    setSelection(null);
    rememberSaved(next);
    setModal(null);
    bump();
  }

  async function deleteSite(id: string) {
    await api.remove(id);
    const list = (await api.projects()) as ProjectSummary[];
    setProjects(list);
    if (projectRef.current?.id === id) {
      if (list[0]) await openProject(list[0].id);
      else await createSite(lang === "ar" ? "موقعي الأول" : "My first website", "blank", lang);
    }
  }

  function applyKit(kit: Kit) {
    const next = commit((current) => ({ ...current, css: applyKitCss(current.css, kit.css) }));
    if (next) syncFrame(next, "css");
    setModal(null);
    setToast(lang === "ar" ? "تم تطبيق الطقم" : "Design kit applied");
  }

  function setPageBackground(value: string, history = true) {
    const next = commit((current) => ({ ...current, css: setPageLayer(current.css, { background: value }) }), history);
    if (next) syncFrame(next, "css");
  }

  function useAssetBackground(path: string) {
    const next = commit((current) => ({
      ...current,
      css: setPageLayer(current.css, {
        "background-color": "#ffffff",
        "background-image": `url("${path}")`,
        "background-size": "cover",
        "background-position": "center",
        "background-repeat": "no-repeat",
        "min-height": "100vh",
      }),
    }));
    if (next) syncFrame(next, "css");
  }

  function command(message: Record<string, unknown>) {
    post(message);
  }

  function setFont(family: string, value: string) {
    const cur = projectRef.current;
    const sel = selectionRef.current;
    if (!cur || !sel) return;
    if (family) {
      const css = ensureFontImport(cur.css, family);
      if (css !== cur.css) {
        const next = commit((project) => ({ ...project, css }), true);
        if (next) post({ cmd: "css", css: editorCss(next.css, next.id) });
      }
    }
    post({ cmd: "style", path: sel.path, prop: "fontFamily", value });
  }

  function toggleFx(name: string) {
    const cur = projectRef.current;
    const sel = selectionRef.current;
    if (!cur || !sel) return;
    const css = ensureCss(cur.css, FX_CSS);
    if (css !== cur.css) {
      const next = commit((project) => ({ ...project, css }), true);
      if (next) post({ cmd: "css", css: editorCss(next.css, next.id) });
    }
    post({ cmd: "toggle-class", path: sel.path, name });
  }

  async function exportZip() {
    await saveNow();
    const current = projectRef.current;
    if (!current) return;
    const res = await fetch(api.exportUrl(current.id), { headers: api.authHeaders() });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${current.name || "website"}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    addEvent("zip");
    setToast(lang === "ar" ? "بدأ التنزيل" : "Download started");
  }

  async function saveFolder() {
    const picker = (window as Window & { showDirectoryPicker?: (opts: { mode: string; startIn?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      await exportZip();
      setToast(lang === "ar"
        ? "تعذر اختيار مجلد من هذه النافذة، فنُزّل الموقع ملفًا."
        : "This window cannot choose a folder, so the website was downloaded as a file.");
      return;
    }
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await picker({ mode: "readwrite", startIn: "documents" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setToast(lang === "ar" ? "تعذر فتح المجلد" : "Could not open that folder");
      return;
    }
    await saveNow();
    const current = projectRef.current;
    if (!current) return;
    const stored = { ...current, html: toStored(current.html, current.id), css: toStored(current.css, current.id) };
    await writeText(dir, "index.html", folderDocument(stored));
    await writeText(dir, "style.css", stored.css);
    if (stored.js.trim()) await writeText(dir, "script.js", stored.js);
    for (const file of stored.files || []) {
      if (file.folder) await ensureFolder(dir, file.path);
      else await writeNested(dir, file.path, file.content || "");
    }
    let missed = 0;
    for (const asset of stored.assets) {
      try {
        const res = await fetch(asset.url);
        if (!res.ok) throw new Error("missing");
        const blob = await res.blob();
        await writeBlob(dir, asset.path, blob);
      } catch {
        missed += 1;
      }
    }
    addEvent("zip");
    const where = dir.name;
    setToast(missed
      ? (lang === "ar" ? `حُفظ الموقع في ${where}، وتعذرت ${missed} صورة` : `Saved in ${where}. ${missed} picture${missed === 1 ? "" : "s"} could not be copied`)
      : (lang === "ar" ? `حُفظ الموقع كاملًا في المجلد: ${where}` : `The whole website was saved in the folder: ${where}`));
  }

  function preview() {
    const current = projectRef.current;
    if (!current) return;
    const blob = new Blob([previewDocument({ ...current, html: pageBody(current, pageRef.current) })], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    addEvent("preview");
  }

  function run() {
    addEvent("run");
    setCodeTab("console");
    setModal({ type: "run" });
  }

  function showMe(id: string, where?: { tab?: SideTab; mode?: Mode; codeTab?: CodeTab }) {
    if (where?.tab) setTab(where.tab);
    if (where?.mode) setMode(where.mode || "visual");
    if (where?.codeTab) setCodeTab(where.codeTab);
    setSpot(id);
    window.setTimeout(() => setSpot(null), 2600);
  }

  function retry() {
    setBooting(true);
    setOffline(false);
    bootPromise = null;
    bootStudio(lang)
      .then((data) => {
        projectRef.current = data.project;
        if (data.project) rememberSaved(data.project);
        setProject(data.project);
        setProjects(data.projects);
        setTemplates(data.templates);
        setKits(data.kits);
        setMission(data.mission);
        setLessons(data.lessons);
        setSession(data.session);
        sessionRef.current = data.session;
        missionReady.current = true;
        setOffline(false);
      })
      .catch(() => setOffline(true))
      .finally(() => setBooting(false));
  }

  function rememberTeacher(room: { id: string; name: string; join_code: string; teacher_token: string }) {
    const next: Session = {
      role: "teacher",
      token: room.teacher_token,
      classId: room.id,
      className: room.name,
      joinCode: room.join_code,
    };
    writeSession(next);
    setSession(next);
    sessionRef.current = next;
    if (needsGate) return enterThisComputer();
    setModal({ type: "class" });
  }

  async function enterThisComputer() {
    const id = ensureDevice();
    api.setDevice(id);
    await api.claim(true);
    bootPromise = null;
    setNeedsGate(false);
    setBooting(true);
    setOffline(false);
  }

  async function joinClass(code: string, name: string) {
    const result = await api.joinClass({ join_code: code.trim(), name: name.trim() });
    const next: Session = {
      role: "learner",
      token: result.token,
      classId: result.class.id,
      className: result.class.name,
      joinCode: result.class.join_code,
      name: result.learner.name,
      learnerId: result.learner.id,
    };
    writeSession(next);
    api.setToken(next.token);
    setSession(next);
    sessionRef.current = next;
    setLessons(result.lessons);
    helpingRef.current = null;
    setHelping(null);
    if (needsGate) {
      bootPromise = null;
      setNeedsGate(false);
      setBooting(true);
      return;
    }
    const list = await api.projects();
    setProjects(list);
    if (list[0]) await openProject(list[0].id);
    else {
      projectRef.current = null;
      setProject(null);
      setModal(null);
    }
  }

  async function createClass(name: string, pin: string) {
    const room = await api.createClass({ name: name.trim(), pin: pin.trim() });
    await rememberTeacher(room);
    setToast(lang === "ar" ? `رمز الصف ${room.join_code}` : `Class code ${room.join_code}`);
  }

  async function enterAsTeacher(code: string, pin: string) {
    const room = await api.enterClass({ join_code: code.trim(), pin: pin.trim() });
    await rememberTeacher(room);
  }

  async function leaveClass() {
    const role = sessionRef.current?.role;
    writeSession(null);
    api.setToken(null);
    setSession(null);
    sessionRef.current = null;
    setLessons([]);
    helpingRef.current = null;
    setHelping(null);
    setModal(null);
    if (role !== "learner") return;
    if (!deviceId()) {
      bootPromise = null;
      projectRef.current = null;
      setProject(null);
      setNeedsGate(true);
      setBooting(false);
      return;
    }
    retry();
  }

  async function loadClass(): Promise<ClassHome | null> {
    const current = sessionRef.current;
    if (!current) return null;
    const home = await api.classHome(current.token);
    setLessons(home.lessons);
    return home;
  }

  async function publishLesson(body: { title: string; brief_en: string; brief_ar: string; template_id: string; site_lang: string; mission_ids: string[] }) {
    const current = sessionRef.current;
    if (!current || current.role !== "teacher") return;
    await api.createLesson(current.token, body);
    await loadClass();
  }

  async function removeLesson(id: string) {
    const current = sessionRef.current;
    if (!current || current.role !== "teacher") return;
    await api.removeLesson(current.token, id);
    await loadClass();
  }

  async function startLesson(id: string, siteLang: "en" | "ar") {
    if (projectRef.current && statusRef.current === "unsaved") await saveNow();
    const next = await api.startLesson(id, siteLang);
    past.current = [];
    future.current = [];
    projectRef.current = next;
    setProject(next);
    setProjects((list) => [summaryOf(next), ...list.filter((item) => item.id !== next.id)]);
    rememberSaved(next);
    const loaded = missionOf(next);
    setMission(loaded);
    seenMission.current = loaded.active;
    if (next.learner_id) localStorage.setItem(`webstudio:open:${next.learner_id}`, next.id);
    setSelection(null);
    rememberSaved(next);
    setModal(null);
    bump();
  }

  async function openStudent(id: string, name: string) {
    const current = sessionRef.current;
    if (!current || current.role !== "teacher") return;
    if (!helpingRef.current && projectRef.current && !projectRef.current.learner_id) {
      soloProjectId.current = projectRef.current.id;
      soloMission.current = missionRef.current;
    }
    helpingRef.current = name;
    setHelping(name);
    api.setToken(current.token);
    await openProject(id);
    setModal(null);
  }

  async function stopHelping() {
    const id = soloProjectId.current;
    helpingRef.current = null;
    setHelping(null);
    api.setToken(null);
    if (!id) return;
    await openProject(id);
    setMission(soloMission.current);
    seenMission.current = soloMission.current.active;
  }

  async function saveNote(note: string) {
    const current = sessionRef.current;
    const page = projectRef.current;
    if (!current || current.role !== "teacher" || !page) return;
    const saved = await api.saveNote(page.id, note, current.token);
    const next = { ...page, note: saved.note };
    projectRef.current = next;
    setProject(next);
    setToast(lang === "ar" ? "حُفظت الملاحظة" : "Note saved");
  }

  function showCode() {
    setMode("split");
    setCodeTab("css");
    setReveal((value) => value + 1);
  }

  function openPage(path: string) {
    const next = isPageFile(path) ? path : "index.html";
    pageRef.current = next;
    setPagePath(next);
    setClosedPages((current) => current.filter((item) => item !== next));
    setExtraPath(null);
    setSelection(null);
    setMode("visual");
    const current = projectRef.current;
    if (current) post({ cmd: "html", html: editorHtml(pageBody(current, next), current.id) });
  }

  function openBeginner() {
    const cur = projectRef.current;
    if (!cur) return;
    setExamMode(false);
    const files = cur.files || [];
    if (!files.some((file) => file.path === "first.html" && !file.folder)) {
      const next = { ...cur, files: [...files, { path: "first.html", folder: false, content: "" }] };
      projectRef.current = next;
      setProject(next);
      void persist(next);
    }
    openPage("first.html");
    setBeginner(true);
  }

  function closeBeginner() {
    setBeginner(false);
    void saveNow();
  }

  function openExam() {
    if (!projectRef.current) return;
    setBeginner(false);
    setExamMode(true);
  }

  function closeExam() {
    setExamMode(false);
  }

  function closePage(path: string) {
    const current = projectRef.current;
    const open = listPages(current).filter((item) => !closedRef.current.includes(item));
    const index = open.indexOf(path);
    const neighbor = open[index - 1] || open[index + 1] || "";
    setClosedPages((items) => (items.includes(path) ? items : [...items, path]));
    if (pageRef.current !== path) return;
    if (!neighbor) {
      pageRef.current = "";
      setPagePath("");
      setSelection(null);
      return;
    }
    openPage(neighbor);
  }

  const srcDoc = project ? buildSrcDoc(editorHtml(pageBody(project, pagePath), project.id), editorCss(project.css, project.id), project.site_lang) : "";

  return {
    needsGate,
    booting,
    offline,
    retry,
    session,
    lessons,
    helping,
    reveal,
    showCode,
    project,
    projects,
    templates,
    kits,
    status,
    mode,
    setMode,
    device,
    setDevice,
    tab,
    setTab,
    codeTab,
    setCodeTab,
    extraPath,
    pagePath,
    pageHtml: project && pagePath ? pageBody(project, pagePath) : "",
    pages: listPages(project).filter((page) => !closedPages.includes(page)),
    openPage,
    closePage,
    beginner,
    openBeginner,
    closeBeginner,
    examMode,
    openExam,
    closeExam,
    openExtra: (path: string) => {
      if (isPageFile(path)) openPage(path);
      else {
        setExtraPath(path);
        setMode("code");
      }
    },
    closeExtra: () => setExtraPath(null),
    editFile: (path: string, content: string) => {
      const cur = projectRef.current;
      if (!cur) return;
      const files = (cur.files || []).map((file) => (file.path === path ? { ...file, content } : file));
      const next = { ...cur, files };
      projectRef.current = next;
      setProject(next);
      scheduleSave(next);
    },
    changeFiles: (files: SiteFile[]) => {
      const cur = projectRef.current;
      if (!cur) return;
      const next = { ...cur, files };
      projectRef.current = next;
      setProject(next);
      if (pageRef.current !== "index.html" && !files.some((file) => file.path === pageRef.current && !file.folder)) {
        pageRef.current = "index.html";
        setPagePath("index.html");
        post({ cmd: "html", html: editorHtml(next.html, next.id) });
      }
      setExtraPath((current) => (current && files.some((file) => file.path === current && !file.folder) ? current : null));
      void persist(next);
    },
    moveItem: async (from: string, kind: string, destFolder: string) => {
      const cur = projectRef.current;
      if (!cur) return;
      const name = from.split("/").pop() || from;
      const dest = destFolder ? `${destFolder}/${name}` : name;
      if (!dest || dest === from) return;
      const low = dest.toLowerCase();
      const used = () => setToast(lang === "ar" ? "هذا الاسم مستخدم." : "That name is already used.");
      if (low === "index.html" || low === "style.css" || low === "script.js" || low === "images") {
        used();
        return;
      }
      if (kind !== "image" && (destFolder === "images" || destFolder.startsWith("images/"))) {
        setToast(lang === "ar" ? "مجلد الصور مخصص للصور فقط." : "The images folder is only for pictures.");
        return;
      }
      if (kind === "folder" && (destFolder === from || destFolder.startsWith(`${from}/`))) return;
      if (kind === "image") {
        if ((cur.files || []).some((file) => file.path.toLowerCase() === low) || cur.assets.some((asset) => asset.path !== from && asset.path.toLowerCase() === low)) {
          used();
          return;
        }
        try {
          const saved = await api.moveAsset(cur.id, from, dest);
          const latest = projectRef.current || cur;
          const next = {
            ...latest,
            html: replacePath(latest.html, from, dest),
            css: replacePath(latest.css, from, dest),
            js: replacePath(latest.js, from, dest),
            files: (latest.files || []).map((file) => (file.folder ? file : { ...file, content: replacePath(file.content, from, dest) })),
            assets: latest.assets.map((asset) => (asset.path === from ? { ...asset, path: saved.path, url: saved.url, mime: saved.mime } : asset)),
          };
          projectRef.current = next;
          setProject(next);
          syncFrame(next);
          void persist(next);
        } catch (error) {
          setToast(error instanceof Error ? error.message : (lang === "ar" ? "تعذر نقل الصورة" : "Could not move that picture"));
        }
        return;
      }
      const moved = (cur.files || []).map((file) => {
        const path = shiftPath(file.path, from, dest);
        return path === file.path ? file : { ...file, path };
      });
      const contained = kind === "folder" ? cur.assets.filter((asset) => asset.path === from || asset.path.startsWith(`${from}/`)) : [];
      const assetMoves = contained
        .map((asset) => ({ from: asset.path, to: shiftPath(asset.path, from, dest) }))
        .sort((a, b) => b.from.length - a.from.length);
      const staying = cur.assets.filter((asset) => !contained.includes(asset)).map((asset) => asset.path.toLowerCase());
      const paths = moved.map((file) => file.path.toLowerCase());
      const taken = new Set([...paths, ...staying]);
      if (new Set(paths).size !== paths.length || staying.some((path) => paths.includes(path)) || assetMoves.some((move) => taken.has(move.to.toLowerCase()))) {
        used();
        return;
      }
      let html = cur.html;
      let css = cur.css;
      let js = cur.js;
      let files = moved;
      let assets = cur.assets;
      try {
        for (const move of assetMoves) {
          const saved = await api.moveAsset(cur.id, move.from, move.to);
          assets = assets.map((asset) => (asset.path === move.from ? { ...asset, path: saved.path, url: saved.url, mime: saved.mime } : asset));
          html = replacePath(html, move.from, move.to);
          css = replacePath(css, move.from, move.to);
          js = replacePath(js, move.from, move.to);
          files = files.map((file) => (file.folder ? file : { ...file, content: replacePath(file.content, move.from, move.to) }));
        }
      } catch (error) {
        setToast(error instanceof Error ? error.message : (lang === "ar" ? "تعذر نقل المجلد" : "Could not move that folder"));
        return;
      }
      pageRef.current = shiftPath(pageRef.current, from, dest);
      setPagePath(pageRef.current);
      setClosedPages((items) => items.map((item) => shiftPath(item, from, dest)));
      setExtraPath((current) => (current ? shiftPath(current, from, dest) : current));
      const next = { ...cur, html, css, js, files, assets };
      projectRef.current = next;
      setProject(next);
      if (assetMoves.length) syncFrame(next);
      void persist(next);
    },
    reloadProject: async () => {
      await saveNow();
      const current = projectRef.current;
      if (!current) return;
      const next = await api.project(current.id);
      projectRef.current = next;
      setProject(next);
      rememberSaved(next);
      if (pageRef.current !== "index.html" && !(next.files || []).some((file) => file.path === pageRef.current && !file.folder)) {
        pageRef.current = "index.html";
        setPagePath("index.html");
        post({ cmd: "html", html: editorHtml(next.html, next.id) });
      }
      setExtraPath((current) => (current && (next.files || []).some((file) => file.path === current && !file.folder) ? current : null));
    },
    selection,
    contextAt,
    closeContext: () => setContextAt(null),
    tableWindow,
    openTableWindow: () => setTableWindow(true),
    closeTableWindow: () => setTableWindow(false),
    xray,
    setXray,
    big,
    setBig: (on: boolean) => setBigState(on),
    theme,
    setTheme: (value: "light" | "dark") => setThemeState(value),
    mission,
    setMission,
    consoleLines,
    clearConsole: () => setConsoleLines([]),
    modal,
    setModal,
    toast,
    setToast,
    clearToast: () => setToast(null),
    celebrate,
    spot,
    frameRef,
    srcDoc,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    hist,
    blocks: BLOCKS,
    edit,
    insertBlock,
    insertMarkup,
    command,
    copyEdit,
    cutEdit,
    pasteEdit,
    selectAllEdit,
    deleteEdit,
    findNext,
    replaceEdit,
    applyKit,
    setPageBackground,
    useAssetBackground,
    setFont,
    toggleFx,
    saveNow,
    undo,
    redo,
    openProject,
    createSite,
    deleteSite,
    uploadFiles,
    exportZip,
    saveFolder,
    preview,
    run,
    showMe,
    addEvent,
    removeAsset: async (path: string) => {
      const current = projectRef.current;
      if (!current) return;
      await api.removeAsset(current.id, path);
      const next = { ...current, assets: current.assets.filter((asset) => asset.path !== path) };
      projectRef.current = next;
      setProject(next);
    },
    importSite: async (files: File[]) => {
      const next = await api.importSite(files);
      past.current = [];
      future.current = [];
      projectRef.current = next;
      setProject(next);
      setProjects((list) => [summaryOf(next), ...list.filter((item) => item.id !== next.id)]);
      setSelection(null);
      rememberSaved(next);
      setModal(null);
      setToast(lang === "ar" ? "تم فتح الموقع" : "Website opened");
    },
    rename: (name: string) => {
      const next = commit((current) => ({ ...current, name, title: current.title === current.name ? name : current.title }), false);
      if (next) document.title = `${next.name} · Web Studio`;
    },
    setMeta: (title: string, siteLang: "en" | "ar") => {
      const next = commit((current) => ({ ...current, title, site_lang: siteLang }), false);
      if (next) syncFrame(next, "html");
      setModal(null);
    },
    confirmTable: (cols: number, rows: number, header: boolean, path: number[] | null, tag: string) => {
      const block = blockById("table");
      const arabic = langRef.current === "ar" || projectRef.current?.site_lang === "ar";
      insertMarkup(tableHtml(cols, rows, header, arabic), block?.css, path, tag);
      setModal(null);
    },
    enterThisComputer,
    joinClass,
    createClass,
    enterAsTeacher,
    leaveClass,
    loadClass,
    publishLesson,
    removeLesson,
    startLesson,
    openStudent,
    stopHelping,
    saveNote,
    startMission: async (id: string, fresh: boolean) => {
      if (fresh) await createSite(lang === "ar" ? "موقعي الأول" : "My first website", "blank", lang);
      passedRef.current = 0;
      setMission((current) => ({ ...current, active: id }));
      setTab("missions");
      setModal(null);
    },
  };
}

async function writeText(dir: FileSystemDirectoryHandle, name: string, text: string) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function ensureFolder(dir: FileSystemDirectoryHandle, path: string) {
  let current = dir;
  for (const part of path.split("/").filter(Boolean)) current = await current.getDirectoryHandle(part, { create: true });
}

async function writeNested(dir: FileSystemDirectoryHandle, path: string, text: string) {
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return;
  let current = dir;
  for (const part of parts) current = await current.getDirectoryHandle(part, { create: true });
  await writeText(current, name, text);
}

async function writeBlob(dir: FileSystemDirectoryHandle, path: string, blob: Blob) {
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return;
  let current = dir;
  for (const part of parts) current = await current.getDirectoryHandle(part, { create: true });
  const handle = await current.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export type Studio = ReturnType<typeof useStudio>;

