import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Power, Wifi, Volume2, ChevronUp, Camera, Scissors, Copy, ClipboardPaste, PenLine, Trash2, Plus, RotateCw, LayoutList, ArrowUpDown, Monitor, X, Brush, Maximize, Minimize } from 'lucide-react';
import type { Sheet } from '../../lib/types';
import { Vfs, useVfs, DESKTOP, RECYCLE, base, parent, isImage, isText, join, win as winPath } from '../../lib/vfs';
import { MysqlServer } from '../../lib/mysqlServer';
import { OSContext, APPS, FileIcon, SpecialIcon, defaultApp, OPEN_WITH, DND, dragStart, dropTo, isFileDrag, type AppId, type Win, type OS, type PickOpts } from './os';
import Window from './Window';
import { ContextMenu, FileDialog, MsgBox, Properties, type CItem, type CTop } from './ui';
import { StartSvg } from './icons';
import SnipApp, { SnipOverlay, SnipToast, SHOTS_DIR, shotName, type Frozen } from './Snip';
import Explorer from './apps/Explorer';
import Notepad from './apps/Notepad';
import SevenZip, { archiveItems } from './apps/SevenZip';

const Xampp = lazy(() => import('./apps/Xampp'));
const Browser = lazy(() => import('./apps/Browser'));
const NotepadPP = lazy(() => import('./apps/NotepadPP'));
const VSCode = lazy(() => import('./apps/VSCode'));
const Paint = lazy(() => import('./apps/Paint'));
const Graphics = lazy(() => import('./apps/Graphics'));
const PdfApp = lazy(() => import('./apps/PdfApp'));

const DARK: AppId[] = ['vscode', 'gimp', 'photoshop'];
const PINNED: AppId[] = ['explorer', 'browser', 'xampp', 'notepadpp', 'vscode', 'gimp', 'photoshop', 'paint', 'notepad', 'snip'];
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
  const [menu, setMenu] = useState<{ x: number; y: number; items: CItem[]; top?: CTop[] } | null>(null);
  const [props, setProps] = useState<string | null>(null);
  const [pick, setPick] = useState<{ o: PickOpts; res: (p: string | null) => void } | null>(null);
  const [msg, setMsg] = useState<{ title: string; text: string; kind?: 'error' | 'info' | 'warn'; confirm?: boolean; res: (ok: boolean) => void } | null>(null);
  const [clip, setClip] = useState<OS['clip']>({});
  const [frozen, setFrozen] = useState<Frozen | null>(null);
  const [snipToast, setSnipToast] = useState<string | null>(null);
  const toastT = useRef<number | undefined>(undefined);
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
        // prawdziwe archiwum z arkusza (spakowane), żeby rozmiar i właściwości się zgadzały
        const data = sheet.files.archiveUrl ? await fetch(sheet.files.archiveUrl).then((r) => (r.ok ? r.blob() : null)).then((bl) => bl && new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(bl); })).catch(() => null) : null;
        vfs.write(join(DESKTOP, arch), data ?? 'data:application/x-7z-compressed;base64,', true);
        vfs.write(DESKTOP + '/.init', '1');
      }
      if (on) setReady(true);
    })();
    return () => { on = false; };
  }, [vfs, server, sheet]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // przycisk „Wstecz” przegladarki nie wychodzi z maszyny: cofa w aktywnym oknie (Eksplorator, Edge)
  useEffect(() => {
    history.pushState({ p03vm: 1 }, '');
    const back = () => window.dispatchEvent(new Event('p03-vm-back'));
    const pop = () => { history.pushState({ p03vm: 1 }, ''); back(); };
    const mouse = (e: PointerEvent) => { if (e.button === 3) { e.preventDefault(); back(); } };
    const key = (e: KeyboardEvent) => { if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); } };
    window.addEventListener('popstate', pop); window.addEventListener('pointerdown', mouse); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('pointerdown', mouse); window.removeEventListener('keydown', key); };
  }, []);

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
  // zamkniecie z animacja (okno znika po 150 ms, jak w Windows)
  const [closing, setClosing] = useState<number[]>([]);
  const close = useCallback((id: number) => {
    setClosing((c) => [...c, id]);
    setTimeout(() => { setWins((ws) => ws.filter((w) => w.id !== id)); setClosing((c) => c.filter((x) => x !== id)); }, 150);
  }, []);
  const openPath = useCallback((p: string) => {
    if (vfs.isDir(p)) return open('explorer', { path: p });
    open(defaultApp(p), { path: p });
  }, [vfs, open]);

  /** PrtSc: zamrozenie ekranu i nakladka Narzedzia Wycinanie (jak w Windows 11). */
  async function screenshot() {
    if (frozen) return;
    const html2canvas = (await import('html2canvas-pro')).default;
    const el = root.current!;
    setSnipToast(null); setStart(false); setMenu(null);
    const scale = 1920 / el.clientWidth;
    const c = await html2canvas(el, { scale, backgroundColor: '#1e3a5f', logging: false, useCORS: true, ignoreElements: (n) => (n as HTMLElement).dataset?.noshot === '1' });
    const wr = [...el.querySelectorAll<HTMLElement>('[data-win]')].map((w) => { const r = w.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, title: w.innerText.split('\n')[0] }; });
    setFrozen({ img: c.toDataURL('image/png'), scale, wins: wr });
  }
  const snipDone = (url: string) => {
    setFrozen(null);
    setClip((cl) => ({ ...cl, image: url }));
    // Windows 11 zapisuje kazdy zrzut takze w Obrazy\Zrzuty ekranu
    try { vfs.write(join(SHOTS_DIR, shotName()), url, true); } catch { /* */ }
    setSnipToast(url);
    clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setSnipToast(null), 9000);
  };
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
    screenshot, properties: (p) => setProps(p),
  };

  // ---------- ikony pulpitu (siatka jak w Windows, przeciaganie, zaznaczanie ramka) ----------
  const CW = 84, CH = 100;
  const files = vfs.list(DESKTOP).filter((p) => !base(p).startsWith('.'));
  const binFull = vfs.list(RECYCLE).length > 0;
  type Ic = { key: string; label: string; icon: React.ReactNode; open: () => void; path?: string; dropDir?: string };
  const icons: Ic[] = [
    { key: 'pc', label: 'Ten komputer', icon: SpecialIcon.pc(44), open: () => open('explorer', { path: 'PC' }) },
    { key: 'trash', label: 'Kosz', icon: SpecialIcon.trash(44, binFull), open: () => open('explorer', { path: RECYCLE }), dropDir: RECYCLE },
    ...SHORTCUTS.map((a) => ({ key: a, label: APPS[a].name, icon: <span className="relative">{APPS[a].icon(42)}<ShortcutArrow /></span>, open: () => open(a) })),
    { key: 'pdf', label: 'Arkusz egzaminacyjny.pdf', icon: <span className="relative">{APPS.pdf.icon(44)}<ShortcutArrow /></span>, open: () => open('pdf') },
    ...files.map((p) => ({ key: p, label: base(p), icon: <FileIcon path={p} dir={vfs.isDir(p)} size={46} />, open: () => openPath(p), path: p, dropDir: vfs.isDir(p) ? p : undefined })),
  ];
  const posKey = `p03:icons:${attempt}`;
  const [pos, setPos] = useState<Record<string, [number, number]>>(() => { try { return JSON.parse(localStorage.getItem(posKey) ?? '{}'); } catch { return {}; } });
  useEffect(() => { try { localStorage.setItem(posKey, JSON.stringify(pos)); } catch { /* */ } }, [pos, posKey]);
  const rows = Math.max(3, Math.floor(((root.current?.clientHeight ?? 800) - 56) / CH));
  // pozycje: zapamietane albo pierwsze wolne pole (kolumnami od gory, jak w Windows)
  const placed = useMemo(() => {
    const out: Record<string, [number, number]> = {}; const used = new Set<string>();
    for (const ic of icons) { const q = pos[ic.key]; if (q && !used.has(q.join(','))) { out[ic.key] = q; used.add(q.join(',')); } }
    let c = 0, r = 0;
    for (const ic of icons) { if (out[ic.key]) continue; while (used.has(`${c},${r}`)) { r++; if (r >= rows) { r = 0; c++; } } out[ic.key] = [c, r]; used.add(`${c},${r}`); }
    return out;
  }, [icons.map((i) => i.key).join('|'), pos, rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const doRename = (p: string, name: string) => {
    setRen(null); const n = name.trim(); if (!n || n === base(p)) return;
    if (/[\\/:*?"<>|]/.test(n)) { void os.alert('Zmiana nazwy', 'Nazwa pliku nie może zawierać żadnego z następujących znaków:\n\\ / : * ? " < > |', 'error'); return; }
    try { const np = vfs.rename(p, n); setPos((ps) => { const q = { ...ps }; if (q[p]) { q[np] = q[p]; delete q[p]; } return q; }); setSel([np]); } catch (e) { void os.alert('Zmiana nazwy', (e as Error).message, 'error'); }
  };
  const newItem = (kind: 'dir' | 'txt', at?: [number, number]) => { const p = kind === 'dir' ? vfs.mkdir(vfs.unique(DESKTOP, 'Nowy folder')) : vfs.write(vfs.unique(DESKTOP, 'Nowy Dokument tekstowy.txt'), ''); if (at) setPos((ps) => ({ ...ps, [p]: at })); setSel([p]); setRen(p); };
  const paste = (dir = DESKTOP) => { const c = clip.files; if (!c) return; try { c.paths.forEach((p) => vfs.exists(p) && vfs.copy(p, dir, c.mode === 'cut')); if (c.mode === 'cut') setClip({ ...clip, files: undefined }); } catch (e) { void os.alert('Kopiowanie', (e as Error).message, 'error'); } };
  const selPaths = () => sel.filter((k) => k.startsWith('C:/'));
  const cellAt = (x: number, y: number): [number, number] => [Math.max(0, Math.round((x - 4 - CW / 2) / CW)), Math.max(0, Math.min(rows - 1, Math.round((y - 4 - CH / 2) / CH)))];
  const bgMenu = (e: React.MouseEvent) => {
    e.preventDefault(); setSel([]);
    const at = cellAt(e.clientX, e.clientY);
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'Widok', icon: <LayoutList size={14} />, sub: [{ label: 'Średnie ikony', run: () => {} }, '-', { label: 'Automatycznie rozmieść ikony', run: () => setPos({}) }, { label: 'Wyrównaj ikony do siatki', run: () => {} }] },
      { label: 'Sortuj według', icon: <ArrowUpDown size={14} />, sub: [{ label: 'Nazwa', run: () => setPos({}) }, { label: 'Rozmiar', run: () => setPos({}) }, { label: 'Typ elementu', run: () => setPos({}) }, { label: 'Data modyfikacji', run: () => setPos({}) }] },
      { label: 'Odśwież', icon: <RotateCw size={14} />, run: () => {} }, '-',
      { label: 'Wklej', icon: <ClipboardPaste size={14} />, run: () => paste(), off: !clip.files, key: 'Ctrl+V' },
      { label: 'Nowy', icon: <Plus size={14} />, sub: [{ label: 'Folder', icon: <FileIcon path="" dir size={16} />, run: () => newItem('dir', at) }, '-', { label: 'Dokument tekstowy', icon: <FileIcon path="a.txt" size={16} />, run: () => newItem('txt', at) }] }, '-',
      { label: 'Ustawienia ekranu', icon: <Monitor size={14} />, off: true }, { label: 'Personalizuj', icon: <Brush size={14} />, off: true },
    ] });
  };
  const iconMenu = (e: React.MouseEvent, ic: Ic) => {
    e.preventDefault(); e.stopPropagation();
    if (!sel.includes(ic.key)) setSel([ic.key]);
    const p = ic.path; const ps = sel.includes(ic.key) ? selPaths() : p ? [p] : [];
    const withApps: AppId[] = !p || vfs.isDir(p) ? [] : isImage(p) ? OPEN_WITH.image : isText(p) ? OPEN_WITH.text : [];
    setMenu({ x: e.clientX, y: e.clientY,
      top: p ? [{ label: 'Wytnij', icon: <Scissors size={16} />, run: () => setClip({ ...clip, files: { mode: 'cut', paths: ps } }) }, { label: 'Kopiuj', icon: <Copy size={16} />, run: () => setClip({ ...clip, files: { mode: 'copy', paths: ps } }) },
        { label: 'Zmień nazwę', icon: <PenLine size={16} />, run: () => setRen(p) }, { label: 'Usuń', icon: <Trash2 size={16} />, run: () => ps.forEach((x) => vfs.trash(x)) }] : undefined,
      items: [
        { label: 'Otwórz', icon: p ? <FileIcon path={p} dir={vfs.isDir(p)} size={16} /> : ic.key === 'pc' ? SpecialIcon.pc(16) : ic.key === 'trash' ? SpecialIcon.trash(16) : ic.key === 'pdf' ? APPS.pdf.icon(16) : APPS[ic.key as AppId]?.icon(16), run: ic.open, key: 'Enter' },
        ...(withApps.length ? [{ label: 'Otwórz za pomocą', sub: withApps.map((a) => ({ label: APPS[a].name, icon: APPS[a].icon(16), run: () => open(a, { path: p }) })) }] : []),
        ...(p && /\.(7z|zip)$/i.test(p) ? archiveItems(os, p) : []),
        ...(p && vfs.isDir(p) && clip.files ? [{ label: 'Wklej', icon: <ClipboardPaste size={14} />, run: () => paste(p) }] : []),
        ...(ic.key === 'trash' ? [{ label: 'Opróżnij Kosz', run: () => void os.confirm('Usuwanie wielu elementów', `Czy na pewno chcesz trwale usunąć te elementy (${vfs.list(RECYCLE).length})?`).then((ok) => ok && vfs.list(RECYCLE).forEach((x) => vfs.remove(x))), off: !binFull }] : []),
        ...(p ? [{ label: 'Kopiuj jako ścieżkę', key: 'Ctrl+Shift+C', run: () => void navigator.clipboard?.writeText(p.replace(/\//g, '\\')) }, { label: 'Właściwości', key: 'Alt+Enter', run: () => setProps(p) }] : []),
      ] });
  };
  /** Klawiatura na pulpicie (gdy zadne okno nie jest aktywne). */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[contenteditable],[data-win]') || pick || msg || props) return;
      if (active !== null && wins.some((w) => w.id === active && !w.min)) return;
      const c = e.ctrlKey || e.metaKey, key = e.key.toLowerCase(); const ps = selPaths();
      if (e.key === 'Delete' && ps.length) { e.preventDefault(); if (e.shiftKey) void os.confirm('Usuwanie', `Czy na pewno chcesz trwale usunąć ${ps.length === 1 ? 'ten element' : `te elementy (${ps.length})`}?`).then((ok) => ok && ps.forEach((x) => vfs.remove(x))); else ps.forEach((x) => vfs.trash(x)); setSel([]); }
      else if (e.key === 'F2' && ps.length === 1) { e.preventDefault(); setRen(ps[0]); }
      else if (e.key === 'Enter' && sel.length) { e.preventDefault(); sel.forEach((kk) => icons.find((i) => i.key === kk)?.open()); }
      else if (c && key === 'a') { e.preventDefault(); setSel(icons.map((i) => i.key)); }
      else if (c && key === 'c' && ps.length) setClip({ ...clip, files: { mode: 'copy', paths: ps } });
      else if (c && key === 'x' && ps.length) setClip({ ...clip, files: { mode: 'cut', paths: ps } });
      else if (c && key === 'v') paste();
      else if (c && e.shiftKey && key === 'n') { e.preventDefault(); newItem('dir'); }
      else if (e.altKey && e.key === 'Enter' && ps.length === 1) setProps(ps[0]);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  /** Skroty systemowe: Win (Start), Win+E, Win+D, Win+strzalki, Alt+F4. */
  const winKey = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'OS') { winKey.current = true; return; }
      if (e.metaKey) winKey.current = false;
      const aw = wins.find((w) => w.id === active);
      if (e.metaKey && e.key.toLowerCase() === 'e') { e.preventDefault(); open('explorer'); }
      else if (e.metaKey && e.key.toLowerCase() === 'd') { e.preventDefault(); setWins((ws) => ws.map((w) => ({ ...w, min: true }))); setActive(null); }
      else if (e.metaKey && aw && e.key === 'ArrowUp') { e.preventDefault(); patch(aw.id, { max: true }); }
      else if (e.metaKey && aw && e.key === 'ArrowDown') { e.preventDefault(); patch(aw.id, aw.max ? { max: false } : { min: true }); }
      else if (e.metaKey && aw && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); snapTo(aw.id, e.key === 'ArrowLeft' ? 'left' : 'right'); }
      else if (e.altKey && e.key === 'F4' && aw) { e.preventDefault(); close(aw.id); }
      // Ctrl+W zamyka okno w maszynie (aplikacje z kartami obsluguja to same), F5/Ctrl+R nie przeladowuje strony
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'w') { e.preventDefault(); if (aw && !['notepad', 'notepadpp', 'vscode', 'paint'].includes(aw.app)) close(aw.id); }
      else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) { e.preventDefault(); }
      else if (e.key === 'F11') { e.preventDefault(); void toggleFull(); }
    };
    const up = (e: KeyboardEvent) => { if ((e.key === 'Meta' || e.key === 'OS') && winKey.current) { winKey.current = false; setStart((s) => !s); } };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });
  /** Pelny ekran z blokada klawiatury (Chrome/Edge): Ctrl+W, Ctrl+N, Win itp. trafiaja do maszyny, nie do przegladarki. */
  const [full, setFull] = useState(false);
  const [fullTip, setFullTip] = useState(false);
  useEffect(() => {
    const ch = () => { const on = !!document.fullscreenElement; setFull(on); if (!on) { try { (navigator as unknown as { keyboard?: { unlock: () => void } }).keyboard?.unlock(); } catch { /* */ } } };
    document.addEventListener('fullscreenchange', ch); return () => document.removeEventListener('fullscreenchange', ch);
  }, []);
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await root.current?.requestFullscreen({ navigationUI: 'hide' });
      await (navigator as unknown as { keyboard?: { lock: (k?: string[]) => Promise<void> } }).keyboard?.lock();
      setFullTip(true); setTimeout(() => setFullTip(false), 6000);
    } catch { void os.alert('Pełny ekran', 'Ta przeglądarka nie pozwoliła włączyć pełnego ekranu.', 'warn'); }
  };
  const patch = (id: number, p: Partial<Win>) => setWins((ws) => ws.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const [snapHint, setSnapHint] = useState<'max' | 'left' | 'right' | null>(null);
  const snapTo = (id: number, side: 'max' | 'left' | 'right') => {
    const W = root.current?.clientWidth ?? 1280, H = (root.current?.clientHeight ?? 800) - 48;
    if (side === 'max') patch(id, { max: true });
    else patch(id, { max: false, x: side === 'left' ? 0 : W / 2, y: 0, w: W / 2, h: H });
  };

  const left = Math.max(0, endsAt - now);
  const hms = `${Math.floor(left / 3600000)}:${String(Math.floor((left % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  const d = new Date(now);
  const [taskMenu, setTaskMenu] = useState<{ x: number; app: AppId } | null>(null);
  const [cal, setCal] = useState(false);
  const [q, setQ] = useState('');
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
      case 'snip': return <SnipApp win={w} />;
    }
  };
  const finish = () => void os.confirm('Zakończ egzamin', 'Zakończyć egzamin i oddać pracę do oceny?\nSprawdzony zostanie folder z numerem zdającego na pulpicie.').then((ok) => ok && onFinish());
  const apps: AppId[] = [...PINNED, 'pdf'];
  const found = apps.filter((a) => APPS[a].name.toLowerCase().includes(q.toLowerCase()));
  // wyszukiwanie w calym dysku jak w Windows: foldery i pliki (bez ukrytych, Kosza i AppData)
  const ql = q.trim().toLowerCase();
  const hits = !ql ? [] : [...vfs.nodes.keys()].filter((k) => !/\/\.|\$Recycle\.Bin|\/AppData(\/|$)/i.test(k) && base(k).toLowerCase().includes(ql))
    .sort((x, y) => Number(base(y).toLowerCase() === ql) - Number(base(x).toLowerCase() === ql) || Number(base(y).toLowerCase().startsWith(ql)) - Number(base(x).toLowerCase().startsWith(ql)) || Number(vfs.isDir(y)) - Number(vfs.isDir(x)) || x.length - y.length).slice(0, 8);
  const openHit = (p: string) => { openPath(p); setQ(''); setStart(false); };

  return (
    <OSContext.Provider value={os}>
      <div ref={root} data-vm className="fixed inset-0 z-[80] select-none overflow-hidden font-['Segoe_UI_Variable','Segoe_UI',system-ui,sans-serif] text-[13px]"
        style={{ background: 'radial-gradient(ellipse at 30% 110%, #4d8fd9 0%, transparent 55%), radial-gradient(ellipse at 80% -10%, #7aa8e6 0%, transparent 50%), linear-gradient(135deg,#0f2f63 0%,#1b4f9c 45%,#2a6fd0 70%,#173f7a 100%)' }}
        onContextMenu={bgMenu}
        onPointerDown={(e) => { setStart(false); setCal(false); setTaskMenu(null); if (e.button === 0 && e.target === e.currentTarget) { setSel([]); setActive(null); setBand({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY }); } }}
        onPointerMove={(e) => { if (!band) return; const b = { ...band, x1: e.clientX, y1: e.clientY }; setBand(b);
          const [x0, x1] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1)], [y0, y1] = [Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
          setSel(icons.filter((ic) => { const [c, r] = placed[ic.key]; const ix = 4 + c * CW, iy = 4 + r * CH; return ix < x1 && ix + CW - 6 > x0 && iy < y1 && iy + CH - 6 > y0; }).map((i) => i.key)); }}
        onPointerUp={() => setBand(null)}
        onDragOver={(e) => { if (isFileDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; } }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(DND); const at = cellAt(e.clientX, e.clientY);
          if (raw) { const ps = JSON.parse(raw) as string[]; const onDesk = ps.filter((x) => x.startsWith(DESKTOP + '/') && !x.slice(DESKTOP.length + 1).includes('/'));
            if (onDesk.length === ps.length && !e.ctrlKey) { e.preventDefault(); const [pc, pr] = placed[ps[0]] ?? at; setPos((old) => { const n = { ...old }; for (const x of ps) { const [c, r] = placed[x] ?? at; n[x] = [Math.max(0, c + at[0] - pc), Math.max(0, Math.min(rows - 1, r + at[1] - pr))]; } return n; }); return; } }
          void dropTo(os, e, DESKTOP);
        }}>
        {/* ikony pulpitu */}
        {ready && icons.map((ic) => { const [c, r] = placed[ic.key]; const cut = clip.files?.mode === 'cut' && ic.path && clip.files.paths.includes(ic.path); const on = sel.includes(ic.key); return (
          <div key={ic.key} style={{ left: 4 + c * CW, top: 4 + r * CH, width: CW - 6 }}
            draggable={ren !== ic.path} onDragStart={(e) => { const ks = on ? sel : [ic.key]; if (!on) setSel([ic.key]); dragStart(e, ks.filter((k) => k.startsWith('C:/')).length ? ks.filter((k) => k.startsWith('C:/')) : [ic.key]); }}
            onDragOver={(e) => { if (ic.dropDir && isFileDrag(e)) { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('bg-white/30'); } }}
            onDragLeave={(e) => e.currentTarget.classList.remove('bg-white/30')}
            onDrop={(e) => { e.currentTarget.classList.remove('bg-white/30'); if (ic.dropDir) void dropTo(os, e, ic.dropDir); }}
            onPointerDown={(e) => { e.stopPropagation(); setActive(null); if (e.button !== 0) return; setSel((s) => (e.ctrlKey ? (s.includes(ic.key) ? s.filter((x) => x !== ic.key) : [...s, ic.key]) : s.includes(ic.key) ? s : [ic.key])); }}
            onDoubleClick={ic.open} onContextMenu={(e) => iconMenu(e, ic)}
            className={`absolute flex flex-col items-center gap-0.5 rounded-[3px] border px-0.5 pb-1 pt-1.5 text-center text-white ${on ? 'border-white/45 bg-[#cde8ff]/30' : 'border-transparent hover:border-white/20 hover:bg-white/10'} ${cut ? 'opacity-50' : ''}`}>
            <span className="pointer-events-none grid h-[48px] place-items-center drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]">{ic.icon}</span>
            {ren === ic.path && ic.path ? <textarea autoFocus defaultValue={ic.label} onPointerDown={(e) => e.stopPropagation()} onFocus={(e) => { const v = e.target.value; e.target.setSelectionRange(0, vfs.isDir(ic.path!) || v.lastIndexOf('.') <= 0 ? v.length : v.lastIndexOf('.')); }}
              onBlur={(e) => doRename(ic.path!, e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); doRename(ic.path!, (e.target as HTMLTextAreaElement).value); } if (e.key === 'Escape') setRen(null); }}
              className="w-full resize-none border border-[#0067c0] bg-white px-0.5 text-center text-[12px] leading-tight text-black outline-none" rows={2} />
              : <span className={`pointer-events-none break-words text-[12px] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,.85)] ${on ? '' : 'line-clamp-2'}`}>{ic.label}</span>}
          </div>); })}
        {band && <div className="pointer-events-none absolute z-[5] border border-[#3a8ee6] bg-[#3a8ee6]/25" style={{ left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0) }} />}

        {/* okna */}
        {wins.map((w) => (
          <Window key={w.id} win={w} frameless={w.app === 'vscode'} closing={closing.includes(w.id)} ghost={w.app === 'sevenzip' && !!w.args.extract} active={active === w.id} dark={DARK.includes(w.app)} onFocus={() => active !== w.id && focus(w.id)} onClose={() => close(w.id)}
            onChange={(p) => patch(w.id, p)} onSnapHint={setSnapHint} onSnap={(side) => snapTo(w.id, side)}
            bar={w.app === 'explorer' ? <span className="flex h-full flex-1 items-end gap-1 pl-1"><span className="mb-[-1px] flex h-[30px] w-[230px] items-center gap-2 rounded-t-[8px] bg-[#f9f9f9] px-3 text-[12px] shadow-[0_-1px_2px_rgba(0,0,0,.05)]">{APPS.explorer.icon(16)}<span className="flex-1 truncate">{w.title}</span><button onPointerDown={(e) => e.stopPropagation()} onClick={() => close(w.id)} className="rounded p-0.5 hover:bg-black/10"><X size={12} /></button></span><button onPointerDown={(e) => e.stopPropagation()} onClick={() => open('explorer')} className="mb-1 rounded p-1 hover:bg-black/[.06]" title="Nowa karta"><Plus size={14} /></button><span className="flex-1" /></span> : undefined}>
            <Suspense fallback={<div className="grid h-full place-items-center bg-white text-[#666]">Uruchamianie…</div>}>{renderApp(w)}</Suspense>
          </Window>
        ))}
        {snapHint && <div className="pointer-events-none absolute z-[130] rounded-[8px] border border-white/60 bg-white/25 backdrop-blur-sm transition-all" style={snapHint === 'max' ? { left: 6, top: 6, right: 6, bottom: 54 } : snapHint === 'left' ? { left: 6, top: 6, width: 'calc(50% - 9px)', bottom: 54 } : { right: 6, top: 6, width: 'calc(50% - 9px)', bottom: 54 }} />}

        {fullTip && <div data-noshot="1" className="pointer-events-none absolute left-1/2 top-4 z-[300] -translate-x-1/2 rounded-[8px] bg-black/75 px-4 py-2 text-[13px] text-white shadow-lg">Pełny ekran: skróty klawiszowe działają w maszynie. Aby wyjść, przytrzymaj Esc.</div>}
        {/* menu Start */}
        {start && (
          <div onPointerDown={(e) => e.stopPropagation()} className="p03-start absolute bottom-[56px] left-1/2 z-[150] w-[640px] -translate-x-1/2 overflow-hidden rounded-[8px] border border-black/10 bg-[#f3f3f3]/95 shadow-[0_16px_48px_rgba(0,0,0,.35)] backdrop-blur-xl">
            <div className="p-6 pb-4">
              <label className="mb-5 flex items-center gap-2 rounded-full border border-black/10 border-b-[#0067c0] bg-white px-4 py-2"><Search size={15} className="text-[#666]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (found[0]) { open(found[0]); setQ(''); setStart(false); } else if (hits[0]) openHit(hits[0]); } if (e.key === 'Escape') setStart(false); }} placeholder="Wpisz tutaj, aby wyszukać" className="flex-1 bg-transparent outline-none" /></label>
              {!q ? <>
                <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Przypięte</p><span className="rounded-[4px] bg-white px-2 py-0.5 text-[12px]">Wszystkie aplikacje ›</span></div>
                <div className="grid min-h-[150px] grid-cols-6 content-start gap-1">
                  {found.map((a) => <button key={a} onClick={() => { open(a); setQ(''); }} className="flex flex-col items-center gap-1.5 rounded-[4px] p-2 text-[11.5px] hover:bg-black/[.05]">{APPS[a].icon(32)}<span className="line-clamp-2 text-center leading-tight">{a === 'pdf' ? 'Arkusz' : APPS[a].name}</span></button>)}
                </div>
              </> : (() => {
                // wyniki jak w wyszukiwarce Windows: najlepsze dopasowanie, potem aplikacje i pliki
                type R = { key: string; icon: React.ReactNode; name: string; sub: string; run: () => void };
                const ra: R[] = found.map((a) => ({ key: a, icon: APPS[a].icon(24), name: a === 'pdf' ? 'Arkusz' : APPS[a].name, sub: 'Aplikacja', run: () => { open(a); setQ(''); setStart(false); } }));
                const rf: R[] = hits.map((h) => ({ key: h, icon: <FileIcon path={h} dir={vfs.isDir(h)} size={24} />, name: base(h), sub: vfs.isDir(h) ? `Folder plików · ${winPath(parent(h))}` : winPath(parent(h)), run: () => openHit(h) }));
                const all = [...ra, ...rf]; const best = all[0];
                if (!best) return <p className="py-10 text-center text-[#666]">Brak wyników dla „{q}”.</p>;
                const row = (r: R) => <button key={r.key} onClick={r.run} className="flex w-full items-center gap-3 rounded-[4px] px-2 py-1.5 text-left hover:bg-black/[.05]">{r.icon}<span className="min-w-0 flex-1"><span className="block truncate text-[12.5px]">{r.name}</span><span className="block truncate text-[11px] text-[#666]">{r.sub}</span></span></button>;
                const restA = ra.filter((r) => r !== best), restF = rf.filter((r) => r !== best);
                return <div className="grid min-h-[260px] grid-cols-[1fr_250px] gap-4">
                  <div className="min-w-0 space-y-3">
                    {restA.length > 0 && <div><p className="mb-1 font-semibold">Aplikacje</p>{restA.map(row)}</div>}
                    {restF.length > 0 && <div><p className="mb-1 font-semibold">{restF.every((r) => vfs.isDir(r.key)) ? 'Foldery' : restF.some((r) => vfs.isDir(r.key)) ? 'Foldery i dokumenty' : 'Dokumenty'}</p><div className="max-h-[230px] overflow-auto">{restF.map(row)}</div></div>}
                    {!restA.length && !restF.length && <p className="text-[12px] text-[#666]">Brak innych wyników.</p>}
                  </div>
                  <div className="flex flex-col items-center rounded-[8px] bg-white/70 p-5 text-center">
                    <p className="mb-3 self-start font-semibold">Najlepsze dopasowanie</p>
                    <span className="scale-[1.6] py-3">{best.icon}</span>
                    <p className="mt-3 w-full truncate font-semibold">{best.name}</p><p className="w-full truncate text-[12px] text-[#666]">{best.sub}</p>
                    <button onClick={best.run} className="mt-4 rounded-[4px] border border-black/10 bg-white px-4 py-1 text-[12px] hover:bg-[#f5f5f5]">Otwórz</button>
                  </div>
                </div>;
              })()}
              {!q && <><p className="mb-2 mt-4 font-semibold">Polecane</p><div className="grid grid-cols-2 gap-1">{vfs.list(DESKTOP).filter((p) => !base(p).startsWith('.')).slice(0, 4).map((p) => <button key={p} onClick={() => { openPath(p); setStart(false); }} className="flex items-center gap-3 rounded-[4px] p-2 text-left hover:bg-black/[.05]"><FileIcon path={p} dir={vfs.isDir(p)} size={28} /><span className="truncate text-[12px]">{base(p)}<br /><span className="text-[#666]">Pulpit</span></span></button>)}</div></>}
            </div>
            <div className="flex items-center justify-between border-t border-black/[.06] bg-black/[.03] px-8 py-3">
              <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#5a7fb8] text-white">E</span>Egzamin</span>
              <button title="Zasilanie: zakończ egzamin" onClick={() => { setStart(false); finish(); }} className="rounded p-2 hover:bg-black/[.06]"><Power size={16} /></button>
            </div>
          </div>
        )}
        {cal && (
          <div onPointerDown={(e) => e.stopPropagation()} className="p03-start absolute bottom-[56px] right-2 z-[150] w-[330px] rounded-[8px] border border-black/10 bg-[#f3f3f3]/95 p-4 text-[#1a1a1a] shadow-2xl backdrop-blur-xl">
            <p className="mb-3 font-semibold">{d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="mb-2 text-[13px] capitalize">{d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[12px]">{['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'].map((x) => <span key={x} className="text-[#666]">{x}</span>)}
              {(() => { const f = new Date(d.getFullYear(), d.getMonth(), 1); const pad = (f.getDay() + 6) % 7; const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return [...Array(pad).fill(0), ...Array.from({ length: n }, (_, i) => i + 1)].map((x, i) => <span key={i} className={`grid h-8 place-items-center rounded-full ${x === d.getDate() ? 'bg-[#0067c0] text-white' : ''}`}>{x || ''}</span>); })()}</div>
          </div>
        )}
        {taskMenu && (
          <div onPointerDown={(e) => e.stopPropagation()} style={{ left: Math.max(4, taskMenu.x - 120) }} className="p03-pop-up absolute bottom-[54px] z-[150] w-[240px] rounded-[8px] border border-black/10 bg-[#f9f9f9]/95 p-1 text-[12.5px] shadow-2xl backdrop-blur">
            <p className="flex items-center gap-2 px-2 py-1.5 font-semibold">{APPS[taskMenu.app].icon(16)}{APPS[taskMenu.app].name}</p>
            <button onClick={() => { open(taskMenu.app); setTaskMenu(null); }} className="block w-full rounded px-3 py-1.5 text-left hover:bg-black/[.05]">Otwórz nowe okno</button>
            {wins.some((w) => w.app === taskMenu.app) && <button onClick={() => { setWins((ws) => ws.filter((w) => w.app !== taskMenu.app)); setTaskMenu(null); }} className="block w-full rounded px-3 py-1.5 text-left hover:bg-black/[.05]">{wins.filter((w) => w.app === taskMenu.app).length > 1 ? 'Zamknij wszystkie okna' : 'Zamknij okno'}</button>}
          </div>
        )}

        {/* pasek zadan */}
        <div onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute inset-x-0 bottom-0 z-[140] flex h-12 items-center border-t border-black/10 bg-[#eef1f5]/90 px-2 backdrop-blur-xl">
          <div data-noshot="1" className="flex items-center gap-2">
            <span className="rounded-[6px] bg-[#1a1a1a]/85 px-2 py-1 text-[12px] font-semibold text-white" title="Czas do końca egzaminu">⏱ {hms}</span>
            <button onClick={finish} className="rounded-[6px] bg-[#0067c0] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#1975c5]">Zakończ egzamin</button>
            <button onClick={() => void os.confirm('Przerwij', 'Przerwać próbę bez oceny?').then((ok) => ok && onAbort())} className="rounded-[6px] px-2 py-1 text-[12px] text-[#c42b1c] hover:bg-black/[.05]">Przerwij</button>
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            <button onClick={() => setStart((s) => !s)} className={`grid h-10 w-10 place-items-center rounded-[4px] hover:bg-white/70 ${start ? 'bg-white/70' : ''}`} title="Start"><StartSvg size={22} /></button>
            <button className="flex h-8 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 text-[12px] text-[#555] hover:bg-white" onClick={() => setStart(true)}><Search size={14} />Wyszukaj</button>
            {[...PINNED.slice(0, 7), ...wins.map((w) => w.app).filter((a, i, all) => !PINNED.slice(0, 7).includes(a) && all.indexOf(a) === i)].map((a) => {
              const ws = wins.filter((w) => w.app === a); const act = ws.some((w) => w.id === active && !w.min);
              return (
                <button key={a} title={ws.length ? ws.map((w) => w.title).join('\n') : APPS[a].name} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setTaskMenu({ x: e.clientX, app: a }); }}
                  onClick={() => { if (!ws.length) open(a); else { const w = ws[ws.length - 1]; if (act) patch(w.id, { min: true }); else focus(w.id); } }}
                  className={`relative grid h-10 w-10 place-items-center rounded-[4px] ${act ? 'bg-white/80' : 'hover:bg-white/60'}`}>
                  {APPS[a].icon(24)}
                  {ws.length > 0 && <span className={`absolute bottom-0.5 h-[3px] rounded-full transition-all duration-200 ${act ? 'w-4 bg-[#0067c0]' : 'w-1.5 bg-[#777]'}`} />}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1 text-[12px] text-[#1a1a1a]">
            <button data-noshot="1" onClick={() => void toggleFull()} title={full ? 'Wyjdź z pełnego ekranu (przytrzymaj Esc albo F11)' : 'Pełny ekran: skróty (Ctrl+W, Win, Alt+Tab) działają w maszynie, a nie w przeglądarce'} className="flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-white/80 px-2 py-1.5 hover:bg-white">{full ? <Minimize size={15} /> : <Maximize size={15} />}</button>
            <button data-noshot="1" onClick={() => void screenshot()} title="Zrzut ekranu (PrtSc / Win+Shift+S)" className="flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-white/80 px-2.5 py-1.5 font-semibold hover:bg-white"><Camera size={15} className="text-[#0067c0]" />Zrzut ekranu</button>
            <ChevronUp size={14} className="mx-1" /><span className="px-1">POL</span><Wifi size={15} className="mx-1" /><Volume2 size={15} className="mx-1" />
            <button onClick={() => setCal((v) => !v)} className="ml-1 rounded-[4px] px-2 py-0.5 text-right leading-tight hover:bg-white/70">{d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}<br />{d.toLocaleDateString('pl-PL')}</button>
            <button title="Pokaż pulpit" onClick={() => { setWins((ws) => ws.map((w) => ({ ...w, min: true }))); setActive(null); }} className="ml-1 h-10 w-1.5 border-l border-black/20 hover:bg-white/70" />
          </div>
        </div>

        {snipToast && <SnipToast img={snipToast} onOpen={() => { setSnipToast(null); open('snip', { img: snipToast }); }} onClose={() => setSnipToast(null)} />}
        {frozen && <SnipOverlay frozen={frozen} onDone={snipDone} onCancel={() => setFrozen(null)} />}
        {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
        {props && <Properties path={props} onClose={() => setProps(null)} />}
        {pick && <FileDialog o={pick.o} onDone={(p) => { pick.res(p); setPick(null); }} />}
        {msg && <MsgBox title={msg.title} text={msg.text} kind={msg.kind} confirm={msg.confirm} onDone={(ok) => { msg.res(ok); setMsg(null); }} />}
        {!ready && <div className="absolute inset-0 grid place-items-center bg-[#0f2f63] text-white">Przygotowywanie pulpitu…</div>}
      </div>
    </OSContext.Provider>
  );
}

/** Strzalka skrotu (lewy dolny rog ikony). */
function ShortcutArrow() {
  return <span className="absolute -bottom-0.5 -left-0.5 grid h-3.5 w-3.5 place-items-center rounded-[2px] border border-[#999] bg-white"><svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 8c0-3 2-5 5-5" stroke="#0067c0" strokeWidth="1.6" fill="none" /><path d="M5 1.5h3v3" stroke="#0067c0" strokeWidth="1.6" fill="none" /></svg></span>;
}
