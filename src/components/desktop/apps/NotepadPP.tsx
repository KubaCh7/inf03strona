import { useEffect, useMemo, useState, useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';
import { sql, MySQL } from '@codemirror/lang-sql';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { FilePlus, FolderOpen, Save, SaveAll, X, Printer, Scissors, Copy, ClipboardPaste, Undo2, Redo2, Search, ZoomIn, ZoomOut, Globe } from 'lucide-react';
import { useOS, type Win, useWinKeys } from '../os';
import { useDocs } from './useDoc';
import { ext, parent } from '../../../lib/vfs';

const NPP = HighlightStyle.define([
  { tag: [t.tagName, t.angleBracket], color: '#0000ff' }, { tag: t.attributeName, color: '#ff0000' }, { tag: t.attributeValue, color: '#8000ff' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#008000' }, { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword], color: '#0000ff', fontWeight: 'bold' },
  { tag: [t.string, t.special(t.string)], color: '#808080' }, { tag: t.number, color: '#ff8000' }, { tag: [t.variableName, t.special(t.variableName)], color: '#000080' },
  { tag: [t.propertyName], color: '#0000ff' }, { tag: [t.typeName, t.className], color: '#8000ff' }, { tag: t.function(t.variableName), color: '#000080', fontWeight: 'bold' },
  { tag: t.processingInstruction, color: '#ff0000', fontWeight: 'bold' }, { tag: t.operator, color: '#000080', fontWeight: 'bold' },
]);
const THEME = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: '#fff', height: '100%' }, '.cm-content': { fontFamily: "'Courier New',Consolas,monospace", caretColor: '#000' },
  '.cm-gutters': { backgroundColor: '#e4e4e4', color: '#808080', borderRight: '1px solid #cfcfcf', fontFamily: "'Courier New',monospace" },
  '.cm-activeLine': { backgroundColor: '#e8e8ff' }, '.cm-activeLineGutter': { backgroundColor: '#e4e4e4', color: '#000' }, '.cm-selectionBackground, ::selection': { backgroundColor: '#c0c0c0 !important' },
});
const LANGS: Record<string, [string, string]> = { html: ['HTML', 'Hyper Text Markup Language file'], htm: ['HTML', 'Hyper Text Markup Language file'], php: ['PHP', 'PHP Hypertext Preprocessor file'], css: ['CSS', 'Cascade Style Sheets File'], js: ['JavaScript', 'JavaScript file'], sql: ['SQL', 'Structured Query Language file'], txt: ['Normal text', 'Normal text file'] };
const langExt = (l: string) => (l === 'HTML' ? [html()] : l === 'PHP' ? [php()] : l === 'CSS' ? [css()] : l === 'JavaScript' ? [javascript()] : l === 'SQL' ? [sql({ dialect: MySQL })] : []);

/** Notepad++ 8: karty, kolorowanie wg jezyka, bez podpowiedzi; Uruchom → przegladarka. */
export default function NotepadPP({ win }: { win: Win }) {
  const os = useOS();
  const D = useDocs(win.args.path ? String(win.args.path) : null, 'new 1');
  const [langOver, setLangOver] = useState<Record<number, string>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [pos, setPos] = useState({ ln: 1, col: 1, p: 0 });
  const [zoom, setZoom] = useState(13);
  const lang = langOver[D.d.id] ?? (LANGS[ext(D.d.name)]?.[0] ?? 'Normal text');
  const extensions = useMemo(() => [...langExt(lang), syntaxHighlighting(NPP), THEME, EditorView.theme({ '&': { fontSize: zoom + 'px' } })], [lang, zoom]);
  useEffect(() => { os.setTitle(win.id, `${D.d.text !== D.d.saved ? '*' : ''}${D.d.path ? D.d.path.replace(/\//g, '\\') : D.d.name} - Notepad++`); }, [D.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const FILTERS = [{ label: 'All types (*.*)', exts: ['*'] }, { label: 'Hyper Text Markup Language file (*.html;*.htm)', exts: ['html', 'htm'] }, { label: 'PHP Hypertext Preprocessor file (*.php)', exts: ['php'] }, { label: 'Cascade Style Sheets File (*.css)', exts: ['css'] }, { label: 'JavaScript file (*.js)', exts: ['js'] }, { label: 'Normal text file (*.txt)', exts: ['txt'] }, { label: 'Structured Query Language file (*.sql)', exts: ['sql'] }];
  const launch = () => { if (!D.d.path) { void os.alert('Uruchom', 'Najpierw zapisz plik.', 'warn'); return; } const p = D.d.path; os.open('browser', { url: p.startsWith('C:/xampp/htdocs/') ? 'localhost/' + p.slice('C:/xampp/htdocs/'.length) : 'file:///' + p }); };
  const kroot = useRef<HTMLDivElement>(null);
  useWinKeys(kroot, (e) => keys(e));
  const keys = (e: KeyboardEvent) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 's') { e.preventDefault(); void (e.altKey || e.shiftKey ? (e.shiftKey && !e.altKey ? Promise.all(D.docs.map((_, i) => D.save(FILTERS, i))) : D.saveAs(FILTERS)) : D.save(FILTERS)); }
    else if (c && k === 'o') { e.preventDefault(); void D.open(FILTERS); } else if (c && k === 'n') { e.preventDefault(); D.newDoc(); } else if (c && k === 'w') { e.preventDefault(); void D.closeDoc(D.cur); }
  };
  const M: Record<string, [string, string, () => void][]> = {
    Plik: [['Nowy', 'Ctrl+N', D.newDoc], ['Otwórz...', 'Ctrl+O', () => void D.open(FILTERS)], ['Otwórz folder zawierający w Eksploratorze', '', () => D.d.path && os.open('explorer', { path: parent(D.d.path) })], ['Zapisz', 'Ctrl+S', () => void D.save(FILTERS)], ['Zapisz jako...', 'Ctrl+Alt+S', () => void D.saveAs(FILTERS)], ['Zapisz wszystkie', 'Ctrl+Shift+S', () => D.docs.forEach((_, i) => void D.save(FILTERS, i))], ['Zamknij', 'Ctrl+W', () => void D.closeDoc(D.cur)], ['Zakończ', 'Alt+F4', () => os.close(win.id)]],
    Edycja: [['Cofnij', 'Ctrl+Z', () => document.execCommand('undo')], ['Ponów', 'Ctrl+Y', () => document.execCommand('redo')], ['Zaznacz wszystko', 'Ctrl+A', () => document.execCommand('selectAll')]],
    Szukaj: [['Znajdź...', 'Ctrl+F', () => {}]], Widok: [['Powiększ', 'Ctrl+kółko', () => setZoom((z) => z + 1)], ['Pomniejsz', '', () => setZoom((z) => Math.max(8, z - 1))]],
    Format: [['Windows (CR LF)', '✓', () => {}], ['Koduj w UTF-8', '✓', () => {}]],
    Język: ['Normal text', 'HTML', 'PHP', 'CSS', 'JavaScript', 'SQL'].map((l) => [l, l === lang ? '✓' : '', () => setLangOver((o) => ({ ...o, [D.d.id]: l }))] as [string, string, () => void]),
    Ustawienia: [['Preferencje...', '', () => {}]], Narzędzia: [], Makra: [], Uruchom: [['Launch in Edge', 'Ctrl+Alt+Shift+E', launch], ['Uruchom...', 'F5', launch]], Wtyczki: [], Okno: [], '?': [['O programie Notepad++', 'F1', () => void os.alert('O programie', 'Notepad++ v8.6 (64-bit)\nSymulacja na pulpicie egzaminacyjnym Pracownia.03')]],
  };
  const I = (Ic: typeof Save, title: string, f?: () => void) => <button title={title} onClick={f} className="grid h-6 w-6 place-items-center hover:border hover:border-[#7eb4ea] hover:bg-[#e5f1fb]"><Ic size={15} strokeWidth={1.6} /></button>;
  return (
    <div ref={kroot} className="flex h-full flex-col bg-[#f0f0f0] text-[12px] text-black">
      <div className="relative flex border-b border-[#ddd] bg-white">
        {Object.keys(M).map((m) => <div key={m} className="relative"><button onClick={() => setMenu(menu === m ? null : m)} onMouseEnter={() => menu && setMenu(m)} className={`px-2 py-[3px] ${menu === m ? 'bg-[#cce8ff]' : 'hover:bg-[#e5f3ff]'}`}>{m}</button>
          {menu === m && M[m].length > 0 && <div className="absolute left-0 top-full z-30 min-w-[260px] border border-[#ccc] bg-[#f2f2f2] py-1 shadow-lg" onMouseLeave={() => setMenu(null)}>{M[m].map(([l, k, f]) => <button key={l} onClick={() => { setMenu(null); f(); }} className="flex w-full justify-between gap-6 px-6 py-1 text-left hover:bg-[#91c9f7]"><span>{l}</span><span>{k}</span></button>)}</div>}</div>)}
      </div>
      <div className="flex items-center gap-0.5 border-b border-[#ddd] px-1 py-0.5">
        {I(FilePlus, 'Nowy', D.newDoc)}{I(FolderOpen, 'Otwórz', () => void D.open(FILTERS))}{I(Save, 'Zapisz', () => void D.save(FILTERS))}{I(SaveAll, 'Zapisz wszystkie')}{I(X, 'Zamknij', () => void D.closeDoc(D.cur))}{I(Printer, 'Drukuj')}
        <span className="mx-1 h-4 w-px bg-[#ccc]" />{I(Scissors, 'Wytnij')}{I(Copy, 'Kopiuj')}{I(ClipboardPaste, 'Wklej')}<span className="mx-1 h-4 w-px bg-[#ccc]" />{I(Undo2, 'Cofnij', () => document.execCommand('undo'))}{I(Redo2, 'Ponów')}
        <span className="mx-1 h-4 w-px bg-[#ccc]" />{I(Search, 'Znajdź')}{I(ZoomIn, 'Powiększ', () => setZoom((z) => z + 1))}{I(ZoomOut, 'Pomniejsz', () => setZoom((z) => Math.max(8, z - 1)))}<span className="mx-1 h-4 w-px bg-[#ccc]" />{I(Globe, 'Launch in Edge', launch)}
      </div>
      <div className="flex items-end gap-0.5 bg-[#f0f0f0] px-1 pt-1">
        {D.docs.map((d, i) => <div key={d.id} onClick={() => D.setCur(i)} className={`flex items-center gap-1.5 border border-b-0 px-2 py-[3px] ${i === D.cur ? 'border-[#aaa] border-t-2 border-t-[#f9a600] bg-white' : 'border-[#ccc] bg-[#e6e6e6] text-[#555]'}`}>
          <Save size={12} className={d.text !== d.saved ? 'text-[#d00]' : 'text-[#2a62c9]'} />{d.name}<button onClick={(e) => { e.stopPropagation(); void D.closeDoc(i); }} className="ml-1 opacity-60 hover:text-[#d00] hover:opacity-100"><X size={11} /></button></div>)}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden border-t border-[#aaa]">
        <CodeMirror key={D.d.id + lang} value={D.d.text} height="100%" style={{ height: '100%' }} extensions={extensions} theme="light"
          basicSetup={{ autocompletion: false, closeBrackets: false, foldGutter: true, highlightActiveLine: true, bracketMatching: true }}
          onChange={(v) => D.update({ text: v })}
          onUpdate={(u) => { if (u.selectionSet || u.docChanged) { const h = u.state.selection.main.head; const l = u.state.doc.lineAt(h); setPos({ ln: l.number, col: h - l.from + 1, p: h + 1 }); } }} />
      </div>
      <div className="flex h-[22px] items-center border-t border-[#ccc] bg-[#f0f0f0] text-[11.5px]">
        <span className="w-[230px] truncate border-r border-[#ccc] px-2">{LANGS[ext(D.d.name)]?.[1] ?? (lang === 'Normal text' ? 'Normal text file' : lang)}</span>
        <span className="w-[230px] border-r border-[#ccc] px-2">length : {D.d.text.length.toLocaleString('en-US')}    lines : {D.d.text.split('\n').length}</span>
        <span className="flex-1 border-r border-[#ccc] px-2">Ln : {pos.ln}    Col : {pos.col}    Pos : {pos.p}</span>
        <span className="border-r border-[#ccc] px-2">Windows (CR LF)</span><span className="border-r border-[#ccc] px-2">UTF-8</span><span className="px-2">INS</span>
      </div>
    </div>
  );
}
