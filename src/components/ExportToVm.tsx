import { useEffect, useState } from 'react';
import { Monitor, X, FileCode2, Image, Database, Loader2 } from 'lucide-react';
import type { Sheet } from '../lib/types';
import { useStore } from '../lib/store';
import { loadAssets } from '../lib/assetsStore';
import { loadReqs } from '../lib/examiner';
import { exportToVm } from '../lib/exportToVm';

/** Okno przy przejsciu z warsztatu na pulpit: przeniesc prace czy nie. */
export default function ExportToVm({ sheet, storageKey, attempt, onDone, onCancel }: { sheet: Sheet; storageKey: string; attempt: string; onDone: () => void; onCancel: () => void }) {
  const files = useStore((s) => s.workspaces[storageKey]) ?? {};
  const names = Object.keys(files).filter((n) => files[n].trim());
  const [images, setImages] = useState<Record<string, string>>({});
  const [dbName, setDbName] = useState<string | null>(null);
  const [mode, setMode] = useState<'move' | 'skip'>(names.length ? 'move' : 'skip');
  const [opt, setOpt] = useState({ files: true, images: true, db: false, wipe: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { void loadAssets(storageKey).then(setImages).catch(() => {}); void loadReqs().then((r) => setDbName(r[sheet.code]?.dbName ?? null)); }, [storageKey, sheet.code]);
  const imgN = Object.keys(images).length;

  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (mode === 'move') {
        const sql = opt.db && dbName && sheet.assets?.sql ? await fetch(`${sheet.assets.dir}/${sheet.assets.sql}`).then((r) => (r.ok ? r.text() : null)).catch(() => null) : null;
        await exportToVm({ attempt, files: opt.files ? Object.fromEntries(names.map((n) => [n, files[n]])) : {}, images: opt.images ? images : {}, db: sql && dbName ? { name: dbName, sql } : null });
      } else if (opt.wipe) await exportToVm({ attempt, wipe: true });
      onDone();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  const box = (on: boolean) => `flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${on ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'}`;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <div className="card pop w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2"><Monitor size={20} className="text-accent" /><h2 className="flex-1 text-xl font-extrabold">Przejście na tryb realistyczny</h2><button onClick={onCancel} className="rounded p-1 hover:bg-surface-2" aria-label="Anuluj"><X size={18} /></button></div>
        <p className="mb-4 text-sm text-muted">Pulpit jak na egzaminie: Windows, XAMPP, phpMyAdmin. Co zrobić z tym, co masz w warsztacie?</p>
        <div className="space-y-2">
          <div role="radio" aria-checked={mode === 'move'} onClick={() => (names.length || imgN) && setMode('move')} className={box(mode === 'move')}>
            <input type="radio" checked={mode === 'move'} onChange={() => setMode('move')} className="mt-1 accent-[var(--accent)]" disabled={!names.length && !imgN} />
            <span className="min-w-0 flex-1">
              <b>Przenieś pracę z warsztatu</b>
              <span className="block text-sm text-muted">{names.length || imgN ? 'Pliki trafią do C:\\xampp\\htdocs, gdzie pracuje się na egzaminie.' : 'W warsztacie nie ma jeszcze plików.'}</span>
              {mode === 'move' && <span className="mt-2 block space-y-1.5 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={opt.files} onChange={(e) => setOpt({ ...opt, files: e.target.checked })} /><FileCode2 size={14} />Pliki ({names.length}){names.length ? <span className="truncate text-xs text-muted">{names.slice(0, 4).join(', ')}{names.length > 4 ? '…' : ''}</span> : null}</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={opt.images} disabled={!imgN} onChange={(e) => setOpt({ ...opt, images: e.target.checked })} /><Image size={14} />Grafiki ({imgN})</label>
                {dbName && sheet.assets?.sql && <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={opt.db} onChange={(e) => setOpt({ ...opt, db: e.target.checked })} /><Database size={14} className="mt-0.5" /><span>Gotowa baza „{dbName}” z danymi w MySQL<span className="block text-xs text-muted">Na egzaminie tworzysz ją sam w phpMyAdmin. Zaznacz, jeśli chcesz to pominąć.</span></span></label>}
                <span className="block text-xs text-muted">Pliki o tych samych nazwach w htdocs zostaną zastąpione.</span>
              </span>}
            </span>
          </div>
          <div role="radio" aria-checked={mode === 'skip'} onClick={() => setMode('skip')} className={box(mode === 'skip')}>
            <input type="radio" checked={mode === 'skip'} onChange={() => setMode('skip')} className="mt-1 accent-[var(--accent)]" />
            <span className="min-w-0 flex-1">
              <b>Nie przenoś</b>
              <span className="block text-sm text-muted">Na pulpicie zaczynasz tak, jak na egzaminie. Warsztat zostaje bez zmian.</span>
              {mode === 'skip' && <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={opt.wipe} onChange={(e) => setOpt({ ...opt, wipe: e.target.checked })} />Wyczyść też wcześniejszą pracę na pulpicie (od zera)</label>}
            </span>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>Anuluj</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => void go()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Monitor size={16} />}Przejdź na pulpit</button>
        </div>
      </div>
    </div>
  );
}
