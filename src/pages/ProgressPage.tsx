import { useMemo, useState } from 'react';
import { Cloud, CloudDownload, Download, Upload, Trash2, Copy } from 'lucide-react';
import { CATEGORY_LABEL, useContent } from '../lib/data';
import { exportProgress, levelInfo, liveStreak, useStore } from '../lib/store';
import { applyImport, pullProgress, pushProgress } from '../lib/sync';
import { Loading, PageHeader, Progress, Stat } from '../components/ui';

export default function ProgressPage() {
  const c = useContent();
  const s = useStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const byCat = useMemo(() => {
    const m: Record<string, [number, number]> = {};
    if (!c) return m;
    for (const q of c.questions) {
      const st = s.qstats[q.id];
      if (!st) continue;
      m[q.category] = [(m[q.category]?.[0] ?? 0) + st.ok, (m[q.category]?.[1] ?? 0) + st.seen];
    }
    return m;
  }, [c, s.qstats]);
  if (!c) return <Loading />;
  const lv = levelInfo(s.xp);
  const theory = s.tests.filter((t) => t.kind === 'theory40').slice(0, 20).reverse();
  const doneSheets = Object.entries(s.sheets).filter(([, v]) => v.status === 'done');
  const totalMin = Object.values(s.activity).reduce((a, d) => a + d.minutes, 0);

  const doPush = async () => { setMsg('Wysyłam…'); try { await pushProgress(); setMsg('Zapisano w chmurze.'); } catch (e) { setMsg('Błąd zapisu: ' + (e as Error).message); } };
  const doPull = async () => {
    const k = code.trim();
    if (!/^[0-9a-f-]{36}$/i.test(k)) { setMsg('To nie wygląda na kod synchronizacji.'); return; }
    if (!confirm('Wczytanie zastąpi postęp na tym urządzeniu. Kontynuować?')) return;
    setMsg('Pobieram…');
    try { setMsg((await pullProgress(k)) ? 'Wczytano postęp.' : 'Nie ma postępu pod tym kodem.'); } catch (e) { setMsg('Błąd: ' + (e as Error).message); }
  };
  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pracownia03-postep-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const doImport = async (f?: File) => { if (!f) return; try { applyImport(JSON.parse(await f.text())); setMsg('Zaimportowano.'); } catch (e) { setMsg('Błąd importu: ' + (e as Error).message); } };

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Twoje statystyki" title="Postęp" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Poziom" value={lv.level} sub={lv.name} />
        <Stat label="XP" value={s.xp} sub={`${lv.into}/${lv.need} do kolejnego`} />
        <Stat label="Seria" value={liveStreak(s.streak)} sub={`najdłuższa: ${s.streak.best}`} />
        <Stat label="Czas nauki" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} sub="łącznie" />
      </div>

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-bold">Testy teorii</h2>
        {theory.length === 0 ? <p className="mt-2 text-sm text-muted">Jeszcze żadnego testu. Zrób pierwszy w zakładce Teoria.</p> : (
          <div className="mt-4 flex h-40 items-end gap-1.5 border-b border-l border-line pl-1">
            {theory.map((t) => { const p = t.score / t.total; return (
              <div key={t.id} className="group relative flex-1" style={{ height: `${Math.max(4, p * 100)}%` }} title={`${new Date(t.at).toLocaleDateString('pl-PL')}: ${t.score}/${t.total}`}>
                <div className={`h-full rounded-t ${p >= 0.5 ? 'bg-success' : 'bg-danger'}`} />
              </div>
            ); })}
          </div>
        )}
        {theory.length > 0 && <p className="mt-1 text-xs text-muted">Linia progu: 50%. Zielone = zdane.</p>}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-bold">Skuteczność w działach</h2>
        <ul className="mt-3 space-y-2.5">
          {Object.entries(CATEGORY_LABEL).map(([k, l]) => {
            const [ok, n] = byCat[k] ?? [0, 0];
            return (
              <li key={k} className="grid grid-cols-[120px_1fr_70px] items-center gap-3 text-sm">
                <span>{l}</span><Progress value={n ? ok / n : 0} /><span className="mono text-right text-xs tabular text-muted">{n ? `${Math.round((ok / n) * 100)}%` : '—'} ({n})</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-bold">Arkusze: {doneSheets.length}/{c.sheets.length} ukończonych</h2>
        <Progress value={doneSheets.length / c.sheets.length} className="mt-2" />
        {doneSheets.length > 0 && <p className="mono mt-3 text-xs text-muted">{doneSheets.map(([k, v]) => `${k}${v.score !== undefined ? ` (${v.score}%)` : ''}`).join(' · ')}</p>}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Cloud size={18} />Synchronizacja (Supabase, bez konta)</h2>
        <p className="mt-1 text-sm text-muted">Postęp siedzi w tej przeglądarce. Żeby przenieść go na telefon albo inny komputer, zapisz go w chmurze i na drugim urządzeniu wpisz ten sam kod. Kod działa jak hasło, nie pokazuj go innym.</p>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 p-2">
          <code className="mono flex-1 truncate text-xs md:text-sm">{s.syncCode}</code>
          <button className="rounded p-1 hover:bg-surface" onClick={() => navigator.clipboard?.writeText(s.syncCode)} aria-label="Kopiuj kod"><Copy size={16} /></button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={doPush}><Cloud size={16} />Zapisz w chmurze</button>
          <input className="input w-auto flex-1" placeholder="Kod z innego urządzenia" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn btn-ghost" onClick={doPull}><CloudDownload size={16} />Wczytaj</button>
        </div>
        {s.lastSync && <p className="mt-2 text-xs text-muted">Ostatnia synchronizacja: {new Date(s.lastSync).toLocaleString('pl-PL')}</p>}
        {msg && <p className="mt-2 text-sm font-bold">{msg}</p>}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-bold">Plik z postępem</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={doExport}><Download size={16} />Eksportuj JSON</button>
          <label className="btn btn-ghost cursor-pointer"><Upload size={16} />Importuj JSON<input type="file" accept=".json" hidden onChange={(e) => doImport(e.target.files?.[0])} /></label>
          <button className="btn btn-ghost text-danger" onClick={() => { if (confirm('Na pewno usunąć cały postęp z tej przeglądarki?')) { localStorage.removeItem('pracownia03'); location.reload(); } }}><Trash2 size={16} />Wyczyść dane</button>
        </div>
      </section>
    </div>
  );
}
