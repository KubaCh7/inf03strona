import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, RotateCw, Search, Plus, Scissors, Copy, ClipboardPaste, PenLine, Trash2, ArrowUpDown, LayoutList, LayoutGrid, FolderPlus, FileText, ChevronDown, ChevronRight, Share, MoreHorizontal, PanelRight } from 'lucide-react';
import { useOS, FileIcon, typeName, APPS, OPEN_WITH, dragStart, dropTo, isFileDrag, useVmBack, type Win, type AppId } from '../os';
import { FolderSvg, NavSvg } from '../icons';
import { ContextMenu, type CItem, type CTop } from '../ui';
import { FI } from '../fluent';
import { archiveItems } from './SevenZip';
import { useVfs, base, parent, join, fmtDate, fmtSize, DESKTOP, DOCS, DOWNLOADS, HTDOCS, isImage, isText, RECYCLE } from '../../../lib/vfs';
const PICS = 'C:/Users/Egzamin/Pictures', MUSIC = 'C:/Users/Egzamin/Music', VIDEOS = 'C:/Users/Egzamin/Videos';

/** Eksplorator plikow Windows 11. args.path = folder startowy. */
export default function Explorer({ win }: { win: Win }) {
  const os = useOS(); const vfs = useVfs(os.vfs);
  const [dir, setDir] = useState(String(win.args.path ?? 'HOME'));
  const [back, setBack] = useState<string[]>([]); const [fwd, setFwd] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [ren, setRen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number; items: CItem[]; top?: CTop[] } | null>(null);
  const [sort, setSort] = useState<{ by: 'name' | 'date' | 'type' | 'size'; desc: boolean }>({ by: 'name', desc: false });
  const [view, setView] = useState<'details' | 'icons'>(String(win.args.path ?? '').endsWith('/Pictures') ? 'icons' : 'details');
  const [editAddr, setEditAddr] = useState<string | null>(null);
  const [viewMenu, setViewMenu] = useState<'sort' | 'view' | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [drop, setDrop] = useState(false);
  const [pane, setPane] = useState(false);
  useEffect(() => { for (const d of [PICS, MUSIC, VIDEOS]) if (!vfs.exists(d)) vfs.mkdir(d); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { os.setTitle(win.id, dir === 'HOME' ? 'Strona główna' : dir === 'PC' ? 'Ten komputer' : dir === 'NET' ? 'Sieć' : dir === 'C:' ? 'Dysk lokalny (C:)' : dir === RECYCLE ? 'Kosz' : base(dir)); }, [dir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!['HOME', 'PC', 'NET'].includes(dir) && !vfs.isDir(dir)) setDir('HOME'); }, [vfs.ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => { if (!back.length) return; setFwd((f) => [dir, ...f]); setDir(back[back.length - 1]); setBack(back.slice(0, -1)); setSel([]); };
  useVmBack(box, goBack);
  const go = (p: string) => { if (p === dir) return; setBack((b) => [...b, dir]); setFwd([]); setDir(p); setSel([]); setQ(''); };
  const items = (['HOME', 'PC', 'NET'].includes(dir) ? [] : vfs.list(dir)).filter((p) => !base(p).startsWith('.')).filter((p) => base(p).toLowerCase().includes(q.toLowerCase())).sort((a, b) => {
    const da = vfs.isDir(a), db = vfs.isDir(b);
    if (da !== db) return da ? -1 : 1;
    const v = sort.by === 'name' ? base(a).localeCompare(base(b), 'pl', { numeric: true }) : sort.by === 'date' ? vfs.get(a)!.mtime - vfs.get(b)!.mtime : sort.by === 'size' ? vfs.size(a) - vfs.size(b) : typeName(a, da).localeCompare(typeName(b, db), 'pl');
    return sort.desc ? -v : v;
  });
  const sortBy = (by: typeof sort.by) => setSort((s0) => ({ by, desc: s0.by === by ? !s0.desc : false }));
  const dropProps = (target: string) => ({
    onDragOver: (e: React.DragEvent) => { if (isFileDrag(e)) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; } },
    onDrop: (e: React.DragEvent) => void dropTo(os, e, target),
  });
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
  /** Obrot obrazu o 90 stopni (jak w menu Windows), zapis w tym samym formacie. */
  const rotate = async (p: string, deg: number) => {
    const src = vfs.read(p); const im = new Image(); im.src = src; await im.decode().catch(() => null);
    const c = document.createElement('canvas'); c.width = im.naturalHeight; c.height = im.naturalWidth;
    const g = c.getContext('2d')!; g.translate(c.width / 2, c.height / 2); g.rotate((deg * Math.PI) / 180); g.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
    const mime = /^data:([^;]+)/.exec(src)?.[1] ?? 'image/png';
    vfs.write(p, c.toDataURL(mime === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92), true);
  };
  /** Pole zmiany nazwy: zaznacza nazwe bez rozszerzenia, a klik/dwuklik w polu nie otwiera pliku. */
  const renProps = (p: string, isDir: boolean) => ({
    autoFocus: true, defaultValue: base(p), spellCheck: false,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => { const v = e.target.value; e.target.setSelectionRange(0, isDir || v.lastIndexOf('.') <= 0 ? v.length : v.lastIndexOf('.')); },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => doRename(p, e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); if (e.key === 'Enter') doRename(p, e.currentTarget.value); if (e.key === 'Escape') setRen(null); },
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onClick: (e: React.MouseEvent) => e.stopPropagation(), onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    onDragStart: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); },
  });
  /** „Powolne klikniecie” jak w Windows: klik w nazwe juz zaznaczonego pliku po chwili wlacza zmiane nazwy. */
  const slow = useRef<number | undefined>(undefined);
  const slowClick = (e: React.MouseEvent, p: string) => {
    clearTimeout(slow.current);
    if (e.detail === 1 && !e.ctrlKey && !e.shiftKey && sel.length === 1 && sel[0] === p && dir !== RECYCLE) slow.current = window.setTimeout(() => setRen(p), 600);
  };
  const ctxItem = (e: React.MouseEvent, p: string) => {
    e.preventDefault(); e.stopPropagation(); if (!sel.includes(p)) setSel([p]);
    const ps = sel.includes(p) ? sel : [p]; const isDir = vfs.isDir(p);
    const withApps: AppId[] = isDir ? [] : isImage(p) ? OPEN_WITH.image : isText(p) ? OPEN_WITH.text : ['notepad'];
    const img = !isDir && isImage(p);
    const items: CItem[] = [
      { label: 'Otwórz', icon: <FileIcon path={p} dir={isDir} size={20} />, run: () => open(p), key: 'Enter' },
      ...(withApps.length ? [{ label: 'Otwórz za pomocą', icon: <FI name="app_generic" />, sub: withApps.map((a) => ({ label: APPS[a].name, icon: APPS[a].icon(20), run: () => os.open(a, { path: p }) })) }] : []),
      ...(/\.(7z|zip)$/i.test(p) ? archiveItems(os, p) : []),
      ...(isDir && os.clip.files ? [{ label: 'Wklej', icon: <FI name="clipboard_paste" />, run: () => { const c = os.clip.files!; c.paths.forEach((x) => vfs.copy(x, p, c.mode === 'cut')); } }] : []),
      ...(isDir ? [{ label: 'Otwórz w nowym oknie', icon: <FI name="window_new" />, run: () => os.open('explorer', { path: p }) }, { label: 'Przypnij do Szybkiego dostępu', icon: <FI name="pin" />, run: () => {} }] : []),
      ...(dir === RECYCLE ? [{ label: 'Przywróć', icon: <FI name="arrow_rotate_counterclockwise" />, run: () => ps.forEach((x) => vfs.copy(x, DESKTOP, true)) }] : []),
      ...(img ? [
        { label: 'Ustaw jako tło pulpitu', icon: <FI name="image" />, run: () => window.dispatchEvent(new CustomEvent('p03-wallpaper', { detail: vfs.read(p) })) },
        { label: 'Obróć w prawo', icon: <FI name="arrow_rotate_clockwise" />, run: () => void rotate(p, 90) },
        { label: 'Obróć w lewo', icon: <FI name="arrow_rotate_counterclockwise" />, run: () => void rotate(p, -90) },
      ] : []),
      { label: 'Dodaj do ulubionych', icon: <FI name="star" />, run: () => {} },
      { label: 'Kompresuj do', icon: <FI name="folder_zip" />, sub: [{ label: 'Plik ZIP', icon: <FI name="folder_zip" />, off: true }, { label: 'Plik 7z', icon: <FI name="folder_zip" />, off: true }, { label: 'Plik TAR', icon: <FI name="folder_zip" />, off: true }, '-', { label: 'Dodatkowe opcje', icon: <FI name="settings" />, off: true }] },
      { label: 'Kopiuj jako ścieżkę', icon: <FI name="clipboard_link" />, key: 'Ctrl+Shift+C', run: () => void navigator.clipboard?.writeText(`"${p.replace(/\//g, '\\')}"`) },
      { label: 'Właściwości', icon: <FI name="wrench" />, key: 'Alt+Enter', run: () => os.properties(p) },
      ...(!isDir && (isText(p) || img) ? ['-' as const] : []),
      ...(!isDir && isText(p) ? [{ label: 'Edytuj w Notatniku', icon: APPS.notepad.icon(20), run: () => os.open('notepad', { path: p }) }] : []),
      ...(img ? [{ label: 'Edytuj w programie Paint', icon: APPS.paint.icon(20), run: () => os.open('paint', { path: p }) }] : []),
    ];
    const top: CTop[] = [{ label: 'Wytnij', icon: <FI name="cut" />, run: () => copy('cut', ps) }, { label: 'Kopiuj', icon: <FI name="copy" />, run: () => copy('copy', ps) }, { label: 'Zmień nazwę', icon: <FI name="rename" />, run: () => setRen(p) }, { label: 'Udostępnij', icon: <FI name="share" />, run: () => {}, off: true }, { label: 'Usuń', icon: <FI name="delete" />, run: () => void del(ps) }];
    setMenu({ x: e.clientX, y: e.clientY, items, top });
  };
  const ctxBg = (e: React.MouseEvent) => {
    e.preventDefault(); setSel([]);
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'Widok', icon: <FI name="grid" />, sub: [{ label: 'Bardzo duże ikony', run: () => setView('icons') }, { label: 'Duże ikony', icon: view === 'icons' ? <span className="h-1.5 w-1.5 rounded-full bg-[#1a1a1a]" /> : undefined, run: () => setView('icons') }, { label: 'Szczegóły', icon: view === 'details' ? <span className="h-1.5 w-1.5 rounded-full bg-[#1a1a1a]" /> : undefined, run: () => setView('details') }] },
      { label: 'Sortuj według', icon: <FI name="arrow_sort" />, sub: [{ label: 'Nazwa', run: () => sortBy('name') }, { label: 'Data modyfikacji', run: () => sortBy('date') }, { label: 'Typ', run: () => sortBy('type') }, { label: 'Rozmiar', run: () => sortBy('size') }] },
      { label: 'Grupuj według', icon: <FI name="apps_list" />, sub: [{ label: '(Brak)', run: () => {} }] },
      { label: 'Odśwież', icon: <FI name="arrow_clockwise" />, run: () => {} }, '-',
      { label: 'Wklej', icon: <FI name="clipboard_paste" />, run: paste, off: !os.clip.files, key: 'Ctrl+V' }, '-',
      { label: 'Nowy', icon: <FI name="add_circle" />, sub: [{ label: 'Folder', icon: <FolderSvg size={20} />, run: () => newItem('dir') }, '-', { label: 'Dokument tekstowy', icon: <FileIcon path="a.txt" size={20} />, run: () => newItem('txt') }] }, '-',
      { label: 'Właściwości', icon: <FI name="wrench" />, key: 'Alt+Enter', run: () => os.properties(dir) },
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
    else if (e.altKey && e.key === 'Enter' && sel[0]) os.properties(sel[0]);
  };
  const tb = 'flex h-9 items-center gap-2 rounded-[4px] px-2.5 hover:bg-black/[.05] disabled:opacity-35 [&>svg:first-child]:text-[#2e5f9e]';
  const fi = (name: string, cls = '', color = true) => (s = 20) => <FI name={name} size={s} color={color} className={cls} />;
  const ICON_OF: Record<string, (s?: number) => React.ReactNode> = { [DESKTOP]: fi('desktop', 'text-[#0f6cbd]'), [DOWNLOADS]: fi('arrow_download', 'text-[#107c41]'), [DOCS]: fi('document'), [PICS]: fi('image'), [MUSIC]: fi('music_note_2', 'text-[#e3742f]'), [VIDEOS]: fi('video'), 'C:': fi('hard_drive', 'text-[#5d5d5d]'), HOME: fi('home'), PC: fi('laptop'), NET: fi('globe') };
  const LABEL = (p: string) => (p === 'HOME' ? 'Strona główna' : p === 'PC' ? 'Ten komputer' : p === 'C:' ? 'Dysk lokalny (C:)' : p === RECYCLE ? 'Kosz' : base(p));
  const PINNED: [string, string][] = [['Pulpit', DESKTOP], ['Pobrane', DOWNLOADS], ['Dokumenty', DOCS], ['Obrazy', PICS], ['Muzyka', MUSIC], ['Wideo', VIDEOS]];
  const virt = dir === 'HOME' || dir === 'PC' || dir === 'NET';
  const recent = virt ? [DESKTOP, HTDOCS, DOWNLOADS, DOCS].flatMap((r) => vfs.tree(r)).filter((f) => !base(f.path).startsWith('.') && !/\.7z$/.test(f.path)).sort((x, y) => y.node.mtime - x.node.mtime).slice(0, 12) : [];
  /** Prostokat zaznaczenia jak w Windows: przeciagniecie od pustego miejsca zaznacza pliki, Ctrl dodaje. */
  const area = useRef<HTMLDivElement>(null);
  const [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number; on: boolean } | null>(null);
  const bandBase = useRef<string[]>([]);
  const local = (e: React.PointerEvent) => { const el = area.current!; const r = el.getBoundingClientRect(); return { x: e.clientX - r.left + el.scrollLeft, y: e.clientY - r.top + el.scrollTop }; };
  const bandDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (e.button !== 0 || virt || t.closest('[data-path],button,input,.sticky')) return;
    const { x, y } = local(e); bandBase.current = e.ctrlKey ? sel : [];
    if (!e.ctrlKey) setSel([]);
    setBand({ x0: x, y0: y, x1: x, y1: y, on: false }); area.current!.setPointerCapture(e.pointerId);
  };
  const bandMove = (e: React.PointerEvent) => {
    if (!band) return; const el = area.current!; const { x, y } = local(e);
    const on = band.on || Math.abs(x - band.x0) + Math.abs(y - band.y0) > 4; const b = { ...band, x1: x, y1: y, on }; setBand(b);
    if (!on) return;
    const r = el.getBoundingClientRect();
    if (e.clientY > r.bottom - 20) el.scrollTop += 12; else if (e.clientY < r.top + 20) el.scrollTop -= 12;
    const [lx, hx, ly, hy] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1), Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
    const hit: string[] = [];
    el.querySelectorAll<HTMLElement>('[data-path]').forEach((n) => { const q = n.getBoundingClientRect(); const nx = q.left - r.left + el.scrollLeft, ny = q.top - r.top + el.scrollTop; if (nx < hx && nx + q.width > lx && ny < hy && ny + q.height > ly) hit.push(n.dataset.path!); });
    setSel([...new Set([...bandBase.current, ...hit])]);
  };
  const bandUp = (e: React.PointerEvent) => { if (band) { try { area.current?.releasePointerCapture(e.pointerId); } catch { /* */ } setBand(null); } };
  const detailsOf = sel.length === 1 && vfs.exists(sel[0]) ? sel[0] : null;
  const navBtn = (label: string, p: string, icon: React.ReactNode, indent = 0, pin = false, chevron?: boolean) => (
    <button key={p + label} {...(virt && p === dir ? {} : p.startsWith('C') ? dropProps(p) : {})} onClick={() => go(p)} style={{ paddingLeft: 8 + indent * 14 }}
      className={`group relative flex h-[34px] w-full items-center gap-2.5 rounded-[4px] pr-2 text-left ${dir === p ? 'bg-black/[.06] font-normal' : 'hover:bg-black/[.04]'}`}>{dir === p && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#005fb8]" />}
      <span className="w-3 text-[#777]">{chevron !== undefined ? <ChevronRight size={11} className={chevron ? 'rotate-90' : ''} /> : null}</span>{icon}<span className="flex-1 truncate">{label}</span>{pin && <span className="opacity-60">{NavSvg.pin(12)}</span>}
    </button>
  );
  const detailRow = (p: string, n: NonNullable<ReturnType<typeof vfs.get>>, cut: boolean) => (
    <div key={p} data-path={p} draggable={ren !== p} onDragStart={(e) => { const ps = sel.includes(p) ? sel : [p]; if (!sel.includes(p)) setSel([p]); dragStart(e, ps); }} {...(n.dir ? dropProps(p) : {})} onClick={(e) => setSel(e.ctrlKey ? (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]) : e.shiftKey && sel.length ? (() => { const i0 = items.indexOf(sel[0]), i1 = items.indexOf(p); return items.slice(Math.min(i0, i1), Math.max(i0, i1) + 1); })() : [p])} onDoubleClick={() => { clearTimeout(slow.current); if (ren !== p) open(p); }} onContextMenu={(e) => ctxItem(e, p)}
      className={`mx-1 grid h-[32px] cursor-default grid-cols-[minmax(240px,1fr)_170px_170px_100px] items-center rounded-[4px] border px-3 ${sel.includes(p) ? 'border-[#99d1ff] bg-[#cce8ff]' : 'border-transparent hover:bg-[#e5f3ff]'} ${cut ? 'opacity-50' : ''}`}>
      <span className="flex min-w-0 items-center gap-2"><FileIcon path={p} dir={n.dir} size={18} />
        {ren === p ? <input {...renProps(p, n.dir)} className="h-[26px] w-full border border-[#0067c0] px-1 outline-none" />
          : <span className="truncate" onClick={(e) => slowClick(e, p)}>{base(p)}</span>}</span>
      <span className="truncate text-[#5d5d5d]">{fmtDate(n.mtime)}</span><span className="truncate text-[#5d5d5d]">{typeName(p, n.dir)}</span><span className="text-right text-[#5d5d5d]">{n.dir ? '' : fmtSize(vfs.size(p))}</span>
    </div>
  );

  return (
    <div ref={box} tabIndex={0} onKeyDown={keys} onPointerDown={() => { setNewOpen(false); setViewMenu(null); }} className="flex h-full flex-col bg-[#f3f3f3] font-['Segoe_UI_Variable','Segoe_UI',sans-serif] text-[14px] text-[#1a1a1a] outline-none">
      {/* pasek adresu */}
      <div className="flex h-[48px] items-center gap-1.5 bg-[#f9f9f9] px-3">
        <button disabled={!back.length} title="Wstecz (Alt+strzałka w lewo)" onClick={goBack} className="grid h-9 w-9 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-30"><FI name="arrow_left" size={16} /></button>
        <button disabled={!fwd.length} title="Dalej" onClick={() => { setBack((bb) => [...bb, dir]); setDir(fwd[0]); setFwd(fwd.slice(1)); }} className="grid h-9 w-9 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-30"><FI name="arrow_right" size={16} /></button>
        <button disabled={virt} title="W górę" onClick={() => go(dir === 'C:' ? 'PC' : parent(dir))} className="grid h-9 w-9 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-30"><FI name="arrow_up" size={16} /></button>
        <button title="Odśwież" className="rounded-[4px] p-1.5 hover:bg-black/[.05]"><FI name="arrow_clockwise" size={16} /></button>
        <div className="flex h-[34px] min-w-0 flex-1 items-center gap-1 rounded-[4px] border border-black/[.06] bg-white px-2.5 shadow-[0_1px_0_rgba(0,0,0,.04)]">
          <span className="shrink-0">{(ICON_OF[dir] ?? ((s = 16) => <FolderSvg size={s} />))(16)}</span>
          {editAddr !== null ? <input autoFocus value={editAddr} onChange={(e) => setEditAddr(e.target.value)} onBlur={() => setEditAddr(null)} onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setEditAddr(null); if (e.key === 'Enter') { const t = editAddr.trim().replace(/\\/g, '/').replace(/\/$/, '').replace(/^c:/i, 'C:'); setEditAddr(null); if (/^ten komputer$/i.test(t)) go('PC'); else if (vfs.isDir(t)) go(t); else if (vfs.exists(t)) os.openPath(t); else void os.alert('Eksplorator plików', `System Windows nie może odnaleźć „${editAddr}”. Sprawdź pisownię i spróbuj ponownie.`, 'error'); } }}
              className="min-w-0 flex-1 outline-none" />
            : <div className="flex min-w-0 flex-1 cursor-text items-center gap-0.5 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) setEditAddr(virt ? LABEL(dir) : dir.replace(/\//g, '\\') + (dir === 'C:' ? '\\' : '')); }}>
              {(virt ? [dir] : ['PC', ...dir.split('/').map((_, i, arr) => arr.slice(0, i + 1).join('/'))]).map((p) => <span key={p} className="flex shrink-0 items-center gap-0.5"><ChevronRight size={12} className="text-[#777]" /><button onClick={() => go(p)} className="rounded px-1 py-0.5 hover:bg-black/[.05]">{LABEL(p)}</button></span>)}
            </div>}
          <ChevronDown size={13} className="text-[#777]" />
        </div>
        <label className="flex h-[34px] w-72 items-center gap-1 rounded-[4px] border border-black/[.06] bg-white px-2.5 shadow-[0_1px_0_rgba(0,0,0,.04)]"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Wyszukaj: ${LABEL(dir)}`} className="w-full bg-transparent outline-none placeholder:text-[#777]" /><FI name="search" size={16} className="text-[#555]" /></label>
      </div>
      {/* pasek polecen */}
      <div className="relative flex h-[52px] items-center gap-1 border-b border-black/[.06] bg-[#f9f9f9] px-3">
        <button disabled={virt} onPointerDown={(e) => e.stopPropagation()} onClick={() => setNewOpen((v) => !v)} className={`${tb} pr-1`}><FI name="add_circle" color />Nowy<FI name="chevron_down" size={12} /></button>
        {newOpen && <div onPointerDown={(e) => e.stopPropagation()} className="absolute left-2 top-full z-20 w-56 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">
          <button onClick={() => newItem('dir')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><FolderSvg size={16} />Folder</button>
          <div className="my-1 h-px bg-black/10" />
          <button onClick={() => newItem('txt')} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><FileIcon path="a.txt" size={16} />Dokument tekstowy</button>
        </div>}
        <span className="mx-1.5 h-6 w-px bg-black/10" />
        <button title="Wytnij (Ctrl+X)" disabled={!sel.length} onClick={() => copy('cut')} className={tb}><FI name="cut" /></button>
        <button title="Kopiuj (Ctrl+C)" disabled={!sel.length} onClick={() => copy('copy')} className={tb}><FI name="copy" /></button>
        <button title="Wklej (Ctrl+V)" disabled={!os.clip.files || virt} onClick={paste} className={tb}><FI name="clipboard_paste" /></button>
        <button title="Zmień nazwę (F2)" disabled={sel.length !== 1} onClick={() => setRen(sel[0])} className={tb}><FI name="rename" /></button>
        <button title="Udostępnij" disabled className={tb}><FI name="share" /></button>
        <button title="Usuń (Delete)" disabled={!sel.length} onClick={() => void del()} className={tb}><FI name="delete" /></button>
        <span className="mx-1.5 h-6 w-px bg-black/10" />
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}><button onClick={() => setViewMenu(viewMenu === 'sort' ? null : 'sort')} className={tb}><FI name="arrow_sort" />Sortuj<FI name="chevron_down" size={12} /></button>
          {viewMenu === 'sort' && <div className="absolute left-0 top-full z-20 w-52 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">{([['name', 'Nazwa'], ['date', 'Data modyfikacji'], ['type', 'Typ'], ['size', 'Rozmiar']] as const).map(([k, l]) => <button key={k} onClick={() => { setSort({ by: k, desc: sort.by === k ? sort.desc : false }); setViewMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><span className="w-3 text-[#0067c0]">{sort.by === k ? '●' : ''}</span>{l}</button>)}
            <div className="my-1 h-px bg-black/10" />{[[false, 'Rosnąco'], [true, 'Malejąco']].map(([dd, l]) => <button key={String(dd)} onClick={() => { setSort({ ...sort, desc: dd as boolean }); setViewMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><span className="w-3 text-[#0067c0]">{sort.desc === dd ? '●' : ''}</span>{l as string}</button>)}</div>}</div>
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}><button onClick={() => setViewMenu(viewMenu === 'view' ? null : 'view')} className={tb}><FI name="text_bullet_list_ltr" />Wyświetl<FI name="chevron_down" size={12} /></button>
          {viewMenu === 'view' && <div className="absolute left-0 top-full z-20 w-56 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">{([['icons', 'Duże ikony', 'Ctrl+Shift+2'], ['details', 'Szczegóły', 'Ctrl+Shift+6']] as const).map(([k, l, key]) => <button key={k} onClick={() => { setView(k); setViewMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><span className="w-3 text-[#0067c0]">{view === k ? '●' : ''}</span><span className="flex-1 text-left">{l}</span><span className="text-[11px] text-[#666]">{key}</span></button>)}
            <div className="my-1 h-px bg-black/10" /><button onClick={() => { setPane((v) => !v); setViewMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-black/[.05]"><span className="w-3">{pane ? '✓' : ''}</span>Panel szczegółów</button></div>}</div>
        <button className={tb} disabled><FI name="more_horizontal" /></button>
        <span className="flex-1" />
        <button onClick={() => setPane((v) => !v)} className={`${tb} ${pane ? 'bg-black/[.06]' : ''}`}><FI name="panel_right" />Szczegóły</button>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* panel nawigacji */}
        <div className="w-[250px] shrink-0 overflow-auto bg-[#f3f3f3] px-1.5 py-2">
          {navBtn('Strona główna', 'HOME', ICON_OF.HOME(20))}
          {navBtn('Galeria', PICS, <FI name="image" color />)}
          <div className="mx-2 my-2 h-px bg-black/10" />
          {PINNED.map(([l, p]) => navBtn(l, p, ICON_OF[p](20), 0, true))}
          <div className="mx-2 my-2 h-px bg-black/10" />
          {navBtn('Ten komputer', 'PC', ICON_OF.PC(20), 0, false, true)}
          {navBtn('Dysk lokalny (C:)', 'C:', ICON_OF['C:'](20), 1, false, dir.startsWith('C:'))}
          {navBtn('Sieć', 'NET', ICON_OF.NET(20), 0, false, false)}
        </div>
        {/* zawartosc */}
        <div ref={area} className={`relative min-w-0 flex-1 overflow-auto rounded-tl-[8px] border-l border-t border-black/[.06] bg-white ${drop ? 'outline outline-2 -outline-offset-2 outline-[#0067c0]' : ''}`}
          onContextMenu={(e) => (virt ? e.preventDefault() : ctxBg(e))} onPointerDown={bandDown} onPointerMove={bandMove} onPointerUp={bandUp} onPointerCancel={bandUp}
          onDragOver={(e) => { if (!virt && isFileDrag(e)) { e.preventDefault(); setDrop(true); } }} onDragLeave={() => setDrop(false)} onDrop={(e) => { setDrop(false); if (!virt) void dropTo(os, e, dir); }}>
          {dir === 'HOME' && (
            <div className="p-4">
              <p className="mb-2 flex items-center gap-1 font-semibold"><ChevronDown size={14} />Szybki dostęp</p>
              <div className="mb-5 flex flex-wrap gap-1">{PINNED.map(([l, p]) => (
                <button key={p} {...dropProps(p)} onDoubleClick={() => go(p)} onClick={() => setSel([p])} className={`flex w-[230px] items-center gap-3 rounded-[4px] border px-3 py-2 text-left ${sel[0] === p ? 'border-[#99d1ff] bg-[#cce8ff]' : 'border-transparent hover:bg-[#e5f3ff]'}`}>
                  <span className="relative"><FolderSvg size={40} /><span className="absolute bottom-1 right-0">{ICON_OF[p](16)}</span></span><span><span className="block">{l}</span><span className="flex items-center gap-1 text-[11.5px] text-[#666]">Przechowywane lokalnie {NavSvg.pin(10)}</span></span>
                </button>))}</div>
              <p className="mb-1 flex items-center gap-1 font-semibold"><ChevronDown size={14} />Ostatnie</p>
              <div className="grid grid-cols-[minmax(220px,1fr)_160px_1fr] border-b border-black/[.06] px-4 py-1 text-[#555]"><span>Nazwa</span><span>Data otwarcia</span><span>Lokalizacja pliku</span></div>
              {recent.map((f) => <div key={f.path} onDoubleClick={() => os.openPath(f.path)} onClick={() => setSel([f.path])} onContextMenu={(e) => ctxItem(e, f.path)} className={`mx-1 grid h-[30px] grid-cols-[minmax(220px,1fr)_160px_1fr] items-center rounded-[4px] border px-3 ${sel[0] === f.path ? 'border-[#99d1ff] bg-[#cce8ff]' : 'border-transparent hover:bg-[#e5f3ff]'}`}><span className="flex items-center gap-2 truncate"><FileIcon path={f.path} size={18} />{base(f.path)}</span><span className="text-[#5d5d5d]">{fmtDate(f.node.mtime)}</span><span className="truncate text-[#5d5d5d]">{parent(f.path).replace(/\//g, '\\')}</span></div>)}
              {!recent.length && <p className="px-4 py-3 text-[#777]">Po otwarciu niektórych plików pokażemy najnowsze z nich w tym miejscu.</p>}
            </div>
          )}
          {dir === 'PC' && (
            <div className="p-4">
              <p className="mb-2 flex items-center gap-1 font-semibold"><ChevronDown size={14} />Urządzenia i dyski</p>
              <button onDoubleClick={() => go('C:')} onClick={() => setSel(['C:'])} className={`flex w-[280px] items-center gap-3 rounded-[4px] border px-3 py-2.5 text-left ${sel[0] === 'C:' ? 'border-[#99d1ff] bg-[#cce8ff]' : 'border-transparent hover:bg-[#e5f3ff]'}`}>
                {NavSvg.drive(44)}<span className="flex-1"><span className="block">Dysk lokalny (C:)</span><span className="my-1 block h-[14px] w-full border border-[#bcbcbc] bg-[#e6e6e6]"><span className="block h-full bg-[#26a0da]" style={{ width: '38%' }} /></span><span className="text-[11.5px] text-[#666]">147 GB wolnych z 237 GB</span></span>
              </button>
              <p className="mb-2 mt-5 flex items-center gap-1 font-semibold"><ChevronDown size={14} />Foldery</p>
              <div className="flex flex-wrap gap-1">{PINNED.map(([l, p]) => <button key={p} onDoubleClick={() => go(p)} className="flex w-[200px] items-center gap-3 rounded-[4px] border border-transparent px-3 py-2 text-left hover:bg-[#e5f3ff]"><span className="relative"><FolderSvg size={36} /><span className="absolute bottom-0.5 right-0">{ICON_OF[p](14)}</span></span>{l}</button>)}</div>
            </div>
          )}
          {!virt && view === 'details' && <div className="sticky top-0 z-10 mx-1 grid h-[34px] items-center grid-cols-[minmax(240px,1fr)_170px_170px_100px] bg-white px-3 text-[#4c4c4c]">{([['name', 'Nazwa'], ['date', 'Data modyfikacji'], ['type', 'Typ'], ['size', 'Rozmiar']] as const).map(([k, l], i) => <button key={k} onClick={() => sortBy(k)} className={`relative flex h-7 items-center gap-1 px-1 hover:bg-[#e5f3ff] ${i ? 'border-l border-black/[.08]' : ''} ${k === 'size' ? 'justify-end' : ''}`}>{sort.by === k && <ChevronDown size={11} className={`absolute left-1/2 top-[-3px] -translate-x-1/2 text-[#666] ${sort.desc ? '' : 'rotate-180'}`} />}{l}</button>)}</div>}
          {!virt && view === 'icons' && <div className="flex flex-wrap content-start gap-1 p-2">{items.map((p) => { const n = vfs.get(p)!; return (
            <div key={p} data-path={p} draggable={ren !== p} onDragStart={(e) => { const ps = sel.includes(p) ? sel : [p]; if (!sel.includes(p)) setSel([p]); dragStart(e, ps); }} {...(n.dir ? dropProps(p) : {})}
              onClick={(e) => setSel(e.ctrlKey ? (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]) : e.shiftKey && sel.length ? (() => { const i0 = items.indexOf(sel[0]), i1 = items.indexOf(p); return items.slice(Math.min(i0, i1), Math.max(i0, i1) + 1); })() : [p])} onDoubleClick={() => { clearTimeout(slow.current); if (ren !== p) open(p); }} onContextMenu={(e) => ctxItem(e, p)}
              className={`flex w-[124px] cursor-default flex-col items-center gap-1.5 rounded-[4px] border p-2 text-center ${sel.includes(p) ? 'border-[#99d1ff] bg-[#cce8ff]' : 'border-transparent hover:bg-[#e5f3ff]'}`}>
              {n.bin && /^data:image\//.test(n.data ?? '') ? <img src={n.data} alt="" className="h-[96px] w-[108px] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,.25)]" draggable={false} /> : <FileIcon path={p} dir={n.dir} size={96} />}
              {ren === p ? <input {...renProps(p, n.dir)} className="w-full border border-[#0067c0] px-1 text-center text-[13px] outline-none" />
                : <span className="line-clamp-2 break-all text-[13px] leading-tight" onClick={(e) => slowClick(e, p)}>{base(p)}</span>}
            </div>); })}</div>}
          {!virt && view === 'details' && items.map((p) => detailRow(p, vfs.get(p)!, os.clip.files?.mode === 'cut' && os.clip.files.paths.includes(p)))}
          {!virt && !items.length && <p className="p-8 text-center text-[#777]">{q ? 'Brak elementów pasujących do wyszukiwania.' : 'Ten folder jest pusty.'}</p>}
          {band && band.on && <div className="pointer-events-none absolute z-20 border border-[#0078d4] bg-[#0078d4]/20" style={{ left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0) }} />}
          {dir === 'NET' && <p className="p-8 text-center text-[#777]">Odnajdowanie sieci jest wyłączone. Na stanowisku egzaminacyjnym nie ma dostępu do sieci.</p>}
        </div>
        {/* panel szczegolow */}
        {pane && (
          <div className="w-[260px] shrink-0 overflow-auto border-l border-t border-black/[.06] bg-white p-4">
            {detailsOf ? (() => { const n = vfs.get(detailsOf)!; return (<>
              <div className="mb-3 grid h-[150px] place-items-center rounded-[6px] bg-[#f6f6f6]">{n.bin && /^data:image\//.test(n.data ?? '') ? <img src={n.data} alt="" className="max-h-[140px] max-w-full" /> : <FileIcon path={detailsOf} dir={n.dir} size={96} />}</div>
              <p className="mb-3 break-all text-[15px] font-semibold">{base(detailsOf)}</p>
              <p className="mb-2 font-semibold">Właściwości</p>
              {[['Typ', typeName(detailsOf, n.dir)], ['Rozmiar', n.dir ? `${vfs.tree(detailsOf).length} plików` : fmtSize(vfs.size(detailsOf))], ['Lokalizacja', parent(detailsOf).replace(/\//g, '\\')], ['Zmodyfikowano', fmtDate(n.mtime)]].map(([k, v]) => <div key={k} className="mb-2"><p className="text-[11.5px] text-[#666]">{k}</p><p className="break-all">{v}</p></div>)}
            </>); })() : <div className="grid h-full place-items-center text-center text-[#777]"><div><FileIcon path="a.txt" size={56} /><p className="mt-2">Wybierz plik, aby wyświetlić szczegóły.</p></div></div>}
          </div>
        )}
      </div>
      {/* pasek stanu */}
      <div className="flex h-[30px] items-center gap-5 bg-[#f3f3f3] px-4 text-[13px] text-[#1a1a1a]">
        <span>{virt ? '' : `Elementy: ${items.length}`}</span>{sel.length > 0 && !virt && <span className="flex gap-5"><span>{sel.length === 1 ? 'Zaznaczono 1 element' : `Zaznaczone elementy: ${sel.length}`}</span>{sel.every((x) => !vfs.isDir(x)) && <span>{fmtSize(sel.reduce((a, x) => a + vfs.size(x), 0))}</span>}</span>}
        <span className="ml-auto flex gap-0.5"><button title="Szczegóły" onClick={() => setView('details')} className={`rounded p-1 ${view === 'details' ? 'bg-black/[.08]' : 'hover:bg-black/[.05]'}`}><FI name="text_bullet_list_ltr" size={16} /></button><button title="Duże ikony" onClick={() => setView('icons')} className={`rounded p-1 ${view === 'icons' ? 'bg-black/[.08]' : 'hover:bg-black/[.05]'}`}><FI name="grid" size={16} /></button></span>
      </div>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
export const joinPath = join;
