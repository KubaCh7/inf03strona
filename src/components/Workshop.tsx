import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Database, Terminal, Eye, Code2, ImagePlus, RotateCcw, ArrowLeftRight, FileText, PanelLeftClose, PanelLeftOpen, ExternalLink, Maximize2, Minimize2, Server, Image as ImageIcon } from 'lucide-react';
import type { Sheet } from '../lib/types';
import PdfViewer, { preloadPdf } from './PdfViewer';
import type { Database as Db } from 'sql.js';
import { useStore } from '../lib/store';
import { buildSrcDoc } from '../lib/preview';
import { freshDb, run, type QueryResult } from '../lib/sql';
import { Loading } from './ui';
import Split from './Split';
import PhpMyAdmin from './PhpMyAdmin';

const Editor = lazy(() => import('./Editor'));

// Dawne pliki startowe: zapisany warsztat identyczny z nimi traktujemy jak pusty
const LEGACY_DEFAULT_INDEX = '<!DOCTYPE html>\n<html lang="pl">\n<head>\n  <meta charset="UTF-8">\n  <title>Moja strona</title>\n  <link rel="stylesheet" href="styl.css">\n</head>\n<body>\n  <header>\n    <h1>Witaj w warsztacie</h1>\n  </header>\n  <main>\n    <p>Zacznij pisać kod. Podgląd odświeża się sam.</p>\n  </main>\n  <script src="skrypt.js"></script>\n</body>\n</html>\n';
function startFiles(saved: Record<string, string> | undefined, initial: Record<string, string> | undefined): Record<string, string> {
  if (saved && !(saved['index.html'] === LEGACY_DEFAULT_INDEX && Object.keys(saved).length <= 4)) return saved;
  return initial ?? {};
}
const QUICK = ['index.html', 'styl.css', 'skrypt.js', 'kwerendy.txt'];

const WELCOME = '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><style>body{margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#faf7f2;color:#57534e;text-align:center}h1{color:#c2410c;margin:0 0 6px;font-size:28px}p{margin:0;font-size:14px}</style></head><body><div><h1>Witaj w warsztacie</h1><p>Utwórz plik i zacznij pisać. Podgląd pojawi się tutaj.</p></div></body></html>';

type Log = { type: string; text: string };

const isDesktopNow = () => window.matchMedia('(min-width: 1024px)').matches;
function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const h = () => setM(mq.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);
  return m;
}

export default function Workshop({ storageKey, initial, sheet }: { storageKey: string; initial?: Record<string, string>; sheet?: Sheet }) {
  const saved = useStore((s) => s.workspaces[storageKey]);
  const saveWorkspace = useStore((s) => s.saveWorkspace);
  const fontSize = useStore((s) => s.settings.editorFont);
  const pdfSide = useStore((s) => s.settings.pdfSide ?? 'left');
  const setSettings = useStore((s) => s.setSettings);
  const [showPdf, setShowPdf] = useState(true);
  const hideNav = useStore((s) => !!s.settings.hideNav);
  const [files, setFiles] = useState<Record<string, string>>(() => startFiles(saved, initial));
  const [active, setActive] = useState<string>(() => Object.keys(startFiles(saved, initial))[0] ?? '');
  const [page, setPage] = useState<string | null>(null);
  const [doc, setDoc] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [tab, setTab] = useState<'arkusz' | 'kod' | 'podglad' | 'sql' | 'pma' | 'konsola'>(sheet ? 'arkusz' : 'kod');
  const [bottom, setBottom] = useState<'podglad' | 'sql' | 'pma' | 'konsola'>('podglad');
  const [newName, setNewName] = useState('');
  const [dbVer, setDbVer] = useState(0);
  const [images, setImages] = useState<Record<string, string>>({});
  const [db, setDb] = useState<Db | null>(null);
  const [dbInfo, setDbInfo] = useState<string>('Brak bazy. Wczytaj plik .sql albo utwórz tabele kwerendą.');
  const [dbName, setDbName] = useState('baza');
  const [sqlOut, setSqlOut] = useState<{ results: QueryResult[]; skipped: string[]; error?: string; query?: string } | null>(null);
  const sqlRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (sheet) preloadPdf(); }, [sheet]);
  const imgRef = useRef<HTMLInputElement>(null);

  // Zapis (debounce)
  useEffect(() => { const t = setTimeout(() => saveWorkspace(storageKey, files), 400); return () => clearTimeout(t); }, [files, storageKey, saveWorkspace]);

  // Podglad (debounce 300 ms): pokazuje aktywny plik HTML/PHP albo strone, na ktora przeszedl link
  const htmlFiles = Object.keys(files).filter((f) => /\.(html?|php)$/i.test(f));
  const entry = (page && files[page] !== undefined ? page : null) ?? (/\.(html?|php)$/i.test(active) ? active : null) ?? (files['index.html'] !== undefined ? 'index.html' : htmlFiles[0]) ?? '';
  const empty = Object.values(files).every((v) => !v.trim());
  const base = sheet?.assets ? `${window.location.origin}${sheet.assets.dir}/` : undefined;
  useEffect(() => {
    const t = setTimeout(() => {
      if (empty || !entry) { setDoc(WELCOME); return; }
      let d = buildSrcDoc(files, entry, base).replace(/<\?php[\s\S]*?(\?>|$)/g, '<span style="background:#6B4E7133;font:12px monospace;padding:2px 4px;border-radius:4px">[PHP wykona się na serwerze]</span>');
      for (const [name, url] of Object.entries(images)) d = d.split(`"${name}"`).join(`"${url}"`).split(`'${name}'`).join(`'${url}'`);
      setDoc(d);
      setLogs([]);
    }, 300);
    return () => clearTimeout(t);
  }, [files, images, entry, empty, base]);

  // Baza z archiwum arkusza wczytuje sie sama
  useEffect(() => {
    const a = sheet?.assets;
    if (!a?.sql || db) return;
    let on = true;
    fetch(`${a.dir}/${a.sql}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => freshDb(text).then((d) => {
        if (!on) return;
        const t = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0];
        setDb(d); setDbName(a.sql!.replace(/\.sql$/i, ''));
        setDbInfo(`Baza ${a.sql} wczytana z archiwum arkusza. Tabele: ${t ? t.values.map((v) => v[0]).join(', ') : 'brak'}.`);
      }))
      .catch((e) => on && setDbInfo('Nie udało się wczytać bazy z archiwum: ' + (e as Error).message));
    return () => { on = false; };
  }, [sheet, db]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (!e.data?.__p03) return;
      if (e.data.type === 'nav') {
        // link do innej strony projektu (np. galeria.html): pokaz ja w podgladzie
        const target = String(e.data.args[0] ?? '').replace(/^\.\//, '').split(/[?#]/)[0];
        setFiles((f) => { if (f[target] !== undefined) setPage(target); else setLogs((l) => [...l, { type: 'warn', text: `Link do „${target}”: nie ma takiego pliku w projekcie.` }]); return f; });
        return;
      }
      setLogs((l) => [...l.slice(-200), { type: e.data.type, text: e.data.args.join(' ') }]);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);

  const setFile = (v: string) => setFiles((f) => ({ ...f, [active]: v }));
  const createFile = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (files[name] === undefined) setFiles((f) => ({ ...f, [name]: '' }));
    setActive(name); setPage(null); setTab('kod'); setNewName('');
  };
  const addFile = () => { const name = prompt('Nazwa pliku (np. galeria.html, styl.css, skrypt.js, kwerendy.txt):'); if (name) createFile(name); };
  const delFile = (name: string) => {
    if (!confirm(`Usunąć ${name}?`)) return;
    setFiles((f) => { const n = { ...f }; delete n[name]; return n; });
    setActive(Object.keys(files).find((x) => x !== name) ?? '');
    if (page === name) setPage(null);
  };
  const reset = () => { if (confirm('Wyczyścić warsztat? Wszystkie pliki z tego warsztatu znikną.')) { setFiles(initial ?? {}); setActive(Object.keys(initial ?? {})[0] ?? ''); setPage(null); } };

  async function importSql(text: string, fileName: string) {
    try {
      const d = await freshDb(text);
      const t = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0];
      setDb(d); setDbName(fileName.replace(/\.(sql|txt)$/i, '')); setDbVer((v) => v + 1);
      setDbInfo(`Wczytano ${fileName}. Tabele: ${t ? t.values.map((v) => v[0]).join(', ') : 'brak'}.`);
    } catch (e) {
      setDbInfo('Nie udało się wczytać zrzutu: ' + (e as Error).message);
    }
  }
  const loadSql = async (file: File) => { await importSql(await file.text(), file.name); setBottom('pma'); setTab('pma'); };
  /** Wykonuje kwerende z pliku (Ctrl+Enter w kwerendy.txt) i pokazuje wynik w panelu SQL. */
  async function execSql(text: string) {
    try {
      const d = db ?? (await freshDb());
      if (!db) setDb(d);
      const r = run(d, text);
      setSqlOut({ ...r, query: text.trim() });
      setDbVer((v) => v + 1);
      const t = d.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0];
      if (t && !sheet?.assets?.sql) setDbInfo(`Tabele: ${t.values.map((v) => v[0]).join(', ')}.`);
    } catch (e) {
      setSqlOut({ results: [], skipped: [], error: (e as Error).message, query: text.trim() });
    }
    setBottom('sql'); setTab((x) => (x === 'kod' && !isDesktopNow() ? 'sql' : x));
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
  const isSql = /\.(sql|txt)$/i.test(active);
  const isDesktop = useIsDesktop();
  const logCount = logs.length ? ` (${logs.length})` : '';

  const editorCard = (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden">
      {isPhp && <p className="border-b border-line bg-info-soft px-3 py-1.5 text-xs">PHP nie wykonuje się w przeglądarce. Sprawdzarka czyta kod, a w podglądzie bloki PHP są oznaczone. Uruchomisz go w XAMPP.</p>}
      <div className="min-h-0 flex-1">
        {active && files[active] !== undefined ? (
          <Suspense fallback={<Loading label="Ładuję edytor…" />}>
            <Editor key={active} file={active} value={files[active] ?? ''} onChange={setFile} fontSize={fontSize} onRun={isSql ? (q) => void execSql(q) : undefined} />
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center p-6 text-center">
            <div className="max-w-sm">
              <p className="display text-lg font-bold">Pusty projekt</p>
              <p className="mt-1 text-sm text-muted">Pliki tworzysz sam, tak jak na egzaminie. Wpisz nazwę z treści zadania{sheet ? '' : ' (np. galeria.html)'}.</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); createFile(newName); }}>
                <input className="input mono text-sm" placeholder="np. galeria.html" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                <button className="btn btn-primary px-3"><Plus size={15} />Utwórz</button>
              </form>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">{QUICK.map((n) => <button key={n} className="chip !text-xs mono" onClick={() => createFile(n)}>{n}</button>)}</div>
            </div>
          </div>
        )}
      </div>
      <p className="border-t border-line px-3 py-1 text-[11px] text-muted">{isSql ? <><kbd>Ctrl+Enter</kbd> = wykonaj kwerendę pod kursorem, <kbd>Ctrl+Shift+Enter</kbd> = wszystkie. Wynik na dole w zakładce SQL.</> : <>Podpowiedzi jak w VS Code: <kbd>!</kbd> + Tab = szablon HTML, <kbd>ul&gt;li*3</kbd> + Tab, <kbd>Ctrl+Spacja</kbd> = lista podpowiedzi.</>}</p>
    </div>
  );
  const previewCard = (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-js/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="mono ml-2 truncate text-xs text-muted">podgląd</span>
        {htmlFiles.length > 1 ? (
          <select className="mono ml-1 rounded border border-line bg-surface px-1 py-0.5 text-xs" value={entry} onChange={(e) => setPage(e.target.value)}>{htmlFiles.map((f) => <option key={f}>{f}</option>)}</select>
        ) : <span className="mono text-xs text-muted">· {entry || '—'}</span>}
      </div>
      <iframe title="Podgląd" sandbox="allow-scripts allow-modals" srcDoc={doc} className="min-h-0 w-full flex-1 bg-white" />
    </div>
  );
  const sqlCard = (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-bold"><Database size={15} className="text-sql" />Wynik kwerendy</span>
        <span className="truncate text-[11px] text-muted">{dbInfo}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-sm">
        {!sqlOut && <p className="text-xs text-muted">Napisz kwerendę w pliku <b>kwerendy.txt</b> (albo .sql) i wciśnij <kbd>Ctrl+Enter</kbd> lub „▶ Uruchom” w edytorze. Wynik pojawi się tutaj, nic nie trzeba przepisywać.</p>}
        {sqlOut?.query && <pre className="mono mb-2 max-h-24 overflow-auto rounded-lg bg-surface-2 p-2 text-[11px]">{sqlOut.query}</pre>}
        {sqlOut?.error && <p className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">Błąd: {sqlOut.error}</p>}
        {sqlOut?.skipped.map((s, i) => <p key={i} className="mt-2 rounded-lg bg-info-soft p-2 text-xs">Pominięto (SQLite nie ma użytkowników): <code>{s.slice(0, 120)}</code></p>)}
        {sqlOut && !sqlOut.error && sqlOut.results.length === 0 && <p className="mt-2 text-xs text-success">Wykonano. Zmienionych wierszy: {db?.getRowsModified() ?? 0}.</p>}
        {sqlOut?.results.map((r, i) => (
          <div key={i} className="mt-2 overflow-x-auto rounded-lg border border-line">
            <table className="mono w-full text-xs">
              <thead className="bg-surface-2"><tr>{r.columns.map((c, k) => <th key={k} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
              <tbody>{r.values.slice(0, 500).map((row, j) => <tr key={j} className="border-t border-line">{row.map((v, k) => <td key={k} className="px-2 py-1">{v === null ? <i className="text-muted">NULL</i> : String(v)}</td>)}</tr>)}</tbody>
            </table>
            <p className="px-2 py-1 text-[11px] text-muted">{r.values.length} wierszy</p>
          </div>
        ))}
      </div>
    </div>
  );
  const pmaCard = (
    <div className="card h-full min-h-0 overflow-hidden">
      <PhpMyAdmin key={dbVer} db={db} name={dbName} onChanged={() => setDbVer((v) => v)} onImport={(t, n) => void importSql(t, n)} />
    </div>
  );
  const assetsCard = sheet?.assets && sheet.assets.files.length > 0 && (
    <details className="mb-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs">
      <summary className="cursor-pointer select-none"><ImageIcon size={13} className="mr-1 inline" />Pliki z archiwum arkusza ({sheet.assets.files.length}) są już wgrane: odwołuj się do nich po nazwie, np. <code className="inline-code">&lt;img src="{sheet.assets.files.find((f) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(f)) ?? sheet.assets.files[0]}"&gt;</code></summary>
      <div className="mt-2 flex flex-wrap gap-2 pb-1">
        {sheet.assets.files.map((f) => (
          <a key={f} href={`${sheet.assets!.dir}/${f}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md border border-line px-1.5 py-1 hover:border-accent">
            {/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(f) && <img src={`${sheet.assets!.dir}/${f}`} alt="" className="h-7 w-7 rounded object-cover" loading="lazy" />}
            <span className="mono">{f}</span>
          </a>
        ))}
        {sheet.assets.sql && <span className="mono flex items-center gap-1 rounded-md border border-line px-1.5 py-1"><Database size={12} />{sheet.assets.sql} (wczytana)</span>}
      </div>
    </details>
  );
  const consoleCard = (
    <div className="card h-full min-h-0 overflow-auto p-3">
      <p className="eyebrow mb-1 flex items-center gap-1"><Terminal size={12} />Konsola</p>
      {logs.length === 0 && <p className="text-xs text-muted">console.log, alert i błędy skryptu pojawią się tutaj.</p>}
      {logs.map((l, i) => (
        <p key={i} className={`mono border-b border-line py-0.5 text-xs ${l.type === 'error' ? 'text-danger' : l.type === 'warn' ? 'text-js' : l.type === 'alert' ? 'text-accent' : ''}`}>
          {l.type === 'alert' ? '⚑ alert: ' : ''}{l.text}
        </p>
      ))}
    </div>
  );
  const pdfCard = sheet && (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-bold"><FileText size={15} className="shrink-0 text-accent" /><span className="truncate">{sheet.code}</span></span>
        {sheet.files.archiveUrl && <a className="btn btn-ghost px-2 py-1 text-xs" href={sheet.files.archiveUrl}>Pliki</a>}
        {sheet.files.archivePassword && <span className="mono hidden text-xs text-muted xl:inline">hasło: {sheet.files.archivePassword}</span>}
        <a className="btn btn-ghost px-2 py-1 text-xs" href={sheet.files.pdfView} target="_blank" rel="noreferrer" title="PDF w nowej karcie"><ExternalLink size={13} /></a>
      </div>
      <PdfViewer url={sheet.files.pdfRaw} fallback={sheet.files.pdfView} className="min-h-0 flex-1" />
    </div>
  );

  const toolbar = (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {Object.keys(files).map((f) => (
        <span key={f} className={`group inline-flex items-center rounded-lg border text-sm ${f === active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'}`}>
          <button className="mono px-2.5 py-1.5 text-xs" onClick={() => { setActive(f); setPage(null); setTab('kod'); }}>{f}</button>
          {f === active && <button className="pr-2 opacity-60 hover:opacity-100" aria-label={`Usuń ${f}`} onClick={() => delFile(f)}><Trash2 size={13} /></button>}
        </span>
      ))}
      <button className="btn btn-ghost px-2 py-1 text-xs" onClick={addFile}><Plus size={14} />Plik</button>
      <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => imgRef.current?.click()}><ImagePlus size={14} />Grafiki / pliki</button>
      <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => sqlRef.current?.click()}><Upload size={14} />Zrzut .sql</button>
      <span className="ml-auto flex gap-1.5">
        <button className="btn btn-ghost hidden px-2 py-1 text-xs lg:inline-flex" onClick={() => setSettings({ hideNav: !hideNav })} title="Ukryj/pokaż boczne menu strony">{hideNav ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{hideNav ? 'Pokaż menu' : 'Pełny ekran'}</button>
        {sheet && <button className="btn btn-ghost hidden px-2 py-1 text-xs lg:inline-flex" onClick={() => setShowPdf((x) => !x)}>{showPdf ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}{showPdf ? 'Ukryj arkusz' : 'Pokaż arkusz'}</button>}
        {sheet && showPdf && <button className="btn btn-dark hidden px-2 py-1 text-xs lg:inline-flex" onClick={() => setSettings({ pdfSide: pdfSide === 'left' ? 'right' : 'left' })} title="Zamień strony"><ArrowLeftRight size={14} />Zamień strony</button>}
        <button className="btn btn-ghost px-2 py-1 text-xs" onClick={reset} title="Wyczyść warsztat"><RotateCcw size={14} /></button>
      </span>
      <input ref={imgRef} type="file" multiple hidden onChange={(e) => addImages(e.target.files)} />
      <input ref={sqlRef} type="file" accept=".sql,.txt" hidden onChange={(e) => e.target.files?.[0] && loadSql(e.target.files[0])} />
    </div>
  );

  const mobileTabs = [
    ...(sheet ? [{ k: 'arkusz', label: 'Arkusz', icon: FileText }] : []),
    { k: 'kod', label: 'Kod', icon: Code2 }, { k: 'podglad', label: 'Podgląd', icon: Eye }, { k: 'sql', label: 'SQL', icon: Database }, { k: 'pma', label: 'phpMyAdmin', icon: Server }, { k: 'konsola', label: `Konsola${logCount}`, icon: Terminal },
  ] as const;

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }}>
      {toolbar}
      {assetsCard}
      {Object.keys(images).length > 0 && <p className="mb-2 text-xs text-muted">Grafiki w podglądzie: {Object.keys(images).join(', ')} (tylko w tej sesji).</p>}

      {/* Mobile: zakladki */}
      {!isDesktop && <div>
        <div className={`mb-2 grid gap-1 ${sheet ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {mobileTabs.map(({ k, label, icon: I }) => (
            <button key={k} className={`chip justify-center !px-1 !text-[11px] ${tab === k ? '!bg-ink !text-bg' : ''}`} onClick={() => setTab(k as typeof tab)}><I size={13} />{label}</button>
          ))}
        </div>
        <div className="h-[70dvh]">
          {tab === 'arkusz' && pdfCard}
          {tab === 'kod' && editorCard}
          {tab === 'podglad' && previewCard}
          {tab === 'sql' && sqlCard}
          {tab === 'pma' && pmaCard}
          {tab === 'konsola' && consoleCard}
        </div>
      </div>}

      {/* Desktop: panele z przeciaganymi separatorami jak w VS Code */}
      {isDesktop && (() => {
        const bottomTabs = (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-1.5 flex gap-1.5">
              {(['podglad', 'sql', 'pma', 'konsola'] as const).map((k) => (
                <button key={k} className="chip !py-1 !text-xs" aria-pressed={bottom === k} onClick={() => setBottom(k)}>{k === 'podglad' ? 'Podgląd' : k === 'sql' ? 'SQL' : k === 'pma' ? 'phpMyAdmin' : `Konsola${logCount}`}</button>
              ))}
            </div>
            <div className="min-h-0 flex-1">{bottom === 'podglad' ? previewCard : bottom === 'sql' ? sqlCard : bottom === 'pma' ? pmaCard : consoleCard}</div>
          </div>
        );
        const work = <Split id="ws-editor" dir="col" initial={0.55} a={editorCard} b={bottomTabs} />;
        return (
          <div className={hideNav ? 'h-[calc(100dvh-120px)] min-h-[520px]' : 'h-[calc(100dvh-200px)] min-h-[560px]'}>
            {sheet && showPdf ? <Split id="ws-pdf" dir="row" initial={0.42} reverse={pdfSide === 'right'} a={pdfCard} b={work} /> : work}
          </div>
        );
      })()}
    </div>
  );
}
