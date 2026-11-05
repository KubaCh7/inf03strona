import CodeMirror, { EditorView, keymap, Prec } from '@uiw/react-codemirror';
import { html, htmlLanguage } from '@codemirror/lang-html';
import { css, cssLanguage } from '@codemirror/lang-css';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { sql, MySQL } from '@codemirror/lang-sql';
import { php, phpLanguage } from '@codemirror/lang-php';
import { acceptCompletion, autocompletion, completionStatus } from '@codemirror/autocomplete';
import { indentLess, indentMore } from '@codemirror/commands';
import { abbreviationTracker, emmetCompletionSource, EmmetKnownSyntax } from '@emmetio/codemirror6-plugin';
import type { Extension } from '@codemirror/state';
import { useEffect, useMemo, useState } from 'react';
import { JS_COMPLETIONS, listSource, PHP_COMPLETIONS, SQL_COMPLETIONS } from '../lib/completions';

function langFor(file: string): Extension[] {
  if (file.endsWith('.css')) return [css(), abbreviationTracker({ syntax: EmmetKnownSyntax.css }), cssLanguage.data.of({ autocomplete: emmetCompletionSource })];
  if (file.endsWith('.js')) return [javascript(), javascriptLanguage.data.of({ autocomplete: listSource(JS_COMPLETIONS) })];
  if (file.endsWith('.sql') || file.endsWith('.txt')) return [sql({ dialect: MySQL, upperCaseKeywords: true }), MySQL.language.data.of({ autocomplete: listSource(SQL_COMPLETIONS) })];
  if (file.endsWith('.php')) return [
    php(), phpLanguage.data.of({ autocomplete: listSource(PHP_COMPLETIONS) }),
    abbreviationTracker({ syntax: EmmetKnownSyntax.html, ...EMMET_CFG }), htmlLanguage.data.of({ autocomplete: emmetCompletionSource }),
    htmlLanguage.data.of({ autocomplete: listSource(PHP_COMPLETIONS.filter((c) => c.label === '<?php')) }),
  ];
  return [
    html({ autoCloseTags: true }),
    abbreviationTracker({ syntax: EmmetKnownSyntax.html, ...EMMET_CFG }),
    htmlLanguage.data.of({ autocomplete: emmetCompletionSource }),
    // JS wewnatrz <script> i CSS wewnatrz <style>
    javascriptLanguage.data.of({ autocomplete: listSource(JS_COMPLETIONS) }),
    cssLanguage.data.of({ autocomplete: emmetCompletionSource }),
  ];
}

// Tab jak w VS Code: 1) akceptuje podpowiedz, 2) Emmet / pola snippetu, 3) na koncu wciecie
const tabKeys = [
  Prec.highest(keymap.of([{ key: 'Tab', run: (v) => (completionStatus(v.state) === 'active' ? acceptCompletion(v) : false) }])),
  Prec.lowest(keymap.of([{ key: 'Tab', run: indentMore, shift: indentLess }])),
];
const EMMET_CFG = { config: { markup: { variables: { lang: 'pl', charset: 'UTF-8' } } } } as const;

export default function Editor({ file, value, onChange, fontSize = 14 }: { file: string; value: string; onChange: (v: string) => void; fontSize?: number }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  const extensions = useMemo(() => [
    ...langFor(file),
    autocompletion({ activateOnTyping: true, icons: true, defaultKeymap: true, closeOnBlur: true, maxRenderedOptions: 60 }),
    ...tabKeys,
    EditorView.lineWrapping,
  ], [file]);
  return (
    <div className="h-full min-h-0 overflow-hidden" style={{ ['--editor-font' as string]: `${fontSize}px` }}>
      <CodeMirror value={value} height="100%" theme={dark ? 'dark' : 'light'} extensions={extensions} onChange={onChange}
        indentWithTab={false}
        basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: false, closeBrackets: true, bracketMatching: true }} className="h-full" />
    </div>
  );
}
