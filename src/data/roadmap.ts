import { LESSONS } from './lessons';
import { PRACTICE } from './practice';
import type { Category, Flashcard, Question, Sheet } from '../lib/types';
import type { SheetQueries } from '../lib/queries';

/** Dane potrzebne do policzenia postepu krokow sciezki. */
export type Ctx = {
  lessons: Record<string, string>;
  practice: Record<string, { ok: boolean }>;
  queries: Record<string, { ok: boolean }>;
  qstats: Record<string, { seen: number; ok: number }>;
  cards: Record<string, unknown>;
  sheets: Record<string, { status: string; score?: number }>;
  tests: { kind: string; score: number; total: number; passed: boolean }[];
  questions: Question[];
  flashcards: Flashcard[];
  sheetList: Sheet[];
  queryList: SheetQueries[];
};
export type Prog = { cur: number; total: number };
export type Step = { id: string; title: string; desc: string; to: string; kind: string; progress: (c: Ctx) => Prog };
export type Stage = { id: string; title: string; goal: string; steps: Step[] };

const lessonStep = (id: string): Step => {
  const l = LESSONS.find((x) => x.id === id)!;
  return { id: `lesson:${id}`, title: l.title, desc: l.goal, to: `/sciezka/${id}`, kind: 'Lekcja', progress: (c) => ({ cur: c.lessons[id] ? 1 : 0, total: 1 }) };
};
const sectionStep = (topic: 'html' | 'css' | 'js' | 'php', section: string): Step => {
  const tasks = PRACTICE.filter((p) => p.topic === topic && p.section === section);
  const first = tasks[0];
  return {
    id: `section:${topic}:${section}`, title: `${section}`, desc: `${tasks.length} zadań z wyjaśnieniami w dziale Nauka`, kind: `Nauka · ${topic.toUpperCase()}`,
    to: `/nauka/${topic}${first ? `/${first.id}` : ''}`,
    progress: (c) => ({ cur: tasks.filter((t) => c.practice[t.id]?.ok).length, total: tasks.length }),
  };
};
const theoryStep = (cat: Category, need: number, label: string): Step => ({
  id: `theory:${cat}:${need}`, title: `Teoria: ${label}`, desc: `${need} dobrych odpowiedzi w dziale (losuj pytania z filtrem działu)`, kind: 'Teoria', to: '/teoria',
  progress: (c) => { const ids = new Set(c.questions.filter((q) => q.category === cat).map((q) => q.id)); let ok = 0; for (const [id, s] of Object.entries(c.qstats)) if (ids.has(id)) ok += s.ok; return { cur: Math.min(ok, need), total: need }; },
});
const deckStep = (deck: string, label: string): Step => ({
  id: `deck:${deck}`, title: `Fiszki: ${label}`, desc: 'Każda karta z talii przynajmniej raz powtórzona', kind: 'Fiszki', to: '/fiszki',
  progress: (c) => { const d = c.flashcards.filter((f) => f.deck === deck); return { cur: d.filter((f) => c.cards[f.id]).length, total: d.length || 1 }; },
});
const queryStep = (lo: number, hi: number, need: number, label: string): Step => ({
  id: `queries:${lo}-${hi}:${need}`, title: label, desc: `${need} kwerend z arkuszy o trudności ${lo}–${hi}`, kind: 'Kwerendy', to: '/nauka/sql',
  progress: (c) => { let ok = 0; for (const s of c.queryList) for (const t of s.tasks) if (t.difficulty >= lo && t.difficulty <= hi && c.queries[`${s.code}#${t.n}`]?.ok) ok++; return { cur: Math.min(ok, need), total: need }; },
});
const sheetStep = (lo: number, hi: number, need: number, label: string, minScore = 75): Step => ({
  id: `sheets:${lo}-${hi}:${need}:${minScore}`, title: label, desc: `${need} arkuszy INF.03 o trudności ${lo}–${hi} z wynikiem ≥ ${minScore}%`, kind: 'Arkusze', to: `/arkusze?kw=INF.03&min=${lo}&max=${hi}`,
  progress: (c) => { const codes = new Set(c.sheetList.filter((s) => s.difficulty.score >= lo && s.difficulty.score <= hi).map((s) => s.code)); const ok = Object.entries(c.sheets).filter(([k, v]) => codes.has(k) && (v.score ?? 0) >= minScore).length; return { cur: Math.min(ok, need), total: need }; },
});
const testStep = (minPct: number, label: string, desc: string): Step => ({
  id: `test:${minPct}`, title: label, desc, kind: 'Test teorii', to: '/proba',
  progress: (c) => ({ cur: c.tests.some((t) => (t.kind === 'theory40' || t.kind === 'exam') && t.total >= 40 && t.score / t.total >= minPct / 100) ? 1 : 0, total: 1 }),
});
const coverageStep = (pct: number): Step => ({
  id: `coverage:${pct}`, title: `Przerób ${pct}% bazy pytań`, desc: 'Każde pytanie przynajmniej raz (teoria, sprint, pytanie dnia, testy)', kind: 'Teoria', to: '/teoria',
  progress: (c) => { const total = Math.ceil(c.questions.length * pct / 100); const seen = c.questions.filter((q) => c.qstats[q.id]?.seen).length; return { cur: Math.min(seen, total), total }; },
});
const examStep: Step = {
  id: 'exam:full', title: 'Zdaj pełną próbę egzaminu', desc: 'Teoria ≥ 50% i praktyka ≥ 75% w jednym podejściu, na czas', kind: 'Próba egzaminu', to: '/proba',
  progress: (c) => ({ cur: c.tests.some((t) => t.kind === 'exam' && t.passed) ? 1 : 0, total: 1 }),
};
const sec = (topic: 'html' | 'css' | 'js' | 'php', names: string[]) => names.map((n) => sectionStep(topic, n));

export const ROADMAP: Stage[] = [
  { id: 's1', title: 'Start: szkielet strony', goal: 'Piszesz poprawny dokument HTML z tekstem, listami i linkami.', steps: [
    lessonStep('html-szkielet'), lessonStep('html-naglowki'), lessonStep('html-listy'), lessonStep('html-linki'),
    ...sec('html', ['Struktura dokumentu', 'Tekst i nagłówki', 'Listy', 'Linki']),
  ] },
  { id: 's2', title: 'HTML na egzamin', goal: 'Obrazy, tabele z łączeniem komórek, formularze i układ jak w arkuszu.', steps: [
    lessonStep('html-obrazy'), lessonStep('html-tabela'), lessonStep('html-formularz'),
    ...sec('html', ['Obrazy i multimedia', 'Tabele', 'Formularze', 'Semantyka i układ']),
    deckStep('html', 'HTML'), theoryStep('strony', 25, 'strony WWW'),
  ] },
  { id: 's3', title: 'CSS i wygląd strony', goal: 'Odtwarzasz wygląd z arkusza: kolory, czcionki, ramki, układ paneli, pseudoklasy.', steps: [
    lessonStep('css-selektory'), lessonStep('css-uklad'), lessonStep('css-pseudoklasy'), lessonStep('css-efekty'),
    ...sec('css', ['Selektory', 'Tekst i czcionki', 'Kolory i tło', 'Model pudełkowy', 'Układ strony', 'Listy i tabele w CSS', 'Pseudoklasy i pseudoelementy', 'Efekty i animacje', 'Responsywność']),
    deckStep('css', 'CSS'),
  ] },
  { id: 's4', title: 'SQL: pierwsze kwerendy', goal: 'SELECT z warunkami i sortowaniem, INSERT, UPDATE, DELETE, ALTER na bazach z arkuszy.', steps: [
    lessonStep('sql-select'), lessonStep('sql-like'), lessonStep('sql-dml'), lessonStep('sql-alter'),
    queryStep(1, 3, 40, 'Kwerendy: rozgrzewka'), theoryStep('bazy', 25, 'bazy danych'),
  ] },
  { id: 's5', title: 'SQL: grupy, złączenia, uprawnienia', goal: 'Funkcje agregujące, GROUP BY, JOIN, CREATE USER i GRANT, czyli kwerendy 3 i 4 z arkuszy.', steps: [
    lessonStep('sql-group'), lessonStep('sql-join'), lessonStep('sql-avg-join'), lessonStep('sql-uzytkownicy'),
    queryStep(4, 6, 50, 'Kwerendy: średnie'), queryStep(7, 10, 20, 'Kwerendy: trudne'), deckStep('sql', 'SQL'),
  ] },
  { id: 's6', title: 'JavaScript', goal: 'Skrypty z arkuszy: odczyt pól, obliczenia, zmiana stylów, galerie, walidacja.', steps: [
    lessonStep('js-pobierz'), lessonStep('js-style'), lessonStep('js-galeria'), lessonStep('js-create'),
    ...sec('js', ['Podstawy JS', 'Warunki i pętle', 'Funkcje', 'Tablice', 'DOM i zdarzenia']),
    deckStep('js', 'JavaScript'),
  ] },
  { id: 's7', title: 'PHP + MySQL', goal: 'Formularze, ciasteczka, sesje i pełny cykl mysqli: połącz, zapytaj, wypisz, zamknij.', steps: [
    lessonStep('php-formularz'), lessonStep('php-mysqli'), lessonStep('php-insert'),
    ...sec('php', ['Podstawy PHP', 'Formularze w PHP', 'Ciasteczka i sesje', 'PHP + MySQL']),
    deckStep('php', 'PHP'), theoryStep('aplikacje', 30, 'aplikacje i programowanie'),
  ] },
  { id: 's8', title: 'Cała teoria', goal: 'Grafika, sieć, licencje, BHP, angielski. Pierwszy zdany test 40 pytań.', steps: [
    theoryStep('podstawy', 20, 'podstawy (grafika, sieć, licencje)'), theoryStep('bhp', 4, 'BHP'), theoryStep('angielski', 4, 'angielski'), theoryStep('kompetencje', 4, 'kompetencje'),
    deckStep('teoria', 'teoria'), coverageStep(50), testStep(50, 'Zdaj test teorii', '40 pytań, 60 minut, minimum 50%'),
  ] },
  { id: 's9', title: 'Arkusze praktyczne', goal: 'Rozwiązujesz prawdziwe zadania CKE od łatwych do najtrudniejszych.', steps: [
    lessonStep('arkusz-pierwszy'), sheetStep(2, 4, 3, 'Łatwe arkusze'), sheetStep(5, 7, 4, 'Średnie arkusze'), sheetStep(8, 10, 3, 'Trudne arkusze'),
  ] },
  { id: 's10', title: 'Na 100%', goal: 'Komplet: cała baza pytań, teoria na maksa, trudne arkusze bez błędów i zdana próba egzaminu.', steps: [
    coverageStep(100), testStep(90, 'Test teorii ≥ 90%', '36 z 40 albo więcej'), testStep(100, 'Test teorii 40/40', 'Bezbłędnie'),
    queryStep(1, 10, 300, 'Kwerendy: 300 z arkuszy'), sheetStep(8, 10, 3, 'Trudne arkusze na ≥ 95%', 95), examStep,
  ] },
];

export const ALL_STEPS = ROADMAP.flatMap((s) => s.steps);
