import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Timer, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { mmss } from '../lib/time';

/** Plywajacy pasek: trwa test/proba egzaminu, a uzytkownik jest na innej stronie. */
export default function ReturnToExam() {
  const exam = useStore((s) => s.activeExam);
  const loc = useLocation();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  if (!exam || loc.pathname === '/proba') return null;
  const part = exam.stage === 'theory' && exam.theory && !exam.theory.finishedAt ? exam.theory : exam.stage === 'practice' && exam.practice && !exam.practice.finishedAt ? exam.practice : null;
  if (!part) return null;
  const left = Math.max(0, part.startedAt + part.durationMs - Date.now());
  const label = exam.stage === 'theory' ? (exam.mode === 'theory' ? 'Trwa test teorii' : 'Trwa egzamin: część pisemna') : 'Trwa egzamin: część praktyczna';
  return (
    <div className="pop fixed inset-x-3 bottom-[84px] z-40 mx-auto max-w-xl md:bottom-5 md:left-[calc(15rem+1.25rem)] md:right-5">
      <Link to="/proba" className="flex items-center gap-3 rounded-2xl border-2 border-[var(--gold-2)] bg-surface p-3 pl-4 shadow-xl">
        <Timer className="shrink-0 text-[var(--gold-2)]" />
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{label}</b><span className="mono text-xs text-muted tabular">zostało {mmss(left)} · zegar dalej leci</span></span>
        <span className="btn btn-gold px-3 py-2 text-sm">Wróć do egzaminu <ArrowRight size={15} /></span>
      </Link>
    </div>
  );
}
