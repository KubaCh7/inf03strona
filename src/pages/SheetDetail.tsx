import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, ExternalLink, Eye, EyeOff, FileArchive, FileCheck2, GitBranch, Code2, ShieldCheck, Copy } from 'lucide-react';
import { SESSION_LABEL, useContent } from '../lib/data';
import { useStore, type SheetStatus } from '../lib/store';
import { DifficultyBar, LangBadge, Loading, Tag } from '../components/ui';
import PdfViewer from '../components/PdfViewer';

const FEAT: Record<string, string> = { T: 'Technologie skryptowe', Q: 'Złożoność SQL', S: 'Logika skryptu', L: 'Układ CSS', K: 'Liczba wymagań', G: 'Grafika' };

export default function SheetDetail() {
  const { code = '' } = useParams();
  const c = useContent();
  const st = useStore((s) => s.sheets[code]);
  const setSheet = useStore((s) => s.setSheet);
  const addXp = useStore((s) => s.addXp);
  const [showPass, setShowPass] = useState(false);
  const [score, setScore] = useState('');
  if (!c) return <Loading />;
  const sheet = c.sheets.find((s) => s.code === code);
  if (!sheet) return <div className="card p-8">Nie ma arkusza {code}. <Link to="/arkusze" className="underline">Wróć do katalogu</Link></div>;
  const f = sheet.files;

  const setStatus = (status: SheetStatus) => setSheet(sheet.code, { status });
  const saveScore = () => {
    const n = Math.max(0, Math.min(100, Number(score)));
    if (Number.isNaN(n) || score === '') return;
    const first = !st || st.score === undefined || st.score < 75;
    setSheet(sheet.code, { status: 'done', score: n });
    if (n >= 75) addXp(first ? 50 : 10);
    setScore('');
  };

  return (
    <div>
      <Link to="/arkusze" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={16} />Wszystkie arkusze</Link>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <p className="mono text-sm text-muted">{sheet.code}</p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{sheet.title}</h1>
          <p className="mt-1 text-muted">{sheet.qualification} · sesja {SESSION_LABEL[sheet.session]} {sheet.year} · zadanie nr {sheet.variant} · 150 minut · próg 75%</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/warsztat/${encodeURIComponent(sheet.code)}`} className="btn btn-primary" onClick={() => !st && setStatus('doing')}><Code2 size={16} />Rozwiązuj w warsztacie</Link>
            <Link to={`/sprawdzarka?code=${encodeURIComponent(sheet.code)}`} className="btn btn-ghost"><ShieldCheck size={16} />Sprawdzarka</Link>
            <a href={f.pdfView} target="_blank" rel="noreferrer" className="btn btn-ghost"><ExternalLink size={16} />PDF w nowej karcie</a>
          </div>
          <PdfViewer url={f.pdfRaw} fallback={f.pdfView} className="mt-5 h-[75dvh]" />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <div className="card p-5">
            <div className="flex items-center justify-between"><p className="eyebrow">Trudność</p><LangBadge lang={sheet.language} /></div>
            <div className="mt-2"><DifficultyBar score={sheet.difficulty.score} /></div>
            <p className="mt-1 text-sm font-bold">{sheet.difficulty.label} <span className="font-normal text-muted">· w źródle: {sheet.sourceDifficulty}</span></p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted">Dlaczego {sheet.difficulty.score}/10?</summary>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(sheet.difficulty.features).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2"><span className="w-40 shrink-0 text-xs">{FEAT[k]}</span><span className="h-1.5 flex-1 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${v * 100}%` }} /></span></li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Cechy wyliczone z tagów zadania, zmieszane z oceną źródła i przeliczone na pozycję w puli 152 arkuszy.</p>
            </details>
          </div>

          <div className="card p-5">
            <p className="eyebrow mb-2">Materiały</p>
            <div className="grid gap-2">
              <a href={f.pdfRaw} className="btn btn-ghost justify-start" download><Download size={16} />Pobierz arkusz PDF</a>
              {f.gradingRaw && <a href={f.gradingRaw} target="_blank" rel="noreferrer" className="btn btn-ghost justify-start"><FileCheck2 size={16} />Zasady oceniania</a>}
              {f.archiveUrl && <a href={f.archiveUrl} className="btn btn-ghost justify-start"><FileArchive size={16} />Pliki do zadania (archiwum)</a>}
              {f.solutionUrl && <a href={f.solutionUrl} target="_blank" rel="noreferrer" className="btn btn-ghost justify-start"><GitBranch size={16} />Przykładowe rozwiązanie (GitHub)</a>}
            </div>
            {f.archivePassword && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
                <span className="text-muted">Hasło do archiwum:</span>
                <code className="mono flex-1 truncate font-semibold">{showPass ? f.archivePassword : '••••••••'}</code>
                <button className="rounded p-1 hover:bg-surface" onClick={() => setShowPass((x) => !x)} aria-label={showPass ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                {showPass && <button className="rounded p-1 hover:bg-surface" onClick={() => navigator.clipboard?.writeText(f.archivePassword!)} aria-label="Kopiuj hasło"><Copy size={16} /></button>}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">Pliki: CKE, {sheet.code}. Indeks i rozwiązania: Chr1skyy (GitHub). Linkujemy, nie kopiujemy.</p>
          </div>

          <div className="card p-5">
            <p className="eyebrow mb-2">Twój status</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([['todo', 'Do zrobienia'], ['doing', 'W trakcie'], ['done', 'Ukończony']] as const).map(([k, l]) => (
                <button key={k} className="chip justify-center !text-xs" aria-pressed={(st?.status ?? 'todo') === k} onClick={() => setStatus(k)}>{l}</button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input" inputMode="numeric" placeholder="Wynik %" value={score} onChange={(e) => setScore(e.target.value.replace(/\D/g, '').slice(0, 3))} aria-label="Wynik procentowy" />
              <button className="btn btn-dark" onClick={saveScore}>Zapisz</button>
            </div>
            {st?.score !== undefined && <p className="mt-2 text-sm">Najlepszy wynik: <b className={st.score >= 75 ? 'text-success' : 'text-danger'}>{st.score}%</b> {st.score >= 75 ? '· zdane' : '· poniżej progu 75%'}</p>}
          </div>

          <div className="card p-5">
            <p className="eyebrow mb-2">Ćwiczy</p>
            <div className="flex flex-wrap gap-1.5">{sheet.tags.map((t) => <Tag key={t.group + t.label} {...t} />)}</div>
            {sheet.sameAs.length > 0 && (
              <p className="mt-3 text-sm">To samo zadanie co: {sheet.sameAs.map((s, i) => <span key={s}>{i > 0 && ', '}<Link className="mono text-accent underline" to={`/arkusze/${encodeURIComponent(s)}`}>{s}</Link></span>)}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
