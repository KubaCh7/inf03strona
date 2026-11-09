import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Eye, HelpCircle, Lightbulb, Lock, Play, X } from 'lucide-react';
import { PRACTICE, SECTIONS, TOPICS, type PracticeTask, type Topic } from '../data/practice';

export function orderedTasks(topic: PracticeTask['topic']) {
  const secs = SECTIONS[topic];
  return PRACTICE.filter((p) => p.topic === topic).sort((a, b) => secs.indexOf(a.section) - secs.indexOf(b.section) || a.difficulty - b.difficulty);
}
import { useQueries, DIFF_LABEL } from '../lib/queries';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { runLessonChecks, type CheckResult } from '../lib/checker';
import { buildSrcDoc } from '../lib/preview';
import { DifficultyBar, Loading, PageHeader, Progress } from '../components/ui';

const Editor = lazy(() => import('../components/Editor'));
const LEVELS = [[1, 2, 'Rozgrzewka'], [3, 4, 'Łatwe'], [5, 6, 'Średnie'], [7, 8, 'Trudne'], [9, 10, 'Egzaminacyjne']] as const;

type Item = { key: string; title: string; difficulty: number; done: boolean; to: string; sub?: string; section?: string };

function useLadder(topic: Topic, allQuals = false): Item[] | null {
  const q = useQueries();
  const c = useContent();
  const practice = useStore((s) => s.practice);
  const queries = useStore((s) => s.queries);
  if (topic === 'sql') {
    if (!q || !c) return null;
    const titles = new Map(c.sheets.map((s) => [s.code, s.title]));
    // domyslnie tylko kwerendy z arkuszy INF.03
    return q.filter((s) => allQuals || s.code.startsWith('INF.03')).flatMap((s) => s.tasks.map((t) => ({
      key: `${s.code}#${t.n}`, title: t.text.charAt(0).toUpperCase() + t.text.slice(1), difficulty: t.difficulty, done: !!queries[`${s.code}#${t.n}`]?.ok,
      to: `/kwerendy/${encodeURIComponent(s.code)}?n=${t.n}&z=nauka`, sub: `${titles.get(s.code) ?? s.code} · zapytanie ${t.n}`,
    }))).sort((a, b) => a.difficulty - b.difficulty || a.key.localeCompare(b.key));
  }
  return orderedTasks(topic).map((p) => ({ key: p.id, title: p.title, difficulty: p.difficulty, done: !!practice[p.id]?.ok, to: `/nauka/${topic}/${p.id}`, sub: p.prompt, section: p.section }));
}

export default function Learn() {
  const q = useQueries();
  const practice = useStore((s) => s.practice);
  const queries = useStore((s) => s.queries);
  const count = (t: Topic) => {
    if (t === 'sql') { const all = (q ?? []).filter((s) => s.code.startsWith('INF.03')).flatMap((s) => s.tasks.map((x) => `${s.code}#${x.n}`)); return [all.filter((k) => queries[k]?.ok).length, all.length]; }
    const all = PRACTICE.filter((p) => p.topic === t); return [all.filter((p) => practice[p.id]?.ok).length, all.length];
  };
  return (
    <div>
      <PageHeader eyebrow="Ćwiczenia od najłatwiejszych do najtrudniejszych" title="Nauka">
        Wybierz temat. Zadania są ułożone według trudności, więc zaczynasz od rozgrzewki, a kończysz na poziomie egzaminu. Każde sprawdzamy od razu.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOPICS.map((t) => {
          const [ok, all] = count(t.k);
          return (
            <Link key={t.k} to={`/nauka/${t.k}`} className="card card-hover relative overflow-hidden p-6">
              <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-15" style={{ background: t.color }} />
              <p className="display text-4xl font-extrabold" style={{ color: t.color }}>{t.name}</p>
              <p className="mt-1 text-sm text-muted">{t.desc}</p>
              <div className="mt-5 flex items-center gap-3"><Progress value={all ? ok / all : 0} className="flex-1" /><span className="mono text-xs tabular">{ok}/{all || '…'}</span></div>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold">{ok ? 'Kontynuuj' : 'Zacznij'} <ArrowRight size={15} /></p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function LearnTopic() {
  const { topic = 'html' } = useParams() as { topic: Topic };
  const nav = useNavigate();
  const info = TOPICS.find((t) => t.k === topic);
  const [allQuals, setAllQuals] = useState(false);
  const items = useLadder(topic, allQuals);
  const [showDone, setShowDone] = useState(true);
  if (!info) return <div className="card p-8">Nie ma takiego tematu.</div>;
  if (!items) return <Loading />;
  const next = items.find((i) => !i.done);
  const done = items.filter((i) => i.done).length;
  return (
    <div className="max-w-4xl">
      <Link to="/nauka" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={16} />Nauka</Link>
      <PageHeader eyebrow={`${items.length} zadań · ${done} zrobionych`} title={<span style={{ color: info.color }}>{info.name}</span>} right={next && <button className="btn btn-primary" onClick={() => nav(next.to)}>Następne zadanie <ArrowRight size={16} /></button>}>
        {topic === 'sql' ? <>Prawdziwe kwerendy z arkuszy {allQuals ? 'CKE (INF.03, EE.09, E.14)' : 'INF.03'}, posortowane od najprostszego SELECT-a do złączeń z grupowaniem. <button className="text-accent underline" onClick={() => setAllQuals((x) => !x)}>{allQuals ? 'Tylko INF.03' : 'Pokaż też EE.09 i E.14'}</button></> : 'Podpunkty od podstaw do poziomu egzaminu. Każde zadanie ma wyjaśnienie i gotowe rozwiązanie, gdy utkniesz.'}
      </PageHeader>
      <Progress value={done / items.length} className="mb-4" />
      {topic !== 'sql' && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {SECTIONS[topic as PracticeTask['topic']].map((sec) => { const all = items.filter((i) => i.section === sec); const d = all.filter((i) => i.done).length; return <a key={sec} href={`#${encodeURIComponent(sec)}`} className={`chip !text-xs ${d === all.length ? '!border-success !text-success' : ''}`}>{sec} <span className="mono opacity-60">{d}/{all.length}</span></a>; })}
        </div>
      )}
      <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[var(--accent)]" />Pokaż zrobione</label>
      {(topic === 'sql' ? LEVELS.map(([lo, hi, name]) => ({ name, lvl: items.filter((i) => i.difficulty >= lo && i.difficulty <= hi) })) : SECTIONS[topic as PracticeTask['topic']].map((name) => ({ name, lvl: items.filter((i) => i.section === name) }))).map(({ name, lvl }) => {
        if (!lvl.length) return null;
        const vis = showDone ? lvl : lvl.filter((i) => !i.done);
        const lvlDone = lvl.filter((i) => i.done).length;
        return (
          <section key={name} id={encodeURIComponent(name)} className="mb-6 scroll-mt-20">
            <div className="mb-2 flex items-center gap-3"><h2 className="text-xl font-bold">{name}</h2><span className="mono text-xs text-muted">{lvlDone}/{lvl.length}</span><span className="h-px flex-1 bg-line" /></div>
            <div className="grid gap-2">
              {vis.slice(0, topic === 'sql' ? 60 : 99).map((i) => (
                <Link key={i.key} to={i.to} className={`card card-hover flex items-center gap-3 p-3 ${i === next ? 'ring-2 ring-accent/50' : ''}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i.done ? 'bg-success text-white' : 'bg-surface-2'}`}>{i.done ? <Check size={16} /> : <span className="mono text-xs font-bold">{i.difficulty}</span>}</span>
                  <span className="min-w-0 flex-1"><b className="line-clamp-1 text-sm">{i.title}</b>{i.sub && <span className="line-clamp-1 text-xs text-muted">{i.sub}</span>}</span>
                  <span className="hidden w-28 sm:block"><DifficultyBar score={i.difficulty} size="sm" showLabel={false} /></span>
                </Link>
              ))}
              {topic === 'sql' && vis.length > 60 && <p className="text-xs text-muted">… i jeszcze {vis.length - 60}. Rób po kolei przyciskiem „Następne zadanie”.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function PracticeRunner() {
  const { id = '' } = useParams();
  return <PracticeRunnerInner key={id} />;
}

function PracticeRunnerInner() {
  const { topic = 'html', id = '' } = useParams();
  const nav = useNavigate();
  const task = PRACTICE.find((p) => p.id === id) as PracticeTask | undefined;
  const saved = useStore((s) => s.practice[id]);
  const savePractice = useStore((s) => s.savePractice);
  const allPractice = useStore((s) => s.practice);
  const fontSize = useStore((s) => s.settings.editorFont);
  const [files, setFiles] = useState<Record<string, string>>(() => saved?.files ?? task?.starter ?? {});
  const [active, setActive] = useState(() => Object.keys(task?.starter ?? { x: '' }).find((f) => f !== 'index.html') ?? 'index.html');
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [hint, setHint] = useState(false);
  const [explain, setExplain] = useState(false);
  const [showSol, setShowSol] = useState(false);
  if (!task) return <div className="card p-8">Nie ma takiego zadania. <Link className="underline" to="/nauka">Wróć</Link></div>;
  const ladder = orderedTasks(task.topic);
  const idx = ladder.findIndex((p) => p.id === id);
  const next = ladder.slice(idx + 1).find((p) => !allPractice[p.id]?.ok) ?? ladder[idx + 1];
  const prev = ladder[idx - 1];
  const update = (v: string) => { const n = { ...files, [active]: v }; setFiles(n); savePractice(task.id, { files: n }); };
  async function check() {
    const r = await runLessonChecks(task!.checks, files);
    setResults(r);
    if (r.every((x) => x.ok)) savePractice(task!.id, { ok: true, files });
  }
  const ok = results?.every((r) => r.ok);
  const topicInfo = TOPICS.find((t) => t.k === task.topic)!;

  return (
    <div>
      <Link to={`/nauka/${topic}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={16} />{topicInfo.name}</Link>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,380px)_1fr]">
        <aside className="space-y-3">
          <div className="card p-5">
            <div className="flex items-center gap-2"><span className="mono rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: topicInfo.color }}>{topicInfo.name}</span><span className="text-xs text-muted">{task.section} · {idx + 1}/{ladder.length}</span>{saved?.ok && <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-success"><Check size={14} />zrobione</span>}</div>
            <h1 className="mt-3 text-2xl font-extrabold">{task.title}</h1>
            <p className="mt-2 leading-relaxed">{task.prompt}</p>
            <div className="mt-3"><DifficultyBar score={task.difficulty} size="sm" /><p className="mt-1 text-xs text-muted">{DIFF_LABEL(task.difficulty)}</p></div>
            {task.hint && (hint ? <p className="mt-3 rounded-lg bg-info-soft p-2 text-sm">{task.hint}</p> : <button className="mt-3 mr-3 inline-flex items-center gap-1 text-sm text-info" onClick={() => setHint(true)}><Lightbulb size={14} />Podpowiedź</button>)}
            {!explain && <button className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-accent" onClick={() => setExplain(true)}><HelpCircle size={14} />Nie wiem, wyjaśnij</button>}
          </div>
          {explain && (
            <div className="card pop space-y-3 border-info/40 p-5" style={{ background: 'var(--info-soft)' }}>
              <p className="eyebrow !text-info">Wyjaśnienie</p>
              <p className="leading-relaxed">{task.explain}</p>
              {!showSol ? (
                <button className="btn btn-ghost w-full" onClick={() => setShowSol(true)}><Eye size={16} />Pokaż rozwiązanie z kodem</button>
              ) : (
                <div className="space-y-2">
                  {Object.entries(task.solution).filter(([f, v]) => v !== task.starter[f] || f !== 'index.html').map(([f, v]) => (
                    <div key={f}>
                      <p className="mono mb-1 text-xs text-muted">{f}</p>
                      <pre className="mono max-h-72 overflow-auto whitespace-pre rounded-lg bg-ink p-3 text-[12.5px] leading-relaxed text-bg">{v}</pre>
                    </div>
                  ))}
                  <button className="btn btn-dark w-full" onClick={() => { setFiles({ ...task.solution }); setResults(null); savePractice(task.id, { files: task.solution }); }}>Wstaw rozwiązanie do edytora</button>
                  <p className="text-xs text-muted">Najlepiej przepisz je sam albo zmień coś i zobacz efekt w podglądzie. Samo wklejenie niewiele uczy.</p>
                </div>
              )}
            </div>
          )}
          {results && (
            <ul className="card pop divide-y divide-line p-2">
              {results.map((r) => <li key={r.label} className="flex items-start gap-2 p-2 text-sm">{r.ok ? <Check size={18} className="shrink-0 text-success" /> : <X size={18} className="shrink-0 text-danger" />}<span>{r.label}</span></li>)}
            </ul>
          )}
          {ok && <p className="pop rounded-xl bg-success-soft p-3 font-bold text-success">Zaliczone! +10 XP</p>}
          <div className="flex flex-wrap gap-2">
            {prev && <button className="btn btn-ghost" onClick={() => nav(`/nauka/${topic}/${prev.id}`)} title={prev.title}><ArrowLeft size={16} />Wróć</button>}
            <button className="btn btn-primary" onClick={check}><Play size={16} />Sprawdź</button>
            <button className="btn btn-ghost" onClick={() => { if (confirm('Wyczyścić Twój kod w tym zadaniu?')) { setFiles(task.starter); setResults(null); } }}>Reset</button>
            {next && <button className="btn btn-dark" onClick={() => { setResults(null); nav(`/nauka/${topic}/${next.id}`); }}>Następne <ArrowRight size={16} /></button>}
          </div>
          {results && !ok && !explain && <button className="text-sm text-accent underline" onClick={() => setExplain(true)}>Nie wychodzi? Zobacz wyjaśnienie i rozwiązanie</button>}
          {task.mode === 'php' && <p className="text-xs text-muted"><Lock size={11} className="mr-1 inline" />PHP nie działa w przeglądarce, więc sprawdzamy kod (czy są wymagane konstrukcje). Przepisz go potem w XAMPP.</p>}
        </aside>
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Object.keys(files).map((f) => <button key={f} className={`mono rounded-lg border px-2.5 py-1.5 text-xs ${f === active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'}`} onClick={() => setActive(f)}>{f}</button>)}
          </div>
          <div className={`grid gap-3 ${task.mode === 'web' ? 'lg:grid-cols-2' : ''}`}>
            <div className="card h-[460px] overflow-hidden">
              <Suspense fallback={<Loading label="Ładuję edytor…" />}><Editor key={task.id + active} file={active} value={files[active] ?? ''} onChange={update} fontSize={fontSize} /></Suspense>
            </div>
            {task.mode === 'web' && (
              <div className="card h-[460px] overflow-hidden">
                <p className="mono border-b border-line px-3 py-2 text-xs text-muted">podgląd</p>
                <iframe title="Podgląd" sandbox="allow-scripts allow-modals" srcDoc={buildSrcDoc(files)} className="h-[calc(100%-33px)] w-full bg-white" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
