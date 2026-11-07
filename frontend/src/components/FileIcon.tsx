import type { ReactNode } from "react";

const IMAGES = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"];
const SCRIPTS = ["js", "mjs", "cjs", "ts", "jsx", "tsx"];
const VIDEO = ["mp4", "webm", "mov", "ogv"];
const AUDIO = ["mp3", "wav", "ogg"];
const FONTS = ["woff", "woff2", "ttf", "otf"];

export function FileIcon({ name, kind }: { name?: string; kind?: string }) {
  return (
    <svg className="file-ico" viewBox="0 0 16 16" aria-hidden="true">
      {glyph(kind || kindOf(name || ""))}
    </svg>
  );
}

function kindOf(name: string) {
  const base = (name.split("/").pop() || name).toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1) : "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css" || ext === "scss" || ext === "less") return "css";
  if (SCRIPTS.includes(ext)) return "js";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "svg") return "svg";
  if (IMAGES.includes(ext)) return "image";
  if (ext === "json") return "json";
  if (ext === "pdf") return "pdf";
  if (ext === "txt" || ext === "text") return "txt";
  if (ext === "xml") return "xml";
  if (ext === "zip") return "zip";
  if (VIDEO.includes(ext)) return "video";
  if (AUDIO.includes(ext)) return "audio";
  if (FONTS.includes(ext)) return "font";
  return "file";
}

function glyph(kind: string) {
  if (kind === "site") return <Site />;
  if (kind === "folder") return <Folder />;
  if (kind === "image") return <Picture />;
  if (kind === "html") return <Sheet fill="#e39b12" fold="#ffe3a3"><Brackets /></Sheet>;
  if (kind === "css") return <Sheet fill="#2b7fc4" fold="#c5e4fb"><Hash /></Sheet>;
  if (kind === "js") return <Sheet fill="#c8960a" fold="#ffe7a3"><Letters>JS</Letters></Sheet>;
  if (kind === "md") return <Sheet fill="#5c6f82" fold="#d5dee8"><Letters>M</Letters></Sheet>;
  if (kind === "svg") return <Sheet fill="#c45a9a" fold="#f8d0e6"><Pen /></Sheet>;
  if (kind === "json") return <Sheet fill="#b8860b" fold="#ffe7a3"><Braces /></Sheet>;
  if (kind === "pdf") return <Sheet fill="#c4473a" fold="#f6c7c2"><Letters>PDF</Letters></Sheet>;
  if (kind === "txt") return <Sheet fill="#8a8f98" fold="#e4e6ea"><Lines /></Sheet>;
  if (kind === "xml") return <Sheet fill="#2f8f4e" fold="#cfeedd"><Brackets /></Sheet>;
  if (kind === "zip") return <Zip />;
  if (kind === "video") return <Video />;
  if (kind === "audio") return <Audio />;
  if (kind === "font") return <Sheet fill="#6b5b95" fold="#e0d8f2"><Letters>A</Letters></Sheet>;
  return <Sheet fill="#8aa0b4" fold="#d5e2ee" />;
}

function Sheet({ fill, fold, children }: { fill: string; fold: string; children?: ReactNode }) {
  return (
    <>
      <path fill={fill} d="M2.2 1.1h7.1L13.8 5.5V14.9H2.2z" />
      <path fill={fold} d="M9.3 1.1V5.5h4.5z" />
      {children}
    </>
  );
}

function Brackets() {
  return <path fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M6.7 7.4 4.4 9.7l2.3 2.3M9.3 7.4l2.3 2.3-2.3 2.3" />;
}

function Hash() {
  return <path fill="none" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" d="M6.3 7.2 5.4 12.2M9.2 7.2 8.3 12.2M4.4 8.7h5.4M4 10.7h5.4" />;
}

function Braces() {
  return <path fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" d="M6.6 7.5c-.9 0-.9.8-.2 1.1-.8.2-.8 1.1.2 1.1M8.2 7.5c.9 0 .9.8.2 1.1.8.2.8 1.1-.2 1.1" />;
}

function Pen() {
  return <path fill="#fff" d="M5.2 11.6 8.8 6.4l1.5 1.1-3.6 5.2z" />;
}

function Lines() {
  return <path fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" d="M4.6 8h5.2M4.6 10h4.2" />;
}

function Letters({ children }: { children: string }) {
  return (
    <text x="8" y="12.4" textAnchor="middle" fill="#fff" fontFamily="Segoe UI, Tahoma, sans-serif" fontSize={children.length > 2 ? 4.2 : 6.4} fontWeight="700">
      {children}
    </text>
  );
}

function Folder() {
  return (
    <>
      <path fill="#d7a21a" d="M1.4 3.2h4.6l1.2 1.3h7.4v8.2H1.4z" />
      <path fill="#f0c84a" d="M1.4 5.6h13.2v7.1H1.4z" />
    </>
  );
}

function Picture() {
  return (
    <>
      <rect x="1.6" y="2.4" width="12.8" height="11.2" rx="1.3" fill="#3d8ec4" />
      <circle cx="5.2" cy="6" r="1.25" fill="#fff" />
      <path fill="#fff" d="M2.4 12.2 5.8 8.2 7.7 10.2 10 7.2 13.6 12.2z" />
    </>
  );
}

function Site() {
  return (
    <>
      <rect x="1.4" y="2.2" width="13.2" height="9.2" rx="1.2" fill="#1a6fb5" />
      <rect x="2.6" y="3.4" width="10.8" height="6.6" fill="#d7ebfa" />
      <path fill="none" stroke="#1a6fb5" strokeWidth="1.2" strokeLinecap="round" d="M6.2 13.6h3.6M8 11.4v2.2" />
    </>
  );
}

function Zip() {
  return (
    <>
      <Sheet fill="#c47b2b" fold="#f6d7b0" />
      <path fill="#fff" d="M7.2 6.4h1.6v1.1H7.2zM7.2 8.2h1.6v1.1H7.2zM7.2 10h1.6v1.2H7.2z" />
    </>
  );
}

function Video() {
  return (
    <>
      <rect x="1.5" y="3.4" width="9.2" height="9.2" rx="1.2" fill="#5b4b8a" />
      <path fill="#5b4b8a" d="M10.4 6.4 14.4 4.6v6.8l-4-1.8z" />
      <path fill="#fff" d="M4.6 6.2 8.2 8 4.6 9.8z" />
    </>
  );
}

function Audio() {
  return (
    <>
      <path fill="#2f8f4e" d="M6.2 2.4v7.2a2.3 2.3 0 1 1-1.3-2.1V4.2l6-.9v5.2a2.3 2.3 0 1 1-1.3-2.1V2.4z" />
    </>
  );
}
