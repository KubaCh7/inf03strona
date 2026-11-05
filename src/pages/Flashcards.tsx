import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, Check, Eye, HelpCircle, Layers, RotateCw, Shuffle, Sparkles, Trophy, X } from 'lucide-react';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { humanDelta, isDue, preview, Rating, review } from '../lib/fsrs';
import { shuffle } from '../lib/random';
import { today } from '../lib/time';
import { Loading, PageHeader, Progress } from '../components/ui';
import type { Flashcard } from '../lib/types';

const DECKS: { k: string; name: string; desc: string; color: string }[] = [
  { k: 'html', name: 'HTML', desc: 'znaczniki i atrybuty', color: 'var(--c-html)' },
  { k: 'css', name: 'CSS', desc: 'selektory i właściwości', color: 'var(--c-css)' },
  { k: 'js', name: 'JavaScript', desc: 'DOM, zdarzenia, funkcje', color: 'var(--c-js)' },
  { k: 'php', name: 'PHP', desc: 'formularze i mysqli', color: 'var(--c-php)' },
  { k: 'sql', name: 'SQL', desc: 'kwerendy i uprawnienia', color: 'var(--c-sql)' },
  { k: 'teoria', name: 'Teoria', desc: 'grafika, sieć, licencje', color: 'var(--info)' },
];
const SESSION = 20;

type Stored = { due: string; state: number; scheduled_days: number; stability: number };
const mastered = (c: unknown) => !!c && (c as Stored).state === 2 && (c as Stored).scheduled_days >= 7;

const RATE = [
  { r: Rating.Again, label: 'Nie wiedziałem', hint: 'pokażę zaraz znowu', key: '1', cls: 'border-danger text-danger hover:bg-danger-soft' },
  { r: Rating.Hard, label: 'Z trudem', hint: 'powtórzę niedługo', key: '2', cls: 'border-js text-js hover:bg-js/10' },
  { r: Rating.Good, label: 'Wiedziałem', hint: 'wróci za kilka dni', key: '3', cls: 'border-success text-success hover:bg-success-soft' },
  { r: Rating.Easy, label: 'Banał', hint: 'wróci dużo później', key: '4', cls: 'border-info text-info hover:bg-info-soft' },
];

type Mode = 'learn' | 'quiz';

function Ring({ value, color }: { value: number; color: string }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset .6s' }} />
    </svg>
  );
}

function Explainer({ onClose }: { onClose?: () => void }) {
  return (
    <div className="card relative overflow-hidden p-5 md:p-6" style={{ background: 'linear-gradient(120deg, var(--accent-soft), var(--surface) 70%)' }}>
      {onClose && <button className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-surface" onClick={onClose} aria-label="Zamknij"><X size={16} /></button>}
      <p className="eyebrow !text-accent">Jak to działa (30 sekund)</p>
      <h2 className="mt-1 text-xl font-bold">Fiszka = pytanie z przodu, odpowiedź z tyłu.</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ['1', 'Patrzysz na pojęcie', 'np. „rowspan / colspan”'],
          ['2', 'Przypominasz sobie', 'w głowie, bez podglądania'],
          ['3', 'Odwracasz kartę', 'klik albo spacja'],
          ['4', 'Oceniasz się szczerze', 'aplikacja sama ustali, kiedy pokazać kartę znowu'],
        ].map(([n, t, d]) => (
          <li key={n} className="flex gap-3 sm:block">
            <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-ink">{n}</span>
            <span className="sm:mt-2 sm:block"><b className="block">{t}</b><span className="text-sm text-muted">{d}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted">Karty, które znasz, wracają coraz rzadziej (za dni, tygodnie). Te, których nie pamiętasz, wracają szybko. Dzięki temu uczysz się tylko tego, czego naprawdę nie umiesz. Wolisz zgadywać? Tryb <b className="text-ink">Quiz</b> daje 4 odpowiedzi do wyboru.</p>
    </div>
  );
}

export default function Flashcards() {
  const c = useContent();
  const { cards, setCard, countNewCard, newCardsDay, settings, setSettings, addXp } = useStore();
  const [deck, setDeck] = useState<string | null>(null); // null = ekran wyboru, 'all' = wszystkie
  const [mode, setMode] = useState<Mode>('learn');
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0, xp: 0 });
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const showIntro = !settings.flashIntroSeen;

  const newUsed = newCardsDay.date === today() ? newCardsDay.count : 0;
  const newLeft = Math.max(0, settings.newCardsPerDay - newUsed);

  const deckStats = useMemo(() => {
    const m: Record<string, { total: number; due: number; fresh: number; mastered: number }> = {};
    for (const f of c?.flashcards ?? []) {
      const s = (m[f.deck] ??= { total: 0, due: 0, fresh: 0, mastered: 0 });
      s.total++;
      if (!cards[f.id]) s.fresh++;
      else if (isDue(cards[f.id])) s.due++;
      if (mastered(cards[f.id])) s.mastered++;
    }
    return m;
  }, [c, cards]);

  function start(d: string, m: Mode) {
    if (!c) return;
    const inDeck = (f: Flashcard) => d === 'all' || f.deck === d;
    const due = c.flashcards.filter((f) => inDeck(f) && isDue(cards[f.id]));
    const fresh = shuffle(c.flashcards.filter((f) => inDeck(f) && !cards[f.id])).slice(0, m === 'quiz' ? SESSION : newLeft);
    let q = [...shuffle(due), ...fresh].slice(0, SESSION);
    if (q.length === 0 && m === 'quiz') q = shuffle(c.flashcards.filter(inDeck)).slice(0, 10); // quiz zawsze mozna pograc
    setQueue(q); setTotal(q.length); setDeck(d); setMode(m); setFlipped(false); setQuizPick(null);
    setStats({ again: 0, hard: 0, good: 0, easy: 0, xp: 0 });
  }

  function rate(r: Rating) {
    const card = queue[0];
    if (!card) return;
    if (!cards[card.id]) countNewCard();
    const next = review(cards[card.id], r);
    setCard(card.id, next);
    addXp(1);
    const key = r === Rating.Again ? 'again' : r === Rating.Hard ? 'hard' : r === Rating.Good ? 'good' : 'easy';
    setStats((s) => ({ ...s, [key]: s[key] + 1, xp: s.xp + 1 }));
    setFlipped(false);
    setQuizPick(null);
    // "Nie wiedzialem" w tej samej sesji: karta wraca na koniec kolejki
    setQueue((q) => (r === Rating.Again ? [...q.slice(1), card] : q.slice(1)));
  }

  const card = queue[0];
  const options = useMemo(() => {
    if (!card || !c || mode !== 'quiz') return [];
    const others = shuffle(c.flashcards.filter((f) => f.id !== card.id && f.deck === card.deck)).slice(0, 3);
    return shuffle([card, ...others]);
  }, [card, c, mode]);
  const prev = useMemo(() => (card ? preview(cards[card.id]) : null), [card, cards]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!deck || !card) return;
      if (mode === 'learn') {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
        if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate(RATE[Number(e.key) - 1].r);
      } else if (quizPick === null && ['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key) - 1);
      else if (quizPick !== null && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  function choose(i: number) { if (quizPick !== null) return; setQuizPick(i); }
  function next() { const ok = options[quizPick!]?.id === card.id; rate(ok ? Rating.Good : Rating.Again); }

  if (!c) return <Loading />;

  // ---------- Ekran wyboru talii ----------
  if (!deck) {
    const totalDue = Object.values(deckStats).reduce((a, s) => a + s.due, 0);
    const totalMastered = Object.values(deckStats).reduce((a, s) => a + s.mastered, 0);
    return (
      <div className="max-w-4xl">
        <PageHeader eyebrow={`${c.flashcards.length} kart · ${totalMastered} opanowanych`} title="Fiszki" right={
          <button className="btn btn-ghost" onClick={() => setSettings({ flashIntroSeen: false })}><HelpCircle size={16} />Jak to działa?</button>
        }>
          Krótkie karty do zapamiętania znaczników, właściwości, funkcji i kwerend. Do powtórki czeka <b className="text-ink">{totalDue}</b>, nowych na dziś: <b className="text-ink">{newLeft}</b>.
        </PageHeader>
        {showIntro && <div className="mb-5"><Explainer onClose={() => setSettings({ flashIntroSeen: true })} /></div>}

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <button className="card card-hover flex items-center gap-4 p-5 text-left" onClick={() => start('all', 'learn')}>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-ink"><Brain size={24} /></span>
            <span className="flex-1"><b className="block text-lg">Ucz się ze wszystkich</b><span className="text-sm text-muted">{Math.min(SESSION, totalDue + newLeft)} kart w sesji · odwracasz i oceniasz</span></span>
          </button>
          <button className="card card-hover flex items-center gap-4 p-5 text-left" onClick={() => start('all', 'quiz')}>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-info-soft text-info"><Shuffle size={24} /></span>
            <span className="flex-1"><b className="block text-lg">Quiz z fiszek</b><span className="text-sm text-muted">Wybierasz 1 z 4 odpowiedzi, bez oceniania się</span></span>
          </button>
        </div>

        <p className="eyebrow mb-2">Talie</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DECKS.map((d) => {
            const s = deckStats[d.k] ?? { total: 0, due: 0, fresh: 0, mastered: 0 };
            const learned = s.total - s.fresh;
            return (
              <div key={d.k} className="card card-hover p-4">
                <div className="flex items-center gap-3">
                  <div className="relative"><Ring value={s.total ? learned / s.total : 0} color={d.color} /><span className="mono absolute inset-0 grid place-items-center text-[10px] font-bold">{s.total ? Math.round((learned / s.total) * 100) : 0}%</span></div>
                  <div className="min-w-0 flex-1"><p className="display text-lg font-bold" style={{ color: d.color }}>{d.name}</p><p className="truncate text-xs text-muted">{d.desc}</p></div>
                </div>
                <div className="mono mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
                  <span className="rounded-md bg-surface-2 py-1"><b className="block text-sm text-ink">{s.fresh}</b>nowe</span>
                  <span className="rounded-md bg-surface-2 py-1"><b className={`block text-sm ${s.due ? 'text-accent' : 'text-ink'}`}>{s.due}</b>powtórka</span>
                  <span className="rounded-md bg-surface-2 py-1"><b className="block text-sm text-success">{s.mastered}</b>opanowane</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-dark flex-1 py-1.5 text-sm" onClick={() => start(d.k, 'learn')} disabled={s.due + Math.min(s.fresh, newLeft) === 0}>Ucz się</button>
                  <button className="btn btn-ghost py-1.5 text-sm" onClick={() => start(d.k, 'quiz')}>Quiz</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Koniec sesji ----------
  if (!card) {
    const answered = stats.again + stats.hard + stats.good + stats.easy;
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="card pop p-8">
          <Trophy size={44} className="mx-auto text-accent" />
          <h1 className="mt-3 text-3xl font-extrabold">{answered ? 'Sesja zrobiona!' : 'Nic tu teraz nie ma'}</h1>
          <p className="mt-1 text-muted">{answered ? `+${stats.xp} XP. Karty wrócą wtedy, kiedy zaczniesz je zapominać.` : 'W tej talii nie ma kart do powtórki ani nowych na dziś. Zagraj w quiz albo wróć jutro.'}</p>
          {answered > 0 && (
            <div className="mono mt-5 grid grid-cols-4 gap-2 text-xs">
              <span className="rounded-lg bg-danger-soft p-2 text-danger"><b className="block text-xl">{stats.again}</b>nie wiedziałem</span>
              <span className="rounded-lg bg-js/10 p-2 text-js"><b className="block text-xl">{stats.hard}</b>z trudem</span>
              <span className="rounded-lg bg-success-soft p-2 text-success"><b className="block text-xl">{stats.good}</b>wiedziałem</span>
              <span className="rounded-lg bg-info-soft p-2 text-info"><b className="block text-xl">{stats.easy}</b>banał</span>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn btn-ghost" onClick={() => setDeck(null)}><ArrowLeft size={16} />Talie</button>
            <button className="btn btn-primary" onClick={() => start(deck, 'quiz')}><Shuffle size={16} />Quiz z tej talii</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Sesja ----------
  const deckInfo = DECKS.find((d) => d.k === card.deck)!;
  const doneN = total - queue.length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <button className="btn btn-ghost px-2 py-1" onClick={() => setDeck(null)} aria-label="Wróć do talii"><ArrowLeft size={18} /></button>
        <Progress value={total ? Math.max(0, doneN) / total : 0} className="flex-1" />
        <span className="mono text-sm tabular text-muted">{queue.length} zostało</span>
      </div>

      {mode === 'learn' ? (
        <>
          <div className="flip-card" onClick={() => setFlipped((f) => !f)} role="button" tabIndex={0} aria-label={flipped ? 'Odwróć na przód' : 'Pokaż odpowiedź'}>
            <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
              <div className="flip-face card p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="mono rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: deckInfo.color }}>{deckInfo.name}</span>
                  <span className="eyebrow">{cards[card.id] ? 'powtórka' : 'nowa karta'}</span>
                </div>
                <p className="mt-8 text-sm text-muted">Co to jest / do czego służy?</p>
                <p className="mono mt-2 text-2xl font-semibold leading-snug md:text-3xl">{card.front}</p>
                <p className="mt-auto inline-flex items-center gap-2 pt-8 text-sm text-muted"><Eye size={15} />Przypomnij sobie, potem kliknij albo naciśnij spację</p>
              </div>
              <div className="flip-face flip-back card p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="mono text-xs text-muted">{card.front}</span>
                  <RotateCw size={14} className="text-muted" />
                </div>
                <p className="mt-6 text-xl font-bold leading-snug md:text-2xl">{card.back}</p>
                {card.example && <pre className="mono mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-sm text-bg">{card.example}</pre>}
              </div>
            </div>
          </div>
          {flipped ? (
            <div className="pop mt-4">
              <p className="mb-2 text-center text-sm text-muted">Jak Ci poszło? Bądź szczery, od tego zależy, kiedy karta wróci.</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {RATE.map((b) => (
                  <button key={b.r} onClick={() => rate(b.r)} className={`rounded-xl border-2 bg-surface px-3 py-3 text-center font-bold transition-colors ${b.cls}`}>
                    {b.label}
                    <span className="block text-[11px] font-normal opacity-80">{prev ? `za ${humanDelta(prev[b.r])}` : b.hint}</span>
                    <kbd className="mono mt-1 inline-block rounded border border-current px-1 text-[10px] opacity-60">{b.key}</kbd>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button className="btn btn-dark mt-4 w-full py-3" onClick={() => setFlipped(true)}><Eye size={16} />Pokaż odpowiedź <kbd className="mono ml-1 rounded border border-current px-1 text-[10px] opacity-70">spacja</kbd></button>
          )}
        </>
      ) : (
        <div className="card pop p-6 md:p-8">
          <div className="flex items-center justify-between">
            <span className="mono rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: deckInfo.color }}>{deckInfo.name}</span>
            <span className="eyebrow flex items-center gap-1"><Sparkles size={12} />quiz</span>
          </div>
          <p className="mt-6 text-sm text-muted">Wybierz poprawne znaczenie:</p>
          <p className="mono mt-1 text-2xl font-semibold">{card.front}</p>
          <div className="mt-5 grid gap-2">
            {options.map((o, i) => {
              const ok = o.id === card.id;
              let cls = 'border-line hover:bg-surface-2';
              if (quizPick !== null && ok) cls = 'border-success bg-success-soft';
              else if (quizPick === i) cls = 'border-danger bg-danger-soft';
              return (
                <button key={o.id} onClick={() => choose(i)} disabled={quizPick !== null} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left ${cls}`}>
                  <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line text-xs">{i + 1}</span>
                  <span className="flex-1">{o.back}</span>
                  {quizPick !== null && ok && <Check size={18} className="text-success" />}
                  {quizPick === i && !ok && <X size={18} className="text-danger" />}
                </button>
              );
            })}
          </div>
          {quizPick !== null && (
            <div className="pop mt-4 flex items-center justify-between gap-3">
              <p className={`font-bold ${options[quizPick].id === card.id ? 'text-success' : 'text-danger'}`}>{options[quizPick].id === card.id ? 'Dobrze! Karta wróci za kilka dni.' : 'Nie tym razem. Karta wróci szybko.'}</p>
              <button className="btn btn-dark" onClick={next}>Dalej</button>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted"><Layers size={12} />{mode === 'learn' ? 'Spacja: odwróć · 1–4: ocena' : '1–4: odpowiedź · Enter: dalej'}</p>
    </div>
  );
}
