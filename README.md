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
| **Images tab** | The project's image library. Drop pictures from the computer (or click to upload), then drag a thumbnail onto the page — or onto the Background box. Hover a thumbnail for Insert / Use as background / Delete. Images can also be dropped from the desktop straight onto the page |
| **Backgrounds** | One card for the selected element — or the whole page (“Page” button): 16 colour swatches + custom colour, 6 gradients, an image drop box with Fill / Fit / Tile, “Darken image” and “Stay fixed when scrolling” |
| **Quick effects** | Rounded, shadow, border, padding, center, and hover effects (grow, lift) written as real `:hover` CSS rules |
| **CSS tools** | Classes & states panel (add a class, style `:hover`), 20 fonts including Google Fonts (the `<link>` is added to the HTML automatically) |
| **JavaScript** | `script.js` tab with 8 ready-made examples (click events, dark mode, show/hide, form check, counter…). **Run** opens the page; `console.log`, warnings and errors (with the script.js line number) appear in the **Console** tab |
| **HTML tools** | **Check page** finds beginner mistakes (missing alt text, several `<h1>`, skipped heading levels, empty links, fields without labels, duplicate ids) and jumps to each one · Emmet shortcuts in the code (`ul>li*3` + Tab) · HTML5 blocks: header, main, article, aside, accordion (`<details>`), audio, code sample, embedded page |
| **Files** | New website (blank / personal page / landing page) · My projects (autosaved in the browser) · Open a ZIP, HTML files or a folder · Save to a real folder (Chrome/Edge) · Download ZIP · Preview in a new tab · Paste HTML · Paste an image straight from the clipboard |

Images live inside the project but always appear in the code and in downloads
as real files (`images/photo.png`). A download is a normal website folder:

```
my-website/
  index.html
  style.css
  script.js      (when the site has JavaScript)
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
