// Tryb Vima w edytorze: @replit/codemirror-vim + to, czego w nim brakuje, zeby zachowywal sie jak prawdziwy Vim.
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { Compartment, EditorView, GutterMarker, Prec, ViewPlugin, gutter, keymap, type Extension } from '@uiw/react-codemirror';
import { indentUnit } from '@codemirror/language';
import { acceptCompletion, closeCompletion, completionStatus, hasNextSnippetField, nextSnippetField } from '@codemirror/autocomplete';
import { useStore } from './store';

/** Opcje :set obslugiwane przez edytor (globalne, jak w jednym oknie Vima). */
const opts = { number: true, relativenumber: false, tabstop: 2, shiftwidth: 2, expandtab: true, wrap: true };
type Opts = typeof opts;

const numbersC = new Compartment();
const indentC = new Compartment();
const wrapC = new Compartment();
const views = new Set<EditorView>();

class Num extends GutterMarker {
  constructor(readonly text: string, readonly current: boolean) { super(); }
  eq(o: Num) { return o.text === this.text && o.current === this.current; }
  toDOM() { const s = document.createElement('span'); s.textContent = this.text; if (this.current) s.style.fontWeight = '700'; return s; }
}

/** Numery linii jak w Vimie: number, relativenumber albo oba (hybryda). */
function numbers(o: Opts): Extension {
  if (!o.number && !o.relativenumber) return [];
  return gutter({
    class: 'cm-lineNumbers',
    lineMarker(view, line) {
      const n = view.state.doc.lineAt(line.from).number;
      const cur = view.state.doc.lineAt(view.state.selection.main.head).number;
      if (!o.relativenumber) return new Num(String(n), n === cur);
      if (n === cur) return new Num(String(o.number ? n : 0), true);
      return new Num(String(Math.abs(n - cur)), false);
    },
    lineMarkerChange: (u) => u.selectionSet || u.docChanged,
    initialSpacer: (view) => new Num(String(Math.max(99, view.state.doc.lines)), false),
  });
}
const indent = (o: Opts) => [indentUnit.of(o.expandtab ? ' '.repeat(o.shiftwidth) : '\t'), EditorView.theme({ '.cm-content': { tabSize: String(o.tabstop) } })];
const wrap = (o: Opts) => (o.wrap ? EditorView.lineWrapping : []);

function refresh() {
  for (const v of views) v.dispatch({ effects: [numbersC.reconfigure(numbers(opts)), indentC.reconfigure(indent(opts)), wrapC.reconfigure(wrap(opts))] });
}

const register = ViewPlugin.define((view) => {
  // opcje i komendy Ex rejestrujemy przy tworzeniu edytora, nie w trakcie renderu Reacta
  setup();
  views.add(view);
  setTimeout(() => applyVimrc(view), 0);
  return {
    // .vimrc wykonujemy, gdy stan Vima juz istnieje, i ponownie po zmianie w Ustawieniach
    update() { if ((useStore.getState().settings.vimrc ?? '') !== appliedRc) setTimeout(() => applyVimrc(view), 0); },
    destroy() { views.delete(view); },
  };
});

/** Tab w trybie insert: lista podpowiedzi (Ctrl+Spacja) i pola snippetow Emmeta, inaczej wciecie jak w Vimie. */
const insertTab = Prec.highest(keymap.of([{
  key: 'Tab',
  run: (v) => {
    const cm = getCM(v);
    // poza trybem insert Tab to <C-i> (skok do przodu po liscie skokow), jak w Vimie
    if (cm?.state.vim && !cm.state.vim.insertMode) { Vim.handleKey(cm as Parameters<typeof Vim.handleKey>[0], '<C-i>', 'user'); return true; }
    if (completionStatus(v.state) === 'active') return acceptCompletion(v);
    if (hasNextSnippetField(v.state)) return nextSnippetField(v);
    const text = opts.expandtab ? ' '.repeat(opts.shiftwidth - ((v.state.selection.main.head - v.state.doc.lineAt(v.state.selection.main.head).from) % opts.shiftwidth || 0)) : '\t';
    v.dispatch(v.state.replaceSelection(text), { scrollIntoView: true, userEvent: 'input' });
    return true;
  },
}]));

/** Esc przy otwartej liscie podpowiedzi: zamknij liste i wyjdz z trybu insert jednym wcisnieciem. */
const escape = Prec.highest(EditorView.domEventHandlers({
  keydown(e, view) {
    if ((e.key === 'Escape' || (e.ctrlKey && (e.key === '[' || e.key === 'c'))) && completionStatus(view.state) !== null) closeCompletion(view);
    return false;
  },
}));

let ready = false;
function setup() {
  if (ready) return;
  ready = true;
  const bool = (name: keyof Opts, aliases: string[]) => Vim.defineOption(name, opts[name] as boolean, 'boolean', aliases, (val?: boolean) => {
    if (val === undefined) return opts[name] as boolean;
    (opts as Record<string, unknown>)[name] = val; refresh();
  });
  const num = (name: keyof Opts, aliases: string[]) => Vim.defineOption(name, opts[name] as number, 'number', aliases, (val?: number) => {
    if (val === undefined) return opts[name] as number;
    if (val > 0 && val <= 16) { (opts as Record<string, unknown>)[name] = Math.round(val); refresh(); }
  });
  bool('number', ['nu']); bool('relativenumber', ['rnu']); bool('expandtab', ['et']); bool('wrap', []);
  num('tabstop', ['ts']); num('shiftwidth', ['sw']);

  // :w i spolka: zapis jest automatyczny, wiec tylko potwierdzamy jak Vim
  type CM = { openNotification: (t: Node, o: { bottom?: boolean; duration?: number }) => unknown };
  const say = (cm: CM, t: string) => { cm.openNotification(document.createTextNode(t), { bottom: true, duration: 2500 }); };
  Vim.defineEx('write', 'w', (cm: CM) => say(cm, '"plik" zapisany (zapis jest automatyczny)'));
  Vim.defineEx('update', 'up', (cm: CM) => say(cm, '"plik" zapisany'));
  for (const [name, short] of [['quit', 'q'], ['wq', 'wq'], ['xit', 'x'], ['qall', 'qa'], ['wall', 'wa']] as const) {
    try { Vim.defineEx(name, short, (cm: CM) => say(cm, name === 'wall' ? 'Wszystkie pliki zapisane' : 'Tu nie ma czego zamykać: pliki zapisują się same')); } catch (e) { console.warn(e); }
  }
}

/** Uzytkownika .vimrc z Ustawien (mapowania, :set itd.). Wykonywany ponownie po kazdej zmianie. */
let appliedRc: string | null = null;
function applyVimrc(view: EditorView) {
  const rc = useStore.getState().settings.vimrc ?? '';
  if (rc === appliedRc) return;
  const cm = getCM(view) as Parameters<typeof Vim.handleEx>[0] | null;
  if (!cm) return;
  Vim.maybeInitVimState_(cm);
  appliedRc = rc;
  Vim.mapclear();
  for (const raw of rc.split('\n')) {
    const line = raw.trim().replace(/^:+/, '');
    if (!line || line.startsWith('"')) continue;
    try { Vim.handleEx(cm, line); } catch (e) { console.warn('vimrc:', line, e); }
  }
}

/** Rozszerzenia trybu Vim. Musza byc na poczatku listy, zeby skroty Vima mialy pierwszenstwo. */
export function vimExtensions(): Extension[] {
  return [vim({ status: true }), escape, insertTab, register, numbersC.of(numbers(opts)), indentC.of(indent(opts)), wrapC.of(wrap(opts))];
}
