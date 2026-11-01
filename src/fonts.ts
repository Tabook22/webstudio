/** Fonts students can pick. Google fonts are linked automatically when used. */
export const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Playfair Display', 'Merriweather',
  'Pacifico', 'Cairo', 'Tajawal', 'Amiri', 'Noto Kufi Arabic', 'Changa',
];

const SAFE_FONTS: [string, string][] = [
  ['System', 'system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif'],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Tahoma', 'Tahoma, Geneva, sans-serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Courier New', '"Courier New", monospace'],
];

const generic = (f: string) =>
  ['Playfair Display', 'Merriweather', 'Amiri'].includes(f) ? 'serif' : f === 'Pacifico' ? 'cursive' : 'sans-serif';

/** [label, css value] pairs, safe fonts first. */
export const FONT_OPTIONS: [string, string][] = [
  ...SAFE_FONTS,
  ...GOOGLE_FONTS.map((f): [string, string] => [`${f} (Google)`, `"${f}", ${generic(f)}`]),
];

/** The <link> needed for the Google fonts used in this CSS, or '' if none. */
export function googleFontsHref(css: string): string {
  const used = GOOGLE_FONTS.filter((f) => css.includes(`"${f}"`) || css.includes(`'${f}'`));
  if (!used.length) return '';
  const families = used.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;700`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Keep the canvas loading the same Google fonts the page will use. */
export function syncCanvasFonts(doc: Document | null | undefined, css: string) {
  if (!doc?.head) return;
  const href = googleFontsHref(css);
  let link = doc.getElementById('ws-fonts') as HTMLLinkElement | null;
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = doc.createElement('link');
    link.id = 'ws-fonts';
    link.rel = 'stylesheet';
    doc.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.href = href;
}
