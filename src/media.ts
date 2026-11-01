import type { Component, CssRule, Editor } from 'grapesjs';
import { addAsset, fileToDataUrl, getAssetData, listAssets, onAssetsChange, removeAsset } from './assets';
import { t, type Key } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { debounce, h } from './ui';

const DRAG_TYPE = 'text/x-ws-image';

const COLORS = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#fef3c7', '#fee2e2', '#dcfce7', '#dbeafe', '#ede9fe',
  '#fde68a', '#1e293b', '#0f172a', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
];
const GRADIENTS = [
  'linear-gradient(135deg, #4f46e5, #06b6d4)',
  'linear-gradient(135deg, #f97316, #ec4899)',
  'linear-gradient(135deg, #22c55e, #14b8a6)',
  'linear-gradient(180deg, #0f172a, #334155)',
  'linear-gradient(135deg, #fde68a, #fca5a5)',
  'radial-gradient(circle at top, #e0e7ff, #ffffff)',
];
const DARKEN = 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45))';
const BG_PROPS = ['background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment'];

type Styleable = { getStyle(): Record<string, any>; setStyle(s: Record<string, any>): void };

interface MediaOptions {
  insert: (content: object) => void;
  isUsed: (path: string) => boolean;
}

export function setupMedia(editor: Editor, opts: MediaOptions) {
  /* ---------- where background changes go ---------- */
  const isPage = () => {
    const c = editor.getSelected();
    return !c || c.get('type') === 'wrapper';
  };
  const pageRule = (): CssRule => editor.Css.getRule('body') ?? editor.Css.setRule('body', {});
  const target = (): Styleable => (isPage() ? pageRule() : editor.getSelected()!) as unknown as Styleable;

  function update(changes: Record<string, string | null>, on: Styleable = target()) {
    const style = { ...on.getStyle() };
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) delete style[k];
      else style[k] = v;
    }
    on.setStyle(style);
    renderBg();
  }

  const clearBg = (): Record<string, null> => Object.fromEntries(BG_PROPS.map((p) => [p, null]));
  const setColor = (v: string) => update({ ...clearBg(), background: v });
  const setImage = (dataUrl: string, on?: Styleable) =>
    update(
      {
        ...clearBg(),
        'background-image': `url("${dataUrl}")`,
        'background-size': 'cover',
        'background-position': 'center',
        'background-repeat': 'no-repeat',
      },
      on,
    );

  const currentImage = (st: Record<string, string>) => {
    const src = st['background-image'] || st.background || '';
    return /url\((['"]?)(.*?)\1\)/.exec(src)?.[2] ?? '';
  };

  async function filesToAssets(files: Iterable<File>) {
    const out: string[] = [];
    for (const f of [...files].filter((f) => f.type.startsWith('image/'))) {
      const dataUrl = await fileToDataUrl(f);
      addAsset(dataUrl, f.name);
      editor.Assets.add({ src: dataUrl } as any);
      out.push(dataUrl);
    }
    return out;
  }

  /* ---------- Images tab: the project's image library ---------- */
  const lib = document.getElementById('media')!;
  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  fileInput.addEventListener('change', async () => {
    await filesToAssets(fileInput.files ?? []);
    fileInput.value = '';
  });
  const drop = h('button', { type: 'button', class: 'media-drop', onclick: () => fileInput.click() },
    h('span', { html: icon(I.Upload, 26) }),
    h('span', {}, t('uploadImages')),
  );
  dropTarget(drop, async (e) => {
    await filesToAssets(e.dataTransfer?.files ?? []);
  });
  const grid = h('div', { class: 'media-grid' });
  lib.append(drop, fileInput, h('p', { class: 'hint' }, t('imagesHint')), grid);

  const renderLibrary = debounce(() => {
    const assets = listAssets();
    grid.replaceChildren(
      ...(assets.length
        ? assets.map((a) => {
            const name = a.path.replace(/^images\//, '');
            const fig = h('figure', { class: 'thumb', draggable: 'true', title: a.path },
              h('img', { src: a.dataUrl, alt: '', draggable: 'false' }),
              h('figcaption', { dir: 'ltr' }, name),
              h('div', { class: 'thumb-actions' },
                h('button', {
                  type: 'button', title: t('insert'), html: icon(I.Plus, 15),
                  onclick: () => opts.insert(imageContent(a.dataUrl, name)),
                }),
                h('button', {
                  type: 'button', title: t('background'), html: icon(I.Paintbrush, 15),
                  onclick: () => setImage(a.dataUrl),
                }),
                h('button', {
                  type: 'button', class: 'danger', title: t('delete'), html: icon(I.Trash2, 15),
                  onclick: () => {
                    if (opts.isUsed(a.path) && !confirm(t('imageInUse'))) return;
                    removeAsset(a.path);
                    editor.Assets.remove(a.dataUrl as any);
                  },
                }),
              ),
            );
            fig.addEventListener('dragstart', (e) => {
              e.dataTransfer!.setData(DRAG_TYPE, a.path);
              e.dataTransfer!.effectAllowed = 'copy';
              editor.Canvas.startDrag({ content: imageContent(a.dataUrl, name) } as any);
              document.body.classList.add('dragging-image');
            });
            fig.addEventListener('dragend', () => {
              editor.Canvas.endDrag();
              document.body.classList.remove('dragging-image');
            });
            return fig;
          })
        : [h('p', { class: 'hint center-hint' }, t('noImages'))]),
    );
  }, 50);
  onAssetsChange(renderLibrary);
  renderLibrary();

  /* ---------- Background card (selected element, or the page) ---------- */
  const bgBox = document.getElementById('bg-tools')!;
  const bgInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
  bgInput.addEventListener('change', async () => {
    const [url] = await filesToAssets(bgInput.files ?? []);
    if (url) setImage(url);
    bgInput.value = '';
  });

  function renderBg() {
    const page = isPage();
    const st = target().getStyle() as Record<string, string>;
    const bgValue = st.background || st['background-color'] || '';
    const img = currentImage(st);
    const swatch = (value: string, title: string) =>
      h('button', {
        type: 'button', class: `swatch${bgValue === value ? ' on' : ''}`, title,
        style: `background:${value}`, onclick: () => setColor(value),
      });
    const custom = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(bgValue) ? bgValue : '#ffffff', title: t('custom') });
    custom.addEventListener('input', () => setColor(custom.value));

    const zone = h('button', { type: 'button', class: `bg-drop${img ? ' has-image' : ''}`, onclick: () => bgInput.click() },
      img
        ? h('span', { class: 'bg-preview', style: `background-image:url("${img}")` })
        : h('span', { class: 'bg-drop-text' },
            h('span', { html: icon(I.Image, 24) }),
            h('strong', {}, t('dropBg')),
            h('small', {}, t('dropBgSub')),
          ),
    );
    dropTarget(zone, async (e) => {
      const path = e.dataTransfer?.getData(DRAG_TYPE);
      const data = path ? getAssetData(path) : undefined;
      if (data) setImage(data);
      else {
        const [url] = await filesToAssets(e.dataTransfer?.files ?? []);
        if (url) setImage(url);
      }
    });

    const size = st['background-size'] || '';
    const repeat = st['background-repeat'] || '';
    const fit = (key: Key, active: boolean, changes: Record<string, string>) =>
      h('button', { type: 'button', class: `chip${active ? ' on' : ''}`, onclick: () => update(changes) }, t(key));
    const darkened = (st['background-image'] || '').includes('rgba(0, 0, 0');
    const fixed = h('input', { type: 'checkbox', checked: st['background-attachment'] === 'fixed' });
    fixed.addEventListener('change', () => update({ 'background-attachment': fixed.checked ? 'fixed' : null }));
    const dark = h('input', { type: 'checkbox', checked: darkened });
    dark.addEventListener('change', () =>
      update({ 'background-image': dark.checked ? `${DARKEN}, url("${img}")` : `url("${img}")` }),
    );

    bgBox.replaceChildren(
      h('div', { class: 'box-title row' },
        h('span', {}, page ? t('pageBackground') : t('background')),
        page
          ? null
          : h('button', {
              type: 'button', class: 'link-btn', onclick: () => editor.select(editor.getWrapper()!),
              html: `${icon(I.Globe, 14)} ${t('editPageBg')}`,
            }),
      ),
      h('div', { class: 'swatches' },
        h('button', { type: 'button', class: `swatch none${!bgValue && !img ? ' on' : ''}`, title: t('noBg'), onclick: () => update(clearBg()) }),
        ...COLORS.map((c) => swatch(c, c)),
        h('label', { class: 'swatch custom', title: t('custom'), html: icon(I.Palette, 14) }, custom),
      ),
      h('div', { class: 'swatches gradients' }, ...GRADIENTS.map((g) => swatch(g, t('gradients')))),
      zone,
      bgInput,
      img
        ? h('div', { class: 'bg-options' },
            h('div', { class: 'chips' },
              fit('fitCover', size === 'cover', { 'background-size': 'cover', 'background-repeat': 'no-repeat' }),
              fit('fitContain', size === 'contain', { 'background-size': 'contain', 'background-repeat': 'no-repeat' }),
              fit('fitTile', repeat === 'repeat', { 'background-size': 'auto', 'background-repeat': 'repeat' }),
              h('button', { type: 'button', class: 'chip danger', onclick: () => update(clearBg()) }, t('remove')),
            ),
            h('label', { class: 'check' }, dark, t('darken')),
            h('label', { class: 'check' }, fixed, t('fixedBg')),
          )
        : '',
    );
  }

  /* ---------- Quick effects for the selected element ---------- */
  const fxBox = document.getElementById('fx-tools')!;
  const HOVER: Record<string, Record<string, string>> = {
    grow: { transform: 'scale(1.05)' },
    lift: { transform: 'translateY(-4px)', 'box-shadow': '0 12px 28px rgba(15, 23, 42, 0.18)' },
  };
  const EFFECT_PROPS = ['border-radius', 'box-shadow', 'border', 'padding', 'margin-left', 'margin-right', 'text-align', 'transition', 'display'];

  function hoverRule(c: Component, style?: Record<string, string>) {
    const id = c.getId();
    if (style) {
      c.addAttributes({ id });
      editor.Css.setRule(`#${id}:hover`, style);
      update({ transition: 'transform 0.2s, box-shadow 0.2s' }, c as unknown as Styleable);
    } else {
      const r = editor.Css.getRule(`#${id}:hover`);
      if (r) editor.Css.remove(r);
    }
  }

  function renderFx() {
    const c = editor.getSelected();
    fxBox.hidden = isPage();
    if (!c || isPage()) return;
    const st = c.getStyle() as Record<string, string>;
    const s = c as unknown as Styleable;
    const toggle = (key: Key, svg: string, prop: string, value: string) =>
      h('button', {
        type: 'button', class: `tool wide${st[prop] === value ? ' on' : ''}`, html: `${icon(svg, 15)}<span>${t(key)}</span>`,
        onclick: () => update({ [prop]: st[prop] === value ? null : value }, s),
      });
    const hasHover = (k: string) => {
      const r = editor.Css.getRule(`#${c.getId()}:hover`);
      return !!r && r.getStyle().transform === HOVER[k].transform;
    };
    const isImg = String(c.get('tagName')) === 'img';
    fxBox.replaceChildren(
      h('div', { class: 'box-title' }, t('effects')),
      h('div', { class: 'ctx-buttons' },
        toggle('fxRound', I.Square, 'border-radius', '12px'),
        toggle('fxShadow', I.Layers, 'box-shadow', '0 8px 24px rgba(15, 23, 42, 0.15)'),
        toggle('fxBorder', I.Square, 'border', '1px solid #e2e8f0'),
        toggle('fxPad', I.Columns2, 'padding', '24px'),
        h('button', {
          type: 'button', class: `tool wide${st['margin-left'] === 'auto' ? ' on' : ''}`, html: `${icon(I.AlignCenter, 15)}<span>${t('fxCenter')}</span>`,
          onclick: () =>
            update(
              st['margin-left'] === 'auto'
                ? { 'margin-left': null, 'margin-right': null, 'text-align': null, display: null }
                : { 'margin-left': 'auto', 'margin-right': 'auto', 'text-align': 'center', ...(isImg ? { display: 'block' } : {}) },
              s,
            ),
        }),
        ...(['grow', 'lift'] as const).map((k) =>
          h('button', {
            type: 'button', class: `tool wide${hasHover(k) ? ' on' : ''}`,
            html: `${icon(I.MousePointerClick, 15)}<span>${t(k === 'grow' ? 'fxGrow' : 'fxLift')}</span>`,
            onclick: () => {
              hoverRule(c, hasHover(k) ? undefined : HOVER[k]);
              renderFx();
            },
          }),
        ),
        h('button', {
          type: 'button', class: 'tool wide', html: `${icon(I.X, 15)}<span>${t('fxClear')}</span>`,
          onclick: () => {
            hoverRule(c);
            update(Object.fromEntries(EFFECT_PROPS.map((p) => [p, null])), s);
            renderFx();
          },
        }),
      ),
    );
  }

  const renderAll = () => {
    renderBg();
    renderFx();
  };
  editor.on('component:toggled', renderAll);
  editor.on('load', renderAll);
  renderAll();
}

function imageContent(dataUrl: string, name: string) {
  const alt = name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
  return { type: 'image', src: dataUrl, attributes: { alt }, style: { 'max-width': '100%' } };
}

/** Make an element accept dropped files / library images, with a hover state. */
function dropTarget(el: HTMLElement, onDrop: (e: DragEvent) => void) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    el.classList.add('over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove('over');
    onDrop(e);
  });
}
