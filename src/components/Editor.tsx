import CodeMirror, { EditorView, keymap, Prec } from '@uiw/react-codemirror';
import { html, htmlLanguage } from '@codemirror/lang-html';
import { css, cssLanguage } from '@codemirror/lang-css';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { sql, MySQL } from '@codemirror/lang-sql';
import { php, phpLanguage } from '@codemirror/lang-php';
import { acceptCompletion, autocompletion, completionStatus, hasNextSnippetField, nextSnippetField, prevSnippetField } from '@codemirror/autocomplete';
import { indentLess, indentMore } from '@codemirror/commands';
import { vimExtensions } from '../lib/vimMode';
import { emmetSource } from '../lib/emmet';
import { editorTheme } from '../lib/themes';
import { useStore } from '../lib/store';
import type { Extension } from '@codemirror/state';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JS_COMPLETIONS, listSource, PHP_COMPLETIONS, SQL_COMPLETIONS } from '../lib/completions';

const htmlEmmet = emmetSource('markup');
const cssEmmet = emmetSource('stylesheet');

function langFor(file: string, schema?: Record<string, string[]>, autoClose = true): Extension[] {
  if (file.endsWith('.css')) return [css(), cssLanguage.data.of({ autocomplete: cssEmmet })];
  if (file.endsWith('.js')) return [javascript(), javascriptLanguage.data.of({ autocomplete: listSource(JS_COMPLETIONS) })];
  if (file.endsWith('.sql') || file.endsWith('.txt')) return [sql({ dialect: MySQL, upperCaseKeywords: true, schema }), MySQL.language.data.of({ autocomplete: listSource(SQL_COMPLETIONS) })];
  if (file.endsWith('.php')) return [
    php(), phpLanguage.data.of({ autocomplete: listSource(PHP_COMPLETIONS) }),
    htmlLanguage.data.of({ autocomplete: htmlEmmet }),
    htmlLanguage.data.of({ autocomplete: listSource(PHP_COMPLETIONS.filter((c) => c.label === '<?php')) }),
  ];
  return [
    html({ autoCloseTags: autoClose }),
    htmlLanguage.data.of({ autocomplete: htmlEmmet }),
    // JS wewnatrz <script> i CSS wewnatrz <style>
    javascriptLanguage.data.of({ autocomplete: listSource(JS_COMPLETIONS) }),
    cssLanguage.data.of({ autocomplete: cssEmmet }),
  ];
}

// Tab jak w VS Code: 1) akceptuje podpowiedz, 2) Emmet / pola snippetu, 3) na koncu wciecie
const tabKeys = [
  Prec.highest(keymap.of([{
    key: 'Tab',
    run: (v) => (completionStatus(v.state) === 'active' ? acceptCompletion(v) : hasNextSnippetField(v.state) ? nextSnippetField(v) : false),
    shift: prevSnippetField,
  }])),
  Prec.lowest(keymap.of([{ key: 'Tab', run: indentMore, shift: indentLess }])),
];

// Staly obiekt: nowy obiekt przy kazdym renderze przebudowywal edytor i gubil pola snippetow
const BASIC_SETUP = { foldGutter: false, highlightActiveLine: true, autocompletion: false, closeBrackets: true, bracketMatching: true } as const;
// W trybie Vim jak w prawdziwym Vimie: bez automatycznego domykania nawiasow, numery linii steruje :set nu/rnu
const BASIC_SETUP_VIM = { ...BASIC_SETUP, closeBrackets: false, lineNumbers: false } as const;

/** Kwerenda pod kursorem: zaznaczenie albo fragment miedzy srednikami, w ktorym stoi kursor. */
function statementAt(view: EditorView): string {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return state.sliceDoc(sel.from, sel.to);
  const text = state.doc.toString();
  let pos = sel.head;
  // kursor tuz za srednikiem: chodzi o kwerende, ktora wlasnie sie skonczyla
  if (pos > 0 && /;\s*$/.test(text.slice(Math.max(0, pos - 3), pos)) && !text.slice(pos).trim().startsWith(';')) pos = text.lastIndexOf(';', pos - 1);
  const start = text.lastIndexOf(';', pos - 1) + 1;
  let end = text.indexOf(';', pos);
  end = end === -1 ? text.length : end + 1;
  const stmt = text.slice(start, end);
  return stmt.replace(/^\s*(--[^\n]*\n|#[^\n]*\n|\s)+/, '').trim() ? stmt : text;
}

export default function Editor({ file, value, onChange, fontSize = 14, schema, onRun }: { file: string; value: string; onChange: (v: string) => void; fontSize?: number; schema?: Record<string, string[]>; onRun?: (sql: string, all: boolean) => void }) {
  const viewRef = useRef<EditorView | null>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  // stabilny onChange: zmiana referencji przebudowywala edytor (i kasowala pola snippetow)
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const stableChange = useCallback((v: string) => changeRef.current(v), []);
  const themeId = useStore((s) => s.equipped.editorTheme);
  const custom = useMemo(() => editorTheme(themeId), [themeId]);
  const vimOn = useStore((s) => !!s.settings.vim);
  const setSettings = useStore((s) => s.setSettings);
  const extensions = useMemo(() => [
    // vim musi byc pierwszy, zeby jego skroty mialy pierwszenstwo
    ...(vimOn ? vimExtensions() : []),
    ...langFor(file, schema, !vimOn),
    // w Vimie lista podpowiedzi nie wyskakuje sama (Ctrl+Spacja ja otwiera)
    autocompletion({ activateOnTyping: !vimOn, icons: true, defaultKeymap: true, closeOnBlur: true, maxRenderedOptions: 80, selectOnOpen: true, aboveCursor: false }),
    ...tabKeys,
    ...(vimOn ? [] : [EditorView.lineWrapping]),
    // Ctrl+Enter: wykonaj kwerende pod kursorem (pliki .sql/.txt)
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: (v) => { if (!runRef.current) return false; runRef.current(statementAt(v), false); return true; } },
      { key: 'Mod-Shift-Enter', run: (v) => { if (!runRef.current) return false; runRef.current(v.state.doc.toString(), true); return true; } },
    ])),
  ], [file, schema, vimOn]);
  return (
    <div className="relative h-full min-h-0 overflow-hidden" style={{ ['--editor-font' as string]: `${fontSize}px` }}>
      <button type="button" onClick={() => setSettings({ vim: !vimOn })} title={vimOn ? 'Wyłącz skróty Vima' : 'Włącz skróty Vima'}
        className={`mono absolute right-2 top-1.5 z-10 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${vimOn ? 'border-success bg-success text-white' : 'border-line bg-surface/80 text-muted opacity-70 hover:opacity-100'}`}>VIM</button>
      {onRun && (
        <div className="flex h-8 items-center gap-1 border-b border-line bg-surface-2 px-2 pr-14">
          <button type="button" className="btn btn-primary px-2 py-0.5 text-[11px]" title="Wykonaj kwerendę pod kursorem (Ctrl+Enter)" onClick={() => { const v = viewRef.current; if (v) onRun(statementAt(v), false); }}>▶ Uruchom kwerendę</button>
          <button type="button" className="btn btn-ghost bg-surface px-2 py-0.5 text-[11px]" title="Wykonaj wszystkie kwerendy z pliku (Ctrl+Shift+Enter)" onClick={() => onRun(value, true)}>Wszystkie</button>
          <span className="ml-1 hidden text-[11px] text-muted xl:inline">Ctrl+Enter</span>
        </div>
      )}
      <CodeMirror onCreateEditor={(v) => { viewRef.current = v; }} value={value} height="100%" theme={custom ?? (dark ? 'dark' : 'light')} extensions={extensions} onChange={stableChange}
        indentWithTab={false}
        basicSetup={vimOn ? BASIC_SETUP_VIM : BASIC_SETUP} className={onRun ? 'h-[calc(100%-2rem)]' : 'h-full'} />
    </div>
  );
}
