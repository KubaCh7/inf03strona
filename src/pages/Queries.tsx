import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Database, Search, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SESSION_LABEL, useContent } from '../lib/data';
import { useQueries, DIFF_LABEL } from '../lib/queries';
import { useStore } from '../lib/store';
import { Loading, PageHeader, Progress } from '../components/ui';
import QueryRunner from '../components/QueryRunner';

const dot = (d: number) => (d <= 2 ? 'bg-success' : d <= 4 ? 'bg-css' : d <= 6 ? 'bg-js' : d <= 8 ? 'bg-accent' : 'bg-danger');

export default function Queries() {
  const q = useQueries();
  const c = useContent();
  const nav = useNavigate();
  const done = useStore((s) => s.queries);
  const [term, setTerm] = useState('');
  const [qual, setQual] = useState<string>('');
  const titles = useMemo(() => new Map((c?.sheets ?? []).map((s) => [s.code, s])), [c]);
  if (!q || !c) return <Loading />;
  const all = q.flatMap((s) => s.tasks.map((t) => ({ s, t })));
  const solved = all.filter(({ s, t }) => done[`${s.code}#${t.n}`]?.ok).length;
  const list = q.filter((s) => (!qual || s.code.startsWith(qual)) && (!term || `${s.code} ${titles.get(s.code)?.title ?? ''} ${s.db ?? ''}`.toLowerCase().includes(term.toLowerCase())))
    .sort((a, b) => { const A = titles.get(a.code), B = titles.get(b.code); return (B?.year ?? 0) * 10 + (B?.session === 'czerwiec' ? 1 : 0) - ((A?.year ?? 0) * 10 + (A?.session === 'czerwiec' ? 1 : 0)) || a.code.localeCompare(b.code); });

  const randomUnsolved = () => { const pool = all.filter(({ s, t }) => !done[`${s.code}#${t.n}`]?.ok); const x = pool[Math.floor(Math.random() * pool.length)]; if (x) nav(`/kwerendy/${encodeURIComponent(x.s.code)}?n=${x.t.n}`); };

  return (
    <div>
      <PageHeader eyebrow={`${all.length} kwerend z ${q.length} arkuszy CKE`} title="Kwerendy" right={<button className="btn btn-primary" onClick={randomUnsolved}><Shuffle size={16} />Losowa nierozwiązana</button>}>
        Prawdziwe zapytania SQL z arkuszy, na prawdziwych bazach z plików do zadań. Piszesz kwerendę, a my porównujemy jej wynik z rozwiązaniem. Rozwiązane: <b className="text-ink">{solved}/{all.length}</b>.
      </PageHeader>
      <Progress value={solved / all.length} className="mb-5" />
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <label className="flex min-w-56 flex-1 items-center gap-2"><Search size={16} className="text-muted" /><input className="input" placeholder="Szukaj: tytuł, kod, nazwa bazy" value={term} onChange={(e) => setTerm(e.target.value)} /></label>
        {['', 'INF.03', 'EE.09', 'E.14'].map((k) => <button key={k} className="chip" aria-pressed={qual === k} onClick={() => setQual(k)}>{k || 'Wszystkie'}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((s) => {
          const sh = titles.get(s.code);
          const ok = s.tasks.filter((t) => done[`${s.code}#${t.n}`]?.ok).length;
          return (
            <Link key={s.code} to={`/kwerendy/${encodeURIComponent(s.code)}`} className="card card-hover p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="mono text-[11px] text-muted">{s.code}{sh ? ` · ${SESSION_LABEL[sh.session]} ${sh.year}` : ''}</p>
                  <p className="truncate font-bold">{sh?.title ?? s.code}</p>
                  <p className="mono mt-0.5 flex items-center gap-1 text-xs text-sql"><Database size={12} />{s.db ?? 'baza'}</p>
                </div>
                <span className={`mono shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${ok === s.tasks.length ? 'bg-success-soft text-success' : 'bg-surface-2'}`}>{ok}/{s.tasks.length}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {s.tasks.map((t) => (
                  <span key={t.n} title={`Zapytanie ${t.n}: ${DIFF_LABEL(t.difficulty)}`} className={`mono flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[11px] font-bold ${done[`${s.code}#${t.n}`]?.ok ? 'bg-success text-white' : 'bg-surface-2'}`}>
                    {done[`${s.code}#${t.n}`]?.ok ? <Check size={12} /> : <span className={`h-1.5 w-1.5 rounded-full ${dot(t.difficulty)}`} />}{t.n}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function QuerySheet() {
  const { code = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = useQueries();
  const c = useContent();
  const nav = useNavigate();
  const done = useStore((s) => s.queries);
  if (!q || !c) return <Loading />;
  const sheet = q.find((s) => s.code === code);
  if (!sheet) return <div className="card p-8">Brak kwerend dla {code}. <Link className="underline" to="/kwerendy">Wróć</Link></div>;
  const n = Number(sp.get('n') ?? sheet.tasks[0].n);
  const task = sheet.tasks.find((t) => t.n === n) ?? sheet.tasks[0];
  const meta = c.sheets.find((s) => s.code === code);
  const fromLadder = sp.get('z') === 'nauka';
  // nastepne zadanie: w drabince SQL (wg trudnosci) albo kolejne w arkuszu
  const ladder = q.flatMap((s) => s.tasks.map((t) => ({ s, t }))).sort((a, b) => a.t.difficulty - b.t.difficulty || a.s.code.localeCompare(b.s.code) || a.t.n - b.t.n);
  const idx = ladder.findIndex((x) => x.s.code === code && x.t.n === task.n);
  const nextLadder = ladder.slice(idx + 1).find((x) => !done[`${x.s.code}#${x.t.n}`]?.ok);
  const nextInSheet = sheet.tasks.find((t) => t.n > task.n);
  const prevInSheet = [...sheet.tasks].reverse().find((t) => t.n < task.n);
  const prevLadder = idx > 0 ? ladder[idx - 1] : null;
  const goPrev = () => {
    if (fromLadder && prevLadder) nav(`/kwerendy/${encodeURIComponent(prevLadder.s.code)}?n=${prevLadder.t.n}&z=nauka`);
    else if (prevInSheet) setSp({ n: String(prevInSheet.n) });
  };
  const goNext = () => {
    if (fromLadder && nextLadder) nav(`/kwerendy/${encodeURIComponent(nextLadder.s.code)}?n=${nextLadder.t.n}&z=nauka`);
    else if (nextInSheet) setSp({ n: String(nextInSheet.n) });
  };

  return (
    <div>
      <Link to={fromLadder ? '/nauka/sql' : '/kwerendy'} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={16} />{fromLadder ? 'Nauka: SQL' : 'Wszystkie kwerendy'}</Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-sm text-muted">{sheet.code}</p>
          <h1 className="text-3xl font-extrabold">{meta?.title ?? sheet.code}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sheet.tasks.map((t) => (
            <button key={t.n} className="chip" aria-pressed={t.n === task.n} onClick={() => setSp(fromLadder ? { n: String(t.n), z: 'nauka' } : { n: String(t.n) })}>
              {done[`${sheet.code}#${t.n}`]?.ok && <Check size={13} className="text-success" />}Zapytanie {t.n}
            </button>
          ))}
          {meta && <Link className="btn btn-ghost px-3 py-1.5 text-sm" to={`/arkusze/${encodeURIComponent(sheet.code)}`}>Arkusz</Link>}
        </div>
      </div>
      <QueryRunner sheet={sheet} task={task} />
      <div className="mt-4 flex justify-between gap-2">
        {(fromLadder ? prevLadder : prevInSheet) ? <button className="btn btn-ghost" onClick={goPrev}><ArrowLeft size={16} />Wróć</button> : <span />}
        {(nextInSheet || (fromLadder && nextLadder)) && <button className="btn btn-dark" onClick={goNext}>{fromLadder ? 'Następne zadanie' : `Zapytanie ${nextInSheet!.n}`}<ArrowRight size={16} /></button>}
      </div>
    </div>
  );
}
