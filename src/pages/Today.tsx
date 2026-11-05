import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Layers, Sparkles, FileText, Map, Timer, Zap } from 'lucide-react';
import { useContent } from '../lib/data';
import { levelInfo, liveStreak, useStore } from '../lib/store';
import { isDue } from '../lib/fsrs';
import { addDays, today, weekStart } from '../lib/time';
import { shuffleQuestion } from '../lib/random';
import { LESSONS } from '../data/lessons';
import { DifficultyBar, LangBadge, Loading } from '../components/ui';
import { RightPanel } from '../components/Layout';
import { SingleQuestion } from './Theory';

function Heatmap() {
  const activity = useStore((s) => s.activity);
  const t = today();
  const start = addDays(weekStart(t), -77);
  const days = Array.from({ length: 84 }, (_, i) => addDays(start, i));
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><p className="eyebrow">Aktywność · 12 tygodni</p><p className="text-xs text-muted">XP dziennie</p></div>
      <div className="mt-3 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
        {days.map((d) => {
          const x = activity[d]?.xp ?? 0;
          const lvl = x === 0 ? 'bg-surface-2' : x < 10 ? 'bg-accent/25' : x < 40 ? 'bg-accent/55' : 'bg-accent';
          return <span key={d} title={`${d}: ${x} XP, ${activity[d]?.minutes ?? 0} min`} className={`h-3.5 w-3.5 rounded-[3px] ${lvl} ${d === t ? 'ring-1 ring-ink' : ''}`} />;
        })}
      </div>
    </div>
  );
}

export default function Today() {
  const c = useContent();
  const { xp, streak, cards, lessons, sheets, dailyQuestion, setDailyQuestion, addXp, qstats, settings, newCardsDay } = useStore();
  const t = today();

  useEffect(() => {
    if (c && dailyQuestion.date !== t && c.questions.length) {
      const idx = Math.abs([...t].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)) % c.questions.length;
      setDailyQuestion({ date: t, id: c.questions[idx].id, done: false });
    }
  }, [c, t, dailyQuestion.date, setDailyQuestion]);

  // Pytanie dnia + kolejne pytania: po dobrej odpowiedzi szybko nastepne, po zlej po chwili (czas na wyjasnienie)
  const [extraId, setExtraId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [nextIn, setNextIn] = useState<{ until: number; total: number } | null>(null);
  const [, force] = useState(0);
  const currentId = extraId ?? dailyQuestion.id;
  const dq = useMemo(() => {
    const q = c?.questions.find((x) => x.id === currentId);
    return q ? shuffleQuestion(q) : null;
  }, [c, currentId, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const goNext = () => {
    if (!c) return;
    const pool = c.questions.filter((x) => x.id !== currentId && !(useStore.getState().qstats[x.id]?.seen));
    const src = pool.length ? pool : c.questions;
    setExtraId(src[Math.floor(Math.random() * src.length)].id);
    setRound((r) => r + 1);
    setNextIn(null);
  };
  useEffect(() => {
    if (!nextIn) return;
    const t = setInterval(() => { if (Date.now() >= nextIn.until) goNext(); else force((x) => x + 1); }, 100);
    return () => clearInterval(t);
  }, [nextIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAnswered = (ok: boolean) => {
    if (!extraId && !dailyQuestion.done) { setDailyQuestion({ ...dailyQuestion, done: true }); addXp(5); }
    const total = ok ? 1600 : 9000;
    setNextIn({ until: Date.now() + total, total });
  };

  const suggested = useMemo(() => {
    if (!c) return null;
    const undone = c.sheets.filter((s) => s.qualification === 'INF.03' && sheets[s.code]?.status !== 'done');
    const doneScores = Object.values(sheets).filter((s) => s.status === 'done').length;
    const target = Math.min(10, 3 + doneScores);
    return undone.sort((a, b) => Math.abs(a.difficulty.score - target) - Math.abs(b.difficulty.score - target))[0] ?? null;
  }, [c, sheets]);

  if (!c) return <Loading />;
  const lv = levelInfo(xp);
  const due = c.flashcards.filter((f) => isDue(cards[f.id])).length;
  const newLeft = Math.min(c.flashcards.filter((f) => !cards[f.id]).length, settings.newCardsPerDay - (newCardsDay.date === t ? newCardsDay.count : 0));
  const nextLesson = LESSONS.find((l) => !lessons[l.id]);
  const st = liveStreak(streak);
  const hour = new Date().getHours();
  const hello = hour < 5 ? 'Nocna zmiana' : hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow mb-2">{new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' }).format(new Date())}</p>
        <h1 className="text-3xl font-extrabold md:text-[44px] md:leading-[1.05]">{hello}. <span className="text-muted">Plan na dziś:</span></h1>
        <p className="mt-2 text-muted"><button className="mr-2 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink hover:bg-surface-2" onClick={() => useStore.getState().setSettings({ tourDone: false })}>Oprowadź mnie</button>Poziom {lv.level} ({lv.name}) · {st > 0 ? `${st} ${st === 1 ? 'dzień' : 'dni'} serii, nie przerywaj` : 'zdobądź 10 XP, żeby zacząć serię'}.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/fiszki" className="card card-hover p-5">
          <Layers className="text-accent" />
          <p className="eyebrow mt-3">Powtórka</p>
          <p className="display text-3xl font-bold tabular">{due}<span className="text-base font-normal text-muted"> + {Math.max(0, newLeft)} nowych</span></p>
          <p className="mt-1 text-sm text-muted">fiszek czeka na Ciebie</p>
        </Link>
        <Link to={nextLesson ? `/sciezka/${nextLesson.id}` : '/sciezka'} className="card card-hover p-5">
          <Map className="text-css" />
          <p className="eyebrow mt-3">Ścieżka</p>
          <p className="mt-1 text-lg font-bold leading-tight">{nextLesson ? nextLesson.title : 'Ścieżka ukończona!'}</p>
          <p className="mt-1 text-sm text-muted">{nextLesson ? `${nextLesson.minutes} min · +${nextLesson.xp} XP` : 'Czas na pełne arkusze.'}</p>
        </Link>
        {suggested && (
          <Link to={`/arkusze/${encodeURIComponent(suggested.code)}`} className="card card-hover p-5">
            <FileText className="text-info" />
            <p className="eyebrow mt-3">Sugerowany arkusz</p>
            <p className="mt-1 text-lg font-bold leading-tight">{suggested.title}</p>
            <div className="mt-2 flex items-center gap-2"><LangBadge lang={suggested.language} /><div className="flex-1"><DifficultyBar score={suggested.difficulty.score} size="sm" /></div></div>
          </Link>
        )}
      </div>

      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2"><Sparkles size={16} className="text-accent" /><h2 className="text-lg font-bold">{extraId ? 'Kolejne pytanie' : 'Pytanie dnia'}</h2>{!dailyQuestion.done && <span className="mono rounded-full bg-accent-soft px-2 text-xs text-accent">+5 XP</span>}{round > 0 && <span className="mono text-xs text-muted">seria: {round}</span>}</div>
        {dq && (
          <div className="card relative overflow-hidden p-5 md:p-6">
            <SingleQuestion q={dq} compact key={dq.id + round} onAnswered={onAnswered} />
            {nextIn && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (1 - (nextIn.until - Date.now()) / nextIn.total) * 100)}%` }} /></div>
                <button className="btn btn-dark px-3 py-1.5 text-sm" onClick={goNext}>Następne teraz</button>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Link to="/proba" className="gold-frame gold-frame-soft card-hover flex items-center gap-4 p-5"><Timer className="text-[var(--gold-2)]" /><div className="flex-1"><p className="font-bold gold-text">Próba egzaminu</p><p className="text-sm text-muted">Teoria 60 min + praktyka 150 min</p></div><ArrowRight size={18} /></Link>
        <Link to="/sprint" className="card card-hover flex items-center gap-4 p-5"><Zap className="text-js" /><div className="flex-1"><p className="font-bold">Sprint 5 minut</p><p className="text-sm text-muted">Ile pytań zdążysz? 3 błędy kończą.</p></div><ArrowRight size={18} /></Link>
      </div>

      <div className="mt-4"><Heatmap /></div>
      <div className="mt-4 xl:hidden"><RightPanel /></div>
    </div>
  );
}
