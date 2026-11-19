import { useEffect, useMemo, useState } from 'react';
import { Check, X, Play, Download, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import type { Sheet } from '../lib/types';
import type { CheckResult } from '../lib/checker';
import { examine, scoreItems, zipFolder, type Item, type Group } from '../lib/examiner';
import { loadAssets } from '../lib/assetsStore';
import { useStore } from '../lib/store';
import type { QueryResult } from '../lib/sql';

/** Zostawione dla zgodnosci (stare wyniki). */
export function scoreOf(auto: CheckResult[], manual: CheckResult[]) {
  const all = [...auto, ...manual];
  const total = all.reduce((s, r) => s + (r.points ?? 1), 0);
  const got = all.filter((r) => r.ok).reduce((s, r) => s + (r.points ?? 1), 0);
  return { got, total, pct: total ? Math.round((got / total) * 100) : 0 };
}

const GROUPS: Group[] = ['Pliki i folder', 'Kwerendy', 'Zrzuty ekranu', 'Grafika', 'Strona', 'Wygląd'];
const CAND_KEY = 'p03:candidate';
const getCand = () => { try { return localStorage.getItem(CAND_KEY) ?? ''; } catch { return ''; } };

function Mini({ r, title }: { r?: QueryResult; title: string }) {
  if (!r) return null;
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[11px] font-bold text-muted">{title} ({r.values.length} wierszy)</p>
      <div className="max-h-40 overflow-auto rounded-md border border-line">
        <table className="mono w-full text-[11px]"><thead><tr>{r.columns.map((c) => <th key={c} className="bg-surface-2 px-1.5 py-1 text-left">{c}</th>)}</tr></thead>
          <tbody>{r.values.slice(0, 30).map((row, i) => <tr key={i} className="border-t border-line">{row.map((v, k) => <td key={k} className="px-1.5 py-0.5">{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody></table>
      </div>
    </div>
  );
}

export default function SheetChecker({ sheet, onScore, autoRun, storageKey }: { sheet: Sheet; onScore?: (pct: number) => void; autoRun?: boolean; storageKey?: string }) {
  const key = storageKey ?? `sheet:${sheet.code}`;
  const ws = useStore((s) => s.workspaces[key]);
  const files = ws ?? null;
  const [images, setImages] = useState<Record<string, string>>({});
  const [cand, setCand] = useState(getCand);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const number = cand.trim() || '00000000000';

  useEffect(() => { setItems(null); void loadAssets(key).then(setImages); }, [sheet.code, key]);
  useEffect(() => { if (autoRun && ws) void go(); }, [autoRun]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(CAND_KEY, cand); } catch { /* */ } }, [cand]);

  /** Wszystko z warsztatu: pliki ze store, grafiki/zrzuty z IndexedDB, brakujace zrzuty robia sie same. */
  async function go() {
    if (!files) return;
    setBusy('Sprawdzam…');
    try {
      const im = await loadAssets(key);
      const r = await examine({ sheet, files, images: im, candidate: number, storageKey: key, onStep: (s) => s && setBusy(`Sprawdzam: ${s}…`) });
      setImages(r.images);
      setItems(r.items);
    } finally { setBusy(''); }
  }
  const s = items ? scoreItems(items) : null;
  const grouped = useMemo(() => GROUPS.map((g) => [g, items?.filter((i) => i.group === g) ?? []] as const).filter(([, l]) => l.length), [items]);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <button className="btn btn-primary text-base" disabled={!files || !!busy} onClick={() => go()}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}{busy || 'Sprawdź'}</button>
          <label className="text-sm">Numer zdającego (nazwa folderu, stopka)<br />
            <input className="input mono mt-1 w-56" value={cand} onChange={(e) => setCand(e.target.value.replace(/\s/g, ''))} placeholder="00000000000" />
          </label>
          <button className="btn btn-ghost" disabled={!files} onClick={() => files && zipFolder(number, files, images, sheet.assets)}><Download size={16} />Pobierz folder {number}.zip</button>
        </div>
        <p className="mt-3 text-sm text-muted">{files
          ? <>Sprawdzam wszystko z warsztatu tego arkusza: pliki ({Object.keys(files).length}), grafiki z edytora i zrzuty ekranu (robią się same z kwerend). Nic nie trzeba wgrywać.</>
          : <>Ten arkusz nie ma jeszcze plików w warsztacie. <Link className="text-accent underline" to={`/warsztat/${encodeURIComponent(sheet.code)}`}>Otwórz warsztat</Link> i rozwiąż zadanie, potem kliknij „Sprawdź”.</>}</p>
      </div>

      {items && s && (
        <div className="card pop p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Wynik</p>
              <p className={`display text-5xl font-extrabold tabular ${s.pct >= 75 ? 'text-success' : 'text-danger'}`}>{s.pct}%</p>
              <p className="text-sm text-muted">{s.got}/{s.total} pkt · próg 75% · {s.pct >= 75 ? 'zaliczone' : 'jeszcze nie'}</p>
            </div>
            {onScore && <button className="btn btn-dark" onClick={() => onScore(s.pct)}>Zapisz wynik</button>}
          </div>

          {grouped.map(([g, list]) => (
            <div key={g} className="mt-5">
              <p className="eyebrow mb-1">{g} <span className="text-muted">· {list.reduce((a, i) => a + (i.got ?? (i.ok ? i.points : 0)), 0)}/{list.reduce((a, i) => a + i.points, 0)} pkt</span></p>
              <ul className="divide-y divide-line">
                {list.map((r) => {
                  const ok = r.ok;
                  const part = r.got !== undefined && r.got > 0 && r.got < r.points;
                  const more = !!(r.user || r.expected || r.compare);
                  return (
                    <li key={r.label} className="py-2 text-sm">
                      <div className="flex items-start gap-3">
                        {ok ? <Check size={18} className="shrink-0 text-success" /> : part ? <Check size={18} className="shrink-0 text-[#A16207]" /> : <X size={18} className="shrink-0 text-danger" />}
                        <div className="min-w-0 flex-1">
                          <button className={`text-left ${more ? 'hover:underline' : 'cursor-default'}`} onClick={() => more && setOpen(open === r.label ? null : r.label)}>{r.label}</button>
                          {r.note && <p className={`text-xs ${r.ok === false ? 'text-danger' : 'text-muted'}`}>{r.note}</p>}
                          {open === r.label && (r.user || r.expected) && <div className="mt-2 flex flex-wrap gap-3"><Mini r={r.user} title="Twój wynik" /><Mini r={r.expected} title="Oczekiwany" /></div>}
                          {r.compare && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <figure><img src={r.compare.mine} alt="Twoja strona" className="w-full cursor-zoom-in rounded-md border border-line" onClick={() => setZoom(r.compare!.mine)} /><figcaption className="text-[11px] text-muted">Twoja strona (podgląd 1280 px)</figcaption></figure>
                              <figure><img src={r.compare.sheet} alt="Ilustracja z arkusza" className="w-full cursor-zoom-in rounded-md border border-line" onClick={() => setZoom(r.compare!.sheet)} /><figcaption className="text-[11px] text-muted">Arkusz: {r.compare.caption}</figcaption></figure>
                            </div>
                          )}
                        </div>
                        {r.thumb && <img src={r.thumb} alt="" className="h-12 w-20 shrink-0 cursor-zoom-in rounded border border-line object-cover" onClick={() => setZoom(r.thumb!)} />}
                        {!r.thumb && r.expected && !r.user && <button className="shrink-0 text-xs text-accent hover:underline" onClick={() => setOpen(open === r.label ? null : r.label)}>wynik</button>}
                        <span className="mono shrink-0 text-xs text-muted">{r.got !== undefined ? `${r.got}/` : ''}{r.points} pkt</span>
                      </div>
                      {open === r.label && r.thumb && r.expected && <div className="mt-2 pl-7"><Mini r={r.expected} title="Na zrzucie powinno być" /></div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="mt-4 text-xs text-muted">Sprawdzane jak u egzaminatora: lista plików z arkusza, kwerendy na świeżej bazie porównane z rozwiązaniem, zrzuty (nazwa, format, cały ekran), grafika (wymiary, przezroczystość, klatki GIF), wykonany PHP, treści i kolory z arkusza. Punkty są orientacyjne, prawdziwe kryteria CKE są w zasadach oceniania.</p>
        </div>
      )}
      {zoom && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setZoom(null)}><img src={zoom} alt="" className="max-h-full max-w-full rounded-lg bg-white" /></div>}
    </div>
  );
}
