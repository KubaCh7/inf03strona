import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Database, Eye, KeyRound, Play, ShieldCheck, Table2, X } from 'lucide-react';
import type { QueryResult } from '../lib/sql';
import { run } from '../lib/sql';
import { checkQuery, DIFF_LABEL, freshFromDump, getDump, getSolutions, KIND_LABEL, schemaOf, type CheckOutcome, type QueryTask, type Schema, type SheetQueries } from '../lib/queries';
import { useStore } from '../lib/store';
import { DifficultyBar, Loading } from './ui';

const Editor = lazy(() => import('./Editor'));

export function ResultTable({ r, title, tone }: { r?: QueryResult; title?: string; tone?: 'ok' | 'bad' }) {
  if (!r) return null;
  return (
    <div className={`overflow-hidden rounded-xl border ${tone === 'ok' ? 'border-success/50' : tone === 'bad' ? 'border-danger/50' : 'border-line'}`}>
      {title && <p className="border-b border-line bg-surface-2 px-3 py-1.5 text-xs font-bold">{title}</p>}
      <div className="max-h-72 overflow-auto">
        <table className="mono w-full text-xs">
          <thead className="sticky top-0 bg-surface-2"><tr>{r.columns.map((c, i) => <th key={i} className="whitespace-nowrap px-2 py-1.5 text-left">{c}</th>)}</tr></thead>
          <tbody>{r.values.slice(0, 300).map((row, i) => <tr key={i} className="border-t border-line">{row.map((v, k) => <td key={k} className="whitespace-nowrap px-2 py-1">{v === null ? <i className="text-muted">NULL</i> : String(v)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="border-t border-line px-3 py-1 text-[11px] text-muted">{r.values.length} {r.values.length === 1 ? 'wiersz' : 'wierszy'}</p>
    </div>
  );
}

function SchemaPanel({ schema, dump }: { schema: Schema; dump: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState<QueryResult | null>(null);
  useEffect(() => {
    if (!open) return;
    freshFromDump(dump).then((db) => setPreview(db.exec(`SELECT * FROM "${open}" LIMIT 30`)[0] ?? null));
  }, [open, dump]);
  return (
    <div className="space-y-1.5">
      {schema.map((t) => (
        <div key={t.name} className="rounded-xl border border-line bg-surface">
          <button className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => { setPreview(null); setOpen(open === t.name ? null : t.name); }}>
            {open === t.name ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Table2 size={14} className="text-js" /><b className="mono text-sm">{t.name}</b>
            <span className="ml-auto text-xs text-muted">{t.rows} wierszy</span>
          </button>
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {t.columns.map((c) => (
              <span key={c.name} className="mono inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px]" title={c.type}>
                {c.pk && <KeyRound size={10} className="text-js" />}{c.name}<span className="text-muted">{c.type ? ` ${c.type.toLowerCase()}` : ''}</span>
              </span>
            ))}
          </div>
          {open === t.name && <div className="px-2 pb-2">{preview ? <ResultTable r={preview} /> : <Loading label="Ładuję dane…" />}</div>}
        </div>
      ))}
    </div>
  );
}

export default function QueryRunner({ sheet, task, onSolved }: { sheet: SheetQueries; task: QueryTask; onSolved?: () => void }) {
  const key = `${sheet.code}#${task.n}`;
  const saved = useStore((s) => s.queries[key]);
  const saveQuery = useStore((s) => s.saveQuery);
  const fontSize = useStore((s) => s.settings.editorFont);
  const [sql, setSql] = useState(saved?.sql ?? '');
  const [dump, setDump] = useState<string | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [out, setOut] = useState<{ results: QueryResult[]; skipped: string[]; error?: string } | null>(null);
  const [check, setCheck] = useState<CheckOutcome | null>(null);
  const [solution, setSolution] = useState<string | null | undefined>(undefined);
  const [showSol, setShowSol] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSql(useStore.getState().queries[key]?.sql ?? ''); setOut(null); setCheck(null); setShowSol(false); setSolution(undefined); }, [key]);
  useEffect(() => {
    if (!sheet.dump) { setDump(''); setSchema([]); return; }
    let on = true;
    getDump(sheet.dump).then(async (d) => { if (!on) return; setDump(d); const db = await freshFromDump(d); if (on) setSchema(schemaOf(db)); }).catch(() => on && setDump(''));
    return () => { on = false; };
  }, [sheet.dump]);
  useEffect(() => { const t = setTimeout(() => saveQuery(key, sql), 400); return () => clearTimeout(t); }, [sql, key, saveQuery]);

  const sqlSchema = useMemo(() => (schema ? Object.fromEntries(schema.map((t) => [t.name, t.columns.map((c) => c.name)])) : undefined), [schema]);

  async function exec() {
    if (dump === null) return;
    try { const db = await freshFromDump(dump); setOut(run(db, sql)); } catch (e) { setOut({ results: [], skipped: [], error: (e as Error).message }); }
  }
  async function doCheck() {
    if (dump === null) return;
    setBusy(true);
    const sols = await getSolutions(sheet.solutionPath);
    const sol = sols[task.n];
    setSolution(sol ?? null);
    const r = await checkQuery(dump, task, sql, sol);
    setCheck(r);
    setBusy(false);
    if (r.ok) { saveQuery(key, sql, true); onSolved?.(); }
  }
  async function reveal() {
    if (solution === undefined) { const sols = await getSolutions(sheet.solutionPath); setSolution(sols[task.n] ?? null); }
    setShowSol(true);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <span className="mono rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-bg">Zapytanie {task.n}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px]">{KIND_LABEL[task.kind]}</span>
            {saved?.ok && <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-success"><Check size={14} />zrobione</span>}
          </div>
          <p className="mt-3 text-[15px] leading-relaxed"><span className="text-muted">Zapytanie </span>{task.text}</p>
          <div className="mt-3"><DifficultyBar score={task.difficulty} size="sm" /><p className="mt-1 text-xs text-muted">{DIFF_LABEL(task.difficulty)}</p></div>
        </div>
        <div className="card p-4">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Database size={13} />Baza {sheet.db ?? ''}</p>
          {schema === null ? <Loading label="Wczytuję bazę z arkusza…" /> : schema.length === 0 ? <p className="text-sm text-muted">Ta baza startuje pusta (tabelę tworzysz w zadaniu) albo nie udało się jej wczytać.</p> : <SchemaPanel schema={schema} dump={dump!} />}
        </div>
      </aside>

      <section className="min-w-0 space-y-3">
        <div className="card h-56 overflow-hidden">
          <Suspense fallback={<Loading label="Ładuję edytor…" />}>
            <Editor key={key + (sqlSchema ? 's' : '')} file="kwerenda.sql" value={sql} onChange={setSql} fontSize={fontSize} schema={sqlSchema} />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={exec} disabled={dump === null}><Play size={16} />Wykonaj</button>
          <button className="btn btn-primary" onClick={doCheck} disabled={dump === null || busy}><ShieldCheck size={16} />{busy ? 'Sprawdzam…' : 'Sprawdź'}</button>
          <button className="btn btn-ghost ml-auto" onClick={reveal}><Eye size={16} />Pokaż rozwiązanie</button>
        </div>
        <p className="text-xs text-muted">Podpowiedzi znają tabele i kolumny tej bazy (Ctrl+Spacja). Kwerenda działa na świeżej kopii bazy za każdym razem.</p>

        {showSol && (
          <div className="card pop p-4">
            <p className="eyebrow mb-2">Przykładowe rozwiązanie (Chr1skyy, GitHub)</p>
            {solution ? <pre className="mono overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink p-3 text-sm text-bg">{solution}</pre> : <p className="text-sm text-muted">Brak rozwiązania dla tego zapytania.</p>}
          </div>
        )}

        {check && (
          <div className={`card pop p-4 ${check.ok ? '!border-success' : '!border-danger'}`}>
            <p className={`flex items-center gap-2 font-bold ${check.ok ? 'text-success' : 'text-danger'}`}>{check.ok ? <Check size={18} /> : <X size={18} />}{check.ok ? 'Dobrze! +8 XP' : 'Jeszcze nie'}</p>
            <p className="mt-1 text-sm">{check.message}</p>
            {check.skipped?.map((s, i) => <p key={i} className="mt-1 text-xs text-muted">Pominięto w SQLite: <code>{s.slice(0, 100)}</code></p>)}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <ResultTable r={check.user} title="Twój wynik" tone={check.ok ? 'ok' : 'bad'} />
              {!check.ok && <ResultTable r={check.expected} title="Oczekiwany wynik" />}
            </div>
          </div>
        )}

        {out && !check && (
          <div className="space-y-2">
            {out.error && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">Błąd: {out.error}</p>}
            {out.skipped.map((s, i) => <p key={i} className="rounded-xl bg-info-soft p-2 text-xs">Pominięto (SQLite nie ma użytkowników): <code>{s.slice(0, 120)}</code></p>)}
            {!out.error && out.results.length === 0 && <p className="text-sm text-success">Wykonano. Brak wyników do pokazania (kwerenda zmieniła dane albo strukturę).</p>}
            {out.results.map((r, i) => <ResultTable key={i} r={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
