import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, ListOrdered, PencilLine, Play } from 'lucide-react';
import { useContent } from '../lib/data';
import { Loading } from '../components/ui';
import { buildSteps, fetchSolution, type Stage, type Step } from '../lib/walkthrough';
import { loadReqs } from '../lib/examiner';
import { loadQueries, freshFromDump } from '../lib/queries';
import { run, type QueryResult } from '../lib/sql';
import { buildSrcDoc } from '../lib/preview';

const STAGES: Stage[] = ['Start', 'Baza danych', 'Grafika', 'Strona', 'Style CSS', 'Skrypt JS', 'Oddanie'];

/** `kod` i **pogrubienie** w objasnieniach */
function Rich({ s }: { s: string }) {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return <>{parts.map((p, i) => p.startsWith('**') && p.length > 4 ? <b key={i}><Rich s={p.slice(2, -2)} /></b> : p.startsWith('`') && p.length > 2 ? <code key={i} className="mono rounded bg-surface-2 px-1 py-0.5 text-[0.85em]">{p.slice(1, -1)}</code> : <Fragment key={i}>{p}</Fragment>)}</>;
}

function CodeView({ code, from, to }: { code: string; from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('[data-hl]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [code, from]);
  const lines = code.split('\n');
  return (
    <div ref={ref} className="max-h-[60vh] overflow-auto rounded-lg border border-line bg-surface-2">
      <pre className="mono py-2 text-[12.5px] leading-[1.55]">
        {lines.map((l, i) => {
          const hl = from !== undefined && to !== undefined && i + 1 >= from && i + 1 <= to;
          return <div key={i} data-hl={hl && i + 1 === from ? '' : undefined} className={`flex ${hl ? 'bg-accent/15' : 'opacity-70'}`}><span className="w-10 shrink-0 select-none pr-3 text-right text-muted">{i + 1}</span><span className={`whitespace-pre pr-4 ${hl ? 'border-l-2 border-accent pl-2' : 'pl-[10px]'}`}>{l || ' '}</span></div>;
        })}
      </pre>
    </div>
  );
}

function ResultTable({ r }: { r: QueryResult }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-line">
      <table className="mono w-full text-xs"><thead><tr>{r.columns.map((c) => <th key={c} className="bg-surface-2 px-2 py-1 text-left">{c}</th>)}</tr></thead>
        <tbody>{r.values.slice(0, 50).map((row, i) => <tr key={i} className="border-t border-line">{row.map((v, k) => <td key={k} className="px-2 py-1">{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

function StepBody({ st, dump, base, n }: { st: Step; dump: string | null; base?: string; n: number }) {
  const [res, setRes] = useState<QueryResult | string | null>(null);
  const [prev, setPrev] = useState(false);
  const [doc, setDoc] = useState('');
  useEffect(() => { setRes(null); }, [st]);
  const page = st.snapshot && (st.file && /\.(html?|php)$/.test(st.file) ? st.file : Object.keys(st.snapshot).find((f) => /\.(html?|php)$/.test(f)));
  useEffect(() => {
    if (!prev || !page || !st.snapshot) return;
    let on = true;
    (async () => {
      let html = st.snapshot![page];
      if (page.endsWith('.php')) {
        const { runPhp } = await import('../lib/php/runtime');
        const db = dump ? await freshFromDump(dump) : null;
        html = (await runPhp({ files: st.snapshot!, entry: page, db })).html;
      }
      if (on) setDoc(buildSrcDoc({ ...st.snapshot!, [page]: html }, page, base));
    })().catch((e) => on && setDoc(`<pre>${String(e)}</pre>`));
    return () => { on = false; };
  }, [prev, st, page, dump, base]);
  async function runQ() {
    if (!dump || !st.sql) return;
    try { const db = await freshFromDump(dump); const r = run(db, st.sql).results; db.close(); setRes(r[r.length - 1] ?? 'Zapytanie wykonane (nie zwraca wierszy).'); } catch (e) { setRes('Błąd: ' + (e as Error).message); }
  }
  return (
    <article id={`krok-${n}`} className="card space-y-3 p-5">
      <p className="eyebrow">{st.stage} · krok {n}</p>
      <h2 className="display text-xl font-extrabold">{st.title}</h2>
      {st.task && <p className="rounded-lg border-l-4 border-accent bg-surface-2 px-3 py-2 text-sm"><b>Polecenie:</b> {st.task}</p>}
      <div className="space-y-2 text-[15px] leading-relaxed">{st.text.map((t, i) => <p key={i}><Rich s={t} /></p>)}</div>
      {st.code !== undefined && <div><p className="mono mb-1 text-xs text-muted">{st.file}</p><CodeView code={st.code} from={st.from} to={st.to} /></div>}
      <div className="flex flex-wrap gap-2">
        {st.sql && dump && <button className="btn btn-ghost" onClick={runQ}><Play size={15} />Wynik zapytania</button>}
        {page && st.stage !== 'Baza danych' && st.stage !== 'Start' && <button className="btn btn-ghost" onClick={() => setPrev((v) => !v)}>{prev ? <EyeOff size={15} /> : <Eye size={15} />}Podgląd strony po tym kroku</button>}
      </div>
      {res && (typeof res === 'string' ? <p className="text-sm text-muted">{res}</p> : <ResultTable r={res} />)}
      {prev && page && <iframe title="Podgląd kroku" sandbox="allow-scripts" srcDoc={doc} className="h-[420px] w-full rounded-lg border border-line bg-white" />}
    </article>
  );
}

export default function Walkthrough() {
  const { code = '' } = useParams();
  const c = useContent();
  const loc = useLocation();
  const nav = useNavigate();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState('');
  const [dump, setDump] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const sheet = c?.sheets.find((s) => s.code === code);
  const cur = Math.max(1, Number(/krok-(\d+)/.exec(loc.hash)?.[1] ?? 1));

  useEffect(() => {
    if (!sheet) return;
    let on = true;
    (async () => {
      const [sol, reqs, qs] = await Promise.all([fetchSolution(sheet.code), loadReqs(), loadQueries()]);
      if (!sol) { if (on) setErr('Brak rozwiązania dla tego arkusza.'); return; }
      const sq = qs.find((q) => q.code === sheet.code);
      const d = sheet.assets?.sql ? await fetch(`${sheet.assets.dir}/${sheet.assets.sql}`).then((r) => (r.ok ? r.text() : null)).catch(() => null) : null;
      const r = reqs[sheet.code] ?? null;
      const dbName = r?.dbName ?? sq?.db ?? null;
      if (on) { setDump(d); setSteps(buildSteps({ sheet, reqs: r, tasks: sq?.tasks ?? [], sol, dbName })); }
    })().catch((e) => on && setErr(String((e as Error).message)));
    return () => { on = false; };
  }, [sheet]);

  const go = (n: number) => nav({ hash: `krok-${n}` }, { replace: true });
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,textarea')) return; if (e.key === 'ArrowRight' && steps && cur < steps.length) go(cur + 1); if (e.key === 'ArrowLeft' && cur > 1) go(cur - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (all) document.getElementById(`krok-${cur}`)?.scrollIntoView({ block: 'start' }); }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const stageStart = useMemo(() => Object.fromEntries(STAGES.map((s) => [s, (steps?.findIndex((x) => x.stage === s) ?? -1) + 1])), [steps]);
  if (!c) return <Loading />;
  if (!sheet) return <div className="card p-8">Nie ma arkusza {code}.</div>;
  const st = steps?.[Math.min(cur, steps.length) - 1];
  const base = sheet.assets ? sheet.assets.dir + '/' : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to={`/arkusze/${encodeURIComponent(code)}`} className="inline-flex items-center gap-1 text-sm text-muted hover:underline"><ArrowLeft size={14} />{code}</Link>
      <header className="card p-5">
        <p className="eyebrow">Rozwiązanie krok po kroku</p>
        <h1 className="display text-2xl font-extrabold">{sheet.title}</h1>
        <p className="mt-1 text-sm text-muted">Kod: rozwiązanie z repozytorium Chr1skyy (pobierane na bieżąco). Objaśnienia: Pracownia.03. Najlepiej najpierw spróbuj sam, a tu zaglądaj, gdy utkniesz.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={`/warsztat/${encodeURIComponent(code)}`} className="btn btn-primary"><PencilLine size={16} />Rozwiązuję samodzielnie</Link>
          <button className="btn btn-ghost" onClick={() => setAll((v) => !v)}><ListOrdered size={16} />{all ? 'Krok po kroku' : 'Wszystkie kroki'}</button>
        </div>
      </header>

      {err && <div className="card p-5 text-danger">{err}</div>}
      {!steps && !err && <Loading label="Pobieram rozwiązanie i układam kroki…" />}

      {steps && (
        <>
          <div className="card sticky top-2 z-10 space-y-2 p-3">
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost px-2" disabled={cur <= 1} onClick={() => go(cur - 1)} aria-label="Poprzedni krok"><ChevronLeft size={18} /></button>
              <input type="range" min={1} max={steps.length} value={Math.min(cur, steps.length)} onChange={(e) => go(+e.target.value)} className="flex-1 accent-[var(--accent)]" aria-label="Krok" />
              <button className="btn btn-ghost px-2" disabled={cur >= steps.length} onClick={() => go(cur + 1)} aria-label="Następny krok"><ChevronRight size={18} /></button>
              <span className="mono w-16 text-right text-sm tabular">{Math.min(cur, steps.length)}/{steps.length}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {STAGES.filter((s) => stageStart[s] > 0).map((s) => <button key={s} onClick={() => go(stageStart[s])} className="chip text-xs" aria-pressed={st?.stage === s}>{s}</button>)}
            </div>
          </div>
          {all ? steps.map((s, i) => <StepBody key={i} st={s} n={i + 1} dump={dump} base={base} />) : st && <StepBody st={st} n={cur} dump={dump} base={base} />}
          {!all && (
            <div className="flex justify-between">
              <button className="btn btn-ghost" disabled={cur <= 1} onClick={() => go(cur - 1)}><ChevronLeft size={16} />Wstecz</button>
              <button className="btn btn-primary" disabled={cur >= steps.length} onClick={() => go(cur + 1)}>Dalej<ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
