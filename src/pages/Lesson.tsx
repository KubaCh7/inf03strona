import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, X, Play, Lock } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { useStore } from '../lib/store';
import { runLessonChecks, type CheckResult } from '../lib/checker';
import { buildSrcDoc } from '../lib/preview';
import { freshDb, run, type QueryResult } from '../lib/sql';
import { Loading, Rich } from '../components/ui';
import { isUnlocked } from './Path';

const Editor = lazy(() => import('../components/Editor'));

export default function Lesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const idx = LESSONS.findIndex((l) => l.id === id);
  const lesson = LESSONS[idx];
  const done = useStore((s) => s.lessons);
  const unlockAll = useStore((s) => s.settings.unlockAll);
  const complete = useStore((s) => s.completeLesson);
  const fontSize = useStore((s) => s.settings.editorFont);
  const saved = useStore((s) => s.workspaces[`lesson:${id}`]);
  const saveWs = useStore((s) => s.saveWorkspace);
  const [files, setFiles] = useState<Record<string, string>>(() => saved ?? lesson?.task.starter ?? {});
  const [active, setActive] = useState(() => Object.keys(lesson?.task.starter ?? { x: '' })[0]);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [sqlRes, setSqlRes] = useState<QueryResult | null | string>(null);
  const [busy, setBusy] = useState(false);

  if (!lesson) return <div className="card p-8">Nie ma takiej lekcji. <Link className="underline" to="/sciezka">Wróć</Link></div>;
  if (!isUnlocked(idx, done, unlockAll)) return <div className="card p-8"><Lock className="mb-2" />Ta lekcja jest jeszcze zablokowana. Ukończ poprzednią albo włącz „Odblokuj całą ścieżkę” w Ustawieniach. <Link className="underline" to="/sciezka">Wróć do ścieżki</Link></div>;

  const t = lesson.task;
  const update = (v: string) => { const n = { ...files, [active]: v }; setFiles(n); saveWs(`lesson:${lesson.id}`, n); };
  const allOk = results !== null && results.every((r) => r.ok);
  const next = LESSONS[idx + 1];

  async function check() {
    setBusy(true);
    const r = await runLessonChecks(t.checks, files, t.db);
    setResults(r);
    setBusy(false);
    if (r.every((x) => x.ok)) complete(lesson.id, lesson.xp);
  }
  async function runSql() {
    try {
      const db = await freshDb(t.db);
      const out = run(db, Object.values(files)[0] ?? '').results;
      setSqlRes(out[out.length - 1] ?? 'Wykonano. Brak wyników.');
    } catch (e) { setSqlRes('Błąd: ' + (e as Error).message); }
  }
  const tables = t.db ? Array.from(t.db.matchAll(/CREATE TABLE (\w+) \(([^;]*?)\);/g)).map((m) => `${m[1]}(${m[2].split(',').map((c) => c.trim().split(' ')[0]).join(', ')})`) : [];

  return (
    <div>
      <Link to="/sciezka" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={16} />Ścieżka</Link>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <article className="min-w-0">
          <p className="eyebrow">Poziom {lesson.level} · lekcja {idx + 1} z {LESSONS.length} · {lesson.minutes} min</p>
          <h1 className="mt-1 text-3xl font-extrabold">{lesson.title}</h1>
          <p className="mt-2 font-bold text-accent">{lesson.goal}</p>
          <div className="prose-p mt-3">{lesson.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
          {lesson.example && <pre className="mono mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-[13px] leading-relaxed text-bg">{lesson.example}</pre>}
          <div className="card mt-5 border-accent/40 p-4" style={{ background: 'var(--accent-soft)' }}>
            <p className="eyebrow !text-accent">Zadanie</p>
            <p className="mt-1 font-bold">{t.prompt}</p>
            {tables.length > 0 && <p className="mono mt-2 text-xs">Tabele: {tables.join(' · ')}</p>}
          </div>
          {results && (
            <ul className="card pop mt-4 divide-y divide-line p-2">
              {results.map((r) => (
                <li key={r.label} className="flex items-start gap-2 p-2 text-sm">
                  {r.ok ? <Check size={18} className="shrink-0 text-success" /> : <X size={18} className="shrink-0 text-danger" />}
                  <span>{r.label}{r.note && !r.ok && <span className="block text-xs text-muted">{r.note}</span>}</span>
                </li>
              ))}
            </ul>
          )}
          {allOk && <p className="pop mt-3 rounded-xl bg-success-soft p-3 font-bold text-success">Zaliczone! +{lesson.xp} XP</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {t.checks.length > 0 ? <button className="btn btn-primary" onClick={check} disabled={busy}>{busy ? 'Sprawdzam…' : 'Sprawdź zadanie'}</button>
              : <button className="btn btn-primary" onClick={() => complete(lesson.id, lesson.xp)} disabled={!!done[lesson.id]}>{done[lesson.id] ? 'Ukończona' : 'Oznacz jako zrobioną'}</button>}
            {lesson.level === 7 && <Link className="btn btn-ghost" to="/arkusze?kw=INF.03&max=4">Łatwe arkusze INF.03</Link>}
            {next && (done[lesson.id] || allOk) && <button className="btn btn-dark" onClick={() => nav(`/sciezka/${next.id}`)}>Następna lekcja <ArrowRight size={16} /></button>}
          </div>
        </article>

        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Object.keys(files).map((f) => <button key={f} className={`mono rounded-lg border px-2.5 py-1.5 text-xs ${f === active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'}`} onClick={() => setActive(f)}>{f}</button>)}
            {t.mode === 'sql' && <button className="btn btn-ghost ml-auto px-3 py-1 text-xs" onClick={runSql}><Play size={13} />Uruchom</button>}
            <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => { setFiles(t.starter); setResults(null); }}>Reset</button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="card h-[420px] overflow-hidden">
              <Suspense fallback={<Loading label="Ładuję edytor…" />}><Editor key={active} file={active} value={files[active] ?? ''} onChange={update} fontSize={fontSize} /></Suspense>
            </div>
            {t.mode === 'web' && (
              <div className="card h-[420px] overflow-hidden">
                <p className="mono border-b border-line px-3 py-2 text-xs text-muted">podgląd</p>
                <iframe title="Podgląd" sandbox="allow-scripts allow-modals" srcDoc={buildSrcDoc(files)} className="h-[calc(100%-33px)] w-full bg-white" />
              </div>
            )}
            {t.mode === 'sql' && (
              <div className="card h-[420px] overflow-auto p-3">
                <p className="eyebrow mb-2">Wynik</p>
                {sqlRes === null && <p className="text-sm text-muted">Kliknij „Uruchom”, żeby zobaczyć wynik kwerendy.</p>}
                {typeof sqlRes === 'string' && <p className="text-sm">{sqlRes}</p>}
                {sqlRes && typeof sqlRes === 'object' && (
                  <table className="mono w-full text-xs"><thead className="bg-surface-2"><tr>{sqlRes.columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
                    <tbody>{sqlRes.values.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, k) => <td key={k} className="px-2 py-1">{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody></table>
                )}
              </div>
            )}
            {t.mode === 'php' && (
              <div className="card p-4 text-sm">
                <p className="eyebrow mb-2">Jak to jest sprawdzane</p>
                <p>Ten kod nie uruchamia się w przeglądarce. Sprawdzarka czyta go i szuka wymaganych konstrukcji. Przepisz go potem do XAMPP i uruchom naprawdę: tylko tak nauczysz się czytać błędy PHP.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
