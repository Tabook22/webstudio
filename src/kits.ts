import type { Editor } from 'grapesjs';
import { lang } from './i18n';
import { parseCss } from './cssparser';
import { formatCss } from './serialize';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

export interface Kit {
  id: string;
  name: Pair;
  mood: Pair;
  vars: Record<string, string>;
}

const font = (name: string, generic = 'sans-serif') => `"${name}", ${generic}`;

/** Colour + font + shape systems, expressed as CSS custom properties. */
export const KITS: Kit[] = [
  {
    id: 'indigo', name: ['Indigo', 'نيلي'], mood: ['Modern & clean', 'عصري ونظيف'],
    vars: {
      '--color-primary': '#5b4cf0', '--color-secondary': '#06b6d4', '--color-on-primary': '#ffffff',
      '--color-bg': '#ffffff', '--color-surface': '#f5f7fb', '--color-text': '#334155', '--color-heading': '#0f172a',
      '--color-dark': '#0f172a', '--radius': '12px',
      '--font-heading': font('Poppins'), '--font-body': font('Inter'),
    },
  },
  {
    id: 'ocean', name: ['Ocean', 'المحيط'], mood: ['Calm & fresh', 'هادئ ومنعش'],
    vars: {
      '--color-primary': '#0369a1', '--color-secondary': '#14b8a6', '--color-on-primary': '#ffffff',
      '--color-bg': '#f0f9ff', '--color-surface': '#ffffff', '--color-text': '#24425a', '--color-heading': '#0c2d48',
      '--color-dark': '#082f49', '--radius': '16px',
      '--font-heading': font('Montserrat'), '--font-body': font('Open Sans'),
    },
  },
  {
    id: 'sunset', name: ['Sunset', 'الغروب'], mood: ['Warm & friendly', 'دافئ وودود'],
    vars: {
      '--color-primary': '#ea580c', '--color-secondary': '#db2777', '--color-on-primary': '#ffffff',
      '--color-bg': '#fff7ed', '--color-surface': '#ffffff', '--color-text': '#57392a', '--color-heading': '#431407',
      '--color-dark': '#431407', '--radius': '20px',
      '--font-heading': font('Poppins'), '--font-body': font('Lato'),
    },
  },
  {
    id: 'forest', name: ['Forest', 'الغابة'], mood: ['Natural & classic', 'طبيعي وكلاسيكي'],
    vars: {
      '--color-primary': '#15803d', '--color-secondary': '#65a30d', '--color-on-primary': '#ffffff',
      '--color-bg': '#f7fbf2', '--color-surface': '#ffffff', '--color-text': '#334033', '--color-heading': '#14321f',
      '--color-dark': '#14321f', '--radius': '8px',
      '--font-heading': font('Merriweather', 'serif'), '--font-body': font('Lato'),
    },
  },
  {
    id: 'mono', name: ['Minimal', 'بسيط'], mood: ['Black & white', 'أبيض وأسود'],
    vars: {
      '--color-primary': '#111827', '--color-secondary': '#6b7280', '--color-on-primary': '#ffffff',
      '--color-bg': '#ffffff', '--color-surface': '#f4f4f5', '--color-text': '#3f3f46', '--color-heading': '#09090b',
      '--color-dark': '#09090b', '--radius': '4px',
      '--font-heading': font('Inter'), '--font-body': font('Inter'),
    },
  },
  {
    id: 'night', name: ['Night', 'الليل'], mood: ['Dark & bold', 'داكن وجريء'],
    vars: {
      '--color-primary': '#a78bfa', '--color-secondary': '#22d3ee', '--color-on-primary': '#0b1020',
      '--color-bg': '#0b1020', '--color-surface': '#151b2e', '--color-text': '#cbd5e1', '--color-heading': '#ffffff',
      '--color-dark': '#05070f', '--radius': '14px',
      '--font-heading': font('Poppins'), '--font-body': font('Inter'),
    },
  },
  {
    id: 'heritage', name: ['Omani heritage', 'التراث العُماني'], mood: ['Red, green & sand', 'أحمر وأخضر ورملي'],
    vars: {
      '--color-primary': '#b91c1c', '--color-secondary': '#15803d', '--color-on-primary': '#ffffff',
      '--color-bg': '#fffbf2', '--color-surface': '#f6ecd9', '--color-text': '#4a3a2c', '--color-heading': '#7f1d1d',
      '--color-dark': '#2b1d14', '--radius': '10px',
      '--font-heading': font('Amiri', 'serif'), '--font-body': font('Tajawal'),
    },
  },
  {
    id: 'playful', name: ['Playful', 'مرح'], mood: ['Bright & fun', 'زاهٍ وممتع'],
    vars: {
      '--color-primary': '#db2777', '--color-secondary': '#f59e0b', '--color-on-primary': '#ffffff',
      '--color-bg': '#fdf4ff', '--color-surface': '#ffffff', '--color-text': '#4a3352', '--color-heading': '#701a75',
      '--color-dark': '#3b0a3f', '--radius': '24px',
      '--font-heading': font('Changa'), '--font-body': font('Poppins'),
    },
  },
];

/** Rules that make the page use the kit's variables. */
const USAGE = `
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-heading); }
a { color: var(--color-primary); }
.btn { background: var(--color-primary); color: var(--color-on-primary); border-radius: var(--radius); }
.card { background: var(--color-surface); border-radius: var(--radius); }
.hero { background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: var(--color-on-primary); }
.hero h1 { color: var(--color-on-primary); }
.navbar, .footer { background: var(--color-dark); }
.table th { background: var(--color-surface); }
`;

export function kitCss(kit: Kit) {
  const vars = Object.entries(kit.vars).map(([k, v]) => `${k}: ${v};`).join(' ');
  return formatCss(`:root { ${vars} }\n${USAGE}`);
}

export const kitLabel = (k: Kit) => tx(k.name);
export const kitMood = (k: Kit) => tx(k.mood);

/** The kit currently in the page's :root rule, if any. */
export function currentKitId(editor: Editor): string | null {
  const root = editor.Css.getRule(':root')?.getStyle() as Record<string, string> | undefined;
  if (!root) return null;
  return KITS.find((k) => k.vars['--color-primary'] === root['--color-primary'] && k.vars['--font-body'] === root['--font-body'])?.id ?? null;
}

/** Merge the kit into the page: :root variables plus rules that use them. */
export function applyKit(editor: Editor, kit: Kit) {
  for (const rule of parseCss(kitCss(kit))) {
    const existing = editor.Css.getRule(rule.selectors);
    const style = { ...(existing?.getStyle() ?? {}), ...rule.style };
    editor.Css.setRule(rule.selectors, style);
  }
}
