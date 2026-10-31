# Web Studio · استوديو الويب

A teaching tool for designing websites by **drag and drop** while seeing the
**real HTML and CSS** behind every change. Built for lectures: bilingual
(English / العربية, with right-to-left support) and laptop-first.

## What students can do (Phase 1)

| Area | Features |
| --- | --- |
| **Toolbox** | Headings, paragraph, quote, link, button · bulleted, numbered and nested lists · table · image, video, YouTube, map, gallery · section, 2/3/4 columns, card, divider, spacer · contact form, inputs, dropdown, checkbox · nav bar, hero, features, footer |
| **Format** | Bold, italic, underline, strikethrough, align left/center/right/justify, text and background colour, size, link. Works on selected text while typing, or on the whole element |
| **Context tools** | Tables: add/delete rows and columns · Lists: add/remove items, switch bullets ↔ numbers · Images: replace · Any element: select parent, duplicate, delete |
| **Style panel** | Text, size & spacing, background & border, layout (flex/grid) |
| **Modes** | **Visual**, **Split** (page above, code below, drag the bar to resize) and **Code** |
| **Linked code** | Click an element → its HTML lines *and* the CSS rules that style it light up. Click a line of code → that element is selected on the page. Typing in the code updates the page live |
| **Teaching aids** | “What is this?” card explains the selected tag in plain language · breadcrumb (`body › section › h2`) · Structure tab shows the DOM tree · projector size button |
| **Files** | New website (blank / personal page / landing page) · My projects (autosaved in the browser) · Open a ZIP, HTML files or a folder · Save to a real folder (Chrome/Edge) · Download ZIP · Preview in a new tab · Paste HTML · Paste an image straight from the clipboard |

Images live inside the project but always appear in the code and in downloads
as real files (`images/photo.png`). A download is a normal website folder:

```
my-website/
  index.html
  style.css
  images/…
```

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5180. `npm run build` makes a static site in `dist/` that
can be served from any folder on any web server (no backend needed yet).

## How it is built

- [GrapesJS](https://grapesjs.com) (BSD-3) — drag-and-drop canvas, layers, style and settings panels.
- [CodeMirror 6](https://codemirror.net) — the code editors.
- `src/serialize.ts` — prints the page as tidy, indented HTML and records where each element sits in the text; this is what links canvas ↔ code.
- `src/cssparser.ts` — keeps CSS as written (GrapesJS’ default parser expands `padding: 8px 16px` into four lines).
- `src/assets.ts` — maps embedded images to `images/…` file paths.
- `src/project.ts` — browser storage (IndexedDB), ZIP / folder import and export, starter templates.

## Roadmap

1. ✅ **Editor** — this version.
2. **Multi-page sites** — file explorer, site map with link arrows, shared CSS, shared header/footer, asset library.
3. **Accounts** — username/password, personal server workspace, version history.
4. **Classroom** — teacher dashboard, class gallery, challenges, Learn mode.
