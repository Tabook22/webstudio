import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Studio } from "../studio";
import type { Asset, Project, SiteFile } from "../types";
import { FileIcon } from "./FileIcon";

const NAME = /^[\p{L}\p{N}_][\p{L}\p{N}_. -]{0,40}$/u;
const RESERVED = new Set(["index.html", "style.css", "script.js", "images"]);

type Kind = "site" | "html" | "css" | "js" | "folder" | "file" | "image";
type Node = { key: string; name: string; path: string; kind: Kind; locked: boolean; children?: Node[] };
type Draft = { parent: string; folder: boolean; name: string };
type Menu = { x: number; y: number; path: string; kind: Kind; locked: boolean; parent: string };

export function FolderList({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const project = studio.project;
  const [rootOpen, setRootOpen] = useState(true);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["images"]));
  const [home, setHome] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [spin, setSpin] = useState(false);
  const dragRef = useRef<Node | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const skipBlur = useRef(false);
  const committing = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  if (!project) return null;
  const tree = buildTree(project);

  const toggle = (path: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const reveal = (parent: string) => {
    setRootOpen(true);
    if (!parent) return;
    setOpen((current) => {
      const next = new Set(current);
      const parts = parent.split("/");
      for (let i = 1; i <= parts.length; i += 1) next.add(parts.slice(0, i).join("/"));
      return next;
    });
  };

  const begin = (folder: boolean, parent = home) => {
    if (parent === "images" || parent.startsWith("images/")) {
      studio.setToast(tx("Add pictures from the Pictures tab.", "أضف الصور من تبويب الصور."));
      return;
    }
    reveal(parent);
    setDraft({ parent, folder, name: "" });
    setMenu(null);
  };

  const commitDraft = () => {
    if (committing.current || !draft) return;
    committing.current = true;
    const name = draft.name.trim();
    const parent = draft.parent;
    const folder = draft.folder;
    setDraft(null);
    if (!NAME.test(name) || name === "." || name === "..") {
      if (name) studio.setToast(tx("Use a plain file name, without / or \\.", "استخدم اسمًا بسيطًا من غير / أو \\."));
      committing.current = false;
      return;
    }
    const path = parent ? `${parent}/${name}` : name;
    const low = path.toLowerCase();
    const files = project.files || [];
    if (RESERVED.has(low) || low.startsWith("images/") || files.some((file) => file.path.toLowerCase() === low)) {
      studio.setToast(tx("That name is already used.", "هذا الاسم مستخدم."));
      committing.current = false;
      return;
    }
    studio.changeFiles([...files, { path, folder, content: "" }]);
    if (!folder && isHtml(path)) studio.openPage(path);
    else if (!folder) studio.openExtra(path);
    else {
      setHome(path);
      reveal(path);
    }
    committing.current = false;
  };

  const removeNode = (path: string, kind: Kind) => {
    const label = path.split("/").pop() || path;
    if (kind === "image") {
      if (!window.confirm(tx(`Delete ${label}?`, `حذف ${label}؟`))) return;
      void studio.removeAsset(path);
      return;
    }
    const folder = kind === "folder";
    const question = folder
      ? tx(`Delete the folder ${label} and everything inside it?`, `حذف المجلد ${label} وكل ما بداخله؟`)
      : tx(`Delete ${label}?`, `حذف ${label}؟`);
    if (!window.confirm(question)) return;
    const files = (project.files || []).filter((file) => file.path !== path && !file.path.startsWith(`${path}/`));
    studio.changeFiles(files);
    if (home === path || home.startsWith(`${path}/`)) setHome("");
  };

  const refresh = () => {
    setSpin(true);
    void studio.reloadProject().finally(() => window.setTimeout(() => setSpin(false), 500));
  };

  const openNode = (node: Node) => {
    if (node.kind === "site") {
      setRootOpen((value) => !value);
      setHome("");
      return;
    }
    if (node.kind === "folder") {
      setHome(node.path);
      toggle(node.path);
      if (node.path === "images") studio.setTab("images");
      return;
    }
    setHome(parentOf(node.path));
    if (node.kind === "html") {
      studio.openPage(node.path);
    } else if (node.kind === "css" || node.kind === "js") {
      studio.closeExtra();
      studio.setMode("code");
      studio.setCodeTab(node.kind);
    } else if (node.kind === "image") {
      studio.insertMarkup(`<img src="${node.path}" alt="" style="max-width:100%">`, undefined, studio.selection?.path || null, studio.selection?.tag || "");
    } else {
      studio.openExtra(node.path);
    }
  };

  const selected = (node: Node) => {
    if (node.kind === "html") return studio.pagePath === node.path && !studio.extraPath;
    if (node.kind === "css" || node.kind === "js") return studio.mode === "code" && !studio.extraPath && studio.codeTab === node.kind;
    if (node.kind === "file") return studio.mode === "code" && studio.extraPath === node.path;
    return false;
  };

  const showMenu = (event: MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    const parent = node.kind === "folder" || node.kind === "site" ? (node.kind === "site" ? "" : node.path) : parentOf(node.path);
    if (node.kind !== "site") setHome(node.kind === "folder" ? node.path : parent);
    setMenu({ x: event.clientX, y: event.clientY, path: node.path, kind: node.kind, locked: node.locked, parent });
  };

  const renderNodes = (nodes: Node[], depth: number): ReactNode => nodes.map((node) => {
    const expanded = node.kind === "site" ? rootOpen : open.has(node.path);
    const canExpand = node.kind === "site" || node.kind === "folder";
    return (
      <div key={node.key}>
        <div
          className="tree-row"
          data-on={selected(node) ? "true" : "false"}
          data-drop={over === node.key ? "true" : "false"}
          style={{ paddingInlineStart: 4 + depth * 12 }}
          onDragOver={(event) => {
            const from = dragRef.current;
            const dest = dropFolder(node);
            if (!from || dest === null || !canDrop(from, dest)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (over !== node.key) setOver(node.key);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const from = dragRef.current;
            const dest = dropFolder(node);
            dragRef.current = null;
            setOver(null);
            if (!from || dest === null || !canDrop(from, dest)) return;
            void studio.moveItem(from.path, from.kind, dest);
            if (dest) reveal(dest);
          }}
        >
          <button type="button" className="twisty" data-open={expanded ? "true" : "false"} aria-label={tx("Expand", "توسيع")} onClick={() => (node.kind === "site" ? setRootOpen((value) => !value) : toggle(node.path))}>
            {canExpand ? <Caret /> : null}
          </button>
          <button
            type="button"
            className="tree-main"
            draggable={canDrag(node)}
            onDragStart={(event) => {
              if (!canDrag(node)) {
                event.preventDefault();
                return;
              }
              dragRef.current = node;
              event.dataTransfer.setData("text/plain", node.path);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              dragRef.current = null;
              setOver(null);
            }}
            onClick={() => openNode(node)}
            onContextMenu={(event) => showMenu(event, node)}
          >
            <FileIcon kind={node.kind === "file" || node.kind === "image" ? undefined : node.kind} name={node.kind === "file" || node.kind === "image" ? node.path : undefined} />
            <span dir="auto">{node.name}</span>
          </button>
        </div>
        {canExpand && expanded && (
          <>
            {node.children && renderNodes(node.children, depth + 1)}
            {draft && draft.parent === (node.kind === "site" ? "" : node.path) && (
              <label className="tree-row" style={{ paddingInlineStart: 20 + (depth + 1) * 12 }}>
                <FileIcon kind={draft.folder ? "folder" : "file"} />
                <input
                  className="tree-input"
                  autoFocus
                  dir="auto"
                  value={draft.name}
                  placeholder={draft.folder ? tx("Folder name", "اسم المجلد") : tx("File name", "اسم الملف")}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitDraft();
                    } else if (event.key === "Escape") {
                      skipBlur.current = true;
                      setDraft(null);
                    }
                  }}
                  onBlur={() => {
                    if (skipBlur.current) {
                      skipBlur.current = false;
                      return;
                    }
                    commitDraft();
                  }}
                />
              </label>
            )}
          </>
        )}
      </div>
    );
  });

  return (
    <div className="folder-list">
      <div className="ew-caption">
        <span>{tx("Folder List", "قائمة المجلدات")}</span>
        <div className="folder-tools">
          <button type="button" title={tx("New File", "ملف جديد")} onClick={() => begin(false)}><NewFileIcon /></button>
          <button type="button" title={tx("New Folder", "مجلد جديد")} onClick={() => begin(true)}><NewFolderIcon /></button>
          <button type="button" className={spin ? "spin" : ""} title={tx("Refresh", "تحديث")} onClick={refresh}><RefreshIcon /></button>
          <button type="button" title={tx("Collapse All", "طي الكل")} onClick={() => { setRootOpen(false); setOpen(new Set()); }}><CollapseIcon /></button>
        </div>
      </div>
      <div className="folder-tree">{renderNodes(tree, 0)}</div>
      {menu && (
        <div className="tree-menu" style={{ left: menu.x, top: menu.y }} onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => begin(false, menu.kind === "folder" || menu.kind === "site" ? menu.parent : parentOf(menu.path))}>{tx("New File", "ملف جديد")}</button>
          <button type="button" onClick={() => begin(true, menu.kind === "folder" || menu.kind === "site" ? menu.parent : parentOf(menu.path))}>{tx("New Folder", "مجلد جديد")}</button>
          {!menu.locked && menu.kind !== "site" && <button type="button" className="danger" onClick={() => { setMenu(null); removeNode(menu.path, menu.kind); }}>{tx("Delete", "حذف")}</button>}
          <button type="button" onClick={() => { setMenu(null); refresh(); }}>{tx("Refresh", "تحديث")}</button>
        </div>
      )}
    </div>
  );
}

function buildTree(project: Project): Node[] {
  const files = project.files || [];
  const extras = nodesUnder(files, "");
  const images: Node = { key: "images", name: "images", path: "images", kind: "folder", locked: true, children: [] };
  const children: Node[] = [
    { key: "index.html", name: "index.html", path: "index.html", kind: "html", locked: true },
    { key: "style.css", name: "style.css", path: "style.css", kind: "css", locked: true },
    { key: "script.js", name: "script.js", path: "script.js", kind: "js", locked: true },
    images,
    ...extras.filter((item) => item.kind === "folder"),
    ...extras.filter((item) => item.kind !== "folder"),
  ];
  for (const asset of project.assets) placeAsset(children, asset);
  return [{ key: "site", name: project.name, path: "", kind: "site", locked: true, children }];
}

function placeAsset(nodes: Node[], asset: Asset) {
  const parent = parentOf(asset.path);
  const holder = parent ? ensureChain(nodes, parent) : null;
  const node = imageNode(asset);
  if (holder?.children) holder.children.push(node);
  else nodes.push(node);
}

function ensureChain(nodes: Node[], folderPath: string) {
  const parts = folderPath.split("/");
  let list = nodes;
  let current: Node | null = null;
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    let found = list.find((item) => item.kind === "folder" && item.path === acc);
    if (!found) {
      found = { key: acc, name: part, path: acc, kind: "folder", locked: acc === "images" || acc.startsWith("images/"), children: [] };
      list.push(found);
    }
    found.children = found.children || [];
    current = found;
    list = found.children;
  }
  return current;
}

function nodesUnder(files: SiteFile[], parent: string): Node[] {
  return files
    .filter((file) => file.path !== "exam.json" && parentOf(file.path) === parent)
    .sort((a, b) => Number(b.folder) - Number(a.folder) || a.path.localeCompare(b.path))
    .map((file) => ({
      key: file.path,
      name: file.path.split("/").pop() || file.path,
      path: file.path,
      kind: file.folder ? "folder" : isHtml(file.path) ? "html" : "file",
      locked: false,
      children: file.folder ? nodesUnder(files, file.path) : undefined,
    }));
}

function imageNode(asset: Asset): Node {
  return { key: asset.path, name: asset.path.split("/").pop() || asset.path, path: asset.path, kind: "image", locked: false };
}

function parentOf(path: string) {
  const at = path.lastIndexOf("/");
  return at < 0 ? "" : path.slice(0, at);
}

function canDrag(node: Node) {
  return !node.locked && node.kind !== "site";
}

function dropFolder(node: Node) {
  if (node.kind === "site") return "";
  if (node.kind === "folder") return node.path;
  return null;
}

function canDrop(from: Node, destFolder: string) {
  if (!canDrag(from)) return false;
  const dest = destFolder ? `${destFolder}/${from.name}` : from.name;
  if (dest === from.path) return false;
  if (from.kind !== "image" && (destFolder === "images" || destFolder.startsWith("images/"))) return false;
  if (from.kind === "folder" && (destFolder === from.path || destFolder.startsWith(`${from.path}/`))) return false;
  return true;
}

function isHtml(path: string) {
  const name = path.toLowerCase();
  return name.endsWith(".html") || name.endsWith(".htm");
}

function Caret() {
  return <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M6 4.2 10.2 8 6 11.8z" /></svg>;
}
function NewFileIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="#e39b12" d="M3 1.4h6.2L12.6 4.8V13.2H3z" /><path fill="#fff" d="M9.2 1.4V4.8h3.4z" /><path fill="#1a6fb5" d="M11.2 8.2h1.4V9.6h1.4v1.4h-1.4v1.4H11.2v-1.4H9.8V9.6h1.4z" /></svg>;
}
function NewFolderIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path fill="#e0b000" d="M1.4 3.2h5l1.3 1.4H14.6V13H1.4z" /><path fill="#1a6fb5" d="M11.1 7.2h1.3v1.3h1.3v1.3h-1.3v1.3H11.1v-1.3H9.8V8.5h1.3z" /></svg>;
}
function RefreshIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="#1a6fb5" strokeWidth="1.6" strokeLinecap="round" d="M13 8a5 5 0 1 1-1.4-3.4" /><path fill="#1a6fb5" d="M12.2 2.2v3.4H8.8z" /></svg>;
}
function CollapseIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="#1a6fb5" strokeWidth="1.5" strokeLinecap="round" d="M3 5.2h6.2M3 10.8h6.2" /><path fill="#1a6fb5" d="M11.2 3.6 14.2 5.2 11.2 6.8zM11.2 9.2 14.2 10.8 11.2 12.4z" /></svg>;
}
