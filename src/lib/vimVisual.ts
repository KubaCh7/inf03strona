// Tryb wizualny (v, V, Ctrl-V) jak w prawdziwym Vimie. @replit/codemirror-vim robi wiekszosc,
// tu sa poprawki tam, gdzie zachowuje sie inaczej niz Vim 9 (sprawdzone na prawdziwym Vimie, klawisz po klawiszu).
// Handler dziala PRZED Vimem: albo przygotowuje stan i zostawia klawisz Vimowi (a poprawke robi zaraz po nim,
// w mikrozadaniu), albo obsluguje klawisz sam i zwraca true.
import { getCM, Vim } from '@replit/codemirror-vim';
import { EditorSelection, EditorView, Prec, ViewPlugin } from '@uiw/react-codemirror';

type Pos = { line: number; ch: number };
type Register = { toString(): string; setText(text: string, linewise?: boolean, blockwise?: boolean): void; linewise?: boolean; blockwise?: boolean };
type VimState = {
  insertMode: boolean; visualMode: boolean; visualLine: boolean; visualBlock: boolean;
  sel: { anchor: Pos; head: Pos };
  inputState: { keyBuffer: string[]; operator: string | null; registerName?: string };
};
type CM = {
  state: { vim?: VimState };
  getLine(n: number): string;
  lastLine(): number;
  getCursor(which?: string): Pos;
  setCursor(line: number | Pos, ch?: number): void;
  setSelections(s: { anchor: Pos; head: Pos }[], primary?: number): void;
};
type RegisterController = { unnamedRegister: Register; registers: Record<string, Register | undefined>; getRegister(name?: string): Register };

const rc = () => (Vim as unknown as { getRegisterController(): RegisterController }).getRegisterController();
const isBefore = (a: Pos, b: Pos) => a.line < b.line || (a.line === b.line && a.ch < b.ch);
const keys = (cm: CM, ks: string[]) => { for (const k of ks) Vim.handleKey(cm as never, k, 'mapping'); };
const firstNonBlank = (s: string) => Math.max(0, s.search(/\S|$/));

/** Poprawka do zrobienia zaraz po tym, jak Vim obsluzy klawisz. */
let after: (() => void) | null = null;

/** Po Esc z blokowego I/A kursor wraca na lewy gorny rog bloku. */
let blockHome: Pos | null = null;

/** Rejestr nienazwany: biblioteka przy p na zaznaczeniu zapisuje tekst bez typu (linia/blok), a przy P go nadpisuje. */
let pasteCtx: { keep: boolean; linewise: boolean; blockwise: boolean } | null = null;
let patched: Register | null = null;
function patchUnnamed() {
  const reg = rc().unnamedRegister;
  if (patched === reg) return;
  patched = reg;
  const orig = reg.setText.bind(reg);
  reg.setText = (text: string, linewise?: boolean, blockwise?: boolean) => {
    // jedyne wywolanie z jednym argumentem to zapis zastepowanego zaznaczenia w `paste`
    if (pasteCtx && linewise === undefined && blockwise === undefined) {
      if (pasteCtx.keep) return; // v_P: rejestr bez zmian
      return orig(pasteCtx.linewise && !text.endsWith('\n') ? text + '\n' : text, pasteCtx.linewise, pasteCtx.blockwise);
    }
    return orig(text, linewise, blockwise);
  };
}

function area(vim: VimState) {
  const { anchor, head } = vim.sel;
  const [start, end] = isBefore(head, anchor) ? [head, anchor] : [anchor, head];
  return { start, end, left: Math.min(anchor.ch, head.ch), right: Math.max(anchor.ch, head.ch) };
}

/** d / c / y na calych liniach (tryb V), z poprawkami: c zostawia pusta linie, d na koncu pliku nie zostawia pustej. */
function lineOp(cm: CM, view: EditorView, vim: VimState, op: 'd' | 'c' | 'y') {
  const { start, end } = area(vim);
  const headUp = isBefore(vim.sel.head, vim.sel.anchor) ? { ...vim.sel.head } : null;
  const wasLast = end.line === cm.lastLine();
  const indent = cm.getLine(start.line).slice(0, firstNonBlank(cm.getLine(start.line)));
  const regName = vim.inputState.registerName;
  const lines: string[] = [];
  for (let l = start.line; l <= end.line; l++) lines.push(cm.getLine(l));
  keys(cm, [op]);
  if (op === 'y') {
    // V y w gore: kursor zostaje w swojej kolumnie
    if (headUp) cm.setCursor(headUp.line, headUp.ch);
    return;
  }
  const doc = view.state.doc;
  if (op === 'd') {
    if (wasLast && start.line > 0) {
      if (doc.lines === start.line + 1 && doc.line(doc.lines).length === 0) {
        const prev = doc.line(doc.lines - 1);
        view.dispatch({ changes: { from: prev.to, to: doc.length } });
        cm.setCursor(start.line - 1, firstNonBlank(cm.getLine(start.line - 1)));
      }
      // biblioteka zapisuje wtedy do rejestru "\n...\n"
      const text = lines.join('\n') + '\n', bad = '\n' + text;
      for (const r of [rc().unnamedRegister, rc().registers['1'], regName ? rc().getRegister(regName) : undefined]) {
        if (r && r.toString() === bad) r.setText(text, true);
      }
    }
    return;
  }
  // c: Vim kasuje linie, ale zostawia jedna (z wcieciem pierwszej) i wstawia w niej
  if (!vim.insertMode) return;
  const line = doc.line(Math.min(start.line + 1, doc.lines));
  const insert = wasLast && line.length === 0 && line.number === start.line + 1 ? indent : indent + '\n';
  if (wasLast && line.number !== start.line + 1) {
    view.dispatch({ changes: { from: doc.length, insert: '\n' + indent }, selection: { anchor: doc.length + 1 + indent.length } });
  } else {
    view.dispatch({ changes: { from: line.from, insert }, selection: { anchor: line.from + indent.length } });
  }
}

function onKey(e: KeyboardEvent, view: EditorView): boolean {
  after = null;
  const cm = getCM(view) as unknown as CM | null;
  const vim = cm?.state.vim;
  if (!cm || !vim) return false;
  // Vim zatrzymuje zdarzenie, wiec krok "po" odpalamy w mikrozadaniu: po calej obsludze klawisza, przed nastepnym
  queueMicrotask(() => {
    const fn = after;
    after = null;
    pasteCtx = null;
    try { fn?.(); afterAny(cm, e); fixStatus(view); } catch (err) { console.warn(err); }
  });
  const esc = e.key === 'Escape' || (e.ctrlKey && (e.key === '[' || e.key === 'c'));

  if (vim.insertMode) {
    // blokowe I/A/c: Vim konczy jednym Esc (biblioteka pierwszym Esc tylko zwijala kursory)
    if (esc && view.state.selection.ranges.length > 1) {
      const top = view.state.selection.ranges.reduce((a, r) => (r.head < a.head ? r : a));
      view.dispatch({ selection: { anchor: top.head } });
    }
    return false;
  }

  const k = e.ctrlKey || e.metaKey || e.altKey ? '' : e.key;
  const is = vim.inputState;
  // licznik (np. 3 w 3V) czeka w buforze klawiszy, dopoki komenda nie jest kompletna
  const buf = is.keyBuffer.join('');
  const count = /^[1-9]\d*/.exec(buf)?.[0] ?? '';
  const rest = buf.slice(count.length);
  const plain = !is.operator && rest === '';
  patchUnnamed();

  if (!vim.visualMode) {
    // 3V zaznacza 3 linie
    if (k === 'V' && plain && count) {
      is.keyBuffer.length = 0;
      const n = Number(count) - 1;
      after = () => { if (vim.visualLine) keys(cm, Array(n).fill('j')); };
    }
    return false;
  }

  const { start, end, left, right } = area(vim);
  const handled = () => { e.preventDefault(); e.stopPropagation(); return true; };

  if (plain && vim.visualBlock) {
    // D i C w bloku: do konca kazdej linii; X i Y: sam blok
    if (k === 'D' || k === 'C') { keys(cm, ['$', k === 'D' ? 'd' : 'c']); return handled(); }
    if (k === 'X' || k === 'Y') { keys(cm, [k === 'X' ? 'd' : 'y']); return handled(); }
    // J w bloku laczy linie jak w V
    if (k === 'J') {
      vim.visualBlock = false;
      vim.visualLine = true;
      if (start.line === end.line && end.line < cm.lastLine()) vim.sel = { anchor: { line: start.line, ch: 0 }, head: { line: end.line + 1, ch: 0 } };
      cm.setSelections([{ anchor: { line: vim.sel.anchor.line, ch: 0 }, head: { line: vim.sel.head.line, ch: 0 } }]);
      keys(cm, ['J']);
      return handled();
    }
    // blokowe I / A / c / s
    if (k === 'I' || k === 'A' || k === 'c' || k === 's') {
      const dollar = vim.sel.head.ch === Infinity || vim.sel.anchor.ch === Infinity;
      if (k === 'A' && !dollar) {
        // krotkie linie sa dopelniane spacjami, zeby tekst trafil w te sama kolumne
        const changes = [];
        for (let l = start.line; l <= end.line; l++) {
          const line = view.state.doc.line(l + 1);
          if (line.length < right + 1) changes.push({ from: line.to, insert: ' '.repeat(right + 1 - line.length) });
        }
        if (changes.length) view.dispatch({ changes });
      }
      if (k === 'I' || k === 'A') blockHome = { line: start.line, ch: left };
      if (k !== 'A') {
        // I, c, s: linie krotsze niz poczatek bloku zostaja bez zmian
        after = () => {
          if (!vim.insertMode) return;
          const ranges = view.state.selection.ranges;
          const keep = ranges.filter((r) => { const l = view.state.doc.lineAt(r.head); return r.head - l.from >= left || (k !== 'I' && l.length >= left); });
          if (keep.length && keep.length < ranges.length) view.dispatch({ selection: EditorSelection.create(keep, 0) });
        };
      }
      return false;
    }
  }

  // D X C Y w v i V: na calych liniach
  if (plain && !vim.visualBlock && (k === 'D' || k === 'X' || k === 'C' || k === 'Y')) {
    if (!vim.visualLine) keys(cm, ['V']);
    lineOp(cm, view, vim, k === 'C' ? 'c' : k === 'Y' ? 'y' : 'd');
    return handled();
  }
  if (plain && vim.visualLine && ['d', 'x', 'Delete', 'c', 's', 'y'].includes(k)) {
    lineOp(cm, view, vim, k === 'c' || k === 's' ? 'c' : k === 'y' ? 'y' : 'd');
    return handled();
  }

  // zwykle v: koniec zaznaczenia na koncu linii (v$, pusta linia) obejmuje tez znak nowej linii
  if (plain && !vim.visualLine && !vim.visualBlock && ['d', 'x', 'Delete', 'y', 'c', 's'].includes(k)) {
    if (end.ch < cm.getLine(end.line).length || end.line >= cm.lastLine()) return false;
    const regName = is.registerName;
    after = () => {
      const reg = regName ? rc().getRegister(regName) : rc().unnamedRegister;
      const text = reg.toString();
      const fix = (r: Register | undefined) => { if (r && r.toString() === text) r.setText(text + '\n', false, false); };
      if (k === 'y') { fix(rc().unnamedRegister); fix(rc().registers['0']); if (regName) fix(reg); return; }
      // d / x / c / s: usun tez znak nowej linii, ktory byl w zaznaczeniu
      const line = view.state.doc.line(start.line + 1);
      const from = line.from + Math.min(start.ch, line.length);
      if (from !== line.to || line.number >= view.state.doc.lines) return;
      const head = view.state.selection.main.head;
      view.dispatch({ changes: { from, to: from + 1 }, selection: { anchor: Math.min(head, view.state.doc.length - 1) } });
      fix(rc().unnamedRegister); fix(rc().registers['1']); fix(rc().registers['-']); if (regName) fix(reg);
      if (!vim.insertMode) {
        const len = cm.getLine(start.line).length;
        cm.setCursor(start.line, Math.max(0, Math.min(start.ch, len - 1)));
      }
    };
    return false;
  }

  // J i gJ na jednej linii lacza ja z nastepna (licznik jest ignorowany)
  if (k === 'J' && !is.operator && (rest === '' || rest === 'g')) {
    is.keyBuffer.splice(0, is.keyBuffer.length, ...(rest ? ['g'] : []));
    if (start.line === end.line && end.line < cm.lastLine()) {
      const sel = { anchor: { line: start.line, ch: start.ch }, head: { line: end.line + 1, ch: 0 } };
      cm.setSelections([sel]);
      vim.sel = sel;
    }
    return false;
  }

  // obiekty tekstowe: iw/aw/is/as w trybie V przechodza na znakowy (od kursora), ip/ap na liniowy
  if (!is.operator && (rest === 'i' || rest === 'a')) {
    if (k.length === 1 && 'wWs'.includes(k) && vim.visualLine) {
      const h = { ...vim.sel.head };
      vim.visualLine = false;
      cm.setSelections([{ anchor: h, head: { line: h.line, ch: h.ch + 1 } }]);
      vim.sel = { anchor: h, head: { ...h } };
    }
    if (k === 'p') after = () => { if (!vim.visualMode) return; if (!vim.visualLine) keys(cm, ['V']); keys(cm, ['0']); };
    return false;
  }

  // p / P na zaznaczeniu
  if (plain && (k === 'p' || k === 'P')) {
    const linewise = vim.visualLine;
    const charReg = !(is.registerName ? rc().getRegister(is.registerName) : rc().unnamedRegister).linewise;
    pasteCtx = { keep: k === 'P', linewise, blockwise: vim.visualBlock };
    // tekst znakowy wklejony za cala linie: kursor na poczatku linii
    if (linewise && charReg) after = () => { if (!vim.visualMode) cm.setCursor(start.line, 0); };
  }
  return false;
}

/** Wspolne dla kazdego klawisza: kursor po Esc z blokowego I/A. */
function afterAny(cm: CM, e: KeyboardEvent) {
  const vim = cm.state.vim;
  if (!blockHome || !vim || vim.insertMode || vim.visualMode) return;
  if (!(e.key === 'Escape' || e.ctrlKey)) { if (!vim.insertMode) blockHome = null; return; }
  const home = blockHome;
  blockHome = null;
  const len = cm.getLine(home.line).length;
  cm.setCursor(home.line, Math.max(0, Math.min(home.ch, len - 1)));
}

/** Musi byc PRZED vim() w liscie rozszerzen (ta sama precedencja = kolejnosc z listy). */
export const visualKeys = Prec.highest(EditorView.domEventHandlers({
  keydown(e, view) { try { return onKey(e, view); } catch (err) { console.warn(err); return false; } },
}));

/**
 * Pasek trybu jak w Vimie: "-- VISUAL --", "-- VISUAL LINE --", "-- VISUAL BLOCK --", "-- INSERT --", "-- REPLACE --",
 * w trybie normalnym pusty. Po prawej (showcmd) wpisywane klawisze, a w trybie wizualnym rozmiar zaznaczenia:
 * liczba znakow w jednej linii, liczba linii, albo "linie x kolumny" dla bloku.
 */
function fixStatus(view: EditorView) {
  const panel = view.dom.querySelector('.cm-vim-panel');
  const cm = getCM(view) as unknown as (CM & { state: { overwrite?: boolean; vim?: VimState & { insertModeReturn?: boolean } } }) | null;
  const vim = cm?.state.vim;
  if (!panel || !cm || !vim || panel.children.length !== 3 || panel.querySelector('input')) return;
  const [mode, , show] = Array.from(panel.children) as HTMLElement[];
  let text = '';
  if (vim.insertMode) text = cm.state.overwrite ? '-- REPLACE --' : '-- INSERT --';
  else if (vim.visualMode) text = `-- ${vim.insertModeReturn ? '(insert) ' : ''}VISUAL${vim.visualBlock ? ' BLOCK' : vim.visualLine ? ' LINE' : ''} --`;
  else if (vim.insertModeReturn) text = '-- (insert) --';
  if (mode.textContent !== text) mode.textContent = text;
  if (!vim.visualMode || vim.inputState.keyBuffer.length || vim.inputState.operator) return;
  const { start, end, left, right } = area(vim);
  const lines = end.line - start.line + 1;
  let size: string;
  if (vim.visualBlock) {
    let r = right;
    if (right === Infinity) { r = left; for (let l = start.line; l <= end.line; l++) r = Math.max(r, cm.getLine(l).length - 1); }
    size = `${lines}x${r - left + 1}`;
  } else if (vim.visualLine || lines > 1) size = String(lines);
  else size = String(Math.min(end.ch, cm.getLine(end.line).length) - start.ch + 1);
  if (show.textContent !== size) show.textContent = size;
}

export const vimStatus = ViewPlugin.define((view) => {
  queueMicrotask(() => fixStatus(view));
  return { update() { queueMicrotask(() => fixStatus(view)); } };
});
