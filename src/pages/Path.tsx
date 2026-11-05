import { Link } from 'react-router';
import { Lock, Check, Clock, ArrowRight } from 'lucide-react';
import { LESSONS, LEVELS } from '../data/lessons';
import { useStore } from '../lib/store';
import { PageHeader, Progress } from '../components/ui';

export function isUnlocked(idx: number, done: Record<string, string>, unlockAll: boolean) {
  return unlockAll || idx === 0 || !!done[LESSONS[idx - 1].id] || !!done[LESSONS[idx].id];
}

const LV_COLOR: Record<string, string> = { html: 'bg-html', css: 'bg-css', sql: 'bg-sql', js: 'bg-js', php: 'bg-php', accent: 'bg-accent' };

export default function Path() {
  const done = useStore((s) => s.lessons);
  const unlockAll = useStore((s) => s.settings.unlockAll);
  const total = LESSONS.length;
  const doneN = LESSONS.filter((l) => done[l.id]).length;
  const nextIdx = LESSONS.findIndex((l) => !done[l.id]);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Kurs krok po kroku" title="Ścieżka">
        Od pustego pliku HTML do pełnego arkusza. Każda lekcja kończy się małym zadaniem, które sprawdzamy od razu. Następna lekcja odblokowuje się po zaliczeniu poprzedniej (w Ustawieniach możesz odblokować wszystko).
      </PageHeader>
      <div className="card mb-6 p-4">
        <div className="flex items-center justify-between text-sm"><span>Ukończone lekcje</span><b className="mono tabular">{doneN}/{total}</b></div>
        <Progress value={doneN / total} className="mt-2" />
        {nextIdx >= 0 && <Link to={`/sciezka/${LESSONS[nextIdx].id}`} className="btn btn-primary mt-3">Kontynuuj: {LESSONS[nextIdx].title} <ArrowRight size={16} /></Link>}
      </div>
      {LEVELS.map((lv) => {
        const items = LESSONS.map((l, i) => ({ l, i })).filter(({ l }) => l.level === lv.n);
        const lvDone = items.filter(({ l }) => done[l.id]).length;
        return (
          <section key={lv.n} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span className={`mono grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white ${LV_COLOR[lv.color]}`}>{String(lv.n).padStart(2, '0')}</span>
              <div><p className="eyebrow">Poziom {lv.n} · {lvDone}/{items.length}</p><h2 className="text-xl font-bold">{lv.name}</h2></div>
            </div>
            <ol className="relative ml-[17px] border-l-2 border-dashed border-line pl-6">
              {items.map(({ l, i }) => {
                const open = isUnlocked(i, done, unlockAll);
                const isDone = !!done[l.id];
                return (
                  <li key={l.id} className="relative mb-3">
                    <span className={`absolute -left-[33px] top-4 grid h-4 w-4 place-items-center rounded-full border-2 ${isDone ? 'border-success bg-success' : open ? 'border-accent bg-surface' : 'border-line bg-surface'}`}>{isDone && <Check size={10} className="text-white" strokeWidth={4} />}</span>
                    {open ? (
                      <Link to={`/sciezka/${l.id}`} className={`card card-hover block p-4 ${i === nextIdx ? 'ring-2 ring-accent/40' : ''}`}>
                        <p className="font-bold">{i + 1}. {l.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{l.goal}</p>
                        <p className="mono mt-2 flex items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock size={12} />{l.minutes} min</span><span>+{l.xp} XP</span>{isDone && <span className="text-success">ukończona</span>}</p>
                      </Link>
                    ) : (
                      <div className="card p-4 opacity-60">
                        <p className="flex items-center gap-2 font-bold"><Lock size={14} />{i + 1}. {l.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{l.goal}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
