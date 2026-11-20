import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Timer, ArrowRight, X, Send, OctagonX } from 'lucide-react';
import { dropAttempt } from '../lib/vfs';
import { useStore } from '../lib/store';
import { mmss } from '../lib/time';

/** Plywajacy pasek: trwa test/proba egzaminu, a uzytkownik jest na innej stronie. */
export default function ReturnToExam() {
  const exam = useStore((s) => s.activeExam);
  const loc = useLocation();
  const nav = useNavigate();
  const [ask, setAsk] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!exam || loc.pathname === '/proba') return null;
  const part = exam.stage === 'theory' && exam.theory && !exam.theory.finishedAt ? exam.theory : exam.stage === 'practice' && exam.practice && !exam.practice.finishedAt ? exam.practice : null;
  if (!part) return null;
  const left = Math.max(0, part.startedAt + part.durationMs - Date.now());
  const label = exam.stage === 'theory' ? (exam.mode === 'theory' ? 'Trwa test teorii' : 'Trwa egzamin: część pisemna') : 'Trwa egzamin: część praktyczna';
  const abort = () => {
    if (!confirm('Przerwać egzamin bez wyniku?\n\nNie dostaniesz oceny ani XP, a praca z tej próby zostanie usunięta.')) return;
    const st = useStore.getState(); st.dropWorkspaces('exam:'); void dropAttempt(`exam:${exam.id}`); st.setActiveExam(null); st.setSettings({ hideNav: false }); setAsk(false);
  };
  return (
    <div className="pop fixed inset-x-3 bottom-[84px] z-40 mx-auto max-w-xl md:bottom-5 md:left-[calc(15rem+1.25rem)] md:right-5">
      {ask && (
        <div className="mb-2 rounded-2xl border border-line bg-surface p-3 shadow-xl">
          <p className="mb-2 text-sm font-bold">Zakończyć egzamin?</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-gold px-3 py-1.5 text-sm" onClick={() => { setAsk(false); nav('/proba?oddaj=1'); }}><Send size={14} />Oddaj pracę do oceny</button>
            <button className="btn btn-ghost px-3 py-1.5 text-sm text-danger" onClick={abort}><OctagonX size={14} />Przerwij bez wyniku</button>
            <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setAsk(false)}>Anuluj</button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-2xl border-2 border-[var(--gold-2)] bg-surface p-3 pl-4 shadow-xl">
        <Link to="/proba" className="flex min-w-0 flex-1 items-center gap-3">
          <Timer className="shrink-0 text-[var(--gold-2)]" />
          <span className="min-w-0 flex-1"><b className="block truncate text-sm">{label}</b><span className="mono text-xs text-muted tabular">zostało {mmss(left)} · zegar dalej leci</span></span>
          <span className="btn btn-gold px-3 py-2 text-sm">Wróć do egzaminu <ArrowRight size={15} /></span>
        </Link>
        <button onClick={() => setAsk((v) => !v)} title="Zakończ egzamin" aria-label="Zakończ egzamin" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-surface-2"><X size={18} /></button>
      </div>
    </div>
  );
}
