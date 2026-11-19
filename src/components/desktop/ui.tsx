import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ArrowLeft, ArrowRight, ArrowUp, Monitor, Download, FileText, Images, HardDrive, FolderPlus, Search, X, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useOS, FileIcon, typeName, type PickOpts } from './os';
import { useVfs, base, parent, join, win as winPath, fmtDate, fmtSize, DESKTOP, DOCS, DOWNLOADS, ext } from '../../lib/vfs';

// ---------- menu kontekstowe Windows 11 ----------
export type CItem = { label: string; icon?: React.ReactNode; run?: () => void; sub?: CItem[]; off?: boolean; key?: string } | '-';
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CItem[]; onClose: () => void }) {
  useEffect(() => { const c = () => onClose(); setTimeout(() => window.addEventListener('pointerdown', c), 0); return () => window.removeEventListener('pointerdown', c); }, [onClose]);
  const left = Math.min(x, window.innerWidth - 270), top = Math.min(y, window.innerHeight - 40 - items.length * 30);
  return <div style={{ left, top }} className="fixed z-[200]" onPointerDown={(e) => e.stopPropagation()}><MenuList items={items} onClose={onClose} /></div>;
}
function MenuList({ items, onClose }: { items: CItem[]; onClose: () => void }) {
  return (
    <div className="min-w-[250px] rounded-[8px] border border-black/10 bg-[#f9f9f9]/95 p-1 text-[12.5px] text-[#1a1a1a] shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur">
      {items.map((it, i) => it === '-' ? <div key={i} className="mx-1 my-1 h-px bg-black/10" /> : (
        <div key={i} className="group relative">
          <button disabled={it.off} onClick={() => { if (!it.sub && it.run) { onClose(); it.run(); } }} className="flex h-[30px] w-full items-center gap-3 rounded-[4px] px-2 text-left hover:bg-black/[.05] disabled:opacity-40">
            <span className="grid w-4 place-items-center">{it.icon}</span><span className="flex-1">{it.label}</span>
            {it.key && <span className="text-[11px] text-[#666]">{it.key}</span>}{it.sub && <ChevronRight size={13} />}
          </button>
          {it.sub && !it.off && <div className="absolute left-full top-0 hidden group-hover:block"><MenuList items={it.sub} onClose={onClose} /></div>}
        </div>
      ))}
    </div>
  );
}

// ---------- okno komunikatu ----------
export function MsgBox({ title, text, kind = 'info', confirm, onDone }: { title: string; text: string; kind?: 'error' | 'info' | 'warn'; confirm?: boolean; onDone: (ok: boolean) => void }) {
  const I = kind === 'error' ? XCircle : kind === 'warn' ? AlertTriangle : Info;
  const ok = useRef<HTMLButtonElement>(null);
  // fokus z opoznieniem: Enter, ktory otworzyl okno, nie moze go od razu zamknac
  useEffect(() => { const t = setTimeout(() => ok.current?.focus(), 250); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/10" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-[420px] overflow-hidden rounded-[8px] border border-black/15 bg-white text-[13px] text-[#1a1a1a] shadow-[0_12px_40px_rgba(0,0,0,.3)]">
        <div className="flex h-8 items-center bg-[#f3f3f3] pl-3 text-[12px]"><span className="flex-1">{title}</span><button onClick={() => onDone(false)} className="grid h-full w-[46px] place-items-center hover:bg-[#c42b1c] hover:text-white"><X size={14} /></button></div>
        <div className="flex gap-3 p-5"><I size={30} className={kind === 'error' ? 'text-[#c42b1c]' : kind === 'warn' ? 'text-[#d39d00]' : 'text-[#0067c0]'} /><p className="whitespace-pre-wrap pt-1">{text}</p></div>
        <div className="flex justify-end gap-2 bg-[#f3f3f3] px-4 py-3">
          <button ref={ok} onClick={() => onDone(true)} className="h-8 min-w-[90px] rounded-[4px] bg-[#0067c0] px-4 text-white hover:bg-[#1975c5]">{confirm ? 'Tak' : 'OK'}</button>
          {confirm && <button onClick={() => onDone(false)} className="h-8 min-w-[90px] rounded-[4px] border border-black/15 bg-white px-4 hover:bg-[#f5f5f5]">Nie</button>}
        </div>
      </div>
    </div>
  );
}

// ---------- okno Otworz / Zapisz jako (Windows 11) ----------
export const NAV: [string, string, React.ReactNode][] = [
  ['Pulpit', DESKTOP, <Monitor key="d" size={15} className="text-[#3a96dd]" />], ['Pobrane', DOWNLOADS, <Download key="p" size={15} className="text-[#3a96dd]" />],
  ['Dokumenty', DOCS, <FileText key="o" size={15} className="text-[#6a6a6a]" />], ['Obrazy', 'C:/Users/Egzamin/Pictures', <Images key="i" size={15} className="text-[#3a96dd]" />],
  ['Dysk lokalny (C:)', 'C:', <HardDrive key="c" size={15} className="text-[#6a6a6a]" />],
];
export function Breadcrumb({ path, go }: { path: string; go: (p: string) => void }) {
  const parts = path.split('/'); const label = (p: string, i: number) => (i === 0 ? 'Dysk lokalny (C:)' : p);
  return <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden rounded-[4px] border border-black/10 bg-white px-2 py-1 text-[12.5px]">
    {parts.map((p, i) => <span key={i} className="flex items-center gap-0.5 whitespace-nowrap"><ChevronRight size={12} className="text-[#888]" /><button className="rounded px-1 hover:bg-black/[.05]" onClick={() => go(parts.slice(0, i + 1).join('/'))}>{label(p, i)}</button></span>)}
  </div>;
}
export function FileDialog({ o, onDone }: { o: PickOpts; onDone: (p: string | null) => void }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const [dir, setDir] = useState(o.dir && vfs.isDir(o.dir) ? o.dir : DESKTOP);
  const [hist, setHist] = useState<string[]>([]);
  const [name, setName] = useState(o.name ?? '');
  const [filter, setFilter] = useState(0);
  const [q, setQ] = useState('');
  const flt = o.filters?.[filter];
  const go = (p: string) => { setHist((h) => [...h, dir]); setDir(p); };
  const items = vfs.list(dir).filter((p) => base(p).toLowerCase().includes(q.toLowerCase())).filter((p) => vfs.isDir(p) || o.dirOnly ? vfs.isDir(p) : !flt || flt.exts.includes('*') || flt.exts.includes(ext(p)));
  const finish = () => {
    if (o.dirOnly) return onDone(dir);
    let n = name.trim(); if (!n) return;
    if (o.mode === 'save' && flt && !flt.exts.includes('*') && !flt.exts.includes(ext(n))) n += '.' + flt.exts[0];
    const p = /^[a-z]:/i.test(n) ? n : join(dir, n);
    if (o.mode === 'open') { if (vfs.exists(p) && !vfs.isDir(p)) onDone(p); else if (vfs.isDir(p)) { go(p); setName(''); } else void os.alert(o.title ?? 'Otwieranie', `${base(p)}\nNie można odnaleźć pliku.\nSprawdź nazwę pliku i spróbuj ponownie.`, 'warn'); return; }
    if (vfs.exists(p) && !vfs.isDir(p)) { void os.confirm('Potwierdzanie zapisywania jako', `${base(p)} już istnieje.\nCzy chcesz go zamienić?`).then((ok) => ok && onDone(p)); return; }
    onDone(p);
  };
  return (
    <div className="fixed inset-0 z-[250] grid place-items-center bg-black/5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex h-[520px] w-[820px] max-w-[96vw] flex-col overflow-hidden rounded-[8px] border border-black/15 bg-[#f3f3f3] text-[12.5px] text-[#1a1a1a] shadow-[0_16px_48px_rgba(0,0,0,.35)]">
        <div className="flex h-8 items-center pl-3 text-[12px]"><span className="flex-1">{o.title ?? (o.mode === 'save' ? 'Zapisywanie jako' : 'Otwieranie')}</span><button onClick={() => onDone(null)} className="grid h-full w-[46px] place-items-center hover:bg-[#c42b1c] hover:text-white"><X size={14} /></button></div>
        <div className="flex items-center gap-1 px-2 pb-2">
          <button disabled={!hist.length} onClick={() => { setDir(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }} className="rounded p-1.5 hover:bg-black/[.05] disabled:opacity-30"><ArrowLeft size={15} /></button>
          <button disabled className="rounded p-1.5 opacity-30"><ArrowRight size={15} /></button>
          <button disabled={dir === 'C:'} onClick={() => go(parent(dir))} className="rounded p-1.5 hover:bg-black/[.05] disabled:opacity-30"><ArrowUp size={15} /></button>
          <Breadcrumb path={dir} go={go} />
          <label className="flex w-48 items-center gap-1 rounded-[4px] border border-black/10 bg-white px-2 py-1"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Wyszukaj: ${base(dir) || 'C:'}`} className="w-full bg-transparent outline-none" /><Search size={13} className="text-[#777]" /></label>
        </div>
        <div className="flex items-center gap-3 border-y border-black/10 bg-[#f9f9f9] px-3 py-1.5">
          <button onClick={() => { const p = vfs.unique(dir, 'Nowy folder'); vfs.mkdir(p); }} className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-black/[.05]"><FolderPlus size={15} className="text-[#d9a521]" />Nowy folder</button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-[180px] space-y-0.5 overflow-auto border-r border-black/10 bg-[#f9f9f9] p-1.5">{NAV.map(([l, p, i]) => <button key={p} onClick={() => go(p)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${dir === p ? 'bg-black/[.06]' : 'hover:bg-black/[.04]'}`}>{i}{l}</button>)}</div>
          <div className="min-w-0 flex-1 overflow-auto bg-white">
            <div className="sticky top-0 grid grid-cols-[1fr_140px_130px_70px] border-b border-black/10 bg-white px-3 py-1 text-[#555]"><span>Nazwa</span><span>Data modyfikacji</span><span>Typ</span><span className="text-right">Rozmiar</span></div>
            {items.map((p) => { const n = vfs.get(p)!; return (
              <button key={p} onClick={() => !n.dir && setName(base(p))} onDoubleClick={() => (n.dir ? go(p) : o.mode === 'open' ? onDone(p) : (setName(base(p)), finish()))}
                className={`grid w-full grid-cols-[1fr_140px_130px_70px] items-center px-3 py-[3px] text-left hover:bg-[#e5f3ff] ${name === base(p) ? 'bg-[#cce8ff]' : ''}`}>
                <span className="flex items-center gap-2 truncate"><FileIcon path={p} dir={n.dir} size={16} />{base(p)}</span><span className="text-[#666]">{fmtDate(n.mtime)}</span><span className="truncate text-[#666]">{typeName(p, n.dir)}</span><span className="text-right text-[#666]">{n.dir ? '' : fmtSize(vfs.size(p))}</span>
              </button>); })}
            {!items.length && <p className="p-6 text-center text-[#777]">Ten folder jest pusty.</p>}
          </div>
        </div>
        <div className="space-y-2 border-t border-black/10 px-4 py-3">
          {!o.dirOnly && <div className="flex items-center gap-2"><span className="w-[110px] text-right">Nazwa pliku:</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finish()} className="h-7 flex-1 rounded-[4px] border border-black/15 border-b-[#0067c0] bg-white px-2 outline-none" />
            {o.mode === 'open' && o.filters && <select value={filter} onChange={(e) => setFilter(+e.target.value)} className="h-7 w-[220px] rounded-[4px] border border-black/15 bg-white px-1">{o.filters.map((f, i) => <option key={i} value={i}>{f.label}</option>)}</select>}</div>}
          {o.mode === 'save' && o.filters && <div className="flex items-center gap-2"><span className="w-[110px] text-right">Zapisz jako typ:</span><select value={filter} onChange={(e) => { setFilter(+e.target.value); const nx = o.filters![+e.target.value].exts[0]; if (nx !== '*') setName((n) => n.replace(/\.[^.]*$/, '') + '.' + nx); }} className="h-7 flex-1 rounded-[4px] border border-black/15 bg-white px-1">{o.filters.map((f, i) => <option key={i} value={i}>{f.label}</option>)}</select></div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={finish} className="h-8 min-w-[100px] rounded-[4px] bg-[#0067c0] px-4 text-white hover:bg-[#1975c5]">{o.dirOnly ? 'Wybierz folder' : o.mode === 'save' ? 'Zapisz' : 'Otwórz'}</button>
            <button onClick={() => onDone(null)} className="h-8 min-w-[100px] rounded-[4px] border border-black/15 bg-white px-4 hover:bg-[#f5f5f5]">Anuluj</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export const pathLabel = (p: string) => winPath(p);
