import grapesjs, { type Component, type Editor } from 'grapesjs';
import arLocale from 'grapesjs/locale/ar.mjs';
import enLocale from 'grapesjs/locale/en.mjs';
import { lang, t } from './i18n';
import { registerBlocks } from './blocks';
import { addAsset, fileToDataUrl } from './assets';
import { parseCss } from './cssparser';
import { FONT_OPTIONS } from './fonts';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

const PROP_LABELS: Record<string, Pair> = {
  'font-family': ['Font', 'نوع الخط'],
  'font-size': ['Font size', 'حجم الخط'],
  'font-weight': ['Weight', 'سماكة الخط'],
  'font-style': ['Style', 'نمط الخط'],
  color: ['Text color', 'لون النص'],
  'line-height': ['Line height', 'ارتفاع السطر'],
  'letter-spacing': ['Letter spacing', 'تباعد الأحرف'],
  'text-align': ['Alignment', 'المحاذاة'],
  'text-decoration': ['Decoration', 'زخرفة النص'],
  'text-transform': ['Capitals', 'حالة الأحرف'],
  width: ['Width', 'العرض'],
  height: ['Height', 'الارتفاع'],
  'max-width': ['Max width', 'أقصى عرض'],
  'min-height': ['Min height', 'أدنى ارتفاع'],
  margin: ['Margin (outside space)', 'الهامش الخارجي'],
  padding: ['Padding (inside space)', 'الحشوة الداخلية'],
  'background-color': ['Background color', 'لون الخلفية'],
  background: ['Background image', 'صورة الخلفية'],
  border: ['Border', 'الحدود'],
  'border-radius': ['Rounded corners', 'استدارة الزوايا'],
  'box-shadow': ['Shadow', 'الظل'],
  opacity: ['Opacity', 'الشفافية'],
  display: ['Display', 'طريقة العرض'],
  'flex-direction': ['Direction', 'الاتجاه'],
  'justify-content': ['Justify', 'التوزيع'],
  'align-items': ['Align items', 'محاذاة العناصر'],
  'flex-wrap': ['Wrap', 'الالتفاف'],
  gap: ['Gap', 'الفجوة'],
  'object-fit': ['Image fit', 'ملاءمة الصورة'],
};

const SECTORS: { id: string; name: Pair; open?: boolean; properties: (string | object)[] }[] = [
  {
    id: 'typography', name: ['Text', 'النص'], open: true,
    properties: [
      { property: 'font-family', type: 'select', default: FONT_OPTIONS[0][1], options: FONT_OPTIONS.map(([label, id]) => ({ id, label })) },
      'font-size', 'font-weight', 'color', 'text-align', 'line-height', 'letter-spacing', 'text-decoration',
      { property: 'text-transform', type: 'select', default: 'none', options: [{ id: 'none' }, { id: 'uppercase' }, { id: 'lowercase' }, { id: 'capitalize' }] }],
  },
  {
    id: 'size', name: ['Size & spacing', 'الحجم والمسافات'],
    properties: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
  },
  {
    id: 'decorations', name: ['Background & border', 'الخلفية والحدود'],
    properties: ['background-color', 'background', 'border', 'border-radius', 'box-shadow',
      { property: 'opacity', type: 'slider', default: 1, min: 0, max: 1, step: 0.05 }],
  },
  {
    id: 'layout', name: ['Layout', 'التخطيط'],
    properties: [
      { property: 'display', type: 'select', default: 'block', options: [{ id: 'block' }, { id: 'inline' }, { id: 'inline-block' }, { id: 'flex' }, { id: 'grid' }, { id: 'none' }] },
      { property: 'flex-direction', type: 'radio', default: 'row', options: [{ id: 'row' }, { id: 'column' }], requires: { display: ['flex'] } },
      { property: 'justify-content', type: 'select', default: 'flex-start', options: [{ id: 'flex-start' }, { id: 'center' }, { id: 'flex-end' }, { id: 'space-between' }, { id: 'space-around' }], requires: { display: ['flex'] } },
      { property: 'align-items', type: 'select', default: 'stretch', options: [{ id: 'stretch' }, { id: 'flex-start' }, { id: 'center' }, { id: 'flex-end' }], requires: { display: ['flex'] } },
      { property: 'flex-wrap', type: 'radio', default: 'nowrap', options: [{ id: 'nowrap' }, { id: 'wrap' }], requires: { display: ['flex'] } },
      { property: 'gap', type: 'number', default: '0', units: ['px', 'rem', '%'], min: 0 },
      { property: 'object-fit', type: 'select', default: 'fill', options: [{ id: 'fill' }, { id: 'cover' }, { id: 'contain' }] },
    ],
  },
];

export function createEditor(): Editor {
  const labels = Object.fromEntries(Object.entries(PROP_LABELS).map(([k, v]) => [k, tx(v)]));
  const sectorNames = Object.fromEntries(SECTORS.map((s) => [s.id, tx(s.name)]));
  const base = lang === 'ar' ? arLocale : enLocale;

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    showOffsets: true,
    noticeOnUnload: false,
    protectedCss: '',
    canvasCss: `
      body { min-height: 100vh; }
      body:not(:has(*))::before {
        content: ${JSON.stringify(t('emptyCanvas'))};
        display: flex; align-items: center; justify-content: center; height: 60vh;
        color: #94a3b8; font: 18px system-ui, sans-serif; border: 2px dashed #cbd5e1; margin: 24px; border-radius: 12px;
      }
      .gjs-selected { outline: 2px solid #4f46e5 !important; outline-offset: -2px; }
    `,
    keepUnusedStyles: true,
    panels: { defaults: [] },
    blockManager: { appendTo: '#blocks' },
    layerManager: { appendTo: '#layers' },
    traitManager: { appendTo: '#traits' },
    selectorManager: { appendTo: '#selectors', componentFirst: true },
    styleManager: { appendTo: '#styles', sectors: SECTORS as any },
    deviceManager: {
      devices: [
        { id: 'desktop', name: t('desktop'), width: '' },
        { id: 'tablet', name: t('tablet'), width: '768px', widthMedia: '992px' },
        { id: 'phone', name: t('phone'), width: '375px', widthMedia: '480px' },
      ],
    },
    assetManager: {
      upload: false,
      multiUpload: true,
      autoAdd: true,
      // Keep uploaded images inside the project with a readable file name.
      // Also used when an image file is dropped straight onto the canvas.
      uploadFile: async (e: any, done?: (res: { data: { src: string }[] }) => void) => {
        const files: File[] = [...(e.dataTransfer ? e.dataTransfer.files : e.target.files)];
        const data: { src: string }[] = [];
        for (const f of files.filter((f) => f.type.startsWith('image/'))) {
          const dataUrl = await fileToDataUrl(f);
          const path = addAsset(dataUrl, f.name);
          editor.Assets.add({ src: dataUrl, name: path } as any);
          data.push({ src: dataUrl });
        }
        done?.({ data });
      },
    },
    parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false } as any, parserCss: parseCss as any },
    i18n: {
      locale: lang,
      detectLocale: false,
      localeFallback: 'en',
      messages: {
        [lang]: {
          ...base,
          styleManager: { ...(base as any).styleManager, sectors: { ...(base as any).styleManager?.sectors, ...sectorNames }, properties: { ...(base as any).styleManager?.properties, ...labels } },
        },
      },
    },
  });

  // Table cells and list items should be editable like text.
  editor.Components.addType('text-cell', {
    extend: 'text',
    isComponent: (el: HTMLElement) => el.tagName === 'TD' || el.tagName === 'TH',
    model: { defaults: { draggable: 'tr', droppable: false } },
  });

  // Selecting an element leaves an empty #id rule behind; copies of it should
  // not inherit a meaningless id. Real styles (non-empty rules) keep theirs.
  editor.on('component:clone', (copy: Component) => {
    const id = (copy.get('attributes') as any)?.id;
    if (!id) return;
    const rules = editor.Css.getRules(`#${id}`);
    if (rules.length && rules.every((r) => !Object.keys(r.getStyle()).length)) {
      rules.forEach((r) => editor.Css.remove(r));
      copy.removeAttributes('id');
    }
  });

  registerBlocks(editor);
  return editor;
}
