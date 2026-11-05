import { useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import type { Question } from '../lib/types';
import { CATEGORY_LABEL } from '../lib/data';
import { QuestionBody, answerLabel } from './QuestionBody';
import type { TheoryState } from './TheoryTest';

/** Rozwijany panel: lista blednych (i pominietych) odpowiedzi z poprawna odpowiedzia i wyjasnieniem. */
export default function WrongAnswers({ t, byId }: { t: TheoryState; byId: Map<string, Question> }) {
  const [open, setOpen] = useState(true);
  const wrong = t.questionIds.map((id, i) => ({ q: byId.get(id)!, i, chosen: t.answers[i] })).filter(({ q, i, chosen }) => q && (chosen === null || t.order[i][chosen] !== q.correct));
  if (!wrong.length) return <div className="card mt-4 p-5 text-center font-bold text-success">Wszystkie odpowiedzi poprawne. Nie ma czego poprawiać!</div>;
  return (
    <section className="card mt-4 overflow-hidden">
      <button className="flex w-full items-center justify-between gap-3 p-5 text-left" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <span><span className="block text-lg font-bold">Twoje błędy ({wrong.length})</span><span className="text-sm text-muted">Co zaznaczyłeś, jaka jest poprawna odpowiedź i dlaczego.</span></span>
        <ChevronDown className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="divide-y divide-line border-t border-line">
          {wrong.map(({ q, i, chosen }) => {
            const origChosen = chosen === null ? null : t.order[i][chosen];
            return (
              <li key={q.id} className="p-5">
                <p className="eyebrow mb-2">Pytanie {i + 1} · {CATEGORY_LABEL[q.category]}</p>
                <QuestionBody q={q} size="md" />
                <div className="mt-3 grid gap-2 text-sm">
                  {origChosen !== null ? (
                    <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-2.5"><X size={16} className="mt-0.5 shrink-0 text-danger" /><span><b>Twoja odpowiedź:</b> {'ABCD'[origChosen]}. {answerLabel(q, q.answers[origChosen], origChosen)}</span></p>
                  ) : <p className="rounded-lg bg-surface-2 p-2.5"><b>Bez odpowiedzi</b> (pominięte pytanie liczy się jako błąd)</p>}
                  <p className="flex items-start gap-2 rounded-lg bg-success-soft p-2.5"><Check size={16} className="mt-0.5 shrink-0 text-success" /><span><b>Poprawna:</b> {'ABCD'[q.correct]}. {answerLabel(q, q.answers[q.correct], q.correct)}</span></p>
                  {q.explanation && <p className="rounded-lg bg-info-soft p-2.5"><b>Wyjaśnienie:</b> {q.explanation}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
