import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, Shuffle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useContent } from '../lib/data';
import { useStore } from '../lib/store';
import { Loading, PageHeader } from '../components/ui';
import SheetCard from '../components/SheetCard';
import type { Sheet } from '../lib/types';

const QUALS = ['INF.03', 'EE.09', 'E.14'] as const;
const LANGS = ['JS', 'PHP', 'JS+PHP'] as const;
const STATUSES = [['todo', 'Nie rozpoczęte'], ['doing', 'W trakcie'], ['done', 'Ukończone']] as const;

export default function Sheets() {
  const c = useContent();
  const nav = useNavigate();
  const progress = useStore((s) => s.sheets);
  const [sp, setSp] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const get = (k: string) => sp.get(k) ?? '';
  const list = (k: string) => (sp.get(k) ? sp.get(k)!.split(',') : []);
  const set = (k: string, v: string | string[] | null) => {
    const n = new URLSearchParams(sp);
    const val = Array.isArray(v) ? v.join(',') : v;
    if (!val) n.delete(k); else n.set(k, val);
    setSp(n, { replace: true });
  };
  const toggle = (k: string, v: string) => { const l = list(k); set(k, l.includes(v) ? l.filter((x) => x !== v) : [...l, v]); };

  const q = get('q').toLowerCase();
  const quals = list('kw');
  const langs = list('jezyk');
  const years = list('rok');
  const tagGroups = list('tag');
  const statuses = list('status');
  const min = Number(get('min') || 1);
  const max = Number(get('max') || 10);
  const sort = get('sort') || 'najnowsze';

  const allYears = useMemo(() => Array.from(new Set((c?.sheets ?? []).map((s) => s.year))).sort((a, b) => b - a), [c]);
  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    c?.sheets.forEach((s) => s.tags.forEach((t) => { const k = `${t.group}: ${t.label}`; m.set(k, (m.get(k) ?? 0) + 1); }));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [c]);

  const filtered = useMemo(() => {
    if (!c) return [];
    const out = c.sheets.filter((s: Sheet) => {
      if (q && !(`${s.title} ${s.code}`.toLowerCase().includes(q))) return false;
      if (quals.length && !quals.includes(s.qualification)) return false;
      if (langs.length && !langs.includes(s.language)) return false;
      if (years.length && !years.includes(String(s.year))) return false;
      if (s.difficulty.score < min || s.difficulty.score > max) return false;
      if (tagGroups.length && !tagGroups.every((tg) => s.tags.some((t) => `${t.group}: ${t.label}` === tg))) return false;
      if (statuses.length && !statuses.includes(progress[s.code]?.status ?? 'todo')) return false;
      return true;
    });
    if (sort === 'trudnosc-rosnaco') out.sort((a, b) => a.difficulty.score - b.difficulty.score);
    if (sort === 'trudnosc-malejaco') out.sort((a, b) => b.difficulty.score - a.difficulty.score);
    if (sort === 'tytul') out.sort((a, b) => a.title.localeCompare(b.title, 'pl'));
    return out;
  }, [c, q, quals.join(), langs.join(), years.join(), tagGroups.join(), statuses.join(), min, max, sort, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <Loading />;
  const done = c.sheets.filter((s) => progress[s.code]?.status === 'done').length;
  const activeCount = [quals, langs, years, tagGroups, statuses].reduce((n, l) => n + l.length, 0) + (min > 1 || max < 10 ? 1 : 0);

  return (
    <div>
      <PageHeader eyebrow={`Arkusze praktyczne · ${c.sheets.length} zadań CKE`} title="Arkusze" right={
        <button className="btn btn-primary" onClick={() => { const s = filtered[Math.floor(Math.random() * filtered.length)]; if (s) nav(`/arkusze/${encodeURIComponent(s.code)}`); }}><Shuffle size={16} />Losuj z widocznych</button>
      }>
        Wszystkie opublikowane zadania INF.03, EE.09 i E.14 (2018–2026). Trudność 2–10 jest względna: liczona z tagów zadania i porównana z resztą puli. Ukończone: <b className="text-ink">{done}/{c.sheets.length}</b>.
      </PageHeader>

      <div className="card mb-5 p-4">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-60 flex-1 items-center gap-2"><Search size={16} className="text-muted" /><input className="input" placeholder="Szukaj po tytule lub kodzie (np. INF.03-01-26.06-SG)" value={get('q')} onChange={(e) => set('q', e.target.value)} /></label>
          <select className="input w-auto" value={sort} onChange={(e) => set('sort', e.target.value === 'najnowsze' ? null : e.target.value)} aria-label="Sortowanie">
            <option value="najnowsze">Najnowsze</option><option value="trudnosc-rosnaco">Najłatwiejsze</option><option value="trudnosc-malejaco">Najtrudniejsze</option><option value="tytul">Tytuł A–Z</option>
          </select>
          <button className="btn btn-ghost" onClick={() => setShowFilters((x) => !x)}><SlidersHorizontal size={16} />Filtry{activeCount ? ` (${activeCount})` : ''}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUALS.map((k) => <button key={k} className="chip" aria-pressed={quals.includes(k)} onClick={() => toggle('kw', k)}>{k} <span className="mono text-xs opacity-70">{c.sheets.filter((s) => s.qualification === k).length}</span></button>)}
          <span className="mx-1 w-px self-stretch bg-line" />
          {LANGS.map((k) => <button key={k} className="chip" aria-pressed={langs.includes(k)} onClick={() => toggle('jezyk', k)}>{k}</button>)}
        </div>
        {showFilters && (
          <div className="pop mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-2">Trudność: {min}–{max}</p>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={10} value={min} onChange={(e) => set('min', Math.min(Number(e.target.value), max) === 1 ? null : String(Math.min(Number(e.target.value), max)))} className="flex-1 accent-[var(--accent)]" aria-label="Minimalna trudność" />
                <input type="range" min={1} max={10} value={max} onChange={(e) => set('max', Math.max(Number(e.target.value), min) === 10 ? null : String(Math.max(Number(e.target.value), min)))} className="flex-1 accent-[var(--accent)]" aria-label="Maksymalna trudność" />
              </div>
              <p className="eyebrow mb-2 mt-4">Rok</p>
              <div className="flex flex-wrap gap-1.5">{allYears.map((y) => <button key={y} className="chip" aria-pressed={years.includes(String(y))} onClick={() => toggle('rok', String(y))}>{y}</button>)}</div>
              <p className="eyebrow mb-2 mt-4">Status</p>
              <div className="flex flex-wrap gap-1.5">{STATUSES.map(([k, l]) => <button key={k} className="chip" aria-pressed={statuses.includes(k)} onClick={() => toggle('status', k)}>{l}</button>)}</div>
            </div>
            <div>
              <p className="eyebrow mb-2">Ćwiczy (wszystkie zaznaczone naraz)</p>
              <div className="flex flex-wrap gap-1.5">{allTags.map(([t, n]) => <button key={t} className="chip !text-xs" aria-pressed={tagGroups.includes(t)} onClick={() => toggle('tag', t)}>{t.replace(/\s*\(.*\)/, '')} <span className="mono opacity-60">{n}</span></button>)}</div>
            </div>
            <button className="btn btn-ghost md:col-span-2 md:justify-self-start" onClick={() => setSp(new URLSearchParams(), { replace: true })}>Wyczyść filtry</button>
          </div>
        )}
      </div>

      <p className="mb-3 text-sm text-muted">Widocznych: <b className="text-ink">{filtered.length}</b></p>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((s) => <SheetCard key={s.code} sheet={s} />)}
      </div>
      {filtered.length === 0 && <p className="card p-8 text-center text-muted">Żaden arkusz nie pasuje do filtrów.</p>}
    </div>
  );
}
