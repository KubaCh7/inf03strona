import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { useEffect, useState } from 'react';

function langFor(file: string) {
  if (file.endsWith('.css')) return [css()];
  if (file.endsWith('.js')) return [javascript()];
  if (file.endsWith('.sql') || file.endsWith('.txt')) return [sql()];
  if (file.endsWith('.php')) return [php()];
  return [html()];
}

export default function Editor({ file, value, onChange, fontSize = 14 }: { file: string; value: string; onChange: (v: string) => void; fontSize?: number }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  return (
    <div className="h-full min-h-0 overflow-hidden" style={{ ['--editor-font' as string]: `${fontSize}px` }}>
      <CodeMirror value={value} height="100%" theme={dark ? 'dark' : 'light'} extensions={[...langFor(file), EditorView.lineWrapping]} onChange={onChange}
        basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: true }} className="h-full" />
    </div>
  );
}
