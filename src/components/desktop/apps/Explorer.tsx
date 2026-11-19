import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, RotateCw, Search, Plus, Scissors, Copy, ClipboardPaste, PenLine, Trash2, ArrowUpDown, LayoutList, FolderPlus, FileText, ChevronDown, Monitor, HardDrive } from 'lucide-react';
import { useOS, FileIcon, typeName, APPS, OPEN_WITH, type Win, type AppId } from '../os';
import { ContextMenu, Breadcrumb, NAV, type CItem } from '../ui';
import { useVfs, base, parent, join, fmtDate, fmtSize, DESKTOP, isImage, isText, RECYCLE } from '../../../lib/vfs';

/** Eksplorator plikow Windows 11. args.path = folder startowy. */
export default function Explorer({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const [dir, setDir] = useState(String(win.args.path ?? DESKTOP));
  const [back, setBack] = useState<string[]>([]); const [fwd, setFwd] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [ren, setRen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; items: CItem[] } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [drop, setDrop] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { os.setTitle(win.id, dir === 'C:' ? 'Dysk lokalny (C:)' : base(dir)); }, [dir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!vfs.isDir(dir)) setDir(DESKTOP); }, [vfs.ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (p: string) => { if (p === dir) return; setBack((b) => [...b, dir]); setFwd([]); setDir(p); setSel([]); setQ(''); };
  const items = vfs.list(dir).filter((p) => base(p).toLowerCase().includes(q.toLowerCase()));
  const open = (p: string) => (vfs.isDir(p) ? go(p) : os.openPath(p));
  const copy = (mode: 'copy' | 'cut', paths = sel) => paths.length && os.setClip({ ...os.clip, files: { mode, paths } });
  const paste = () => {
    const c = os.clip.files; if (!c) return;
    try { for (const p of c.paths) if (vfs.exists(p)) vfs.copy(p, dir, c.mode === 'cut'); if (c.mode === 'cut') os.setClip({ ...os.clip, files: undefined }); }
    catch (e) { void os.alert('Kopiowanie', (e as Error).message, 'error'); }
  };
  const del = async (paths = sel) => {
    if (!paths.length) return;
    if (dir === RECYCLE) { if (await os.confirm('Usuwanie', `Czy na pewno chcesz trwale usunąć ${paths.length === 1 ? `„${base(paths[0])}”` : `te elementy (${paths.length})`}?`)) paths.forEach((p) => vfs.remove(p)); }
    else paths.forEach((p) => vfs.trash(p));
    setSel([]);
  };
  const newItem = (kind: 'dir' | 'txt') => { const p = kind === 'dir' ? vfs.mkdir(vfs.unique(dir, 'Nowy folder')) : vfs.write(vfs.unique(dir, 'Nowy Dokument tekstowy.txt'), ''); setSel([p]); setRen(p); setNewOpen(false); };
  const doRename = (p: string, name: string) => {
    setRen(null); const n = name.trim(); if (!n || n === base(p)) return;
    if (/[\\/:*?"<>|]/.test(n)) { void os.alert('Zmiana nazwy', 'Nazwa pliku nie może zawierać żadnego z następujących znaków:\n\\ / : * ? " < > |', 'error'); return; }
    try { const np = vfs.rename(p, n); setSel([np]); } catch (e) { void os.alert('Zmiana nazwy', (e as Error).message, 'error'); }
  };
  const ctxItem = (e: React.MouseEvent, p: string) => {
    e.preventDefault(); e.stopPropagation(); if (!sel.includes(p)) setSel([p]);
    const ps = sel.includes(p) ? sel : [p]; const isDir = vfs.isDir(p);
    const withApps: AppId[] = isDir ? [] : isImage(p) ? OPEN_WITH.image : isText(p) ? OPEN_WITH.text : ['notepad'];
    const items: CItem[] = [
      { label: 'Otwórz', run: () => open(p), key: 'Enter' },
      ...(withApps.length ? [{ label: 'Otwórz za pomocą', sub: withApps.map((a) => ({ label: APPS[a].name, icon: APPS[a].icon(15), run: () => os.open(a, { path: p }) })) }] : []),
      ...(/\.(7z|zip)$/i.test(p) ? [{ label: '7-Zip', sub: [{ label: 'Otwórz archiwum', run: () => os.open('sevenzip', { path: p }) }, { label: 'Wypakuj pliki…', run: () => os.open('sevenzip', { path: p, extract: 'ask' }) }, { label: 'Wypakuj tutaj', run: () => os.open('sevenzip', { path: p, extract: 'here' }) }, { label: `Wypakuj do "${base(p).replace(/\.\w+$/, '')}\\"`, run: () => os.open('sevenzip', { path: p, extract: 'folder' }) }] }] : []),
      '-',
      { label: 'Wytnij', icon: <Scissors size={14} />, run: () => copy('cut', ps), key: 'Ctrl+X' }, { label: 'Kopiuj', icon: <Copy size={14} />, run: () => copy('copy', ps), key: 'Ctrl+C' },
      ...(isDir && os.clip.files ? [{ label: 'Wklej', icon: <ClipboardPaste size={14} />, run: () => { const c = os.clip.files!; c.paths.forEach((x) => vfs.copy(x, p, c.mode === 'cut')); } }] : []),
      { label: 'Zmień nazwę', icon: <PenLine size={14} />, run: () => setRen(p), key: 'F2' }, { label: 'Usuń', icon: <Trash2 size={14} />, run: () => void del(ps), key: 'Delete' },
      ...(dir === RECYCLE ? [{ label: 'Przywróć', run: () => ps.forEach((x) => vfs.copy(x, DESKTOP, true)) }] : []),
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  };
  const ctxBg = (e: React.MouseEvent) => {
    e.preventDefault(); setSel([]);
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'Widok', icon: <LayoutList size={14} />, sub: [{ label: 'Szczegóły', run: () => {} }] }, { label: 'Sortuj według', icon: <ArrowUpDown size={14} />, sub: [{ label: 'Nazwa', run: () => {} }] }, '-',
      { label: 'Wklej', icon: <ClipboardPaste size={14} />, run: paste, off: !os.clip.files, key: 'Ctrl+V' }, { label: 'Odśwież', icon: <RotateCw size={14} />, run: () => {} }, '-',
      { label: 'Nowy', icon: <Plus size={14} />, sub: [{ label: 'Folder', icon: <FolderPlus size={14} className="text-[#d9a521]" />, run: () => newItem('dir') }, '-', { label: 'Dokument tekstowy', icon: <FileText size={14} />, run: () => newItem('txt') }] },
    ] });
  };
  const keys = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const c = e.ctrlKey || e.metaKey;
    if (c && e.key.toLowerCase() === 'c') copy('copy'); else if (c && e.key.toLowerCase() === 'x') copy('cut'); else if (c && e.key.toLowerCase() === 'v') paste();
    else if (c && e.key.toLowerCase() === 'a') setSel(items);
    else if (e.key === 'Delete') void del(); else if (e.key === 'F2' && sel[0]) setRen(sel[0]); else if (e.key === 'Enter' && sel[0]) open(sel[0]);
    else if (e.key === 'Backspace' && dir !== 'C:') go(parent(dir));
    else if (c && e.shiftKey && e.key.toLowerCase() === 'n') newItem('dir');
  };
  // przeciagniecie plikow z komputera do folderu
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDrop(false);
    for (const f of Array.from(e.dataTransfer.files)) {
      const bin = !/\.(html?|php|css|js|txt|sql|csv|json|xml)$/i.test(f.name);
      const data = bin ? await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }) : await f.text();
      vfs.write(vfs.unique(dir, f.name), data, bin);
    }
  };
  const tb = 'flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 hover:bg-black/[.05] disabled:opacity-35';

  return (
    <div ref={box} tabIndex={0} onKeyDown={keys} className="flex h-full flex-col bg-[#f3f3f3] text-[12.5px] text-[#1a1a1a] outline-none">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button disabled={!back.length} onClick={() => { setFwd((f) => [dir, ...f]); setDir(back[back.length - 1]); setBack(back.slice(0, -1)); }} className="rounded p-1.5 hover:bg-black/[.05] disabled:opacity-30"><ArrowLeft size={15} /></button>
        <button disabled={!fwd.length} onClick={() => { setBack((b) => [...b, dir]); setDir(fwd[0]); setFwd(fwd.slice(1)); }} className="rounded p-1.5 hover:bg-black/[.05] disabled:opacity-30"><ArrowRight size={15} /></button>
        <button disabled={dir === 'C:'} onClick={() => go(parent(dir))} className="rounded p-1.5 hover:bg-black/[.05] disabled:opacity-30"><ArrowUp size={15} /></button>
        <button className="rounded p-1.5 hover:bg-black/[.05]"><RotateCw size={14} /></button>
        <Breadcrumb path={dir} go={go} />
        <label className="flex w-56 items-center gap-1 rounded-[4px] border border-black/10 bg-white px-2 py-1"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Wyszukaj: ${dir === 'C:' ? 'Dysk lokalny (C:)' : base(dir)}`} className="w-full bg-transparent outline-none" /><Search size={13} className="text-[#777]" /></label>
      </div>
      <div className="relative flex items-center gap-1 border-y border-black/[.08] bg-[#f9f9f9] px-2 py-1">
        <button onClick={() => setNewOpen((v) => !v)} className={`${tb} pr-1`}><Plus size={16} className="text-[#0067c0]" />Nowy<ChevronDown size={12} /></button>
        {newOpen && <div className="absolute left-2 top-full z-20 w-52 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">
          <button onClick={() => newItem('dir')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><FolderPlus size={15} className="text-[#d9a521]" />Folder</button>
          <button onClick={() => newItem('txt')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><FileText size={15} />Dokument tekstowy</button>
        </div>}
        <span className="mx-1 h-6 w-px bg-black/10" />
        <button title="Wytnij (Ctrl+X)" disabled={!sel.length} onClick={() => copy('cut')} className={tb}><Scissors size={15} /></button>
        <button title="Kopiuj (Ctrl+C)" disabled={!sel.length} onClick={() => copy('copy')} className={tb}><Copy size={15} /></button>
        <button title="Wklej (Ctrl+V)" disabled={!os.clip.files} onClick={paste} className={tb}><ClipboardPaste size={15} /></button>
        <button title="Zmień nazwę (F2)" disabled={sel.length !== 1} onClick={() => setRen(sel[0])} className={tb}><PenLine size={15} /></button>
        <button title="Usuń (Delete)" disabled={!sel.length} onClick={() => void del()} className={tb}><Trash2 size={15} /></button>
        <span className="mx-1 h-6 w-px bg-black/10" />
        <button className={tb}><ArrowUpDown size={15} />Sortuj<ChevronDown size={12} /></button><button className={tb}><LayoutList size={15} />Widok<ChevronDown size={12} /></button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-[200px] shrink-0 space-y-0.5 overflow-auto p-1.5">
          {NAV.slice(0, 4).map(([l, p, i]) => <button key={p} onClick={() => go(p)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${dir === p ? 'bg-black/[.06]' : 'hover:bg-black/[.04]'}`}>{i}{l}</button>)}
          <div className="my-1 h-px bg-black/10" />
          <button onClick={() => go('C:')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-black/[.04]"><Monitor size={15} className="text-[#3a96dd]" />Ten komputer</button>
          <button onClick={() => go('C:')} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 pl-6 text-left ${dir === 'C:' ? 'bg-black/[.06]' : 'hover:bg-black/[.04]'}`}><HardDrive size={15} className="text-[#6a6a6a]" />Dysk lokalny (C:)</button>
          <button onClick={() => go('C:/xampp/htdocs')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 pl-10 text-left hover:bg-black/[.04]"><FileIcon path="" dir size={15} />htdocs</button>
          <button onClick={() => go(RECYCLE)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${dir === RECYCLE ? 'bg-black/[.06]' : 'hover:bg-black/[.04]'}`}><Trash2 size={15} className="text-[#888]" />Kosz</button>
        </div>
        <div className={`min-w-0 flex-1 overflow-auto rounded-tl-[8px] border-l border-t border-black/[.08] bg-white ${drop ? 'outline outline-2 -outline-offset-2 outline-[#0067c0]' : ''}`}
          onContextMenu={ctxBg} onPointerDown={(e) => { if (e.target === e.currentTarget) setSel([]); }}
          onDragOver={(e) => { e.preventDefault(); setDrop(true); }} onDragLeave={() => setDrop(false)} onDrop={onDrop}>
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(200px,1fr)_150px_160px_90px] border-b border-black/[.06] bg-white px-4 py-1.5 text-[#555]"><span>Nazwa</span><span>Data modyfikacji</span><span>Typ</span><span className="text-right">Rozmiar</span></div>
          {items.map((p) => { const n = vfs.get(p)!; const cut = os.clip.files?.mode === 'cut' && os.clip.files.paths.includes(p); return (
            <div key={p} onClick={(e) => setSel(e.ctrlKey ? (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]) : [p])} onDoubleClick={() => open(p)} onContextMenu={(e) => ctxItem(e, p)}
              className={`mx-1 grid cursor-default grid-cols-[minmax(200px,1fr)_150px_160px_90px] items-center rounded-[4px] px-3 py-[3px] ${sel.includes(p) ? 'bg-[#cce8ff]' : 'hover:bg-[#e5f3ff]'} ${cut ? 'opacity-50' : ''}`}>
              <span className="flex min-w-0 items-center gap-2"><FileIcon path={p} dir={n.dir} size={17} />
                {ren === p ? <input autoFocus defaultValue={base(p)} onFocus={(e) => { const v = e.target.value; const d = n.dir ? v.length : v.lastIndexOf('.') > 0 ? v.lastIndexOf('.') : v.length; e.target.setSelectionRange(0, d); }}
                  onBlur={(e) => doRename(p, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doRename(p, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setRen(null); e.stopPropagation(); }} className="w-full border border-[#0067c0] px-1 outline-none" />
                  : <span className="truncate">{base(p)}</span>}</span>
              <span className="text-[#666]">{fmtDate(n.mtime)}</span><span className="truncate text-[#666]">{typeName(p, n.dir)}</span><span className="text-right text-[#666]">{n.dir ? '' : fmtSize(vfs.size(p))}</span>
            </div>); })}
          {!items.length && <p className="p-8 text-center text-[#777]">{q ? 'Brak elementów pasujących do wyszukiwania.' : 'Ten folder jest pusty.'}</p>}
        </div>
      </div>
      <div className="flex h-6 items-center gap-4 px-4 text-[12px] text-[#444]"><span>Elementy: {items.length}</span>{sel.length > 0 && <span>Zaznaczone elementy: {sel.length}{sel.length === 1 && !vfs.isDir(sel[0]) ? `  ${fmtSize(vfs.size(sel[0]))}` : ''}</span>}</div>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
export const joinPath = join;
