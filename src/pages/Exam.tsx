import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, MonitorSmartphone, Trophy, ArrowRight, RotateCcw, FileText, ExternalLink } from 'lucide-react';
import { useContent } from '../lib/data';
import { useStore, type ActiveExam } from '../lib/store';
import { newTheory, PRACTICE_MS, PRACTICE_PASS, THEORY_PASS } from '../lib/exam';
import { pick } from '../lib/random';
import { Loading, PageHeader } from '../components/ui';
import TheoryTest, { scoreTheory, TimerBadge, useCountdown, type TheoryState } from '../components/TheoryTest';
import Workshop from '../components/Workshop';
import SheetChecker from '../components/SheetChecker';
import PdfViewer from '../components/PdfViewer';
import { CATEGORY_LABEL } from '../lib/data';

const uid = () => crypto.randomUUID?.() ?? String(Date.now());

function Practice({ exam, onDone }: { exam: ActiveExam; onDone: (pct: number) => void }) {
  const c = useContent()!;
  const p = exam.practice!;
  const sheet = c.sheets.find((s) => s.code === p.sheetCode)!;
  const left = useCountdown(p.startedAt, p.durationMs, !!p.finishedAt);
  const [view, setView] = useState<'pdf' | 'kod' | 'ocena'>('pdf');
  const timeUp = left === 0;
  return (
    <div>
      <div className="card sticky top-[60px] z-10 mb-4 flex flex-wrap items-center justify-between gap-3 p-4 md:top-4">
        <div className="min-w-0">
          <p className="eyebrow">Część praktyczna · {sheet.code}</p>
          <p className="display truncate text-xl font-bold">{sheet.title}</p>
        </div>
        <TimerBadge left={left} total={p.durationMs} />
        <div className="flex gap-1.5">
          {(['pdf', 'kod', 'ocena'] as const).map((k) => <button key={k} className="chip" aria-pressed={view === k} onClick={() => setView(k)}>{k === 'pdf' ? 'Arkusz' : k === 'kod' ? 'Warsztat' : 'Oddaję'}</button>)}
        </div>
      </div>
      {timeUp && view !== 'ocena' && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-bold text-danger">Czas minął. Przejdź do „Oddaję” i oceń pracę.</p>}
      {view === 'pdf' && (<>
        <a className="btn btn-ghost mb-3" href={sheet.files.pdfView} target="_blank" rel="noreferrer"><FileText size={16} />PDF w nowej karcie <ExternalLink size={14} /></a>
        {sheet.files.archiveUrl && <a className="btn btn-ghost mb-3 ml-2" href={sheet.files.archiveUrl}>Pliki do zadania</a>}
        {sheet.files.archivePassword && <span className="mono ml-2 text-sm text-muted">hasło: {sheet.files.archivePassword}</span>}
        <PdfViewer url={sheet.files.pdfRaw} fallback={sheet.files.pdfView} className="h-[75dvh]" />
      </>)}
      {view === 'kod' && <Workshop storageKey={`sheet:${sheet.code}`} />}
      {view === 'ocena' && <SheetChecker sheet={sheet} autoRun onScore={onDone} />}
    </div>
  );
}

export default function Exam() {
  const c = useContent();
  const { activeExam: exam, setActiveExam, addTest, addXp, setSheet } = useStore();
  const [onlyInf, setOnlyInf] = useState(true);
  const byId = useMemo(() => new Map((c?.questions ?? []).map((q) => [q.id, q])), [c]);
  if (!c) return <Loading />;

  const randomSheet = () => pick(c.sheets.filter((s) => !onlyInf || s.qualification === 'INF.03'));
  const start = (mode: ActiveExam['mode']) => {
    if (exam && exam.stage !== 'done' && !confirm('Porzucić rozpoczętą próbę?')) return;
    if (mode === 'practice') setActiveExam({ id: uid(), mode, stage: 'practice', practice: { sheetCode: randomSheet().code, startedAt: Date.now(), durationMs: PRACTICE_MS } });
    else setActiveExam({ id: uid(), mode, stage: 'theory', theory: newTheory(c.questions) });
  };

  const finishTheory = (t: TheoryState) => {
    const { ok, total, byCat } = scoreTheory(t, byId);
    const passed = ok / total >= THEORY_PASS;
    const theory = { ...t, finishedAt: Date.now(), score: ok };
    addTest({ id: uid(), kind: 'theory40', at: new Date().toISOString(), score: ok, total, passed, byCat });
    t.questionIds.forEach((id, i) => { const a = t.answers[i]; useStore.getState().recordAnswer(id, a !== null && t.order[i][a] === byId.get(id)!.correct); });
    if (passed) addXp(30);
    if (exam!.mode === 'full') setActiveExam({ ...exam!, theory, stage: 'theory' });
    else setActiveExam({ ...exam!, theory, stage: 'done' });
  };
  const finishPractice = (pct: number) => {
    const p = exam!.practice!;
    setSheet(p.sheetCode, { status: 'done', score: pct });
    if (pct >= 75) addXp(50);
    const practice = { ...p, finishedAt: Date.now(), score: pct };
    if (exam!.mode === 'full') {
      const t = exam!.theory!;
      const passed = (t.score ?? 0) / t.questionIds.length >= THEORY_PASS && pct / 100 >= PRACTICE_PASS;
      addTest({ id: uid(), kind: 'exam', at: new Date().toISOString(), score: t.score ?? 0, total: t.questionIds.length, passed, sheetCode: p.sheetCode, practice: pct });
      if (passed) addXp(100);
    }
    setActiveExam({ ...exam!, practice, stage: 'done' });
  };

  // ---- Landing ----
  if (!exam) {
    return (
      <div>
        <PageHeader eyebrow="Egzamin · symulacja" title="Próba generalna">
          Wybierz część egzaminu. Od startu liczy się czas, a Ty pracujesz sam. Odświeżenie strony nie zatrzymuje zegara.
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <button className="card card-hover p-6 text-left" onClick={() => start('theory')}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent"><BookOpen size={22} /></span>
            <h2 className="mt-4 text-2xl font-bold">Teoria</h2><p className="text-sm text-muted">40 pytań · 60 minut · próg 50%</p>
          </button>
          <div className="card card-hover p-6 text-left">
            <button className="block w-full text-left" onClick={() => start('practice')}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-soft text-info"><MonitorSmartphone size={22} /></span>
              <h2 className="mt-4 text-2xl font-bold">Praktyka</h2><p className="text-sm text-muted">Losowy arkusz · 150 minut · próg 75%</p>
            </button>
            <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyInf} onChange={(e) => setOnlyInf(e.target.checked)} className="accent-[var(--accent)]" />Tylko arkusze INF.03</label>
          </div>
          <button className="card card-hover p-6 text-left" style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface) 65%)' }} onClick={() => start('full')}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-ink"><Trophy size={22} /></span>
            <h2 className="mt-4 text-2xl font-bold">Pełny egzamin</h2><p className="text-sm text-muted">Teoria, potem praktyka. Zdajesz przy ≥ 50% i ≥ 75%.</p>
          </button>
        </div>
      </div>
    );
  }

  // ---- Teoria ----
  if (exam.stage === 'theory' && exam.theory) {
    const t = exam.theory;
    const done = !!t.finishedAt;
    return (
      <div>
        <PageHeader eyebrow={exam.mode === 'full' ? 'Pełny egzamin · etap 1 z 2' : 'Test teorii'} title={done ? `Wynik: ${t.score}/${t.questionIds.length}` : 'Część pisemna'}
          right={done && (exam.mode === 'full' && !exam.practice ? (
            <button className="btn btn-primary" onClick={() => setActiveExam({ ...exam, stage: 'practice', practice: { sheetCode: randomSheet().code, startedAt: Date.now(), durationMs: PRACTICE_MS } })}>Przejdź do praktyki <ArrowRight size={16} /></button>
          ) : (
            <button className="btn btn-primary" onClick={() => setActiveExam({ ...exam, stage: 'done' })}>Podsumowanie <ArrowRight size={16} /></button>
          ))} />
        <TheoryTest state={t} questions={c.questions} onChange={(s) => setActiveExam({ ...exam, theory: s })} onFinish={finishTheory} />
      </div>
    );
  }

  // ---- Praktyka ----
  if (exam.stage === 'practice' && exam.practice) return <Practice exam={exam} onDone={finishPractice} />;

  // ---- Podsumowanie ----
  const t = exam.theory;
  const p = exam.practice;
  const tPct = t ? (t.score ?? 0) / t.questionIds.length : null;
  const tRes = t ? scoreTheory(t, byId) : null;
  const passed = (tPct === null || tPct >= THEORY_PASS) && (!p || (p.score ?? 0) / 100 >= PRACTICE_PASS);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Próba zakończona" title={passed ? 'Zdane (trening) 🎉' : 'Jeszcze nie tym razem'} />
      <div className="grid gap-4 sm:grid-cols-2">
        {t && (
          <div className="card p-5">
            <p className="eyebrow">Teoria</p>
            <p className={`display text-4xl font-extrabold ${tPct! >= THEORY_PASS ? 'text-success' : 'text-danger'}`}>{Math.round(tPct! * 100)}%</p>
            <p className="text-sm text-muted">{t.score}/{t.questionIds.length} · próg 50%</p>
            <ul className="mt-3 space-y-1 text-sm">{tRes && Object.entries(tRes.byCat).map(([k, [ok, n]]) => <li key={k} className="flex justify-between"><span>{CATEGORY_LABEL[k]}</span><span className="mono tabular">{ok}/{n}</span></li>)}</ul>
          </div>
        )}
        {p && (
          <div className="card p-5">
            <p className="eyebrow">Praktyka · {p.sheetCode}</p>
            <p className={`display text-4xl font-extrabold ${(p.score ?? 0) >= 75 ? 'text-success' : 'text-danger'}`}>{p.score ?? 0}%</p>
            <p className="text-sm text-muted">próg 75%</p>
            <Link className="mt-3 inline-block text-sm text-accent underline" to={`/arkusze/${encodeURIComponent(p.sheetCode)}`}>Zobacz arkusz i rozwiązanie</Link>
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {t && <button className="btn btn-ghost" onClick={() => setActiveExam({ ...exam, stage: 'theory' })}>Przejrzyj odpowiedzi</button>}
        <button className="btn btn-primary" onClick={() => setActiveExam(null)}><RotateCcw size={16} />Nowa próba</button>
      </div>
    </div>
  );
}
