import type { Component, Editor } from 'grapesjs';
import { EditorView, basicSetup } from 'codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { abbreviationTracker } from '@emmetio/codemirror6-plugin';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState, StateEffect, StateField, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { fromCode, toCode } from './assets';
import { componentAt, formatCss, parseDocument, serializeDocument, type CodeRange, type PageMeta } from './serialize';
import { debounce } from './ui';

const setMarks = StateEffect.define<{ from: number; to: number }[]>();

const marksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setMarks)) {
        const mark = Decoration.mark({ class: 'cm-linked' });
        const ranges: Range<Decoration>[] = e.value
          .filter((r) => r.to > r.from)
          .sort((a, b) => a.from - b.from)
          .map((r) => mark.range(r.from, r.to));
        deco = Decoration.set(ranges);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

interface CodePanelOptions {
  editor: Editor;
  htmlParent: HTMLElement;
  cssParent: HTMLElement;
  jsParent: HTMLElement;
  getMeta: () => PageMeta;
  setMeta: (m: Partial<PageMeta>) => void;
  /** script.js was edited. */
  onJs: (js: string) => void;
  /** The stylesheet was regenerated (used to load Google fonts in the canvas). */
  onCss: (css: string) => void;
}

/**
 * Keeps the CodeMirror HTML/CSS views and the GrapesJS canvas in step, and
 * links a selected element on the page to its lines of code (both ways).
 */
export class CodePanel {
  readonly htmlView: EditorView;
  readonly cssView: EditorView;
  readonly jsView: EditorView;
  private ranges: CodeRange[] = [];
  private htmlDirty = false;
  private cssDirty = false;
  private writing = false;
  private selectingFromCode = false;
  visible = false;

  constructor(private o: CodePanelOptions) {
    const common = [basicSetup, oneDark, EditorView.lineWrapping, marksField];

    this.htmlView = new EditorView({
      parent: o.htmlParent,
      state: EditorState.create({
        extensions: [
          ...common,
          htmlLang(),
          abbreviationTracker({ syntax: 'html' as any }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !this.writing) {
              this.htmlDirty = true;
              this.applyHtml();
            } else if (u.selectionSet && !u.docChanged && !this.htmlDirty && u.view.hasFocus) {
              this.selectFromCode(u.state.selection.main.head);
            }
          }),
          EditorView.domEventHandlers({ blur: () => this.onBlur() }),
        ],
      }),
    });

    this.cssView = new EditorView({
      parent: o.cssParent,
      state: EditorState.create({
        extensions: [
          ...common,
          cssLang(),
          abbreviationTracker({ syntax: 'css' as any }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !this.writing) {
              this.cssDirty = true;
              this.applyCss();
            }
          }),
          EditorView.domEventHandlers({ blur: () => this.onBlur() }),
        ],
      }),
    });

    this.jsView = new EditorView({
      parent: o.jsParent,
      state: EditorState.create({
        extensions: [
          basicSetup, oneDark, EditorView.lineWrapping, javascript(),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !this.writing) o.onJs(u.state.doc.toString());
          }),
        ],
      }),
    });

    const ed = o.editor;
    const refresh = debounce(() => this.refresh(), 120);
    ed.on('update', refresh);
    ed.on('component:update', refresh);
    ed.on('style:property:update', refresh);
    ed.on('rte:disable', refresh);
    ed.on('component:toggled', () => this.highlightSelected());
  }

  private applyHtml = debounce(() => this.applyHtmlNow(), 350);
  private applyCss = debounce(() => this.applyCssNow(), 350);

  private applyHtmlNow() {
    const parsed = parseDocument(this.htmlView.state.doc.toString());
    const meta: Partial<PageMeta> = {};
    if (parsed.title !== undefined) meta.title = parsed.title;
    if (parsed.siteLang) meta.siteLang = parsed.siteLang;
    this.o.setMeta(meta);
    const ed = this.o.editor;
    ed.setComponents(fromCode(parsed.body));
    // Replacing elements drops their #id rules; put the stylesheet back
    // (merged, so rules from inline style="" attributes survive).
    ed.Css.addRules(fromCode(this.cssView.state.doc.toString()));
    this.settle('html');
  }

  private applyCssNow() {
    this.o.editor.setStyle(fromCode(this.cssView.state.doc.toString()));
    this.settle('css');
  }

  setJs(js: string) {
    this.write(this.jsView, js);
  }

  /** Insert text at the cursor of script.js (or at the end). */
  insertJs(text: string) {
    const v = this.jsView;
    const at = v.hasFocus ? v.state.selection.main.head : v.state.doc.length;
    const prefix = at > 0 && v.state.doc.sliceString(at - 1, at) !== '\n' ? '\n\n' : '';
    v.dispatch({ changes: { from: at, insert: prefix + text }, selection: { anchor: at + prefix.length + text.length }, scrollIntoView: true });
    v.focus();
  }

  /** Drop unapplied edits (e.g. another website was opened) and redraw. */
  reset() {
    this.applyHtml.cancel();
    this.applyCss.cancel();
    this.htmlDirty = this.cssDirty = false;
    this.refresh();
  }

  /** Edits applied and nobody is typing: show the tidy code again. */
  private settle(which: 'html' | 'css') {
    if (which === 'html' ? this.htmlView.hasFocus : this.cssView.hasFocus) return;
    if (which === 'html') this.htmlDirty = false;
    else this.cssDirty = false;
    this.refresh();
  }

  private onBlur() {
    // Let a pending edit land, then show the tidy version with links restored.
    setTimeout(() => {
      if (this.htmlDirty && !this.htmlView.hasFocus) {
        this.applyHtml.cancel();
        this.applyHtmlNow();
      }
      if (this.cssDirty && !this.cssView.hasFocus) {
        this.applyCss.cancel();
        this.applyCssNow();
      }
    }, 100);
  }

  private write(view: EditorView, text: string) {
    if (view.state.doc.toString() === text) return;
    this.writing = true;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    this.writing = false;
  }

  /** Re-generate code from the canvas (skips a view the student is typing in). */
  refresh() {
    const ed = this.o.editor;
    const wrapper = ed.getWrapper();
    if (!wrapper) return;
    const css = this.cssText();
    if (!this.htmlDirty) {
      const { code, ranges } = serializeDocument(wrapper, this.o.getMeta(), css);
      this.write(this.htmlView, code);
      this.ranges = ranges;
    }
    if (!this.cssDirty) {
      this.write(this.cssView, css);
    }
    this.o.onCss(css);
    this.highlightSelected(false);
  }

  /** Current files, always regenerated from the canvas. */
  files() {
    const css = this.cssText();
    return { indexHtml: serializeDocument(this.o.editor.getWrapper()!, this.o.getMeta(), css).code, css };
  }

  private cssText() {
    return formatCss(toCode(this.o.editor.getCss({ keepUnusedStyles: true }) || ''));
  }

  private selectFromCode(pos: number) {
    const comp = componentAt(this.ranges, pos);
    const ed = this.o.editor;
    if (!comp || comp === ed.getSelected()) return;
    this.selectingFromCode = true;
    ed.select(comp);
    ed.Canvas.scrollTo(comp, { behavior: 'smooth', block: 'center' } as any);
    this.selectingFromCode = false;
  }

  highlightSelected(scroll = true) {
    const comp = this.o.editor.getSelected();
    const htmlMarks: { from: number; to: number }[] = [];
    let cssMarks: { from: number; to: number }[] = [];
    if (comp) {
      const r = this.ranges.find((x) => x.comp === comp);
      if (r && !this.htmlDirty) htmlMarks.push({ from: r.from, to: r.to });
      cssMarks = this.cssRulesFor(comp);
    }
    const shouldScroll = scroll && !this.selectingFromCode && this.visible;
    this.htmlView.dispatch({
      effects: [
        setMarks.of(htmlMarks),
        ...(shouldScroll && htmlMarks[0] ? [EditorView.scrollIntoView(htmlMarks[0].from, { y: 'center' })] : []),
      ],
    });
    this.cssView.dispatch({
      effects: [
        setMarks.of(cssMarks),
        ...(shouldScroll && cssMarks[0] ? [EditorView.scrollIntoView(cssMarks[0].from, { y: 'center' })] : []),
      ],
    });
  }

  /** CSS rules whose selector names the element's id, class or tag. */
  private cssRulesFor(comp: Component) {
    const text = this.cssView.state.doc.toString();
    const id = comp.getId();
    const classes = comp.getClasses() as string[];
    const tag = String(comp.get('tagName') || '');
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const names = [`#${esc(id)}`, ...classes.map((c) => `\\.${esc(c)}`)];
    if (tag && tag !== 'div') names.push(`(?<![\\w.#-])${esc(tag)}`);
    const sel = new RegExp(`(${names.join('|')})(?![\\w-])`);
    const out: { from: number; to: number }[] = [];
    const ruleRe = /([^{}]+)\{[^{}]*\}/g;
    for (let m; (m = ruleRe.exec(text)); ) {
      const selector = m[1].trim();
      if (selector.startsWith('@')) continue;
      if (sel.test(selector)) {
        const from = m.index + m[1].length - m[1].trimStart().length;
        out.push({ from, to: m.index + m[0].length });
      }
    }
    return out;
  }
}
