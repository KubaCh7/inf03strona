import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Play, Upload, Database, Terminal, Eye, Code2, ImagePlus, RotateCcw } from 'lucide-react';
import type { Database as Db } from 'sql.js';
import { useStore } from '../lib/store';
import { buildSrcDoc } from '../lib/preview';
import { freshDb, run, type QueryResult } from '../lib/sql';
import { Loading } from './ui';

const Editor = lazy(() => import('./Editor'));

export const DEFAULT_FILES: Record<string, string> = {
  'index.html': '<!DOCTYPE html>\n<html lang="pl">\n<head>\n  <meta charset="UTF-8">\n  <title>Moja strona</title>\n  <link rel="stylesheet" href="styl.css">\n</head>\n<body>\n  <header>\n    <h1>Witaj w warsztacie</h1>\n  </header>\n  <main>\n    <p>Zacznij pisać kod. Podgląd odświeża się sam.</p>\n  </main>\n  <script src="skrypt.js"></script>\n</body>\n</html>\n',
  'styl.css': 'body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n}\nheader {\n  background-color: #C2410C;\n  color: white;\n  padding: 10px;\n}\n',
  'skrypt.js': '// Twój skrypt\nconsole.log("Skrypt działa");\n',
  'kwerendy.txt': '-- Kwerendy SQL. Zaznacz (albo zostaw całość) i kliknij „Wykonaj”.\n',
};

type Log = { type: string; text: string };

export default function Workshop({ storageKey, initial, compact }: { storageKey: string; initial?: Record<string, string>; compact?: boolean }) {
  const saved = useStore((s) => s.workspaces[storageKey]);
  const saveWorkspace = useStore((s) => s.saveWorkspace);
  const fontSize = useStore((s) => s.settings.editorFont);
  const [files, setFiles] = useState<Record<string, string>>(() => saved ?? initial ?? DEFAULT_FILES);
  const [active, setActive] = useState(() => Object.keys(saved ?? initial ?? DEFAULT_FILES)[0]);
  const [doc, setDoc] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [tab, setTab] = useState<'kod' | 'podglad' | 'sql' | 'konsola'>('kod');
  const [images, setImages] = useState<Record<string, string>>({});
  const [db, setDb] = useState<Db | null>(null);
  const [dbInfo, setDbInfo] = useState<string>('Brak bazy. Wczytaj plik .sql z archiwum arkusza albo utwórz tabele kwerendą.');
  const [sqlOut, setSqlOut] = useState<{ results: QueryResult[]; skipped: string[]; error?: string } | null>(null);
  const sqlRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  // Zapis (debounce)
  useEffect(() => { const t = setTimeout(() => saveWorkspace(storageKey, files), 400); return () => clearTimeout(t); }, [files, storageKey, saveWorkspace]);

  // Podglad (debounce 300 ms)
  const entry = files['index.html'] !== undefined ? 'index.html' : Object.keys(files).find((f) => f.endsWith('.html') || f.endsWith('.php')) ?? 'index.html';
  useEffect(() => {
    const t = setTimeout(() => {
      let d = buildSrcDoc(files, entry).replace(/<\?php[\s\S]*?(\?>|$)/g, '<span style="background:#6B4E7133;font:12px monospace;padding:2px 4px;border-radius:4px">[PHP wykona się na serwerze]</span>');
      for (const [name, url] of Object.entries(images)) d = d.split(`"${name}"`).join(`"${url}"`).split(`'${name}'`).join(`'${url}'`);
      setDoc(d);
      setLogs([]);
    }, 300);
    return () => clearTimeout(t);
  }, [files, images, entry]);

  useEffect(() => {
    const h = (e: MessageEvent) => { if (e.data?.__p03) setLogs((l) => [...l.slice(-200), { type: e.data.type, text: e.data.args.join(' ') }]); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);

  const setFile = (v: string) => setFiles((f) => ({ ...f, [active]: v }));
  const addFile = () => {
    const name = prompt('Nazwa pliku (np. galeria.html, skrypt.js, wynik.php):')?.trim();
    if (!name || files[name] !== undefined) return;
    setFiles((f) => ({ ...f, [name]: '' }));
    setActive(name);
  };
  const delFile = (name: string) => {
    if (!confirm(`Usunąć ${name}?`)) return;
    setFiles((f) => { const n = { ...f }; delete n[name]; return n; });
    setActive(Object.keys(files).find((x) => x !== name) ?? 'index.html');
  };
  const reset = () => { if (confirm('Przywrócić pliki startowe? Twoje zmiany w tym warsztacie znikną.')) { const f = initial ?? DEFAULT_FILES; setFiles(f); setActive(Object.keys(f)[0]); } };

  async function loadSql(file: File) {
    const text = await file.text();
    try {
      const d = await freshDb(text);
      const t = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0];
      setDb(d);
      setDbInfo(`Wczytano ${file.name}. Tabele: ${t ? t.values.map((v) => v[0]).join(', ') : 'brak'}.`);
      setTab('sql');
    } catch (e) {
      setDbInfo('Nie udało się wczytać zrzutu: ' + (e as Error).message);
    }
  }
  async function execSql() {
    const ta = document.querySelector<HTMLTextAreaElement>('#p03-sql-box');
    const text = ta?.value.trim() || files['kwerendy.txt'] || '';
    try {
      const d = db ?? (await freshDb());
      if (!db) setDb(d);
      const r = run(d, text);
      setSqlOut(r);
      const t = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0];
      if (t) setDbInfo(`Tabele: ${t.values.map((v) => v[0]).join(', ')}.`);
    } catch (e) {
      setSqlOut({ results: [], skipped: [], error: (e as Error).message });
    }
  }
  function addImages(list: FileList | null) {
    if (!list) return;
    const next: Record<string, string> = {};
    for (const f of Array.from(list)) {
      if (f.name.endsWith('.sql')) { void loadSql(f); continue; }
      if (f.type.startsWith('image/') || /\.(png|jpe?g|gif|svg|webp)$/i.test(f.name)) next[f.name] = URL.createObjectURL(f);
      else if (/\.(html|css|js|php|txt)$/i.test(f.name)) void f.text().then((t) => setFiles((x) => ({ ...x, [f.name]: t })));
    }
    setImages((i) => ({ ...i, ...next }));
  }

  const isPhp = active.endsWith('.php');
  const panelH = compact ? 'h-[60dvh]' : 'h-[calc(100dvh-220px)] min-h-[520px]';
  const mobileTabs = useMemo(() => [
    { k: 'kod', label: 'Kod', icon: Code2 }, { k: 'podglad', label: 'Podgląd', icon: Eye }, { k: 'sql', label: 'SQL', icon: Database }, { k: 'konsola', label: `Konsola${logs.length ? ` (${logs.length})` : ''}`, icon: Terminal },
  ] as const, [logs.length]);

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }}>
      {/* pasek plikow */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {Object.keys(files).map((f) => (
          <span key={f} className={`group inline-flex items-center rounded-lg border text-sm ${f === active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'}`}>
            <button className="mono px-2.5 py-1.5 text-xs" onClick={() => { setActive(f); setTab('kod'); }}>{f}</button>
            {f === active && Object.keys(files).length > 1 && <button className="pr-2 opacity-60 hover:opacity-100" aria-label={`Usuń ${f}`} onClick={() => delFile(f)}><Trash2 size={13} /></button>}
          </span>
        ))}
        <button className="btn btn-ghost px-2 py-1 text-xs" onClick={addFile}><Plus size={14} />Plik</button>
        <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => imgRef.current?.click()}><ImagePlus size={14} />Grafiki / pliki</button>
        <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => sqlRef.current?.click()}><Upload size={14} />Zrzut .sql</button>
        <button className="btn btn-ghost ml-auto px-2 py-1 text-xs" onClick={reset} title="Przywróć pliki startowe"><RotateCcw size={14} /></button>
        <input ref={imgRef} type="file" multiple hidden onChange={(e) => addImages(e.target.files)} />
        <input ref={sqlRef} type="file" accept=".sql,.txt" hidden onChange={(e) => e.target.files?.[0] && loadSql(e.target.files[0])} />
      </div>
      {Object.keys(images).length > 0 && <p className="mb-2 text-xs text-muted">Grafiki w podglądzie: {Object.keys(images).join(', ')} (tylko w tej sesji).</p>}

      {/* zakladki mobile */}
      <div className="mb-2 grid grid-cols-4 gap-1 lg:hidden">
        {mobileTabs.map(({ k, label, icon: I }) => (
          <button key={k} className={`chip justify-center ${tab === k ? '!bg-ink !text-bg' : ''}`} onClick={() => setTab(k)}><I size={14} />{label}</button>
        ))}
      </div>

      <div className={`grid gap-3 lg:grid-cols-2 ${panelH}`}>
        <div className={`card flex min-h-0 flex-col overflow-hidden ${tab === 'kod' ? '' : 'hidden lg:flex'}`}>
          {isPhp && <p className="border-b border-line bg-info-soft px-3 py-1.5 text-xs">PHP nie wykonuje się w przeglądarce. Sprawdzarka czyta kod, a w podglądzie bloki PHP są oznaczone. Uruchomisz go w XAMPP.</p>}
          <div className="min-h-0 flex-1">
            <Suspense fallback={<Loading label="Ładuję edytor…" />}>
              <Editor key={active} file={active} value={files[active] ?? ''} onChange={setFile} fontSize={fontSize} />
            </Suspense>
          </div>
        </div>

        <div className={`flex min-h-0 flex-col gap-3 ${tab === 'kod' ? 'hidden lg:flex' : 'flex'}`}>
          <div className={`card min-h-0 flex-1 overflow-hidden ${tab === 'podglad' || tab === 'kod' ? '' : 'hidden lg:block'}`}>
            <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-js/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="mono ml-2 truncate text-xs text-muted">podgląd · {entry}</span>
            </div>
            <iframe title="Podgląd" sandbox="allow-scripts allow-modals" srcDoc={doc} className="h-[calc(100%-37px)] w-full bg-white" />
          </div>

          <div className={`card flex min-h-0 flex-col overflow-hidden lg:max-h-[45%] ${tab === 'sql' ? 'flex-1' : 'hidden lg:flex'}`}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-bold"><Database size={15} className="text-sql" />SQL (SQLite w przeglądarce)</span>
              <button className="btn btn-primary px-3 py-1 text-xs" onClick={execSql}><Play size={13} />Wykonaj</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3 text-sm">
              <p className="text-xs text-muted">{dbInfo}</p>
              <textarea id="p03-sql-box" rows={3} className="input mono mt-2 text-xs" placeholder="Wpisz kwerendę albo zostaw puste, żeby wykonać kwerendy.txt" />
              {sqlOut?.error && <p className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">Błąd: {sqlOut.error}</p>}
              {sqlOut?.skipped.map((s, i) => <p key={i} className="mt-2 rounded-lg bg-info-soft p-2 text-xs">Pominięto (SQLite nie ma użytkowników): <code>{s.slice(0, 120)}</code></p>)}
              {sqlOut && !sqlOut.error && sqlOut.results.length === 0 && <p className="mt-2 text-xs text-success">Wykonano. Brak wyników do pokazania.</p>}
              {sqlOut?.results.map((r, i) => (
                <div key={i} className="mt-2 overflow-x-auto rounded-lg border border-line">
                  <table className="mono w-full text-xs">
                    <thead className="bg-surface-2"><tr>{r.columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
                    <tbody>{r.values.slice(0, 200).map((row, j) => <tr key={j} className="border-t border-line">{row.map((v, k) => <td key={k} className="px-2 py-1">{v === null ? <i className="text-muted">NULL</i> : String(v)}</td>)}</tr>)}</tbody>
                  </table>
                  <p className="px-2 py-1 text-[11px] text-muted">{r.values.length} wierszy</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`card max-h-40 overflow-auto p-3 ${tab === 'konsola' ? 'flex-1 !max-h-none' : 'hidden lg:block'}`}>
            <p className="eyebrow mb-1 flex items-center gap-1"><Terminal size={12} />Konsola</p>
            {logs.length === 0 && <p className="text-xs text-muted">console.log, alert i błędy skryptu pojawią się tutaj.</p>}
            {logs.map((l, i) => (
              <p key={i} className={`mono border-b border-line py-0.5 text-xs ${l.type === 'error' ? 'text-danger' : l.type === 'warn' ? 'text-js' : l.type === 'alert' ? 'text-accent' : ''}`}>
                {l.type === 'alert' ? '⚑ alert: ' : ''}{l.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
