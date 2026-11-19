import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Power, Wifi, Volume2, ChevronUp, LayoutGrid, Camera, Scissors, Copy, ClipboardPaste, PenLine, Trash2, Plus, FolderPlus, FileText, RotateCw, LayoutList, ArrowUpDown, Monitor, X } from 'lucide-react';
import type { Sheet } from '../../lib/types';
import { Vfs, useVfs, DESKTOP, RECYCLE, base, isImage, isText, join } from '../../lib/vfs';
import { MysqlServer } from '../../lib/mysqlServer';
import { OSContext, APPS, FileIcon, SpecialIcon, defaultApp, OPEN_WITH, type AppId, type Win, type OS, type PickOpts } from './os';
import Window from './Window';
import { ContextMenu, FileDialog, MsgBox, type CItem } from './ui';
import Explorer from './apps/Explorer';
import Notepad from './apps/Notepad';
import SevenZip from './apps/SevenZip';

const Xampp = lazy(() => import('./apps/Xampp'));
const Browser = lazy(() => import('./apps/Browser'));
const NotepadPP = lazy(() => import('./apps/NotepadPP'));
const VSCode = lazy(() => import('./apps/VSCode'));
const Paint = lazy(() => import('./apps/Paint'));
const Graphics = lazy(() => import('./apps/Graphics'));
const PdfApp = lazy(() => import('./apps/PdfApp'));

const DARK: AppId[] = ['vscode', 'gimp', 'photoshop'];
const PINNED: AppId[] = ['explorer', 'browser', 'xampp', 'notepadpp', 'vscode', 'gimp', 'photoshop', 'paint', 'notepad'];
const SHORTCUTS: AppId[] = ['xampp', 'notepadpp', 'vscode', 'gimp', 'photoshop', 'browser'];

export type DesktopProps = { sheet: Sheet; attempt: string; candidate: string; endsAt: number; onFinish: () => void; onAbort: () => void };

export default function Desktop({ sheet, attempt, candidate, endsAt, onFinish, onAbort }: DesktopProps) {
  const vfs = useMemo(() => new Vfs(`vfs:${attempt}`), [attempt]);
  const server = useMemo(() => new MysqlServer(`mysql:${attempt}`), [attempt]);
  const [ready, setReady] = useState(false);
  useVfs(vfs);
  const [wins, setWins] = useState<Win[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [start, setStart] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: CItem[] } | null>(null);
  const [pick, setPick] = useState<{ o: PickOpts; res: (p: string | null) => void } | null>(null);
  const [msg, setMsg] = useState<{ title: string; text: string; kind?: 'error' | 'info' | 'warn'; confirm?: boolean; res: (ok: boolean) => void } | null>(null);
  const [clip, setClip] = useState<OS['clip']>({});
  const [toast, setToast] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [ren, setRen] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const root = useRef<HTMLDivElement>(null);
  const zTop = useRef(10);
  const nextId = useRef(1);

  // pierwszy start proby: archiwum z arkusza na pulpicie
  useEffect(() => {
    let on = true;
    (async () => {
      await Promise.all([vfs.load(), server.load()]);
      const arch = (sheet.files.archiveUrl ?? 'pliki1.7z').split('/').pop() ?? 'pliki1.7z';
      if (!vfs.exists(join(DESKTOP, arch)) && !vfs.get(DESKTOP + '/.init')) {
        vfs.write(join(DESKTOP, arch), 'data:application/x-7z-compressed;base64,', true);
        vfs.write(DESKTOP + '/.init', '1');
      }
      if (on) setReady(true);
    })();
    return () => { on = false; };
  }, [vfs, server, sheet]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const focus = useCallback((id: number) => { setActive(id); setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: ++zTop.current, min: false } : w))); }, []);
  const open = useCallback((app: AppId, args: Record<string, unknown> = {}) => {
    setStart(false);
    const id = nextId.current++;
    const A = APPS[app];
    const W = root.current?.clientWidth ?? 1280, H = (root.current?.clientHeight ?? 800) - 48;
    const w = Math.min(A.w, W - 40), h = Math.min(A.h, H - 20);
    const n = wins.length % 6;
    setWins((ws) => [...ws, { id, app, title: A.name, args, x: Math.max(10, (W - w) / 2 - 60 + n * 28), y: Math.max(6, (H - h) / 2 - 30 + n * 24), w, h, min: false, max: w >= W - 60, z: ++zTop.current }]);
    setActive(id);
  }, [wins.length]);
  const close = useCallback((id: number) => setWins((ws) => ws.filter((w) => w.id !== id)), []);
  const openPath = useCallback((p: string) => {
    if (vfs.isDir(p)) return open('explorer', { path: p });
    open(defaultApp(p), { path: p });
  }, [vfs, open]);

  async function screenshot() {
    const html2canvas = (await import('html2canvas-pro')).default;
    const el = root.current!;
    setToast(null);
    const scale = 1920 / el.clientWidth;
    const c = await html2canvas(el, { scale, backgroundColor: '#1e3a5f', logging: false, useCORS: true, ignoreElements: (n) => (n as HTMLElement).dataset?.noshot === '1' });
    // ekran 1920 x 1080 jak monitor na stanowisku
    const out = document.createElement('canvas'); out.width = 1920; out.height = 1080;
    out.getContext('2d')!.drawImage(c, 0, 0, 1920, Math.round((c.height * 1920) / c.width));
    setClip((cl) => ({ ...cl, image: out.toDataURL('image/png') }));
    setToast('Zrzut ekranu skopiowano do schowka. Wklej go (Ctrl+V) np. w programie Paint i zapisz.');
    setTimeout(() => setToast(null), 5000);
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's')) { e.preventDefault(); void screenshot(); }
    };
    window.addEventListener('keyup', k); return () => window.removeEventListener('keyup', k);
  });

  const os: OS = {
    vfs, sheet, server, candidate, open, openPath, close, clip, setClip,
    setTitle: (id, t) => setWins((ws) => ws.map((w) => (w.id === id && w.title !== t ? { ...w, title: t } : w))),
    pick: (o) => new Promise((res) => setPick({ o, res })),
    alert: (title, text, kind = 'info') => new Promise((res) => setMsg({ title, text, kind, res: () => res() })),
    confirm: (title, text) => new Promise((res) => setMsg({ title, text, kind: 'warn', confirm: true, res })),
    screenshot,
  };

  // ---------- ikony pulpitu ----------
  const files = vfs.list(DESKTOP).filter((p) => !base(p).startsWith('.'));
  const icons: { key: string; label: string; icon: React.ReactNode; open: () => void; path?: string }[] = [
    { key: 'pc', label: 'Ten komputer', icon: SpecialIcon.pc(34), open: () => open('explorer', { path: 'C:' }) },
    { key: 'trash', label: 'Kosz', icon: SpecialIcon.trash(34), open: () => open('explorer', { path: RECYCLE }) },
    ...SHORTCUTS.map((a) => ({ key: a, label: APPS[a].name, icon: APPS[a].icon(34), open: () => open(a) })),
    { key: 'pdf', label: 'Arkusz egzaminacyjny.pdf', icon: APPS.pdf.icon(34), open: () => open('pdf') },
    ...files.map((p) => ({ key: p, label: base(p), icon: <FileIcon path={p} dir={vfs.isDir(p)} size={36} />, open: () => openPath(p), path: p })),
  ];
  const doRename = (p: string, name: string) => {
    setRen(null); const n = name.trim(); if (!n || n === base(p)) return;
    if (/[\\/:*?"<>|]/.test(n)) { void os.alert('Zmiana nazwy', 'Nazwa pliku nie może zawierać żadnego z następujących znaków:\n\\ / : * ? " < > |', 'error'); return; }
    try { vfs.rename(p, n); } catch (e) { void os.alert('Zmiana nazwy', (e as Error).message, 'error'); }
  };
  const newItem = (kind: 'dir' | 'txt') => { const p = kind === 'dir' ? vfs.mkdir(vfs.unique(DESKTOP, 'Nowy folder')) : vfs.write(vfs.unique(DESKTOP, 'Nowy Dokument tekstowy.txt'), ''); setSel([p]); setRen(p); };
  const paste = (dir = DESKTOP) => { const c = clip.files; if (!c) return; try { c.paths.forEach((p) => vfs.exists(p) && vfs.copy(p, dir, c.mode === 'cut')); if (c.mode === 'cut') setClip({ ...clip, files: undefined }); } catch (e) { void os.alert('Kopiowanie', (e as Error).message, 'error'); } };
  const bgMenu = (e: React.MouseEvent) => {
    e.preventDefault(); setSel([]);
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'Widok', icon: <LayoutList size={14} />, sub: [{ label: 'Średnie ikony', run: () => {} }] }, { label: 'Sortuj według', icon: <ArrowUpDown size={14} />, sub: [{ label: 'Nazwa', run: () => {} }] },
      { label: 'Odśwież', icon: <RotateCw size={14} />, run: () => {} }, '-',
      { label: 'Wklej', icon: <ClipboardPaste size={14} />, run: () => paste(), off: !clip.files },
      { label: 'Nowy', icon: <Plus size={14} />, sub: [{ label: 'Folder', icon: <FolderPlus size={14} className="text-[#d9a521]" />, run: () => newItem('dir') }, '-', { label: 'Dokument tekstowy', icon: <FileText size={14} />, run: () => newItem('txt') }] }, '-',
      { label: 'Ustawienia ekranu', icon: <Monitor size={14} />, off: true },
    ] });
  };
  const iconMenu = (e: React.MouseEvent, ic: (typeof icons)[number]) => {
    e.preventDefault(); e.stopPropagation(); setSel([ic.key]);
    const p = ic.path;
    const withApps: AppId[] = !p || vfs.isDir(p) ? [] : isImage(p) ? OPEN_WITH.image : isText(p) ? OPEN_WITH.text : [];
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'Otwórz', run: ic.open },
      ...(withApps.length ? [{ label: 'Otwórz za pomocą', sub: withApps.map((a) => ({ label: APPS[a].name, icon: APPS[a].icon(15), run: () => open(a, { path: p }) })) }] : []),
      ...(p && /\.(7z|zip)$/i.test(p) ? [{ label: '7-Zip', sub: [{ label: 'Otwórz archiwum', run: () => open('sevenzip', { path: p }) }, { label: 'Wypakuj pliki…', run: () => open('sevenzip', { path: p, extract: 'ask' }) }, { label: 'Wypakuj tutaj', run: () => open('sevenzip', { path: p, extract: 'here' }) }, { label: `Wypakuj do "${base(p).replace(/\.\w+$/, '')}\\"`, run: () => open('sevenzip', { path: p, extract: 'folder' }) }] }] : []),
      ...(p ? ['-' as const, { label: 'Wytnij', icon: <Scissors size={14} />, run: () => setClip({ ...clip, files: { mode: 'cut', paths: [p] } }) }, { label: 'Kopiuj', icon: <Copy size={14} />, run: () => setClip({ ...clip, files: { mode: 'copy', paths: [p] } }) },
        ...(vfs.isDir(p) && clip.files ? [{ label: 'Wklej', icon: <ClipboardPaste size={14} />, run: () => paste(p) }] : []),
        { label: 'Zmień nazwę', icon: <PenLine size={14} />, run: () => setRen(p) }, { label: 'Usuń', icon: <Trash2 size={14} />, run: () => vfs.trash(p) }] : []),
    ] });
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    for (const f of Array.from(e.dataTransfer.files)) {
      const bin = !/\.(html?|php|css|js|txt|sql|csv|json|xml)$/i.test(f.name);
      const data = bin ? await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }) : await f.text();
      vfs.write(vfs.unique(DESKTOP, f.name), data, bin);
    }
  };

  const left = Math.max(0, endsAt - now);
  const hms = `${Math.floor(left / 3600000)}:${String(Math.floor((left % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  const d = new Date(now);
  const renderApp = (w: Win) => {
    switch (w.app) {
      case 'explorer': return <Explorer win={w} />;
      case 'notepad': return <Notepad win={w} />;
      case 'sevenzip': return <SevenZip win={w} />;
      case 'xampp': return <Xampp win={w} />;
      case 'browser': return <Browser win={w} />;
      case 'notepadpp': return <NotepadPP win={w} />;
      case 'vscode': return <VSCode win={w} />;
      case 'paint': return <Paint win={w} />;
      case 'gimp': case 'photoshop': return <Graphics win={w} />;
      case 'pdf': return <PdfApp win={w} />;
    }
  };

  return (
    <OSContext.Provider value={os}>
      <div ref={root} className="fixed inset-0 z-[80] select-none overflow-hidden font-['Segoe_UI_Variable','Segoe_UI',system-ui,sans-serif] text-[13px]"
        style={{ background: 'radial-gradient(ellipse at 30% 110%, #4d8fd9 0%, transparent 55%), radial-gradient(ellipse at 80% -10%, #7aa8e6 0%, transparent 50%), linear-gradient(135deg,#0f2f63 0%,#1b4f9c 45%,#2a6fd0 70%,#173f7a 100%)' }}
        onContextMenu={bgMenu} onPointerDown={() => { setSel([]); setStart(false); }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        {/* ikony pulpitu (kolumnami od gory, jak w Windows) */}
        <div className="absolute inset-0 bottom-12 flex flex-col flex-wrap content-start gap-1 p-2">
          {ready && icons.map((ic) => (
            <div key={ic.key} onPointerDown={(e) => { e.stopPropagation(); setSel([ic.key]); }} onDoubleClick={ic.open} onContextMenu={(e) => iconMenu(e, ic)}
              className={`flex w-[78px] flex-col items-center gap-1 rounded-[4px] border px-1 py-1.5 text-center text-white ${sel.includes(ic.key) ? 'border-white/40 bg-white/25' : 'border-transparent hover:bg-white/10'} ${clip.files?.mode === 'cut' && ic.path && clip.files.paths.includes(ic.path) ? 'opacity-50' : ''}`}>
              <span className="grid h-9 place-items-center drop-shadow">{ic.icon}</span>
              {ren === ic.path && ic.path ? <textarea autoFocus defaultValue={ic.label} onPointerDown={(e) => e.stopPropagation()} onFocus={(e) => { const v = e.target.value; e.target.setSelectionRange(0, vfs.isDir(ic.path!) || v.lastIndexOf('.') <= 0 ? v.length : v.lastIndexOf('.')); }}
                onBlur={(e) => doRename(ic.path!, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doRename(ic.path!, (e.target as HTMLTextAreaElement).value); } if (e.key === 'Escape') setRen(null); }}
                className="w-full resize-none border border-[#0067c0] bg-white px-0.5 text-center text-[12px] leading-tight text-black outline-none" rows={2} />
                : <span className="line-clamp-2 break-words text-[12px] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,.8)]">{ic.label}</span>}
            </div>
          ))}
        </div>

        {/* okna */}
        {wins.map((w) => (
          <Window key={w.id} win={w} active={active === w.id} dark={DARK.includes(w.app)} onFocus={() => active !== w.id && focus(w.id)} onClose={() => close(w.id)}
            onChange={(p) => setWins((ws) => ws.map((x) => (x.id === w.id ? { ...x, ...p } : x)))}>
            <Suspense fallback={<div className="grid h-full place-items-center bg-white text-[#666]">Uruchamianie…</div>}>{renderApp(w)}</Suspense>
          </Window>
        ))}

        {/* menu Start */}
        {start && (
          <div data-noshot="0" onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-[56px] left-1/2 z-[150] w-[600px] -translate-x-1/2 overflow-hidden rounded-[8px] border border-black/10 bg-[#f3f3f3]/95 shadow-[0_16px_48px_rgba(0,0,0,.35)] backdrop-blur-xl">
            <div className="p-6 pb-4">
              <div className="mb-5 flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[#666]"><Search size={15} />Wpisz tutaj, aby wyszukać</div>
              <p className="mb-3 font-semibold">Przypięte</p>
              <div className="grid grid-cols-6 gap-1">
                {PINNED.map((a) => <button key={a} onClick={() => open(a)} className="flex flex-col items-center gap-1.5 rounded-[4px] p-2 text-[11.5px] hover:bg-black/[.05]">{APPS[a].icon(30)}<span className="line-clamp-2 text-center leading-tight">{APPS[a].name}</span></button>)}
                <button onClick={() => open('pdf')} className="flex flex-col items-center gap-1.5 rounded-[4px] p-2 text-[11.5px] hover:bg-black/[.05]">{APPS.pdf.icon(30)}<span className="text-center leading-tight">Arkusz</span></button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-black/[.06] bg-black/[.03] px-8 py-3">
              <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#5a7fb8] text-white">E</span>Egzamin</span>
              <button title="Zasilanie: zakończ egzamin" onClick={() => { setStart(false); void os.confirm('Zakończ egzamin', 'Zakończyć egzamin i oddać pracę do oceny?\nSprawdzony zostanie folder z numerem zdającego na pulpicie.').then((ok) => ok && onFinish()); }} className="rounded p-2 hover:bg-black/[.06]"><Power size={16} /></button>
            </div>
          </div>
        )}

        {/* pasek zadan */}
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 z-[140] flex h-12 items-center border-t border-black/10 bg-[#eef1f5]/90 px-2 backdrop-blur-xl">
          <div data-noshot="1" className="flex items-center gap-2">
            <span className="rounded-[6px] bg-[#1a1a1a]/85 px-2 py-1 text-[12px] font-semibold text-white" title="Czas do końca egzaminu">⏱ {hms}</span>
            <button onClick={() => void os.confirm('Zakończ egzamin', 'Zakończyć egzamin i oddać pracę do oceny?\nSprawdzony zostanie folder z numerem zdającego na pulpicie.').then((ok) => ok && onFinish())} className="rounded-[6px] bg-[#0067c0] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#1975c5]">Zakończ egzamin</button>
            <button onClick={() => void os.confirm('Przerwij', 'Przerwać próbę bez oceny?').then((ok) => ok && onAbort())} className="rounded-[6px] px-2 py-1 text-[12px] text-[#c42b1c] hover:bg-black/[.05]">Przerwij</button>
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            <button onClick={() => setStart((s) => !s)} className={`grid h-10 w-10 place-items-center rounded-[4px] hover:bg-white/70 ${start ? 'bg-white/70' : ''}`} title="Start"><LayoutGrid size={22} className="text-[#0067c0]" strokeWidth={2.2} /></button>
            <button className="grid h-10 w-10 place-items-center rounded-[4px] hover:bg-white/70" title="Wyszukaj" onClick={() => setStart(true)}><Search size={18} /></button>
            {[...PINNED.slice(0, 7), ...wins.map((w) => w.app).filter((a, i, all) => !PINNED.slice(0, 7).includes(a) && all.indexOf(a) === i)].map((a) => {
              const ws = wins.filter((w) => w.app === a); const act = ws.some((w) => w.id === active && !w.min);
              return (
                <button key={a} title={APPS[a].name} onClick={() => { if (!ws.length) open(a); else { const w = ws[ws.length - 1]; if (act) setWins((all) => all.map((x) => (x.id === w.id ? { ...x, min: true } : x))); else focus(w.id); } }}
                  className={`relative grid h-10 w-10 place-items-center rounded-[4px] ${act ? 'bg-white/80' : 'hover:bg-white/60'}`}>
                  {APPS[a].icon(24)}
                  {ws.length > 0 && <span className={`absolute bottom-0.5 h-[3px] rounded-full ${act ? 'w-4 bg-[#0067c0]' : 'w-1.5 bg-[#777]'}`} />}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1 text-[12px] text-[#1a1a1a]">
            <button data-noshot="1" onClick={() => void screenshot()} title="Zrzut ekranu (PrtSc / Win+Shift+S)" className="flex items-center gap-1 rounded-[4px] px-2 py-1.5 hover:bg-white/70"><Camera size={15} />PrtSc</button>
            <ChevronUp size={14} className="mx-1" /><span className="px-1">POL</span><Wifi size={15} className="mx-1" /><Volume2 size={15} className="mx-1" />
            <span className="ml-1 rounded-[4px] px-2 py-0.5 text-right leading-tight hover:bg-white/70">{d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}<br />{d.toLocaleDateString('pl-PL')}</span>
          </div>
        </div>

        {toast && (
          <div data-noshot="1" className="absolute bottom-16 right-3 z-[160] w-[360px] rounded-[8px] border border-black/10 bg-[#f9f9f9] p-3 text-[12.5px] text-[#1a1a1a] shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#555]"><Scissors size={13} />Narzędzie Wycinanie<button onClick={() => setToast(null)} className="ml-auto"><X size={13} /></button></div>
            <p className="font-semibold">Zrzut ekranu skopiowany do schowka</p><p className="text-[#555]">{toast}</p>
            {clip.image && <img src={clip.image} alt="" className="mt-2 w-full rounded border border-black/10" />}
          </div>
        )}
        {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
        {pick && <FileDialog o={pick.o} onDone={(p) => { pick.res(p); setPick(null); }} />}
        {msg && <MsgBox title={msg.title} text={msg.text} kind={msg.kind} confirm={msg.confirm} onDone={(ok) => { msg.res(ok); setMsg(null); }} />}
        {!ready && <div className="absolute inset-0 grid place-items-center bg-[#0f2f63] text-white">Przygotowywanie pulpitu…</div>}
      </div>
    </OSContext.Provider>
  );
}
