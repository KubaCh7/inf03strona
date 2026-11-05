import { useEffect, useState } from 'react';
import { Check, X, Upload, Play } from 'lucide-react';
import type { Sheet } from '../lib/types';
import { checkSheet, type CheckResult } from '../lib/checker';
import { useStore } from '../lib/store';

export function scoreOf(auto: CheckResult[], manual: CheckResult[]) {
  const all = [...auto, ...manual];
  const total = all.reduce((s, r) => s + (r.points ?? 1), 0);
  const got = all.filter((r) => r.ok).reduce((s, r) => s + (r.points ?? 1), 0);
  return { got, total, pct: total ? Math.round((got / total) * 100) : 0 };
}

export default function SheetChecker({ sheet, onScore, autoRun }: { sheet: Sheet; onScore?: (pct: number) => void; autoRun?: boolean }) {
  const ws = useStore((s) => s.workspaces[`sheet:${sheet.code}`]);
  const [files, setFiles] = useState<Record<string, string> | null>(ws ?? null);
  const [auto, setAuto] = useState<CheckResult[] | null>(null);
  const [manual, setManual] = useState<CheckResult[]>([]);

  useEffect(() => { setFiles(ws ?? null); setAuto(null); }, [sheet.code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoRun && ws) void go(ws); }, [autoRun]); // eslint-disable-line react-hooks/exhaustive-deps

  async function go(f = files) {
    if (!f) return;
    const r = await checkSheet(sheet, f);
    setAuto(r.results);
    setManual(r.manual);
  }
  async function upload(list: FileList | null) {
    if (!list) return;
    const out: Record<string, string> = {};
    for (const f of Array.from(list)) if (/\.(html?|css|js|php|txt|sql)$/i.test(f.name)) out[f.name.replace(/\.htm$/, '.html')] = await f.text();
    setFiles(out);
    setAuto(null);
  }
  const s = auto ? scoreOf(auto, manual) : null;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="eyebrow mb-2">Pliki do sprawdzenia</p>
        {files ? <p className="text-sm">Pliki: <span className="mono">{Object.keys(files).join(', ')}</span> {ws && files === ws && <span className="text-muted">(z warsztatu)</span>}</p> : <p className="text-sm text-muted">Brak plików w warsztacie dla tego arkusza. Wgraj swoje pliki albo rozwiąż zadanie w warsztacie.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="btn btn-ghost cursor-pointer"><Upload size={16} />Wgraj pliki<input type="file" multiple hidden accept=".html,.htm,.css,.js,.php,.txt,.sql" onChange={(e) => upload(e.target.files)} /></label>
          <button className="btn btn-primary" disabled={!files} onClick={() => go()}><Play size={16} />Sprawdź</button>
        </div>
      </div>

      {auto && s && (
        <div className="card pop p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Wynik treningowy</p>
              <p className={`display text-5xl font-extrabold tabular ${s.pct >= 75 ? 'text-success' : 'text-danger'}`}>{s.pct}%</p>
              <p className="text-sm text-muted">{s.got}/{s.total} pkt · próg 75% · {s.pct >= 75 ? 'zaliczone' : 'jeszcze nie'}</p>
            </div>
            {onScore && <button className="btn btn-dark" onClick={() => onScore(s.pct)}>Zapisz wynik</button>}
          </div>
          <p className="eyebrow mb-2 mt-5">Sprawdzone automatycznie</p>
          <ul className="divide-y divide-line">
            {auto.map((r) => (
              <li key={r.label} className="flex items-center gap-3 py-2 text-sm">
                {r.ok ? <Check size={18} className="text-success" /> : <X size={18} className="text-danger" />}
                <span className="flex-1">{r.label}</span><span className="mono text-xs text-muted">{r.points} pkt</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-2 mt-5">Samoocena (porównaj z arkuszem i zasadami oceniania)</p>
          <ul className="divide-y divide-line">
            {manual.map((r, i) => (
              <li key={r.label} className="py-2 text-sm">
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={r.ok} onChange={(e) => setManual((m) => m.map((x, k) => (k === i ? { ...x, ok: e.target.checked } : x)))} />
                  <span className="flex-1">{r.label}</span><span className="mono text-xs text-muted">{r.points} pkt</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">To wynik orientacyjny: sprawdzarka szuka elementów wymaganych przez tagi tego arkusza. Prawdziwą ocenę daje egzaminator według zasad oceniania CKE.</p>
        </div>
      )}
    </div>
  );
}
