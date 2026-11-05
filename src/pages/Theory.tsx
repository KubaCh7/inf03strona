import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Dices, ClipboardList, Database, Target, Trophy, ChartBar, Check, X, Search, ArrowRight } from 'lucide-react';
import { CATEGORY_LABEL, useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { pick, shuffleQuestion, type Shuffled } from '../lib/random';
import { newTheory, THEORY_COUNT } from '../lib/exam';
import { Loading, PageHeader } from '../components/ui';
import type { Category, Question } from '../lib/types';
import { QuestionBody, answerLabel } from '../components/QuestionBody';

const CATS: Category[] = ['strony', 'bazy', 'aplikacje', 'podstawy', 'bhp', 'angielski', 'kompetencje'];
const DOT: Record<string, string> = { strony: 'bg-html', bazy: 'bg-sql', aplikacje: 'bg-php', podstawy: 'bg-css', bhp: 'bg-danger', angielski: 'bg-js', kompetencje: 'bg-info' };

export function SingleQuestion({ q, onNext, compact, onAnswered }: { q: Shuffled; onNext?: () => void; compact?: boolean; onAnswered?: (ok: boolean) => void }) {
  const recordAnswer = useStore((s) => s.recordAnswer);
  const [chosen, setChosen] = useState<number | null>(null);
  const done = chosen !== null;
  return (
    <div className={compact ? '' : 'card pop p-5 md:p-7'}>
      <p className="eyebrow mb-2">{CATEGORY_LABEL[q.category]}</p>
      <QuestionBody q={q} size="md" />
      <div className="mt-4 grid gap-2">
        {q.answers.map((a, k) => {
          const ok = k === q.correct;
          let cls = 'border-line hover:bg-surface-2';
          if (done && ok) cls = 'border-success bg-success-soft';
          else if (done && k === chosen) cls = 'border-danger bg-danger-soft';
          return (
            <button key={k} disabled={done} onClick={() => { setChosen(k); recordAnswer(q.id, ok); onAnswered?.(ok); }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${cls}`}>
              <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line text-sm font-semibold">{'ABCD'[k]}</span>
              <code className="whitespace-pre-wrap font-[inherit]">{answerLabel(q, a, q.order[k])}</code>
              {done && ok && <Check size={18} className="ml-auto text-success" />}
              {done && k === chosen && !ok && <X size={18} className="ml-auto text-danger" />}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="pop mt-4 rounded-xl bg-surface-2 p-4 text-sm">
          <p className={`font-bold ${chosen === q.correct ? 'text-success' : 'text-danger'}`}>{chosen === q.correct ? 'Dobrze! +2 XP' : 'Niestety nie.'}</p>
          {q.explanation ? <p className="mt-1">{q.explanation}</p> : chosen !== q.correct && <p className="mt-1">Poprawna odpowiedź: <b>{'ABCD'[q.correct]}. {answerLabel(q, q.answers[q.correct], q.order[q.correct])}</b></p>}
        </div>
      )}
      {done && onNext && <button className="btn btn-dark mt-4" onClick={onNext}>Następne pytanie <ArrowRight size={16} /></button>}
    </div>
  );
}

export default function Theory() {
  const c = useContent();
  const nav = useNavigate();
  const { qstats, tests, activeExam, setActiveExam } = useStore();
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [current, setCurrent] = useState<Shuffled | null>(null);
  const [drawN, setDrawN] = useState(0);
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    c?.questions.forEach((q) => { m[q.category] = (m[q.category] ?? 0) + 1; });
    return m;
  }, [c]);
  const pool = useMemo(() => (c?.questions ?? []).filter((q) => (cats.size === 0 || cats.has(q.category)) && (!onlyWrong || qstats[q.id]?.lastWrong)), [c, cats, onlyWrong, qstats]);
  const found = useMemo(() => {
    if (query.trim().length < 3 || !c) return [];
    const t = query.toLowerCase();
    return c.questions.filter((q) => q.text.toLowerCase().includes(t) || q.answers[q.correct].toLowerCase().includes(t)).slice(0, 8);
  }, [query, c]);

  if (!c) return <Loading />;
  const theoryTests = tests.filter((t) => t.kind === 'theory40');
  const last = theoryTests[0];
  const best = theoryTests.reduce((m, t) => Math.max(m, t.score / t.total), 0);
  const seen = Object.keys(qstats).length;

  const draw = () => { if (pool.length) { setCurrent(shuffleQuestion(pick(pool) as Question)); setDrawN((n) => n + 1); } };
  const startTest = () => {
    if (activeExam && !confirm('Masz rozpoczęty inny test lub próbę. Zacząć od nowa?')) return;
    setActiveExam({ id: crypto.randomUUID?.() ?? String(Date.now()), mode: 'theory', stage: 'theory', theory: newTheory(c.questions) });
    nav('/proba');
  };

  return (
    <div>
      <PageHeader eyebrow="Część pisemna · INF.03" title="Teoria" right={
        <div className="card grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm">
          <div className="flex items-center gap-2"><Database size={16} className="text-info" /><div><p className="display text-lg font-bold tabular">{c.questions.length}</p><p className="eyebrow !text-[10px]">pytań w bazie</p></div></div>
          <div className="flex items-center gap-2"><Target size={16} className="text-success" /><div><p className="display text-lg font-bold tabular">{seen}</p><p className="eyebrow !text-[10px]">przerobionych</p></div></div>
          <div className="flex items-center gap-2"><ChartBar size={16} className="text-js" /><div><p className="display text-lg font-bold tabular">{last ? `${Math.round((last.score / last.total) * 100)}%` : '—'}</p><p className="eyebrow !text-[10px]">ostatni test</p></div></div>
          <div className="flex items-center gap-2"><Trophy size={16} className="text-accent" /><div><p className="display text-lg font-bold tabular">{best ? `${Math.round(best * 100)}%` : '—'}</p><p className="eyebrow !text-[10px]">najlepszy</p></div></div>
        </div>
      }>
        Jedno pytanie, kiedy masz dwie minuty. Pełny test 40 pytań, kiedy chcesz sprawdzić, czy zdasz.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <button onClick={draw} className="card card-hover group relative overflow-hidden p-6 text-left">
          <span className="mono absolute right-4 top-4 rounded-md bg-ink px-2 py-0.5 text-xs text-bg">01</span>
          <Dices size={44} className="text-accent" strokeWidth={1.6} />
          <p className="eyebrow mt-4">ok. 1 minuta</p>
          <h2 className="mt-1 text-2xl font-bold">Losuj 1 pytanie</h2>
          <p className="mt-1 text-sm text-muted">Z działów wybranych niżej. Bez stopera, z wyjaśnieniem po odpowiedzi.</p>
          <span className="btn btn-ghost mt-4">Losuję <ArrowRight size={16} /></span>
        </button>
        <button onClick={startTest} className="card card-hover relative overflow-hidden p-6 text-left" style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface) 60%)' }}>
          <span className="mono absolute right-4 top-4 rounded-md bg-ink px-2 py-0.5 text-xs text-bg">02</span>
          <ClipboardList size={44} className="text-accent" strokeWidth={1.6} />
          <p className="eyebrow mt-4">60 minut</p>
          <h2 className="mt-1 text-2xl font-bold">Pełny test teorii</h2>
          <p className="mt-1 text-sm text-muted">{THEORY_COUNT} losowych pytań, cztery odpowiedzi, próg zaliczenia 50% (20/40).</p>
          <span className="btn btn-primary mt-4">Start testu <ArrowRight size={16} /></span>
        </button>
      </div>

      <section className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-lg font-bold">Wybierz dział</h3><p className="text-xs text-muted">Filtr dotyczy losowania pojedynczych pytań.</p></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="accent-[var(--accent)]" />Tylko te, w których ostatnio był błąd</label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="chip" aria-pressed={cats.size === 0} onClick={() => setCats(new Set())}>Wszystkie <span className="mono text-xs opacity-70">{c.questions.length}</span></button>
          {CATS.filter((k) => counts[k]).map((k) => (
            <button key={k} className="chip" aria-pressed={cats.has(k)} onClick={() => setCats((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
              <span className={`h-2 w-2 rounded-full ${DOT[k]}`} />{CATEGORY_LABEL[k]} <span className="mono text-xs opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">W puli: {pool.length} pytań.</p>
      </section>

      {current && <div className="mt-4"><SingleQuestion key={drawN} q={current} onNext={draw} /></div>}

      <section className="card mt-4 p-5">
        <label className="flex items-center gap-2"><Search size={16} className="text-muted" /><input className="input" placeholder="Szukaj w pytaniach (min. 3 znaki), np. colspan, GROUP BY, mysqli…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        {found.length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {found.map((q) => (
              <li key={q.id} className="py-3 text-sm">
                <p className="font-bold">{q.text}</p>
                <p className="mt-1 text-success">✓ <code>{q.answers[q.correct]}</code></p>
                {q.explanation && <p className="mt-1 text-muted">{q.explanation}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-muted">
        Prawdziwa baza pytań CKE jest niejawna. Pytania w Pracowni są napisane od zera w zakresie INF.03 (HTML, CSS, JS, SQL, PHP, grafika, BHP). <Link to="/o-projekcie" className="underline">Więcej o źródłach</Link>.
      </p>
    </div>
  );
}
