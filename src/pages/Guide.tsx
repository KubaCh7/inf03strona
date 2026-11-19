import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search, ListOrdered, Monitor, ChevronRight } from 'lucide-react';
import { SESSION_LABEL, useContent } from '../lib/data';
import { Loading, PageHeader } from '../components/ui';
import ExamFlow from './ExamFlow';

/** Poradnik: wybierz arkusz INF.03 i zobacz, jak go rozwiązać krok po kroku. */
export default function Guide() {
  const c = useContent();
  const [sp, setSp] = useSearchParams();
  const code = sp.get('arkusz') ?? '';
  const [q, setQ] = useState('');
  const top = useRef<HTMLDivElement>(null);
  const sheets = useMemo(() => (c?.sheets ?? []).filter((s) => s.qualification === 'INF.03')
    .sort((a, b) => b.year - a.year || (a.session === b.session ? a.code.localeCompare(b.code) : a.session === 'czerwiec' ? -1 : 1)), [c]);
  useEffect(() => { if (code) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [code]);
  if (!c) return <Loading />;
  const f = q.trim().toLowerCase();
  const shown = sheets.filter((s) => !f || `${s.code} ${s.title} ${s.year}`.toLowerCase().includes(f));
  const cur = sheets.find((s) => s.code === code);

  return (
    <div>
      <PageHeader eyebrow="Arkusze · poradnik" title="Jak rozwiązać arkusz">
        Wybierz arkusz, a pokażemy kolejność pracy na egzaminie krok po kroku: folder, archiwum, XAMPP, baza, kwerendy i zrzuty, grafika, strona i oddanie. Do każdego arkusza jest też pełne rozwiązanie zadania z objaśnieniami.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card self-start p-3 lg:sticky lg:top-8">
          <label className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"><Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: rok, kod, temat" className="w-full bg-transparent text-sm outline-none" aria-label="Szukaj arkusza" /></label>
          <p className="mt-2 px-1 text-xs text-muted">{shown.length} arkuszy INF.03</p>
          <ul className="mt-1 max-h-[60dvh] space-y-0.5 overflow-auto lg:max-h-[70dvh]">
            {shown.map((s) => (
              <li key={s.code}>
                <button onClick={() => setSp({ arkusz: s.code })} aria-current={s.code === code}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${s.code === code ? 'bg-accent-soft font-bold' : 'hover:bg-surface-2'}`}>
                  <span className="min-w-0 flex-1"><span className="block truncate">{s.title}</span><span className="mono block text-xs text-muted">{s.code} · {SESSION_LABEL[s.session]} {s.year}</span></span>
                  <ChevronRight size={15} className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section ref={top} className="min-w-0 scroll-mt-6">
          {cur ? (
            <>
              <ExamFlow key={cur.code} code={cur.code} embedded />
              <div className="card mt-4 flex flex-wrap items-center gap-3 p-5">
                <p className="min-w-0 flex-1 text-sm">Znasz już kolejność? Zobacz, jak napisać kod i kwerendy do tego zadania, albo przećwicz całość na pulpicie.</p>
                {cur.files.solutionUrl && <Link className="btn btn-primary" to={`/arkusze/${encodeURIComponent(cur.code)}/rozwiazanie`}><ListOrdered size={16} />Rozwiązanie zadania</Link>}
                <Link className="btn btn-ghost" to={`/pulpit/${encodeURIComponent(cur.code)}`}><Monitor size={16} />Ćwicz na pulpicie</Link>
              </div>
            </>
          ) : (
            <div className="card grid min-h-[300px] place-items-center p-8 text-center">
              <div><p className="text-lg font-bold">Wybierz arkusz z listy</p><p className="mt-1 text-sm text-muted">Najnowsze są na górze. Możesz szukać po roku, kodzie albo temacie.</p>
                {sheets[0] && <button className="btn btn-primary mt-4" onClick={() => setSp({ arkusz: sheets[0].code })}>Zacznij od najnowszego</button>}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
