// Tryb Vima w edytorze: @replit/codemirror-vim + to, czego w nim brakuje, zeby zachowywal sie jak prawdziwy Vim.
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { Compartment, EditorView, GutterMarker, Prec, ViewPlugin, gutter, keymap, type Extension } from '@uiw/react-codemirror';
import { indentUnit } from '@codemirror/language';
import { acceptCompletion, closeCompletion, completionStatus, hasNextSnippetField, nextSnippetField } from '@codemirror/autocomplete';
import { useStore } from './store';
import { vimStatus, visualKeys } from './vimVisual';

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
  setTimeout(() => { applyVimrc(view); watchModes(view); }, 0);
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

type Pos = { line: number; ch: number };
type VimCM = {
  state: { vim: { sel: { anchor: Pos; head: Pos }; visualLine: boolean; visualBlock: boolean } };
  getLine(n: number): string;
  replaceRange(text: string, from: Pos, to: Pos): void;
  setCursor(line: number, ch: number): void;
};

/** Vim: w kazdej linii zaznaczenia zmienia pierwsza liczbe (nrformats=bin,hex), g Ctrl-A dodaje 1x, 2x, 3x... */
function visualIncrement(cm: VimCM, { increase, progressive, repeat }: { increase: boolean; progressive: boolean; repeat?: number }) {
  const vim = cm.state.vim;
  const { anchor, head } = vim.sel;
  const block = vim.visualBlock, line = vim.visualLine;
  const [start, end] = anchor.line < head.line || (anchor.line === head.line && anchor.ch <= head.ch) ? [anchor, head] : [head, anchor];
  const left = Math.min(anchor.ch, head.ch), right = Math.max(anchor.ch, head.ch);
  const step = (repeat || 1) * (increase ? 1 : -1);
  let n = 0;
  for (let l = start.line; l <= end.line; l++) {
    const text = cm.getLine(l);
    let from = 0, to = text.length;
    if (block) { from = left; to = Math.min(text.length, right === Infinity ? text.length : right + 1); }
    else if (!line) { if (l === start.line) from = start.ch; if (l === end.line) to = Math.min(text.length, end.ch + 1); }
    const m = /0[xX][0-9a-fA-F]+|0[bB][01]+|-?\d+/.exec(text.slice(from, to));
    if (!m) continue;
    n++;
    const s = m[0], delta = BigInt(step * (progressive ? n : 1));
    let out: string;
    if (/^0[xX]/.test(s)) {
      const width = s.length - 2, upper = /[A-F]/.test(s) && !/[a-f]/.test(s);
      const v = (BigInt('0x' + s.slice(2)) + delta) & ((1n << 64n) - 1n);
      const h = v.toString(16).padStart(width, '0');
      out = s.slice(0, 2) + (upper ? h.toUpperCase() : h);
    } else if (/^0[bB]/.test(s)) {
      const v = (BigInt('0b' + s.slice(2)) + delta) & ((1n << 64n) - 1n);
      out = s.slice(0, 2) + v.toString(2).padStart(s.length - 2, '0');
    } else {
      const digits = s.replace('-', '');
      const v = BigInt(s) + delta;
      const abs = (v < 0n ? -v : v).toString();
      // zera wiodace zostaja (jak Vim bez "octal" w nrformats)
      out = (v < 0n ? '-' : '') + (digits.length > 1 && digits.startsWith('0') ? abs.padStart(digits.length, '0') : abs);
    }
    const at = from + m.index;
    cm.replaceRange(out, { line: l, ch: at }, { line: l, ch: at + s.length });
  }
  Vim.exitVisualMode(cm as never, false);
  cm.setCursor(start.line, block ? left : line ? 0 : start.ch);
}

/**
 * Wtyczka Vima nie zwraca CodeMirrorowi informacji, ze obsluzyla klawisz, wiec po niej odpalaly sie
 * skroty edytora (Ctrl+A zaznaczalo wszystko, Ctrl+D zaznaczalo kolejne wystapienie, Ctrl+Y robilo redo...).
 * Klawisz, ktory Vim juz obsluzyl (preventDefault), nie trafia do zadnego innego skrotu.
 */
const vimOwnsHandledKeys = Prec.highest(keymap.of([{ any: (_view, e) => e.defaultPrevented }]));

/**
 * Poprawki wyjscia z trybu wizualnego. W bibliotece exitVisualMode stawia kursor, to wywoluje je drugi raz
 * (z obslugi zaznaczenia) i zewnetrzne wywolanie nadpisuje zapamietane zaznaczenie jako znakowe:
 * gv po V albo Ctrl-V wracal do zwyklego v. Do tego kursor zostawal za ostatnim znakiem linii.
 */
function watchModes(view: EditorView) {
  const cm = getCM(view);
  if (!cm) return;
  type VS = { visualMode: boolean; visualLine: boolean; visualBlock: boolean; insertMode: boolean; lastSelection?: { visualLine: boolean; visualBlock: boolean } | null };
  let kind: { visualLine: boolean; visualBlock: boolean } | null = null;
  const remember = () => { const v = cm.state.vim as VS | undefined; if (v?.visualMode) kind = { visualLine: v.visualLine, visualBlock: v.visualBlock }; };
  cm.on('vim-keypress', remember);
  cm.on('vim-mode-change', (e: { mode: string }) => {
    if (e.mode === 'visual') { queueMicrotask(remember); return; }
    if (e.mode !== 'normal') { kind = null; return; }
    const was = kind;
    kind = null;
    queueMicrotask(() => {
      const v = cm.state.vim as VS | undefined;
      if (!v || v.visualMode || v.insertMode) return;
      if (was && v.lastSelection) Object.assign(v.lastSelection, was);
      // w trybie normalnym kursor stoi na znaku, nigdy za koncem niepustej linii
      const c = cm.getCursor(), len = cm.getLine(c.line).length;
      if (len > 0 && c.ch >= len && !cm.somethingSelected()) cm.setCursor(c.line, len - 1);
    });
  });
}

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

  // Ctrl-A / Ctrl-X / g Ctrl-A / g Ctrl-X na zaznaczeniu (v, V, Ctrl-V), jak w Vimie
  Vim.defineAction('visualIncrement', (cm, args) => visualIncrement(cm as unknown as VimCM, args as { increase: boolean; progressive: boolean; repeat?: number }));

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

/** Nasze dodatkowe komendy Vima. :mapclear z .vimrc kasuje wszystko spoza domyslnej mapy, wiec dodajemy je po nim. */
function addKeys() {
  for (const [keys, increase, progressive] of [['<C-a>', true, false], ['<C-x>', false, false], ['g<C-a>', true, true], ['g<C-x>', false, true]] as const) {
    Vim.mapCommand(keys, 'action', 'visualIncrement', { increase, progressive }, { context: 'visual', isEdit: true });
  }
}
function applyVimrc(view: EditorView) {
  const rc = useStore.getState().settings.vimrc ?? '';
  if (rc === appliedRc) return;
  const cm = getCM(view) as Parameters<typeof Vim.handleEx>[0] | null;
  if (!cm) return;
  Vim.maybeInitVimState_(cm);
  appliedRc = rc;
  Vim.mapclear();
  addKeys();
  for (const raw of rc.split('\n')) {
    const line = raw.trim().replace(/^:+/, '');
    if (!line || line.startsWith('"')) continue;
    try { Vim.handleEx(cm, line); } catch (e) { console.warn('vimrc:', line, e); }
  }
}

/** Rozszerzenia trybu Vim. Musza byc na poczatku listy, zeby skroty Vima mialy pierwszenstwo. */
export function vimExtensions(): Extension[] {
  return [visualKeys, Prec.highest(vim({ status: true })), vimStatus, escape, vimOwnsHandledKeys, insertTab, register, numbersC.of(numbers(opts)), indentC.of(indent(opts)), wrapC.of(wrap(opts))];
}
