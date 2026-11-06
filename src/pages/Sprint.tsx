import { useEffect, useRef, useState } from 'react';
import { Zap, Heart, Trophy } from 'lucide-react';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { shuffle, shuffleQuestion, type Shuffled } from '../lib/random';
import { mmss } from '../lib/time';
import { Loading, PageHeader } from '../components/ui';
import { QuestionBody, answerLabel } from '../components/QuestionBody';

const DURATION = 5 * 60_000;

export default function Sprint() {
  const c = useContent();
  const { sprintBest, setSprintBest, addXp, recordAnswer, addTest } = useStore();
  const [phase, setPhase] = useState<'idle' | 'run' | 'end'>('idle');
  const [queue, setQueue] = useState<Shuffled[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [xpGain, setXpGain] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [left, setLeft] = useState(DURATION);
  const endAt = useRef(0);

  useEffect(() => {
    if (phase !== 'run') return;
    const t = setInterval(() => { const l = endAt.current - Date.now(); setLeft(Math.max(0, l)); if (l <= 0) setPhase('end'); }, 250);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === 'end') {
      setSprintBest(score);
      addXp(xpGain);
      addTest({ id: String(Date.now()), kind: 'sprint', at: new Date().toISOString(), score, total: score + (3 - lives), passed: score > 0 });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <Loading />;
  const start = () => {
    setQueue(shuffle(c.questions).map(shuffleQuestion));
    setScore(0); setLives(3); setCombo(0); setXpGain(0);
    endAt.current = Date.now() + DURATION; setLeft(DURATION);
    setPhase('run');
  };
  const answer = (k: number) => {
    const q = queue[0];
    const ok = k === q.correct;
    recordAnswer(q.id, ok);
    setFlash(ok ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 250);
    if (ok) { const mult = 1 + Math.floor(combo / 5); setScore((s) => s + 1); setCombo((x) => x + 1); setXpGain((x) => x + mult); }
    else { setCombo(0); const l = lives - 1; setLives(l); if (l <= 0) setPhase('end'); }
    setQueue((qq) => (qq.length > 1 ? qq.slice(1) : shuffle(c.questions).map(shuffleQuestion)));
  };

  if (phase === 'idle' || phase === 'end') {
    return (
      <div className="max-w-2xl">
        <PageHeader eyebrow="Tryb szybki" title="Sprint">5 minut, pytania jedno po drugim. Za każdą dobrą +1 punkt, co 5 dobrych z rzędu rośnie mnożnik XP. Trzy błędy kończą sprint.</PageHeader>
        {phase === 'end' && (
          <div className="card pop mb-4 p-6 text-center">
            <p className="eyebrow">Wynik</p>
            <p className="display text-6xl font-extrabold tabular text-accent">{score}</p>
            <p className="text-muted">+{xpGain} XP · rekord: {Math.max(sprintBest, score)}</p>
            {score > 0 && score >= sprintBest && <p className="mt-2 inline-flex items-center gap-1 font-bold text-success"><Trophy size={16} />Nowy rekord!</p>}
          </div>
        )}
        <button className="btn btn-primary text-lg" onClick={start}><Zap size={18} />{phase === 'end' ? 'Jeszcze raz' : 'Start'}</button>
        <p className="mt-3 text-sm text-muted">Rekord osobisty: <b className="text-ink">{sprintBest}</b></p>
      </div>
    );
  }
  const q = queue[0];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className={`mono text-3xl font-semibold tabular ${left < 30_000 ? 'text-danger' : ''}`}>{mmss(left)}</p>
        <div className="flex items-center gap-1">{[0, 1, 2].map((i) => <Heart key={i} size={22} className={i < lives ? 'fill-danger text-danger' : 'text-line'} />)}</div>
        <p className="display text-3xl font-bold tabular">{score}{combo >= 5 && <span className="ml-2 align-middle text-sm text-accent">×{1 + Math.floor(combo / 5)}</span>}</p>
      </div>
      <div className={`card p-6 transition-colors ${flash === 'ok' ? '!border-success !bg-success-soft' : flash === 'bad' ? '!border-danger !bg-danger-soft' : ''}`}>
        <QuestionBody q={q} size="md" />
        <div className="mt-4 grid gap-2">
          {q.answers.map((a, k) => (
            <button key={k} onClick={() => answer(k)} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:bg-surface-2">
              <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line text-sm">{'ABCD'[k]}</span><code className="whitespace-pre-wrap font-[inherit]">{answerLabel(q, a, q.order[k])}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
