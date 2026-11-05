import { useEffect, useMemo, useState } from 'react';
import { RotateCw, PartyPopper } from 'lucide-react';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { humanDelta, isDue, preview, Rating, review } from '../lib/fsrs';
import { today } from '../lib/time';
import { Loading, PageHeader } from '../components/ui';
import type { Flashcard } from '../lib/types';

const DECKS: Record<string, string> = { html: 'HTML', css: 'CSS', js: 'JavaScript', php: 'PHP', sql: 'SQL', teoria: 'Teoria' };
const BTN = [
  { r: Rating.Again, label: 'Nie pamiętam', key: '1', cls: 'border-danger text-danger hover:bg-danger-soft' },
  { r: Rating.Hard, label: 'Trudne', key: '2', cls: 'border-js text-js hover:bg-js/10' },
  { r: Rating.Good, label: 'Dobrze', key: '3', cls: 'border-success text-success hover:bg-success-soft' },
  { r: Rating.Easy, label: 'Łatwe', key: '4', cls: 'border-info text-info hover:bg-info-soft' },
];

export default function Flashcards() {
  const c = useContent();
  const { cards, setCard, countNewCard, newCardsDay, settings, addXp } = useStore();
  const [decks, setDecks] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [tick, setTick] = useState(0);

  const newUsed = newCardsDay.date === today() ? newCardsDay.count : 0;
  const queue = useMemo(() => {
    if (!c) return [] as Flashcard[];
    const inDeck = (f: Flashcard) => decks.size === 0 || decks.has(f.deck);
    const due = c.flashcards.filter((f) => inDeck(f) && isDue(cards[f.id])).sort((a, b) => String((cards[a.id] as { due: string }).due).localeCompare(String((cards[b.id] as { due: string }).due)));
    const fresh = c.flashcards.filter((f) => inDeck(f) && !cards[f.id]).slice(0, Math.max(0, settings.newCardsPerDay - newUsed));
    return [...due, ...fresh];
  }, [c, cards, decks, settings.newCardsPerDay, newUsed, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = queue[0];
  const prev = useMemo(() => (card ? preview(cards[card.id]) : null), [card, cards]);

  function rate(r: Rating) {
    if (!card) return;
    if (!cards[card.id]) countNewCard();
    setCard(card.id, review(cards[card.id], r));
    addXp(1);
    setFlipped(false);
    setSessionDone((n) => n + 1);
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate(BTN[Number(e.key) - 1].r);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  // co minute przelicz kolejke (karty z krokow nauki wracaja po kilku minutach)
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);

  if (!c) return <Loading />;
  const counts = (d: string) => c.flashcards.filter((f) => f.deck === d && isDue(cards[f.id])).length;
  const totalDue = c.flashcards.filter((f) => isDue(cards[f.id])).length;
  const learned = Object.keys(cards).length;

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow={`Powtórki FSRS · ${learned}/${c.flashcards.length} kart w nauce`} title="Fiszki">
        Algorytm FSRS pokazuje kartę wtedy, kiedy zaczynasz ją zapominać. Do powtórki: <b className="text-ink">{totalDue}</b>, nowych dziś zostało: <b className="text-ink">{Math.max(0, settings.newCardsPerDay - newUsed)}</b>.
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="chip" aria-pressed={decks.size === 0} onClick={() => setDecks(new Set())}>Wszystkie</button>
        {Object.entries(DECKS).map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={decks.has(k)} onClick={() => setDecks((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
            {l} {counts(k) > 0 && <span className="mono rounded-full bg-accent px-1.5 text-[10px] text-accent-ink">{counts(k)}</span>}
          </button>
        ))}
      </div>

      {!card ? (
        <div className="card p-10 text-center">
          <PartyPopper size={40} className="mx-auto text-accent" />
          <p className="display mt-3 text-2xl font-bold">Na teraz to wszystko</p>
          <p className="mt-1 text-muted">Przerobione w tej sesji: {sessionDone}. Wróć później albo zwiększ limit nowych kart w Ustawieniach.</p>
        </div>
      ) : (
        <>
          <button onClick={() => setFlipped((f) => !f)} className="card pop block min-h-72 w-full p-8 text-center" aria-live="polite">
            <p className="eyebrow">{DECKS[card.deck]} · {cards[card.id] ? 'powtórka' : 'nowa'} · w kolejce {queue.length}</p>
            <p className="mono mt-6 text-2xl font-semibold md:text-3xl">{card.front}</p>
            {flipped ? (
              <div className="pop mt-6 border-t border-line pt-6">
                <p className="text-lg">{card.back}</p>
                {card.example && <pre className="mono mx-auto mt-4 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-left text-sm">{card.example}</pre>}
              </div>
            ) : <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted"><RotateCw size={14} />Kliknij albo naciśnij spację, żeby odwrócić</p>}
          </button>
          {flipped && prev && (
            <div className="pop mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {BTN.map((b) => (
                <button key={b.r} onClick={() => rate(b.r)} className={`rounded-xl border-2 bg-surface px-3 py-3 text-center font-bold transition-colors ${b.cls}`}>
                  {b.label}<span className="mono block text-xs font-normal opacity-80">{humanDelta(prev[b.r])} · [{b.key}]</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
