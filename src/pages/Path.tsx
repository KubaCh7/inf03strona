import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Check, ChevronDown, Flag, Lock, SkipForward, Undo2, X } from 'lucide-react';
import { ROADMAP, type Ctx, type Stage, type Step } from '../data/roadmap';
import { useContent } from '../lib/data';
import { useQueries } from '../lib/queries';
import { useStore } from '../lib/store';
import { Loading, PageHeader, Progress } from '../components/ui';

/** Lekcje sa zawsze dostepne: kolejnosc prowadzi sciezka, a tematy mozna pomijac. */
export function isUnlocked(_idx: number, _done: Record<string, string>, _unlockAll: boolean) { return true; }

type StepState = { step: Step; cur: number; total: number; done: boolean; skipped: boolean };

function ConfirmSkip({ what, onYes, onNo }: { what: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/50" aria-label="Anuluj" onClick={onNo} />
      <div className="pop relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <p className="display text-xl font-bold">Pominąć {what}?</p>
        <p className="mt-2 text-sm text-muted">Pominięte kroki liczą się jako zaliczone i odblokowują dalszą część ścieżki. Rób tak tylko, jeśli naprawdę już to umiesz. Zawsze możesz cofnąć pominięcie.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onNo}>Nie, zostaję</button>
          <button className="btn btn-primary" onClick={onYes}><SkipForward size={16} />Tak, umiem to</button>
        </div>
      </div>
    </div>
  );
}

export default function Path() {
  const c = useContent();
  const q = useQueries();
  const s = useStore();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState<null | { what: string; ids: string[] }>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);

  const stages = useMemo(() => {
    if (!c || !q) return null;
    const ctx: Ctx = { lessons: s.lessons, practice: s.practice, queries: s.queries, qstats: s.qstats, cards: s.cards, sheets: s.sheets, tests: s.tests, questions: c.questions, flashcards: c.flashcards, sheetList: c.sheets, queryList: q };
    let prevDone = true;
    return ROADMAP.map((st: Stage, i) => {
      const steps: StepState[] = st.steps.map((step) => { const p = step.progress(ctx); const done = p.cur >= p.total; return { step, ...p, done, skipped: !done && !!s.skipped[step.id] }; });
      const complete = steps.every((x) => x.done || x.skipped);
      const unlocked = s.settings.unlockAll || i === 0 || prevDone || steps.some((x) => x.cur > 0 || x.skipped);
      prevDone = complete;
      const pct = steps.reduce((a, x) => a + (x.done || x.skipped ? 1 : x.cur / x.total), 0) / steps.length;
      return { st, steps, complete, unlocked, pct, index: i };
    });
  }, [c, q, s.lessons, s.practice, s.queries, s.qstats, s.cards, s.sheets, s.tests, s.skipped, s.settings.unlockAll]);

  if (!stages) return <Loading />;
  const allSteps = stages.flatMap((x) => x.steps.map((y) => ({ ...y, stage: x })));
  const doneN = allSteps.filter((x) => x.done || x.skipped).length;
  const next = allSteps.find((x) => !x.done && !x.skipped && x.stage.unlocked);
  const current = stages.find((x) => !x.complete && x.unlocked) ?? stages[stages.length - 1];
  const isOpen = (id: string) => (openStage ? openStage === id : current.st.id === id);

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={`${doneN}/${allSteps.length} kroków · 10 etapów do 100%`} title="Ścieżka">
        Cała droga do zdania INF.03 na 100%: od pustego pliku HTML przez CSS, SQL, JavaScript i PHP po teorię, arkusze i próbę egzaminu. Postęp liczy się sam z tego, co robisz w aplikacji. Temat, który już umiesz, możesz pominąć.
      </PageHeader>

      <div className="card mb-6 p-5">
        <div className="flex items-center justify-between text-sm"><span>Postęp całej ścieżki</span><b className="mono tabular">{Math.round((doneN / allSteps.length) * 100)}%</b></div>
        <Progress value={doneN / allSteps.length} className="mt-2" />
        {next && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1"><p className="eyebrow">Następny krok · {next.step.kind}</p><p className="truncate font-bold">{next.step.title}</p></div>
            <button className="btn btn-primary" onClick={() => nav(next.step.to)}>Dalej <ArrowRight size={16} /></button>
          </div>
        )}
        {!next && doneN === allSteps.length && <p className="mt-3 font-bold text-success">Cała ścieżka zrobiona. Jesteś gotowy na egzamin!</p>}
      </div>

      <ol className="relative space-y-4">
        {stages.map(({ st, steps, complete, unlocked, pct, index }) => (
          <li key={st.id} className={`card overflow-hidden ${!unlocked ? 'opacity-60' : ''} ${current.st.id === st.id ? 'ring-2 ring-accent/40' : ''}`}>
            <button className="flex w-full items-center gap-4 p-5 text-left" onClick={() => setOpenStage(isOpen(st.id) ? '__none' : st.id)} aria-expanded={isOpen(st.id)}>
              <span className={`display grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-extrabold ${complete ? 'bg-success text-white' : unlocked ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}>
                {complete ? <Check size={22} /> : !unlocked ? <Lock size={18} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block">Etap {index + 1}{index === ROADMAP.length - 1 ? ' · finał' : ''}</span>
                <span className="block text-lg font-bold">{st.title}</span>
                <span className="block text-sm text-muted">{st.goal}</span>
                <Progress value={pct} className="mt-2 h-1.5" />
              </span>
              <ChevronDown className={`shrink-0 transition-transform ${isOpen(st.id) ? 'rotate-180' : ''}`} />
            </button>
            {isOpen(st.id) && (
              <div className="border-t border-line">
                {!unlocked && <p className="bg-surface-2 px-5 py-2 text-xs text-muted">Etap odblokuje się po skończeniu poprzedniego. Możesz go też pominąć albo odblokować wszystko w Ustawieniach.</p>}
                <ul className="divide-y divide-line">
                  {steps.map(({ step, cur, total, done, skipped }) => (
                    <li key={step.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${done ? 'bg-success text-white' : skipped ? 'bg-surface-2 text-muted' : 'border border-line'}`}>
                        {done ? <Check size={16} /> : skipped ? <SkipForward size={14} /> : <Flag size={13} className="text-muted" />}
                      </span>
                      <Link to={step.to} className="min-w-0 flex-1 hover:text-accent">
                        <span className="eyebrow block !text-[10px]">{step.kind}</span>
                        <b className={`block truncate text-sm ${skipped ? 'line-through opacity-60' : ''}`}>{step.title}</b>
                        <span className="block truncate text-xs text-muted">{step.desc}</span>
                      </Link>
                      {total > 1 && !done && <span className="mono hidden text-xs tabular text-muted sm:block">{cur}/{total}</span>}
                      {!done && !skipped && <button className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2" onClick={() => setConfirm({ what: `„${step.title}”`, ids: [step.id] })}>Pomiń</button>}
                      {skipped && <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2" onClick={() => s.setSkipped(step.id, false)}><Undo2 size={12} />Cofnij</button>}
                      <Link to={step.to} className="btn btn-dark hidden px-3 py-1.5 text-xs sm:inline-flex">{done ? 'Powtórz' : 'Idź'}</Link>
                    </li>
                  ))}
                </ul>
                {!complete && (
                  <div className="flex justify-end border-t border-line px-5 py-3">
                    <button className="btn btn-ghost text-sm" onClick={() => setConfirm({ what: `cały etap „${st.title}”`, ids: steps.filter((x) => !x.done && !x.skipped).map((x) => x.step.id) })}><SkipForward size={15} />Pomiń etap</button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {confirm && <ConfirmSkip what={confirm.what} onNo={() => setConfirm(null)} onYes={() => { confirm.ids.forEach((id) => s.setSkipped(id, true)); setConfirm(null); }} />}
      <p className="mt-6 text-xs text-muted"><X size={11} className="mr-1 inline" />Pomijanie niczego nie blokuje: pominięty krok możesz zrobić w każdej chwili, a jego postęp dalej się liczy.</p>
    </div>
  );
}
