// CSS jak w VS Code: wlasciwosc + Tab -> "wlasciwosc: |;" i od razu lista wartosci pasujacych do tej wlasciwosci.
import { pickedCompletion, startCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';

const COLORS = 'red green blue black white gray grey yellow orange purple pink brown navy teal olive maroon lime aqua cyan magenta fuchsia silver gold beige coral crimson darkblue darkgreen darkred darkgray lightblue lightgreen lightgray lightyellow skyblue steelblue tomato violet indigo khaki salmon turquoise transparent currentColor'.split(' ');
const COLOR_FMT = ['#', 'rgb()', 'rgba()', 'hsl()'];
const LEN = ['0', '10px', '20px', '1em', '50%', '100%', 'auto'];
const BORDER_STYLE = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'];
const FONTS = ['Arial', 'Verdana', 'Tahoma', 'Helvetica', '"Times New Roman"', 'Georgia', '"Courier New"', 'sans-serif', 'serif', 'monospace', 'cursive'];
const GLOBAL = ['inherit', 'initial', 'unset'];

const V: Record<string, string[]> = {
  display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none', 'table', 'table-cell', 'list-item'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  float: ['left', 'right', 'none'], clear: ['left', 'right', 'both', 'none'],
  'text-align': ['left', 'right', 'center', 'justify'],
  'vertical-align': ['top', 'middle', 'bottom', 'baseline', 'text-top', 'text-bottom'],
  'text-decoration': ['none', 'underline', 'overline', 'line-through'],
  'text-transform': ['uppercase', 'lowercase', 'capitalize', 'none'],
  'font-weight': ['normal', 'bold', 'bolder', 'lighter', '100', '400', '700', '900'],
  'font-style': ['normal', 'italic', 'oblique'], 'font-variant': ['normal', 'small-caps'],
  'font-family': FONTS, 'font-size': ['12px', '14px', '16px', '20px', '1.5em', '120%', 'small', 'medium', 'large', 'x-large'],
  'list-style-type': ['none', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
  'list-style': ['none', 'disc', 'circle', 'square', 'decimal', 'inside', 'outside'],
  'list-style-position': ['inside', 'outside'],
  'border-style': BORDER_STYLE, 'outline-style': BORDER_STYLE,
  border: ['1px solid black', '2px dashed red', 'none'], outline: ['none', '1px solid black'],
  'border-collapse': ['collapse', 'separate'],
  'background-repeat': ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'],
  'background-size': ['cover', 'contain', 'auto', '100%'],
  'background-position': ['center', 'top', 'bottom', 'left', 'right', 'center center'],
  'background-attachment': ['scroll', 'fixed', 'local'],
  'background-image': ['url()', 'none', 'linear-gradient()'],
  background: [...COLORS, 'url()', 'linear-gradient()', 'none'],
  overflow: ['hidden', 'auto', 'scroll', 'visible'], visibility: ['visible', 'hidden', 'collapse'],
  cursor: ['pointer', 'default', 'text', 'move', 'not-allowed', 'help', 'crosshair'],
  'box-sizing': ['border-box', 'content-box'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'], 'flex-wrap': ['wrap', 'nowrap', 'wrap-reverse'],
  'justify-content': ['center', 'flex-start', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  'align-items': ['center', 'flex-start', 'flex-end', 'stretch', 'baseline'],
  'align-content': ['center', 'flex-start', 'flex-end', 'space-between', 'space-around', 'stretch'],
  'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap'], 'object-fit': ['cover', 'contain', 'fill', 'none'],
  'border-radius': ['5px', '10px', '50%'], 'box-shadow': ['5px 5px 10px gray', 'none'], 'text-shadow': ['2px 2px 4px gray', 'none'],
  opacity: ['0', '0.5', '1'], 'z-index': ['1', '10', '100'], 'line-height': ['1.5', '20px', 'normal'],
  'letter-spacing': ['1px', '2px', 'normal'], 'word-spacing': ['5px', 'normal'], 'text-indent': ['20px', '30px'],
};
const isColorProp = (p: string) => p === 'color' || p.endsWith('-color');
const isLenProp = (p: string) => /^(width|height|min-|max-|margin|padding|top|right|bottom|left|gap|border-width|border-spacing)/.test(p);

function valuesFor(prop: string): string[] {
  if (V[prop]) return [...V[prop], ...(prop === 'background' ? [] : GLOBAL)];
  if (isColorProp(prop)) return [...COLORS, ...COLOR_FMT];
  if (isLenProp(prop)) return [...LEN, ...GLOBAL];
  return [];
}

/** Wartosci dla wlasciwosci, w ktorej stoi kursor ("color: re|" -> red, ...). Pierwszenstwo przed ogolna lista. */
export function cssValueSource(ctx: CompletionContext) {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = line.text.slice(0, ctx.pos - line.from);
  const m = /([a-z-]+)\s*:\s*(?:[^;:{}]*\s)?([\w#.%-]*)$/i.exec(before);
  if (!m) return null;
  const vals = valuesFor(m[1].toLowerCase());
  if (!vals.length) return null;
  const from = ctx.pos - m[2].length;
  const options: Completion[] = vals.map((v, i) => ({
    label: v, type: 'constant', boost: 99 - i,
    // url() i funkcje: kursor do srodka nawiasu
    ...(v.endsWith('()') ? { apply: (view: EditorView, _c: Completion, f: number, t: number) => view.dispatch({ changes: { from: f, to: t, insert: v }, selection: { anchor: f + v.length - 1 } }) } : {}),
  }));
  return { from, options, validFor: /^[\w#.%-]*$/ };
}

/** Po wybraniu wlasciwosci: dopisz ": ;" (jesli trzeba) i otworz liste wartosci. */
export const cssPropertyBehaviour = EditorView.updateListener.of((u) => {
  for (const tr of u.transactions) {
    const picked = tr.annotation(pickedCompletion);
    if (!picked) continue;
    const view = u.view;
    const pos = u.state.selection.main.head;
    const line = u.state.doc.lineAt(pos);
    const before = line.text.slice(0, pos - line.from);
    const after = line.text.slice(pos - line.from);
    if (picked.type === 'property' && /^\s*[a-z-]+$/i.test(before) && !/^\s*:/.test(after)) {
      queueMicrotask(() => {
        if (view.state.selection.main.head !== pos) return;
        const semi = /^\s*;/.test(after) ? '' : ';';
        view.dispatch({ changes: { from: pos, insert: ': ' + semi }, selection: { anchor: pos + 2 }, userEvent: 'input.complete' });
        startCompletion(view);
      });
      return;
    }
    // wartosc wybrana z listy: srednik na koniec i kursor za nim (mozna od razu pisac nastepna wlasciwosc)
    if (picked.type === 'constant' && /[a-z-]+\s*:[^;]*$/i.test(before)) {
      queueMicrotask(() => {
        if (view.state.selection.main.head !== pos) return;
        if (/^\s*;/.test(after)) view.dispatch({ selection: { anchor: pos + after.indexOf(';') + 1 } });
        else view.dispatch({ changes: { from: pos, insert: ';' }, selection: { anchor: pos + 1 } });
      });
      return;
    }
    // kursor zaraz za "wlasciwosc: " (biblioteka CSS albo Emmet dopisaly dwukropek) -> srednik i lista wartosci
    if (/[a-z-]+\s*:\s*$/i.test(before)) {
      queueMicrotask(() => {
        if (view.state.selection.main.head !== pos) return;
        if (!/^\s*;/.test(after)) view.dispatch({ changes: { from: pos, insert: ';' }, selection: { anchor: pos } });
        startCompletion(view);
      });
      return;
    }
  }
});
