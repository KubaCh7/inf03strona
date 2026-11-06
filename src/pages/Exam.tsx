import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, MonitorSmartphone, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { useContent } from '../lib/data';
import { useStore, type ActiveExam } from '../lib/store';
import { newTheory, PRACTICE_MS, PRACTICE_PASS, THEORY_PASS } from '../lib/exam';
import { pick } from '../lib/random';
import { Loading, PageHeader } from '../components/ui';
import TheoryTest, { scoreTheory, TimerBadge, useCountdown, type TheoryState } from '../components/TheoryTest';
import Workshop from '../components/Workshop';
import SheetChecker from '../components/SheetChecker';
import { CATEGORY_LABEL } from '../lib/data';
import WrongAnswers from '../components/WrongAnswers';

const uid = () => crypto.randomUUID?.() ?? String(Date.now());

function Practice({ exam, onDone }: { exam: ActiveExam; onDone: (pct: number) => void }) {
  const c = useContent();
  const p = exam.practice!;
  const left = useCountdown(p.startedAt, p.durationMs, !!p.finishedAt);
  const [view, setView] = useState<'kod' | 'ocena'>('kod');
  if (!c) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === p.sheetCode);
  if (!sheet) return <div className="card p-6">Nie znaleziono arkusza {p.sheetCode}.</div>;
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
          {(['kod', 'ocena'] as const).map((k) => <button key={k} className="chip" aria-pressed={view === k} onClick={() => setView(k)}>{k === 'kod' ? 'Arkusz + warsztat' : 'Oddaję pracę'}</button>)}
        </div>
      </div>
      {timeUp && view !== 'ocena' && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-bold text-danger">Czas minął. Przejdź do „Oddaję” i oceń pracę.</p>}
      {view === 'kod' && <Workshop key={sheet ? `sheet:${sheet.code}` : 'free'} storageKey={`sheet:${sheet.code}`} sheet={sheet} />}
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
    const hist = useStore.getState().tests.filter((x) => x.kind === 'exam' || x.kind === 'theory40').slice(0, 5);
    return (
      <div>
        <section className="gold-frame gold-frame-soft gold-shine mb-6 overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow !text-[var(--gold-3)]">Egzamin zawodowy INF.03 · symulacja</p>
              <h1 className="mt-2 text-4xl font-extrabold md:text-6xl"><span className="gold-text">Próba egzaminu</span></h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">Warunki jak na prawdziwym egzaminie: pytania losowane z bazy, czas liczony od startu, arkusz praktyczny z prawdziwej sesji CKE. Zegar działa dalej, nawet jak odświeżysz stronę.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[['40', 'pytań'], ['60', 'min teorii'], ['150', 'min praktyki'], ['50/75%', 'progi']].map(([v, l]) => (
                <div key={l} className="rounded-xl border border-[var(--gold-2)]/40 bg-surface/70 px-4 py-3"><p className="display text-2xl font-extrabold gold-text">{v}</p><p className="text-[11px] text-muted">{l}</p></div>
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <button className="gold-frame card-hover p-6 text-left" onClick={() => start('theory')}>
            <span className="grid h-12 w-12 place-items-center rounded-xl gold-chip"><BookOpen size={22} /></span>
            <h2 className="mt-4 text-2xl font-bold">Część pisemna</h2><p className="text-sm text-muted">40 pytań · 60 minut · zdajesz od 20 dobrych</p>
            <span className="btn btn-gold mt-5 w-full">Start teorii</span>
          </button>
          <div className="gold-frame card-hover p-6 text-left">
            <button className="block w-full text-left" onClick={() => start('practice')}>
              <span className="grid h-12 w-12 place-items-center rounded-xl gold-chip"><MonitorSmartphone size={22} /></span>
              <h2 className="mt-4 text-2xl font-bold">Część praktyczna</h2><p className="text-sm text-muted">Losowy arkusz CKE · 150 minut · próg 75%</p>
              <span className="btn btn-gold mt-5 w-full">Losuj arkusz</span>
            </button>
            <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyInf} onChange={(e) => setOnlyInf(e.target.checked)} className="accent-[var(--gold-2)]" />Tylko arkusze INF.03</label>
          </div>
          <button className="gold-frame gold-frame-soft gold-shine card-hover p-6 text-left" onClick={() => start('full')}>
            <span className="grid h-12 w-12 place-items-center rounded-xl gold-chip"><Trophy size={22} /></span>
            <h2 className="mt-4 text-2xl font-bold gold-text">Pełny egzamin</h2><p className="text-sm text-muted">Teoria, a potem praktyka. Zdajesz przy ≥ 50% i ≥ 75%.</p>
            <span className="btn btn-gold mt-5 w-full">Zaczynam egzamin</span>
          </button>
        </div>
        {hist.length > 0 && (
          <section className="card mt-6 p-5">
            <p className="eyebrow mb-3">Ostatnie podejścia</p>
            <ul className="divide-y divide-line text-sm">
              {hist.map((x) => (
                <li key={x.id} className="flex items-center gap-3 py-2">
                  <span className={`h-2 w-2 rounded-full ${x.passed ? 'bg-success' : 'bg-danger'}`} />
                  <span className="flex-1">{x.kind === 'exam' ? `Pełny egzamin · ${x.sheetCode}` : 'Część pisemna'}</span>
                  <span className="mono tabular">{x.score}/{x.total}{x.practice !== undefined ? ` · ${x.practice}%` : ''}</span>
                  <span className="text-xs text-muted">{new Date(x.at).toLocaleDateString('pl-PL')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ---- Teoria ----
  if (exam.stage === 'theory' && exam.theory) {
    const t = exam.theory;
    const done = !!t.finishedAt;
    return (
      <div>
        <PageHeader eyebrow={exam.mode === 'full' ? 'Etap 1 z 2' : 'Test teorii'} title={done ? `Wynik: ${t.score}/${t.questionIds.length}` : 'Część pisemna'}
          right={done && (exam.mode === 'full' && !exam.practice ? (
            <button className="btn btn-gold" onClick={() => setActiveExam({ ...exam, stage: 'practice', practice: { sheetCode: randomSheet().code, startedAt: Date.now(), durationMs: PRACTICE_MS } })}>Przejdź do praktyki <ArrowRight size={16} /></button>
          ) : (
            <button className="btn btn-gold" onClick={() => setActiveExam({ ...exam, stage: 'done' })}>Podsumowanie <ArrowRight size={16} /></button>
          ))} />
        <TheoryTest state={t} questions={c.questions} onChange={(s) => setActiveExam({ ...exam, theory: s })} onFinish={finishTheory} />
        {done && <WrongAnswers t={t} byId={byId} />}
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
      <section className={`mb-5 p-6 text-center md:p-8 ${passed ? 'gold-frame gold-frame-soft gold-shine' : 'card'}`}>
        {passed ? <Trophy size={40} className="mx-auto text-[var(--gold-2)]" /> : <RotateCcw size={36} className="mx-auto text-muted" />}
        <p className="eyebrow mt-3">Próba egzaminu zakończona</p>
        <h1 className={`mt-1 text-4xl font-extrabold ${passed ? 'gold-text' : ''}`}>{passed ? 'Zdane!' : 'Jeszcze nie tym razem'}</h1>
        <p className="mt-2 text-sm text-muted">{passed ? 'Tak trzymaj. To wynik treningowy, ale pokazuje, że jesteś gotowy.' : 'Zobacz, gdzie poszło gorzej, i spróbuj ponownie.'}</p>
      </section>
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
      {t && <WrongAnswers t={t} byId={byId} />}
      <div className="mt-5 flex flex-wrap gap-2">
        {t && <button className="btn btn-ghost" onClick={() => setActiveExam({ ...exam, stage: 'theory' })}>Przejrzyj wszystkie odpowiedzi</button>}
        <button className="btn btn-gold" onClick={() => setActiveExam(null)}><RotateCcw size={16} />Nowa próba egzaminu</button>
      </div>
    </div>
  );
}
