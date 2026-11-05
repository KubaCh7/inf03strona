import { useEffect, useMemo, useState } from 'react';
import { Flag, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Question } from '../lib/types';
import { CATEGORY_LABEL } from '../lib/data';
import { QuestionBody, answerLabel } from './QuestionBody';
import { mmss } from '../lib/time';

export type TheoryState = { questionIds: string[]; order: number[][]; answers: (number | null)[]; startedAt: number; durationMs: number; finishedAt?: number; score?: number };

export function useCountdown(startedAt: number, durationMs: number, stopped?: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (stopped) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [stopped]);
  return Math.max(0, startedAt + durationMs - now);
}

export function TimerBadge({ left, total }: { left: number; total: number }) {
  const danger = left < 5 * 60_000;
  return (
    <div className="min-w-36" aria-live="polite">
      <p className={`mono text-3xl font-semibold tabular ${danger ? 'text-danger' : ''}`}>{mmss(left)}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={`h-full ${danger ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${(left / total) * 100}%` }} /></div>
    </div>
  );
}

export function scoreTheory(t: TheoryState, byId: Map<string, Question>) {
  let ok = 0;
  const byCat: Record<string, [number, number]> = {};
  t.questionIds.forEach((id, i) => {
    const q = byId.get(id)!;
    const chosen = t.answers[i];
    const correct = chosen !== null && t.order[i][chosen] === q.correct;
    if (correct) ok++;
    byCat[q.category] = [(byCat[q.category]?.[0] ?? 0) + (correct ? 1 : 0), (byCat[q.category]?.[1] ?? 0) + 1];
  });
  return { ok, total: t.questionIds.length, byCat };
}

export default function TheoryTest({ state, questions, onChange, onFinish }: {
  state: TheoryState; questions: Question[]; onChange: (s: TheoryState) => void; onFinish: (s: TheoryState) => void;
}) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [i, setI] = useState(() => Math.max(0, state.answers.findIndex((a) => a === null)));
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const left = useCountdown(state.startedAt, state.durationMs, !!state.finishedAt);
  const finished = !!state.finishedAt;

  useEffect(() => { if (!finished && left === 0) onFinish(state); }, [left, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (finished) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [finished]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (['1', '2', '3', '4'].includes(e.key) && !finished) choose(Number(e.key) - 1);
      if (e.key === 'ArrowRight') setI((x) => Math.min(state.questionIds.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const q = byId.get(state.questionIds[i]);
  if (!q) return null;
  const answers = state.order[i].map((k) => answerLabel(q, q.answers[k], k));
  const chosen = state.answers[i];
  const answered = state.answers.filter((a) => a !== null).length;

  function choose(k: number) {
    if (finished) return;
    const answersNext = state.answers.slice();
    answersNext[i] = k;
    onChange({ ...state, answers: answersNext });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="card p-5 md:p-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="eyebrow">Pytanie {i + 1} z {state.questionIds.length} · {CATEGORY_LABEL[q.category]}</p>
          {!finished && (
            <button className={`chip ${flags.has(i) ? '!border-js !text-js' : ''}`} onClick={() => setFlags((f) => { const n = new Set(f); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
              <Flag size={14} /> {flags.has(i) ? 'Oznaczone' : 'Wróć później'}
            </button>
          )}
        </div>
        <QuestionBody q={q} />
        <div className="mt-5 grid gap-2.5" role="radiogroup">
          {answers.map((a, k) => {
            const isCorrect = state.order[i][k] === q.correct;
            const sel = chosen === k;
            let cls = 'border-line hover:border-ink/40 hover:bg-surface-2';
            if (!finished && sel) cls = 'border-accent bg-accent-soft';
            if (finished && isCorrect) cls = 'border-success bg-success-soft';
            if (finished && sel && !isCorrect) cls = 'border-danger bg-danger-soft';
            return (
              <button key={k} role="radio" aria-checked={sel} onClick={() => choose(k)} disabled={finished}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${cls}`}>
                <span className={`mono grid h-7 w-7 shrink-0 place-items-center rounded-md border text-sm font-semibold ${sel ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>{'ABCD'[k]}</span>
                <span className="pt-0.5"><code className="whitespace-pre-wrap font-[inherit]">{a}</code></span>
                {finished && isCorrect && <Check size={18} className="ml-auto mt-1 shrink-0 text-success" />}
                {finished && sel && !isCorrect && <X size={18} className="ml-auto mt-1 shrink-0 text-danger" />}
              </button>
            );
          })}
        </div>
        {finished && q.explanation && <p className="mt-4 rounded-xl bg-surface-2 p-4 text-sm"><b>Wyjaśnienie: </b>{q.explanation}</p>}
        <div className="mt-6 flex items-center justify-between">
          <button className="btn btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><ChevronLeft size={18} />Poprzednie</button>
          <button className="btn btn-dark" onClick={() => setI(Math.min(state.questionIds.length - 1, i + 1))} disabled={i === state.questionIds.length - 1}>Następne<ChevronRight size={18} /></button>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="card p-4">
          {!finished ? <TimerBadge left={left} total={state.durationMs} /> : <p className="display text-2xl font-bold">Test zakończony</p>}
          <p className="mt-2 text-sm text-muted">Odpowiedzi: <b className="text-ink tabular">{answered}/{state.questionIds.length}</b></p>
        </div>
        <div className="card p-4">
          <div className="grid grid-cols-8 gap-1.5">
            {state.questionIds.map((id, k) => {
              const qq = byId.get(id)!;
              const a = state.answers[k];
              let cls = a !== null ? 'bg-ink text-bg' : 'bg-surface-2';
              if (finished) cls = a !== null && state.order[k][a] === qq.correct ? 'bg-success text-white' : 'bg-danger text-white';
              return (
                <button key={id} onClick={() => setI(k)} aria-label={`Pytanie ${k + 1}`}
                  className={`mono relative h-8 rounded-md text-xs font-semibold tabular ${cls} ${k === i ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''}`}>
                  {k + 1}
                  {flags.has(k) && !finished && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-js" />}
                </button>
              );
            })}
          </div>
          {!finished && (
            <button className="btn btn-primary mt-4 w-full" onClick={() => { if (answered < state.questionIds.length && !confirm(`Masz ${state.questionIds.length - answered} pytań bez odpowiedzi. Oddać test?`)) return; onFinish(state); }}>
              Oddaję test
            </button>
          )}
          <p className="mt-3 text-xs text-muted">Skróty: 1–4 wybór, ← → nawigacja.</p>
        </div>
      </aside>
    </div>
  );
}
