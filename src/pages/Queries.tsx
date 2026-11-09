import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Database, Layers, Play, Search, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SESSION_LABEL, useContent } from '../lib/data';
import { useQueries, DIFF_LABEL, LEVELS, LEVEL_CLASS, LEVEL_LABEL, fitsDiff, isLevel, levelOf, pickNext, type Level, type Mode } from '../lib/queries';
import { useStore } from '../lib/store';
import { Loading, PageHeader, Progress } from '../components/ui';
import QueryRunner from '../components/QueryRunner';

const dot = (d: number) => (d <= 2 ? 'bg-success' : d <= 4 ? 'bg-js' : 'bg-danger');
const SHORT: Record<Level, string> = { latwe: 'łatwe', srednie: 'średnie', trudne: 'trudne' };
function LevelTag({ d, className = '' }: { d: number; className?: string }) {
  const l = levelOf(d);
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_CLASS[l]} ${className}`}>{SHORT[l]}</span>;
}
const readPref = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`p03:kw:${k}`); return v === null ? d : (JSON.parse(v) as T); } catch { return d; } };
const savePref = (k: string, v: unknown) => { try { localStorage.setItem(`p03:kw:${k}`, JSON.stringify(v)); } catch { /* ignore */ } };

export default function Queries() {
  const q = useQueries();
  const c = useContent();
  const nav = useNavigate();
  const done = useStore((s) => s.queries);
  const [term, setTerm] = useState('');
  // domyslnie INF.03; inne kwalifikacje po kliknieciu
  const [qual, setQualS] = useState<string>(() => readPref('qual', 'INF.03'));
  const [level, setLevelS] = useState<Level | null>(() => readPref<Level | null>('level', null));
  const [mode, setModeS] = useState<Mode>(() => readPref<Mode>('mode', 'baza'));
  const setQual = (v: string) => { setQualS(v); savePref('qual', v); };
  const [exact, setExactS] = useState<number | null>(() => readPref<number | null>('exact', null));
  // poziom i dokladna trudnosc wykluczaja sie: wybor jednego czysci drugi
  const setLevel = (v: Level | null) => { setLevelS(v); savePref('level', v); setExactS(null); savePref('exact', null); };
  const setExact = (v: number | null) => { setExactS(v); savePref('exact', v); if (v) { setLevelS(null); savePref('level', null); } };
  const setMode = (v: Mode) => { setModeS(v); savePref('mode', v); };
  const titles = useMemo(() => new Map((c?.sheets ?? []).map((s) => [s.code, s])), [c]);
  if (!q || !c) return <Loading />;
  const inQual = q.filter((s) => !qual || s.code.startsWith(qual));
  const all = inQual.flatMap((s) => s.tasks.map((t) => ({ s, t })));
  const solved = all.filter(({ s, t }) => done[`${s.code}#${t.n}`]?.ok).length;
  const count = (l: Level | null) => all.filter(({ t }) => !l || levelOf(t.difficulty) === l).length;
  const countExact = (d: number) => all.filter(({ t }) => t.difficulty === d).length;
  const filtering = !!level || !!exact;
  const list = inQual.filter((s) => (!filtering || s.tasks.some((t) => fitsDiff(t.difficulty, level, exact))) && (!term || `${s.code} ${titles.get(s.code)?.title ?? ''} ${s.db ?? ''}`.toLowerCase().includes(term.toLowerCase())))
    .sort((a, b) => { const A = titles.get(a.code), B = titles.get(b.code); return (B?.year ?? 0) * 10 + (B?.session === 'czerwiec' ? 1 : 0) - ((A?.year ?? 0) * 10 + (A?.session === 'czerwiec' ? 1 : 0)) || a.code.localeCompare(b.code); });

  const start = () => {
    const x = pickNext(q, done, { qual, level, exact, mode });
    if (x) nav(`/kwerendy/${encodeURIComponent(x.code)}?n=${x.n}&tryb=${mode}${level ? `&poziom=${level}` : ''}${exact ? `&trud=${exact}` : ''}${qual ? `&kw=${qual}` : '&kw='}`);
  };

  return (
    <div>
      <PageHeader eyebrow={`${all.length} kwerend z ${inQual.length} arkuszy ${qual || 'CKE'}`} title="Kwerendy">
        Prawdziwe zapytania SQL z arkuszy, na prawdziwych bazach z plików do zadań. Piszesz kwerendę, a my porównujemy jej wynik z rozwiązaniem. Rozwiązane: <b className="text-ink">{solved}/{all.length}</b>.
      </PageHeader>
      <Progress value={all.length ? solved / all.length : 0} className="mb-5" />
      <div className="card mb-4 p-4">
        <p className="eyebrow mb-2">Trening</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Poziom:</span>
            {LEVELS.map((l) => <button key={l} className="chip" aria-pressed={level === l} onClick={() => setLevel(level === l ? null : l)}><span className={`h-2 w-2 rounded-full ${l === 'latwe' ? 'bg-success' : l === 'srednie' ? 'bg-js' : 'bg-danger'}`} />{LEVEL_LABEL[l]} <span className="mono text-xs opacity-70">{count(l)}</span></button>)}
            <button className="chip" aria-pressed={!level && !exact} onClick={() => setLevel(null)}>Wszystkie <span className="mono text-xs opacity-70">{count(null)}</span></button>
          </div>
          <div className="flex w-full flex-wrap items-center gap-1">
            <span className="text-xs text-muted">Dokładna trudność:</span>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => {
              const n = countExact(d);
              return (
                <button key={d} disabled={!n} title={n ? `${n} kwerend o trudności ${d}/10 (${DIFF_LABEL(d)})` : 'Brak kwerend o tej trudności'}
                  className={`mono flex h-8 min-w-9 flex-col items-center justify-center rounded-lg border px-1.5 text-xs font-bold leading-none disabled:opacity-30 ${exact === d ? 'border-ink bg-ink text-bg' : 'border-line bg-surface hover:border-ink/40'}`}
                  onClick={() => setExact(exact === d ? null : d)}>
                  <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${dot(d)}`} />{d}</span>
                  <span className="mt-0.5 text-[9px] font-normal opacity-70">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Tryb:</span>
            <button className="chip" aria-pressed={mode === 'baza'} onClick={() => setMode('baza')} title="Wszystkie kwerendy z jednej bazy (jednego arkusza) po kolei"><Layers size={13} />Cała baza po kolei</button>
            <button className="chip" aria-pressed={mode === 'losowo'} onClick={() => setMode('losowo')} title="Każda kwerenda z innej, losowej bazy"><Shuffle size={13} />Losowo</button>
          </div>
          <button className="btn btn-primary ml-auto" onClick={start}><Play size={15} />Start</button>
        </div>
        <p className="mt-2 text-xs text-muted">{mode === 'baza' ? 'Losujemy jedną bazę z arkusza i robisz po kolei wszystkie jej kwerendy' : 'Każda kolejna kwerenda jest z innej, losowej bazy'}{exact ? ` (tylko trudność ${exact}/10)` : level ? ` (tylko ${SHORT[level]})` : ''}. Rozwiązane pomijamy.</p>
      </div>
      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <label className="flex min-w-56 flex-1 items-center gap-2"><Search size={16} className="text-muted" /><input className="input" placeholder="Szukaj: tytuł, kod, nazwa bazy" value={term} onChange={(e) => setTerm(e.target.value)} /></label>
        {['INF.03', 'EE.09', 'E.14', ''].map((k) => <button key={k} className="chip" aria-pressed={qual === k} onClick={() => setQual(k)}>{k || 'Wszystkie'}</button>)}
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
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`mono rounded-full px-2 py-0.5 text-xs font-bold ${ok === s.tasks.length ? 'bg-success-soft text-success' : 'bg-surface-2'}`}>{ok}/{s.tasks.length}</span>
                  <LevelTag d={Math.max(...s.tasks.map((t) => t.difficulty))} />
                </span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {s.tasks.map((t) => (
                  <span key={t.n} title={`Zapytanie ${t.n}: ${SHORT[levelOf(t.difficulty)]} (${DIFF_LABEL(t.difficulty)})`} className={`flex h-9 flex-1 flex-col items-center justify-center rounded-md leading-none ${done[`${s.code}#${t.n}`]?.ok ? 'bg-success text-white' : 'bg-surface-2'} ${filtering && !fitsDiff(t.difficulty, level, exact) ? 'opacity-35' : ''}`}>
                    <span className="mono flex items-center gap-1 text-[11px] font-bold">{done[`${s.code}#${t.n}`]?.ok ? <Check size={11} /> : <span className={`h-1.5 w-1.5 rounded-full ${dot(t.difficulty)}`} />}{t.n}</span>
                    <span className="mt-0.5 text-[9px] opacity-80">{SHORT[levelOf(t.difficulty)]}</span>
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
  const mode = (sp.get('tryb') === 'baza' || sp.get('tryb') === 'losowo' ? sp.get('tryb') : null) as Mode | null;
  const lvl = sp.get('poziom'); const level = isLevel(lvl) ? lvl : null;
  const exact = Number(sp.get('trud')) || null;
  const qual = sp.get('kw') ?? 'INF.03';
  const keep = (n2: number, code2 = code) => `/kwerendy/${encodeURIComponent(code2)}?n=${n2}&tryb=${mode}${level ? `&poziom=${level}` : ''}${exact ? `&trud=${exact}` : ''}&kw=${qual}`;
  const trainNext = (newSheet = false) => { const x = pickNext(q, done, { qual, level, exact, mode: mode!, current: { code, n: task.n }, newSheet }); if (x) nav(keep(x.n, x.code)); };
  const sameSheetNext = mode === 'baza' ? sheet.tasks.find((t) => t.n > task.n && fitsDiff(t.difficulty, level, exact) && !done[`${code}#${t.n}`]?.ok) : undefined;
  // nastepne zadanie: w drabince SQL (wg trudnosci) albo kolejne w arkuszu
  const ladder = q.filter((s) => s.code.slice(0, 5) === code.slice(0, 5)).flatMap((s) => s.tasks.map((t) => ({ s, t }))).sort((a, b) => a.t.difficulty - b.t.difficulty || a.s.code.localeCompare(b.s.code) || a.t.n - b.t.n);
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
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><LevelTag d={task.difficulty} /><span className="text-muted">Zapytanie {task.n} · trudność {task.difficulty}/10</span>{mode && <span className="chip !py-0.5 !text-[11px]">{mode === 'baza' ? 'Cała baza po kolei' : 'Losowo'}{exact ? ` · trudność ${exact}` : level ? ` · ${SHORT[level]}` : ''}</span>}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sheet.tasks.map((t) => (
            <button key={t.n} className={`chip ${(level || exact) && !fitsDiff(t.difficulty, level, exact) ? 'opacity-40' : ''}`} aria-pressed={t.n === task.n} onClick={() => (mode ? nav(keep(t.n)) : setSp(fromLadder ? { n: String(t.n), z: 'nauka' } : { n: String(t.n) }))}>
              {done[`${sheet.code}#${t.n}`]?.ok && <Check size={13} className="text-success" />}Zapytanie {t.n} <span className={`h-1.5 w-1.5 rounded-full ${dot(t.difficulty)}`} />
            </button>
          ))}
          {meta && <Link className="btn btn-ghost px-3 py-1.5 text-sm" to={`/arkusze/${encodeURIComponent(sheet.code)}`}>Arkusz</Link>}
        </div>
      </div>
      <QueryRunner sheet={sheet} task={task} />
      {mode ? (
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <button className="btn btn-ghost" onClick={() => nav(-1)}><ArrowLeft size={16} />Wróć</button>
          <span className="flex flex-wrap gap-2">
            {mode === 'baza' && <button className="btn btn-ghost" onClick={() => trainNext(true)}><Shuffle size={16} />Inna baza</button>}
            <button className="btn btn-dark" onClick={() => trainNext(false)}>{mode === 'baza' ? (sameSheetNext ? `Zapytanie ${sameSheetNext.n}` : 'Następna baza') : 'Następna losowa'}<ArrowRight size={16} /></button>
          </span>
        </div>
      ) : (
        <div className="mt-4 flex justify-between gap-2">
          {(fromLadder ? prevLadder : prevInSheet) ? <button className="btn btn-ghost" onClick={goPrev}><ArrowLeft size={16} />Wróć</button> : <span />}
          {(nextInSheet || (fromLadder && nextLadder)) && <button className="btn btn-dark" onClick={goNext}>{fromLadder ? 'Następne zadanie' : `Zapytanie ${nextInSheet!.n}`}<ArrowRight size={16} /></button>}
        </div>
      )}
    </div>
  );
}
