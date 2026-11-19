import { useEffect, useMemo, useState } from 'react';
import { Check, X, Upload, Play, FolderUp, Download, CircleHelp, Loader2 } from 'lucide-react';
import type { Sheet } from '../lib/types';
import type { CheckResult } from '../lib/checker';
import { examine, scoreItems, zipFolder, type Item, type Group } from '../lib/examiner';
import { loadAssets, readAsDataUrl } from '../lib/assetsStore';
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
  const [files, setFiles] = useState<Record<string, string> | null>(ws ?? null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [folder, setFolder] = useState<string | null>(null);
  const [cand, setCand] = useState(getCand);
  const [items, setItems] = useState<Item[] | null>(null);
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => { setFiles(ws ?? null); setItems(null); setFolder(null); void loadAssets(key).then(setImages); }, [sheet.code, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoRun && ws) void loadAssets(key).then((im) => { setImages(im); void go(ws, im); }); }, [autoRun]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(CAND_KEY, cand); } catch { /* */ } }, [cand]);

  async function go(f = files, im = images) {
    if (!f) return;
    setBusy('Sprawdzam…');
    try {
      const r = await examine({ sheet, files: f, images: im, candidate: cand, folder, onStep: (s) => s && setBusy(`Sprawdzam: ${s}…`) });
      setItems(r.items);
      setManual(Object.fromEntries(r.items.filter((i) => i.ok === null && i.compare).map((i) => [i.label, (i.compare?.pct ?? 0) >= 50])));
    } finally { setBusy(''); }
  }
  async function upload(list: FileList | null, asFolder = false) {
    if (!list?.length) return;
    const txt: Record<string, string> = {}, img: Record<string, string> = {};
    let dir: string | null = null;
    for (const f of Array.from(list)) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const parts = rel.split('/');
      if (asFolder && parts.length > 1) { dir ??= parts[0]; if (parts.length > 2 && !/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(f.name)) continue; }
      try {
        if (/\.(html?|css|js|php|txt|sql|csv)$/i.test(f.name)) txt[f.name.replace(/\.htm$/i, '.html')] = await f.text();
        else if (/\.(png|jpe?g|gif|bmp|webp|svg|ico|mp4|webm|woff2?|ttf)$/i.test(f.name) && f.size < 8e6) img[f.name] = await readAsDataUrl(f);
      } catch { console.warn('Nie udało się odczytać pliku', rel); }
    }
    setFiles(Object.keys(txt).length ? txt : files);
    setImages(asFolder ? img : { ...images, ...img });
    setFolder(asFolder ? dir : null);
    setItems(null);
  }
  const s = items ? scoreItems(items, manual) : null;
  const grouped = useMemo(() => GROUPS.map((g) => [g, items?.filter((i) => i.group === g) ?? []] as const).filter(([, l]) => l.length), [items]);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="eyebrow mb-2">Folder do oddania</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Numer zdającego (PESEL)<br />
            <input className="input mono mt-1 w-56" value={cand} onChange={(e) => setCand(e.target.value.replace(/\s/g, ''))} placeholder="np. 08211512345" />
          </label>
          <button className="btn btn-ghost" disabled={!files || !cand} title={!cand ? 'Wpisz numer zdającego' : ''} onClick={() => files && zipFolder(cand, files, images, sheet.assets)}><Download size={16} />Pobierz folder {cand || 'numer'}.zip</button>
        </div>
        <p className="mt-3 text-sm">
          {files ? <>Pliki: <span className="mono">{Object.keys(files).join(', ')}</span>{ws && files === ws && <span className="text-muted"> (z warsztatu)</span>}</> : <span className="text-muted">Brak plików w warsztacie dla tego arkusza. Wgraj folder albo rozwiąż zadanie w warsztacie.</span>}
        </p>
        <p className="mt-1 text-sm">Grafiki i zrzuty: {Object.keys(images).length ? <span className="mono">{Object.keys(images).join(', ')}</span> : <span className="text-muted">brak (dodaj zrzuty kw1…, import i grafiki w warsztacie: „Grafiki / pliki”)</span>}
          {folder && <span className="text-muted"> · folder: <b className="mono">{folder}</b></span>}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="btn btn-ghost cursor-pointer"><FolderUp size={16} />Wgraj folder<input type="file" hidden {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} onChange={(e) => upload(e.target.files, true)} /></label>
          <label className="btn btn-ghost cursor-pointer"><Upload size={16} />Wgraj pliki<input type="file" multiple hidden onChange={(e) => upload(e.target.files)} /></label>
          <button className="btn btn-primary" disabled={!files || !!busy} onClick={() => go()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}{busy || 'Sprawdź jak egzaminator'}</button>
        </div>
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
              <p className="eyebrow mb-1">{g} <span className="text-muted">· {list.filter((i) => i.ok ?? manual[i.label]).reduce((a, i) => a + i.points, 0)}/{list.reduce((a, i) => a + i.points, 0)} pkt</span></p>
              <ul className="divide-y divide-line">
                {list.map((r) => {
                  const ok = r.ok ?? manual[r.label] ?? false;
                  const more = !!(r.user || r.expected || r.compare);
                  return (
                    <li key={r.label} className="py-2 text-sm">
                      <div className="flex items-start gap-3">
                        {r.ok === null
                          ? <input type="checkbox" title="Sprawdź sam i zaznacz" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={ok} onChange={(e) => setManual((m) => ({ ...m, [r.label]: e.target.checked }))} />
                          : ok ? <Check size={18} className="shrink-0 text-success" /> : <X size={18} className="shrink-0 text-danger" />}
                        <div className="min-w-0 flex-1">
                          <button className={`text-left ${more ? 'hover:underline' : 'cursor-default'}`} onClick={() => more && setOpen(open === r.label ? null : r.label)}>{r.label}{r.ok === null && <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted"><CircleHelp size={12} />sprawdź sam</span>}</button>
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
                        <span className="mono shrink-0 text-xs text-muted">{r.points} pkt</span>
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
