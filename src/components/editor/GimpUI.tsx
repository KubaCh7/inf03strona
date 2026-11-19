import { useEffect, useRef, useState } from 'react';
import { Move, SquareDashed, Wand2, Crop, Scaling, RotateCw, FlipHorizontal2, Type, PaintBucket, Brush, Eraser, Pipette, ZoomIn, Eye, EyeOff, Link2, Link2Off, Plus, Copy, ArrowUp, ArrowDown, Trash2, Anchor, FolderPlus, Minus, Square, X, Image as Img, Folder, Monitor, Clock, Search } from 'lucide-react';
import Canvas from './Canvas';
import { MenuBar, type MItem, type Skin } from './Menu';
import type { Ed, Src, Tool } from './engine';
import { rgbOf } from '../../lib/imageOps';

const SKIN: Skin = { bar: 'bg-[#454545] text-[#dcdcdc] text-[13px]', pop: 'bg-[#3b3b3b] text-[#dcdcdc] text-[13px] border border-[#2a2a2a]', hover: 'bg-[#5f86b9] text-white', item: 'hover:bg-[#5f86b9] hover:text-white', sep: 'bg-[#555]', dim: 'text-[#808080]' };
type Dlg = null | 'open' | 'layers' | 'new' | 'scale' | 'canvas' | 'c2a' | 'export' | 'exportType' | 'newLayer';
const inp = 'h-[24px] rounded-[3px] border border-[#2a2a2a] bg-[#2e2e2e] px-1.5 text-[#e6e6e6] outline-none focus:border-[#5f86b9]';
const btn = 'h-[26px] rounded-[3px] border border-[#2a2a2a] bg-[#505050] px-3 text-[#e6e6e6] hover:bg-[#5c5c5c] active:bg-[#444]';

function GDialog({ title, head, sub, children, buttons, onClose, wide }: { title: string; head?: string; sub?: string; children: React.ReactNode; buttons: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/25">
      <div className={`flex flex-col border border-[#1f1f1f] bg-[#454545] text-[13px] text-[#dcdcdc] shadow-[0_10px_40px_rgba(0,0,0,.7)] ${wide ? 'w-[760px]' : 'w-[440px]'} max-w-[96vw]`}>
        <div className="flex items-center bg-[#2b2b2b] px-3 py-1.5 text-[12px]"><span className="flex-1">{title}</span><button onClick={onClose} className="px-1 hover:bg-[#c42b1c]"><X size={14} /></button></div>
        {head && <div className="flex items-center gap-3 border-b border-[#3a3a3a] px-4 py-3"><Img size={30} className="text-[#9aa]" /><div><p className="text-[15px] font-bold">{head}</p>{sub && <p className="text-[12px] opacity-70">{sub}</p>}</div></div>}
        <div className="space-y-3 p-4">{children}</div>
        <div className="flex items-center gap-2 border-t border-[#3a3a3a] px-4 py-3">{buttons}</div>
      </div>
    </div>
  );
}

export default function GimpUI({ ed, sources, hints, defaultName, hasParamShot, onClose, modeSwitch }: { ed: Ed; sources: Src[]; hints: string[]; defaultName?: string; hasParamShot: boolean; onClose: () => void; modeSwitch: React.ReactNode }) {
  const [dlg, setDlg] = useState<Dlg>(ed.L ? null : 'open');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dockTab, setDockTab] = useState<'layers' | 'channels' | 'paths' | 'undo'>('layers');
  const [hintOpen, setHintOpen] = useState(true);
  const file = useRef<HTMLInputElement>(null);
  const fileAsLayer = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const { W, H, L, layers, act } = ed;
  const has = !!L;

  // pola okien dialogowych
  const [sw, setSw] = useState(0); const [sh, setSh] = useState(0); const [chain, setChain] = useState(true);
  const [cw, setCw] = useState(0); const [ch, setCh] = useState(0); const [ox, setOx] = useState(0); const [oy, setOy] = useState(0);
  const [c2a, setC2a] = useState('#ffffff'); const [c2aT, setC2aT] = useState(0.1);
  const [nw, setNw] = useState(1920); const [nh, setNh] = useState(1080); const [nfill, setNfill] = useState<'white' | 'fg' | 'bg' | 'transparent'>('bg');
  const [name, setName] = useState(defaultName ?? 'Bez nazwy.png');
  const [quality, setQuality] = useState(90);
  const [anim, setAnim] = useState(true); const [gloop, setGloop] = useState(true); const [delay, setDelay] = useState(100); const [mode, setMode] = useState<'r' | 'c' | 'u'>('u'); const [useAll, setUseAll] = useState(false);
  const [lname, setLname] = useState('Warstwa');
  const show = (d: Dlg) => {
    if (d === 'scale') { setSw(W); setSh(H); setChain(true); }
    if (d === 'canvas') { setCw(W); setCh(H); setOx(0); setOy(0); }
    if (d === 'export') setName((n) => (n === 'Bez nazwy.png' && defaultName ? defaultName : n));
    setDlg(d);
  };
  const ext = (/\.(\w+)$/.exec(name)?.[1] ?? '').toLowerCase();
  const doExport = async () => {
    const ok = await ed.exportAs(name, { quality: quality / 100, anim: ext === 'gif' && anim && layers.length > 1, delay, loop: gloop, replace: mode !== 'c', shotEl: root.current });
    if (ok) setDlg(null);
  };

  const T = (id: Tool, I: typeof Move, label: string, key: string) => ({ id, I, label, key });
  const TOOLS = [
    T('move', Move, 'Przesunięcie', 'M'), T('rect', SquareDashed, 'Zaznaczenie prostokątne', 'R'), T('wand', Wand2, 'Zaznaczanie rozmyte', 'U'), T('crop', Crop, 'Kadrowanie', 'Shift+C'),
    T('scale', Scaling, 'Skalowanie', 'Shift+S'), T('rotate', RotateCw, 'Obrót (o 90°)', 'Shift+R'), T('flip', FlipHorizontal2, 'Odbicie', 'Shift+F'), T('text', Type, 'Tekst', 'T'),
    T('bucket', PaintBucket, 'Wypełnienie kubełkiem', 'Shift+B'), T('brush', Brush, 'Pędzel', 'P'), T('eraser', Eraser, 'Gumka', 'Shift+E'), T('picker', Pipette, 'Pobieranie koloru', 'O'), T('zoom', ZoomIn, 'Powiększenie', 'Z'),
  ];

  const off = (x = false) => ({ off: !has || x });
  const MENUS: [string, MItem[]][] = [
    ['Plik', [{ label: 'Nowy…', key: 'Ctrl+N', run: () => show('new') }, { label: 'Utwórz', sub: [{ label: 'Ze schowka', off: true }], off: true }, { label: 'Otwórz…', key: 'Ctrl+O', run: () => show('open') }, { label: 'Otwórz jako warstwy…', key: 'Ctrl+Alt+O', run: () => show('layers'), ...off() }, { label: 'Otwórz położenie…', off: true }, { label: 'Ostatnio otwierane', sub: [], off: true }, '-',
      { label: 'Zapisz', key: 'Ctrl+S', off: true }, { label: 'Zapisz jako…', key: 'Shift+Ctrl+S', off: true }, { label: 'Zapisz kopię…', off: true }, { label: 'Przywróć', off: true }, '-',
      { label: 'Eksportuj do…', key: 'Ctrl+E', run: () => show('export'), ...off() }, { label: 'Nadpisz…', off: true }, { label: 'Eksportuj jako…', key: 'Shift+Ctrl+E', run: () => show('export'), ...off() }, '-', { label: 'Utwórz szablon…', off: true }, '-', { label: 'Drukuj…', key: 'Ctrl+P', off: true }, '-',
      { label: 'Zamknij widok', key: 'Ctrl+W', run: onClose }, { label: 'Zamknij wszystko', key: 'Shift+Ctrl+W', run: onClose }, { label: 'Zakończ', key: 'Ctrl+Q', run: onClose }]],
    ['Edycja', [{ label: `Cofnij${ed.hist.length ? ' ' + ed.hist[ed.hist.length - 1].label : ''}`, key: 'Ctrl+Z', run: ed.undo, off: !ed.hist.length }, { label: 'Ponów', key: 'Ctrl+Y', run: ed.redoAct, off: !ed.redo.length }, { label: 'Historia cofnięć', run: () => setDockTab('undo') }, '-',
      { label: 'Wytnij', key: 'Ctrl+X', off: true }, { label: 'Kopiuj', key: 'Ctrl+C', off: true }, { label: 'Wklej', key: 'Ctrl+V', off: true }, '-', { label: 'Wyczyść', key: 'Delete', run: ed.clear, ...off() },
      { label: 'Wypełnij kolorem pierwszoplanowym', key: 'Ctrl+,', run: () => ed.sel && ed.fill(ed.sel.x, ed.sel.y), off: !ed.sel }, { label: 'Wypełnij kolorem tła', key: 'Ctrl+.', off: true }, '-', { label: 'Preferencje', off: true }, { label: 'Skróty klawiszowe', off: true }]],
    ['Zaznaczenie', [{ label: 'Wszystko', key: 'Ctrl+A', run: () => ed.setSel({ x: 0, y: 0, w: W, h: H }), ...off() }, { label: 'Nic', key: 'Shift+Ctrl+A', run: () => ed.setSel(null), off: !ed.sel }, { label: 'Odwróć', key: 'Ctrl+I', off: true }, { label: 'Pływające', off: true }, { label: 'Według koloru', key: 'Shift+O', off: true }, '-', { label: 'Zmiękcz…', off: true }, { label: 'Zaokrąglony prostokąt…', off: true }]],
    ['Widok', [{ label: 'Powiększenie', sub: [{ label: 'Dopasuj obraz do okna', key: 'Shift+Ctrl+J', run: () => ed.setZoom(0) }, '-', ...[8, 4, 2, 1, 0.5, 0.25].map((z) => ({ label: `${z * 100}% (${z >= 1 ? z + ':1' : '1:' + 1 / z})`, key: z === 1 ? '1' : undefined, run: () => ed.setZoom(z) }))], ...off() }, { label: 'Odwróć poziomo', off: true }, '-', { label: 'Pokaż zaznaczenie', key: 'Ctrl+T', check: true, off: true }, { label: 'Pokaż linijki', key: 'Shift+Ctrl+R', check: true, off: true }]],
    ['Obraz', [{ label: 'Duplikuj', key: 'Ctrl+D', off: true }, { label: 'Tryb', sub: [], off: true }, { label: 'Precyzja', sub: [], off: true }, { label: 'Przekształcenie', sub: [{ label: 'Odbij poziomo', run: () => ed.flip('h') }, { label: 'Odbij pionowo', run: () => ed.flip('v') }, '-', { label: 'Obróć o 90° w prawo', run: () => ed.rotate(90) }, { label: 'Obróć o 90° w lewo', run: () => ed.rotate(-90) }, { label: 'Obróć o 180°', run: () => ed.rotate(180) }, { label: 'Dowolny obrót…', off: true }, '-', { label: 'Gilotyna', off: true }], ...off() }, '-',
      { label: 'Rozmiar płótna…', run: () => show('canvas'), ...off() }, { label: 'Dopasuj płótno do warstw', off: true }, { label: 'Dopasuj płótno do zaznaczenia', off: true }, { label: 'Wydrukuj rozmiar…', off: true }, { label: 'Skaluj obraz…', run: () => show('scale'), ...off() },
      { label: 'Przytnij do zaznaczenia', run: ed.cropToSel, off: !ed.sel }, { label: 'Przytnij do zawartości', off: true }, '-', { label: 'Scal widoczne warstwy…', key: 'Ctrl+M', run: ed.flatten, ...off() }, { label: 'Spłaszcz obraz', run: ed.flatten, ...off() }, '-', { label: 'Właściwości obrazu', key: 'Alt+Return', off: true }]],
    ['Warstwa', [{ label: 'Nowa warstwa…', key: 'Shift+Ctrl+N', run: () => show('newLayer'), ...off() }, { label: 'Nowa z widocznego', off: true }, { label: 'Nowa grupa warstw', off: true }, { label: 'Duplikuj warstwę', key: 'Shift+Ctrl+D', run: ed.dupLayer, ...off() }, { label: 'Zakotwicz warstwę', key: 'Ctrl+H', off: true }, { label: 'Scal w dół', off: true }, { label: 'Usuń warstwę', run: ed.delLayer, off: layers.length < 2 }, '-',
      { label: 'Stos', sub: [{ label: 'Podnieś warstwę', run: ed.raise }, { label: 'Obniż warstwę', run: ed.lower }, { label: 'Odwróć kolejność warstw', run: () => ed.commit('Odwróć kolejność warstw', [...layers].reverse(), layers.length - 1 - act) }], ...off() }, { label: 'Maska', sub: [], off: true },
      { label: 'Przezroczystość', sub: [{ label: 'Dodaj kanał alfa', run: () => ed.flash('Dodano kanał alfa do warstwy.') }, { label: 'Usuń kanał alfa', off: true }, { label: 'Kolor na alfa…', run: () => show('c2a') }, '-', { label: 'Alfa do zaznaczenia', off: true }], ...off() },
      { label: 'Przekształcenie', sub: [{ label: 'Odbij poziomo', run: () => ed.one('Odbij poziomo', (c) => flipOne(c, 'h')) }, { label: 'Odbij pionowo', run: () => ed.one('Odbij pionowo', (c) => flipOne(c, 'v')) }], ...off() }, '-', { label: 'Rozmiar warstwy…', off: true }, { label: 'Dopasuj warstwę do obrazu', off: true }, { label: 'Skaluj warstwę…', off: true }, { label: 'Przytnij do zaznaczenia', run: ed.cropToSel, off: !ed.sel }]],
    ['Kolory', [{ label: 'Balans kolorów…', off: true }, { label: 'Temperatura barwowa…', off: true }, { label: 'Barwa-chroma…', off: true }, { label: 'Barwa-nasycenie…', off: true }, { label: 'Nasycenie…', off: true }, { label: 'Ekspozycja…', off: true }, { label: 'Cienie-światła…', off: true }, '-', { label: 'Jasność-kontrast…', off: true }, { label: 'Poziomy…', off: true }, { label: 'Krzywe…', off: true }, '-', { label: 'Odwróć', off: true }, { label: 'Desaturacja', sub: [], off: true }, '-', { label: 'Kolor na alfa…', run: () => show('c2a'), ...off() }]],
    ['Narzędzia', [{ label: 'Narzędzia zaznaczania', sub: [{ label: 'Zaznaczenie prostokątne', key: 'R', run: () => ed.setTool('rect') }, { label: 'Zaznaczanie rozmyte', key: 'U', run: () => ed.setTool('wand') }] }, { label: 'Narzędzia malarskie', sub: [{ label: 'Wypełnienie kubełkiem', key: 'Shift+B', run: () => ed.setTool('bucket') }, { label: 'Pędzel', key: 'P', run: () => ed.setTool('brush') }, { label: 'Gumka', key: 'Shift+E', run: () => ed.setTool('eraser') }] },
      { label: 'Narzędzia przekształcania', sub: [{ label: 'Przesunięcie', key: 'M', run: () => ed.setTool('move') }, { label: 'Kadrowanie', key: 'Shift+C', run: () => ed.setTool('crop') }, { label: 'Obrót', key: 'Shift+R', run: () => ed.setTool('rotate') }, { label: 'Skalowanie', key: 'Shift+S', run: () => ed.setTool('scale') }, { label: 'Odbicie', key: 'Shift+F', run: () => ed.setTool('flip') }] },
      { label: 'Pobieranie koloru', key: 'O', run: () => ed.setTool('picker') }, { label: 'Powiększenie', key: 'Z', run: () => ed.setTool('zoom') }, { label: 'Tekst', key: 'T', run: () => ed.setTool('text') }, '-', { label: 'Domyślne kolory', key: 'D', run: () => { ed.setFg('#000000'); ed.setBg('#ffffff'); } }, { label: 'Zamień kolory', key: 'X', run: () => { const f = ed.fg; ed.setFg(ed.bg); ed.setBg(f); } }]],
    ['Filtry', [{ label: 'Powtórz ostatni', key: 'Ctrl+F', off: true }, '-', ...['Rozmycie', 'Uwydatnienie', 'Zniekształcenia', 'Światło i cień', 'Szum', 'Wykrywanie krawędzi', 'Ogólne', 'Łączenie', 'Artystyczne', 'Dekoracja', 'Mapa', 'Renderowanie', 'Sieć WWW', 'Animacja'].map((x) => ({ label: x, sub: [], off: true }))]],
    ['Okna', [{ label: 'Ostatnio zamknięte doki', sub: [], off: true }, { label: 'Dokowalne okna dialogowe', sub: [{ label: 'Warstwy', key: 'Ctrl+L', run: () => setDockTab('layers') }, { label: 'Historia cofnięć', run: () => setDockTab('undo') }] }, '-', { label: 'Ukryj doki', key: 'Tab', off: true }, { label: 'Tryb pojedynczego okna', check: true, off: true }]],
    ['Pomoc', [{ label: 'Pomoc', key: 'F1', off: true }, { label: 'Wskazówki', off: true }, { label: 'O programie', off: true }]],
  ];

  const keys = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input,textarea,select')) return;
    const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const map: [boolean, () => void][] = [
      [c && !e.shiftKey && k === 'z', ed.undo], [c && k === 'y', ed.redoAct], [c && !e.altKey && k === 'o', () => show('open')], [c && e.altKey && k === 'o', () => has && show('layers')], [c && k === 'n' && !e.shiftKey, () => show('new')],
      [c && e.shiftKey && k === 'e', () => has && show('export')], [c && !e.shiftKey && k === 'e', () => has && show('export')], [c && !e.shiftKey && k === 'a', () => has && ed.setSel({ x: 0, y: 0, w: W, h: H })], [c && e.shiftKey && k === 'a', () => ed.setSel(null)],
      [e.key === 'Delete', ed.clear], [e.key === 'Enter' && ed.tool === 'crop', ed.applyCrop], [e.key === 'Escape', () => { ed.setCrop(null); setDlg(null); }],
      [!c && e.shiftKey && k === 'c', () => ed.setTool('crop')], [!c && e.shiftKey && k === 's', () => ed.setTool('scale')], [!c && e.shiftKey && k === 'r', () => ed.setTool('rotate')], [!c && e.shiftKey && k === 'f', () => ed.setTool('flip')], [!c && e.shiftKey && k === 'b', () => ed.setTool('bucket')], [!c && e.shiftKey && k === 'e', () => ed.setTool('eraser')],
      [!c && !e.shiftKey && k === 'm', () => ed.setTool('move')], [!c && !e.shiftKey && k === 'r', () => ed.setTool('rect')], [!c && !e.shiftKey && k === 'u', () => ed.setTool('wand')], [!c && !e.shiftKey && k === 't', () => ed.setTool('text')], [!c && !e.shiftKey && k === 'p', () => ed.setTool('brush')], [!c && !e.shiftKey && k === 'o', () => ed.setTool('picker')], [!c && !e.shiftKey && k === 'z', () => ed.setTool('zoom')],
      [!c && k === '1', () => ed.setZoom(1)], [c && e.shiftKey && k === 'j', () => ed.setZoom(0)],
    ];
    const hit = map.find(([m]) => m); if (hit) { e.preventDefault(); hit[1](); }
  };

  const toolName = TOOLS.find((t) => t.id === ed.tool)?.label ?? '';
  const title = has ? `[${ed.docName.replace(/\.\w+$/, '')}] ${ed.hist.length ? '(zmieniony)' : '(zaimportowany)'}-1.0 (Kolor RGB 8-bitowy gamma, ${layers.length} ${layers.length === 1 ? 'warstwa' : 'warstwy'}) ${W}x${H} – GIMP` : 'GNU Image Manipulation Program';
  const zoomPct = Math.round((ed.zoom || 0) * 100);

  useEffect(() => { const h = (e: KeyboardEvent) => { if (!dlg || e.key === 'Escape') keys(e); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  return (
    <div ref={root} className="fixed inset-0 z-[90] flex flex-col bg-[#454545] font-[Cantarell,'Segoe_UI',Ubuntu,sans-serif] text-[13px] text-[#dcdcdc] outline-none">
      <input ref={file} type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void ed.openFile(f, fileAsLayer.current); e.target.value = ''; setDlg(null); }} />
      {/* pasek tytulu okna */}
      <div className="relative z-[60] flex h-[30px] items-center bg-[#2b2b2b] pl-2 text-[12px]">
        <span className="mr-2 inline-block h-4 w-4 rounded-full bg-[#8a7a5a]" />
        <span className="flex-1 truncate">{title}</span>
        {modeSwitch}
        <button className="h-full px-3 hover:bg-[#444]"><Minus size={14} /></button><button className="h-full px-3 hover:bg-[#444]"><Square size={12} /></button><button className="h-full px-3 hover:bg-[#c42b1c]" onClick={onClose} title="Zamknij"><X size={15} /></button>
      </div>
      <MenuBar menus={MENUS} skin={SKIN} />

      <div className="flex min-h-0 flex-1 border-t border-[#2a2a2a]">
        {/* lewy dok: przybornik + opcje narzedzia */}
        <div className="flex w-[218px] shrink-0 flex-col border-r border-[#2a2a2a] bg-[#454545]">
          <div className="flex flex-wrap gap-[2px] p-[6px]">
            {TOOLS.map(({ id, I, label, key }) => (
              <button key={id} title={`${label}  ${key}`} disabled={!has} onClick={() => ed.setTool(id)} className={`grid h-[30px] w-[30px] place-items-center rounded-[3px] ${ed.tool === id ? 'bg-[#5f86b9] text-white' : 'hover:bg-[#555]'} disabled:opacity-40`}><I size={17} strokeWidth={1.6} /></button>
            ))}
          </div>
          <div className="relative mx-[8px] mb-2 h-[44px] w-[60px]">
            <input type="color" value={ed.bg} onChange={(e) => ed.setBg(e.target.value)} className="absolute left-[22px] top-[16px] h-[26px] w-[34px] cursor-pointer border border-[#111] p-0" title="Kolor tła" />
            <input type="color" value={ed.fg} onChange={(e) => ed.setFg(e.target.value)} className="absolute left-0 top-0 h-[26px] w-[34px] cursor-pointer border border-[#111] p-0" title="Kolor pierwszoplanowy" />
          </div>
          <div className="flex border-y border-[#2a2a2a] bg-[#3b3b3b] text-[12px]"><span className="border-r border-[#2a2a2a] bg-[#454545] px-2 py-1">Opcje narzędzia</span><span className="px-2 py-1 opacity-60">Urządzenia</span></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2 text-[12px]">
            <p className="font-bold">{toolName}</p>
            {(ed.tool === 'wand' || ed.tool === 'bucket') && <>
              <label className="flex items-center justify-between gap-2">Próg <input type="range" min={0} max={255} value={ed.tol} onChange={(e) => ed.setTol(+e.target.value)} className="flex-1" /><span className="w-8 text-right">{ed.tol}</span></label>
              {ed.tool === 'wand' && <label className="flex items-center gap-2"><input type="checkbox" checked={ed.contiguous} onChange={(e) => ed.setContiguous(e.target.checked)} />Wypełnianie przezroczystych obszarów</label>}
              {ed.tool === 'bucket' && <p className="opacity-70">Wypełnienie: kolor pierwszoplanowy · Obszar: {ed.sel ? 'całe zaznaczenie' : 'podobne kolory'}</p>}
              {ed.tool === 'wand' && <p className="opacity-70">Kliknij obszar, potem Edycja → Wyczyść (Delete), żeby był przezroczysty.</p>}
            </>}
            {ed.tool === 'crop' && <>
              <p className="opacity-70">Przeciągnij na obrazie. Enter albo podwójne kliknięcie = przytnij.</p>
              {(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k} className="flex items-center justify-between">{{ x: 'Położenie X', y: 'Położenie Y', w: 'Rozmiar: szer.', h: 'Rozmiar: wys.' }[k]}<input type="number" className={`${inp} w-20`} value={ed.crop?.[k] ?? 0} onChange={(e) => ed.setCrop({ ...(ed.crop ?? { x: 0, y: 0, w: W, h: H }), [k]: Math.max(0, +e.target.value) })} /></label>)}
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked />Usuwanie przyciętych pikseli</label>
            </>}
            {ed.tool === 'text' && <>
              <label className="flex items-center justify-between">Czcionka <select className={`${inp} w-28`} value={ed.font} onChange={(e) => ed.setFont(e.target.value)}>{['Arial', 'Sans-serif', 'Serif', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New', 'Comic Sans MS', 'Impact'].map((f) => <option key={f}>{f}</option>)}</select></label>
              <label className="flex items-center justify-between">Rozmiar <span><input type="number" className={`${inp} w-16`} value={ed.fontSize} onChange={(e) => ed.setFontSize(Math.max(4, +e.target.value))} /> px</span></label>
              <label className="flex items-center justify-between">Kolor <input type="color" value={ed.fg} onChange={(e) => ed.setFg(e.target.value)} /></label>
              <p className="opacity-70">Kliknij na obrazie i pisz. Ctrl+Enter albo kliknięcie obok kończy tekst.</p>
            </>}
            {(ed.tool === 'brush' || ed.tool === 'eraser') && <label className="flex items-center justify-between gap-2">Rozmiar <input type="range" min={1} max={200} value={ed.brush} onChange={(e) => ed.setBrush(+e.target.value)} className="flex-1" /><span className="w-8 text-right">{ed.brush}</span></label>}
            {ed.tool === 'flip' && <p className="opacity-70">Kierunek: poziomo (kliknij obraz) · z Shift: pionowo</p>}
            {ed.tool === 'rotate' && <p className="opacity-70">Kliknięcie obraca o 90° w prawo (z Shift w lewo). Dokładne obroty: Obraz → Przekształcenie.</p>}
            {ed.tool === 'scale' && <p className="opacity-70">Kliknij obraz: otworzy się okno skalowania.</p>}
            {ed.tool === 'picker' && <p className="opacity-70">Kliknięcie ustawia kolor pierwszoplanowy.</p>}
          </div>
        </div>

        {/* srodek: karty obrazow, plotno z linijkami, pasek stanu */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[26px] items-end gap-1 border-b border-[#2a2a2a] bg-[#3b3b3b] px-1">
            {has && <span className="flex items-center gap-1.5 rounded-t-[3px] bg-[#454545] px-2 py-0.5 text-[12px]"><img src={ed.visible().toDataURL()} alt="" className="h-4 w-5 bg-white object-contain" />{ed.docName}<X size={11} className="cursor-pointer opacity-60" onClick={onClose} /></span>}
          </div>
          {has ? <Canvas ed={ed} pasteboard="#333333" rulers onPos={setPos} onScaleTool={() => show('scale')} onOpen={(f) => void ed.openFile(f, false)} />
            : <div className="flex flex-1 items-center justify-center bg-[#333]"><button className={btn} onClick={() => show('open')}>Plik → Otwórz… (Ctrl+O)</button></div>}
          {hints.length > 0 && (
            <div className="border-t border-[#2a2a2a] bg-[#3b3b3b] px-2 py-1 text-[12px]">
              <button className="font-bold text-[#9cc4f5]" onClick={() => setHintOpen((v) => !v)}>{hintOpen ? '▾' : '▸'} Polecenie z arkusza</button>
              {hintOpen && <p className="max-h-20 overflow-auto opacity-90">{hints.join(' · ')}</p>}
            </div>
          )}
          <div className="flex h-[26px] items-center gap-2 border-t border-[#2a2a2a] bg-[#454545] px-2 text-[12px]">
            <span className="w-[90px] tabular-nums">{pos ? `${pos.x}, ${pos.y}` : ''}</span>
            <select className={`${inp} h-[20px] py-0`}><option>px</option></select>
            <select className={`${inp} h-[20px] py-0`} value={ed.zoom === 0 ? '' : String(ed.zoom)} onChange={(e) => ed.setZoom(+e.target.value)}>
              {ed.zoom === 0 && <option value="">dopasowane</option>}{[0.25, 0.5, 1, 2, 4, 8].map((z) => <option key={z} value={z}>{z * 100}%</option>)}{ed.zoom && ![0.25, 0.5, 1, 2, 4, 8].includes(ed.zoom) ? <option value={ed.zoom}>{zoomPct}%</option> : null}
            </select>
            <span className="truncate opacity-80">{L ? `${L.name} (${((W * H * 4) / 1048576).toFixed(1)} MB)` : ''}</span>
          </div>
        </div>

        {/* prawy dok */}
        <div className="flex w-[250px] shrink-0 flex-col border-l border-[#2a2a2a] bg-[#454545]">
          <div className="flex border-b border-[#2a2a2a] bg-[#3b3b3b] text-[12px]">{['Pędzle', 'Wzorki', 'Czcionki', 'Dokumenty'].map((t, i) => <span key={t} className={`px-2 py-1 ${i === 0 ? 'bg-[#454545]' : 'opacity-60'}`}>{t}</span>)}</div>
          <div className="grid h-[120px] grid-cols-6 content-start gap-1 overflow-hidden p-2">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="grid h-7 place-items-center bg-white"><span className="rounded-full bg-black" style={{ width: 4 + (i % 6) * 3, height: 4 + (i % 6) * 3, filter: i % 2 ? 'blur(1px)' : undefined }} /></span>)}</div>
          <div className="flex border-y border-[#2a2a2a] bg-[#3b3b3b] text-[12px]">
            {([['layers', 'Warstwy'], ['channels', 'Kanały'], ['paths', 'Ścieżki'], ['undo', 'Historia cofnięć']] as const).map(([k, l]) => <button key={k} onClick={() => setDockTab(k)} className={`px-2 py-1 ${dockTab === k ? 'bg-[#454545]' : 'opacity-60'}`}>{l}</button>)}
          </div>
          {dockTab === 'layers' && <>
            <div className="space-y-1 p-2 text-[12px]">
              <label className="flex items-center gap-2">Tryb <select className={`${inp} h-[22px] flex-1 py-0`}><option>Zwykły</option></select></label>
              <label className="flex items-center gap-2">Krycie <input type="range" min={0} max={100} value={Math.round((L?.opacity ?? 1) * 100)} onChange={(e) => ed.setOpacity(+e.target.value / 100)} className="flex-1" /><span className="w-9 text-right">{((L?.opacity ?? 1) * 100).toFixed(1)}</span></label>
              <p className="opacity-70">Blokada: ✎ ✥ ▦</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto border-y border-[#2a2a2a] bg-[#3b3b3b]">
              {[...layers.map((l, i) => ({ l, i }))].reverse().map(({ l, i }) => (
                <div key={l.id} onClick={() => ed.setAct(i)} className={`flex h-[38px] items-center gap-1.5 px-1 text-[12px] ${i === act ? 'bg-[#5f86b9] text-white' : 'hover:bg-[#4a4a4a]'}`}>
                  <button onClick={(e) => { e.stopPropagation(); ed.toggleVis(i); }} className="w-5">{l.visible ? <Eye size={14} /> : <EyeOff size={14} className="opacity-40" />}</button>
                  <span className="w-4 opacity-40"><Link2 size={12} /></span>
                  {l.text ? <span className="grid h-[30px] w-[30px] place-items-center bg-white text-[16px] font-bold text-black">T</span> : <img src={l.c.toDataURL()} alt="" className="h-[30px] w-[30px] border border-[#222] object-contain" style={{ backgroundImage: 'conic-gradient(#999 25%, #666 0 50%, #999 0 75%, #666 0)', backgroundSize: '8px 8px' }} />}
                  <span className="flex-1 truncate" onDoubleClick={() => { const n = prompt('Nazwa warstwy', l.name); if (n) ed.rename(i, n); }}>{l.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between p-1">
              {[[Plus, 'Nowa warstwa', () => show('newLayer')], [FolderPlus, 'Nowa grupa', () => {}], [ArrowUp, 'Podnieś warstwę', ed.raise], [ArrowDown, 'Obniż warstwę', ed.lower], [Copy, 'Duplikuj warstwę', ed.dupLayer], [Anchor, 'Zakotwicz', () => {}], [Trash2, 'Usuń warstwę', ed.delLayer]].map(([I, t, f], k) => {
                const Ic = I as typeof Plus; return <button key={k} title={t as string} disabled={!has} onClick={f as () => void} className="rounded-[3px] p-1 hover:bg-[#555] disabled:opacity-40"><Ic size={15} /></button>;
              })}
            </div>
            {layers.length > 1 && <p className="px-2 pb-2 text-[11px] opacity-60">Animacja GIF: każda warstwa to klatka (dolna = pierwsza). Czas klatki możesz dopisać w nazwie warstwy, np. „Warstwa (750ms)”.</p>}
          </>}
          {dockTab === 'undo' && <div className="min-h-0 flex-1 overflow-auto bg-[#3b3b3b] text-[12px]">
            <p className="px-2 py-1 opacity-70">[Obraz bazowy]</p>{ed.hist.map((h, i) => <p key={i} className="px-2 py-1">{h.label}</p>)}<p className="bg-[#5f86b9] px-2 py-1 text-white">{ed.hist.length ? 'Bieżący stan' : '—'}</p>
          </div>}
          {(dockTab === 'channels' || dockTab === 'paths') && <div className="flex-1 bg-[#3b3b3b] p-2 text-[12px] opacity-80">{dockTab === 'channels' ? ['Czerwony', 'Zielony', 'Niebieski', 'Alfa'].map((c) => <p key={c} className="flex items-center gap-2 py-1"><Eye size={13} />{c}</p>) : 'Brak ścieżek'}</div>}
        </div>
      </div>

      {ed.toast && <div className="pointer-events-none absolute bottom-10 left-1/2 z-[60] -translate-x-1/2 rounded bg-black/85 px-3 py-2 text-white">{ed.toast}</div>}

      {/* ---------- okna dialogowe GIMP ---------- */}
      {(dlg === 'open' || dlg === 'layers') && (
        <GDialog wide title={dlg === 'open' ? 'Otwórz obraz' : 'Otwórz obraz jako warstwy'} onClose={() => setDlg(null)} buttons={<>
          <button className={btn}>Pomoc</button><span className="flex-1" />
          <button className={btn} onClick={() => { fileAsLayer.current = dlg === 'layers'; file.current?.click(); }}>Inne położenie (z komputera)…</button>
          <button className={btn} onClick={() => setDlg(null)}>{dlg === 'layers' ? 'Gotowe' : 'Anuluj'}</button></>}>
          <div className="flex h-[360px] gap-2">
            <div className="w-[150px] space-y-0.5 text-[12px]">
              {[[Search, 'Szukaj'], [Clock, 'Ostatnio używane'], [Monitor, 'Pulpit'], [Folder, 'pliki z arkusza'], [Folder, 'Folder zdającego']].map(([I, t], k) => { const Ic = I as typeof Search; return <p key={k} className={`flex items-center gap-2 rounded px-2 py-1 ${k === 3 ? 'bg-[#5f86b9] text-white' : ''}`}><Ic size={13} />{t as string}</p>; })}
            </div>
            <div className="flex min-w-0 flex-1 flex-col border border-[#2a2a2a] bg-[#3b3b3b]">
              <div className="grid grid-cols-[1fr_70px] border-b border-[#2a2a2a] px-2 py-1 text-[12px] font-bold"><span>Nazwa</span><span>Typ</span></div>
              <div className="min-h-0 flex-1 overflow-auto">
                {sources.map((s) => <button key={s.name} onDoubleClick={() => { void ed.open(s, dlg === 'layers'); if (dlg === 'open') setDlg(null); }} onClick={() => { if (dlg === 'layers') { void ed.open(s, true); ed.flash(`Dodano warstwę ${s.name}`); } else { void ed.open(s, false); setDlg(null); } }}
                  className="grid w-full grid-cols-[1fr_70px] items-center px-2 py-[3px] text-left text-[12px] hover:bg-[#5f86b9] hover:text-white"><span className="flex items-center gap-2 truncate"><img src={s.url} alt="" className="h-5 w-6 object-contain" />{s.name}</span><span className="uppercase opacity-70">{/\.(\w+)/.exec(s.name)?.[1]}</span></button>)}
                {!sources.length && <p className="p-3 opacity-70">Brak grafik. Użyj „Inne położenie (z komputera)”.</p>}
              </div>
              <div className="border-t border-[#2a2a2a] px-2 py-1 text-[12px]">Wszystkie obrazy ▾</div>
            </div>
          </div>
          {dlg === 'layers' && <p className="text-[12px] opacity-70">Klikaj pliki po kolei: każdy stanie się nową warstwą (klatką animacji).</p>}
        </GDialog>
      )}
      {dlg === 'new' && (
        <GDialog title="Utwórz nowy obraz" onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><button className={btn} onClick={() => { setNw(1920); setNh(1080); }}>Przywróć</button><span className="flex-1" /><button className={btn} onClick={() => { ed.newImage(nw, nh, nfill); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center justify-between">Szablon: <select className={`${inp} w-60`}><option>—</option></select></label>
          <p className="font-bold">Rozmiar obrazu</p>
          <label className="flex items-center justify-between">Szerokość <input type="number" className={`${inp} w-28`} value={nw} onChange={(e) => setNw(+e.target.value)} /></label>
          <label className="flex items-center justify-between">Wysokość <span><input type="number" className={`${inp} w-28`} value={nh} onChange={(e) => setNh(+e.target.value)} /> px</span></label>
          <p className="text-[12px] opacity-70">{nw} × {nh} pikseli · 72 ppi, Kolor RGB</p>
          <p className="font-bold">▾ Opcje zaawansowane</p>
          <label className="flex items-center justify-between">Wypełnienie <select className={`${inp} w-60`} value={nfill} onChange={(e) => setNfill(e.target.value as typeof nfill)}><option value="fg">Kolor pierwszoplanowy</option><option value="bg">Kolor tła</option><option value="white">Biały</option><option value="transparent">Przezroczystość</option></select></label>
        </GDialog>
      )}
      {dlg === 'scale' && (
        <GDialog title="Skalowanie obrazu" head="Skalowanie obrazu" sub={`[${ed.docName}]-1`} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><button className={btn} onClick={() => { setSw(W); setSh(H); }}>Przywróć</button><span className="flex-1" /><button className={btn} onClick={() => { ed.scale(sw, sh); setDlg(null); }}>Skaluj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <p className="font-bold">Rozmiar obrazu</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-2">
              <label className="flex items-center justify-between">Szerokość: <input type="number" className={`${inp} w-28`} value={sw} onChange={(e) => { const v = +e.target.value; setSw(v); if (chain) setSh(Math.round((v * H) / W)); }} /></label>
              <label className="flex items-center justify-between">Wysokość: <input type="number" className={`${inp} w-28`} value={sh} onChange={(e) => { const v = +e.target.value; setSh(v); if (chain) setSw(Math.round((v * W) / H)); }} /></label>
            </div>
            <button onClick={() => setChain((v) => !v)} title="Łączenie szerokości i wysokości" className="rounded p-1 hover:bg-[#555]">{chain ? <Link2 size={18} /> : <Link2Off size={18} />}</button>
            <select className={`${inp} w-14`}><option>px</option></select>
          </div>
          <p className="text-[12px] opacity-70">{sw} × {sh} pikseli · 72 ppi</p>
          <label className="flex items-center justify-between">Rozdzielczość X: <span><input className={`${inp} w-20`} defaultValue="72,000" /> piksele/in</span></label>
          <label className="flex items-center justify-between">Rozdzielczość Y: <input className={`${inp} w-20`} defaultValue="72,000" /></label>
          <p className="font-bold">Jakość</p>
          <label className="flex items-center justify-between">Interpolacja: <select className={`${inp} w-44`}><option>Sinc (Lanczos3)</option><option>Liniowa</option><option>Sześcienna</option><option>Brak</option></select></label>
        </GDialog>
      )}
      {dlg === 'canvas' && (
        <GDialog title="Ustawienie rozmiaru płótna obrazu" head="Ustawienie rozmiaru płótna obrazu" sub={`[${ed.docName}]-1`} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><button className={btn} onClick={() => { setCw(W); setCh(H); setOx(0); setOy(0); }}>Przywróć</button><span className="flex-1" /><button className={btn} onClick={() => { ed.canvas(cw, ch, ox, oy); setDlg(null); }}>Zmień rozmiar</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <p className="font-bold">Rozmiar płótna</p>
          <label className="flex items-center justify-between">Szerokość: <input type="number" className={`${inp} w-28`} value={cw} onChange={(e) => setCw(+e.target.value)} /></label>
          <label className="flex items-center justify-between">Wysokość: <span><input type="number" className={`${inp} w-28`} value={ch} onChange={(e) => setCh(+e.target.value)} /> px</span></label>
          <p className="font-bold">Przesunięcie</p>
          <label className="flex items-center justify-between">X: <input type="number" className={`${inp} w-28`} value={ox} onChange={(e) => setOx(+e.target.value)} /></label>
          <label className="flex items-center justify-between">Y: <span><input type="number" className={`${inp} w-28`} value={oy} onChange={(e) => setOy(+e.target.value)} /> <button className={btn} onClick={() => { setOx(Math.round((W - cw) / 2)); setOy(Math.round((H - ch) / 2)); }}>Wyśrodkuj</button></span></label>
          <p className="text-[12px] opacity-70">Mniejsze płótno przycina obraz do dokładnego rozmiaru (kadr od punktu X, Y).</p>
          <label className="flex items-center justify-between">Zmiana rozmiaru warstw: <select className={`${inp} w-44`}><option>Wszystkie warstwy</option></select></label>
        </GDialog>
      )}
      {dlg === 'c2a' && (
        <GDialog title="Kolor na alfa" head="Kolor na alfa" sub={L?.name} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><button className={btn} onClick={() => { setC2a('#ffffff'); setC2aT(0.1); }}>Przywróć</button><span className="flex-1" /><button className={btn} onClick={() => { ed.c2a(rgbOf(c2a), Math.round(c2aT * 255)); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center justify-between">Ustawienia: <select className={`${inp} w-48`}><option>Ustawienia domyślne</option></select></label>
          <label className="flex items-center justify-between">Kolor <span className="flex items-center gap-2"><input type="color" value={c2a} onChange={(e) => setC2a(e.target.value)} className="h-6 w-16" /><button className={btn} title="Pobierz kolor z obrazu" onClick={() => { setC2a(ed.fg); }}><Pipette size={13} /></button></span></label>
          <label className="block">Próg przezroczystości <span className="float-right">{c2aT.toFixed(3)}</span><input type="range" min={0} max={0.5} step={0.005} value={c2aT} onChange={(e) => setC2aT(+e.target.value)} className="w-full" /></label>
          <label className="block">Próg nieprzezroczystości <span className="float-right">1,000</span><input type="range" disabled defaultValue={1} className="w-full" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked />Podgląd</label>
        </GDialog>
      )}
      {dlg === 'newLayer' && (
        <GDialog title="Nowa warstwa" head="Utwórz nową warstwę" sub={`[${ed.docName}]-1`} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><span className="flex-1" /><button className={btn} onClick={() => { ed.newLayer(lname); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center justify-between">Nazwa warstwy <input className={`${inp} w-56`} value={lname} onChange={(e) => setLname(e.target.value)} /></label>
          <label className="flex items-center justify-between">Wypełnienie <select className={`${inp} w-56`}><option>Przezroczystość</option></select></label>
        </GDialog>
      )}
      {dlg === 'export' && (
        <GDialog wide title="Eksportuj obraz" onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><span className="flex-1" /><button className={btn} onClick={() => { if (!/^(png|jpe?g|gif)$/.test(ext)) ed.flash('Nieznany typ pliku. Dopisz rozszerzenie .png, .jpg albo .gif.'); else setDlg('exportType'); }}>Eksportuj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center gap-3">Nazwa: <input autoFocus className={`${inp} flex-1`} value={name} onChange={(e) => setName(e.target.value.trim())} /></label>
          <p className="flex items-center gap-2 text-[12px]">Zapisz w katalogu: <span className="rounded bg-[#3b3b3b] px-2 py-0.5">Pulpit</span>▸<span className="rounded bg-[#5f86b9] px-2 py-0.5 text-white">folder zdającego</span></p>
          <div className="h-[180px] overflow-auto border border-[#2a2a2a] bg-[#3b3b3b] text-[12px]">
            <p className="border-b border-[#2a2a2a] px-2 py-1 font-bold">Nazwa</p>
            {sources.filter((s) => / \(twoja\)$/.test(s.name)).map((s) => <button key={s.name} onClick={() => setName(s.name.replace(/ \(twoja\)$/, ''))} className="block w-full px-2 py-[3px] text-left hover:bg-[#5f86b9]">{s.name.replace(/ \(twoja\)$/, '')}</button>)}
          </div>
          <details className="text-[12px]"><summary className="cursor-pointer">Wybierz typ pliku (Według rozszerzenia)</summary>
            <div className="mt-1 max-h-28 overflow-auto border border-[#2a2a2a] bg-[#3b3b3b]">{[['GIF', 'gif'], ['JPEG', 'jpg'], ['PNG', 'png']].map(([n, e2]) => <button key={e2} onClick={() => setName(name.replace(/\.\w+$/, '') + '.' + e2)} className="grid w-full grid-cols-[1fr_80px] px-2 py-[3px] text-left hover:bg-[#5f86b9]"><span>Obraz {n}</span><span>{e2}</span></button>)}</div>
          </details>
        </GDialog>
      )}
      {dlg === 'exportType' && ext === 'gif' && (
        <GDialog title={`Eksportuj obraz jako GIF`} head="Eksportuj obraz jako GIF" sub={name} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><span className="flex-1" /><button className={btn} onClick={() => void doExport()}>Eksportuj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center gap-2"><input type="checkbox" />Przeplot</label>
          <label className="flex items-center gap-2"><input type="checkbox" />Komentarz GIF:</label>
          <textarea className={`${inp} h-12 w-full`} disabled />
          <p className="font-bold">Opcje animowanego GIF</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={anim} onChange={(e) => setAnim(e.target.checked)} />Jako animację</label>
          <label className={`flex items-center gap-2 ${anim ? '' : 'opacity-50'}`}><input type="checkbox" disabled={!anim} checked={gloop} onChange={(e) => setGloop(e.target.checked)} />Pętla nieskończona</label>
          <label className={`flex items-center gap-2 ${anim ? '' : 'opacity-50'}`}>Opóźnienie między klatkami, jeśli nie podano: <input type="number" disabled={!anim} className={`${inp} w-20`} value={delay} onChange={(e) => setDelay(Math.max(0, +e.target.value))} /> milisekund</label>
          <label className={`flex items-center gap-2 ${anim ? '' : 'opacity-50'}`}>Tryb ramek, jeśli nie podano: <select disabled={!anim} className={`${inp} flex-1`} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="u">Bez znaczenia</option><option value="c">Kumulacja warstw (łączenie)</option><option value="r">Jedna ramka na warstwę (zastąpienie)</option></select></label>
          <label className={`flex items-center gap-2 ${anim ? '' : 'opacity-50'}`}><input type="checkbox" disabled={!anim} checked={useAll} onChange={(e) => setUseAll(e.target.checked)} />Użycie opóźnienia wprowadzonego powyżej dla wszystkich klatek</label>
          <label className={`flex items-center gap-2 ${anim ? '' : 'opacity-50'}`}><input type="checkbox" disabled={!anim} />Użycie trybu ramek wprowadzonego powyżej dla wszystkich klatek</label>
          {hasParamShot && <p className="text-[12px] text-[#9cc4f5]">Przy eksporcie zrobi się zrzut ekranu z tym oknem (arkusz wymaga udokumentowania ustawień).</p>}
        </GDialog>
      )}
      {dlg === 'exportType' && (ext === 'jpg' || ext === 'jpeg') && (
        <GDialog title="Eksportuj obraz jako JPEG" head="Eksportuj obraz jako JPEG" sub={name} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><span className="flex-1" /><button className={btn} onClick={() => void doExport()}>Eksportuj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="block">Jakość <span className="float-right">{quality}</span><input type="range" min={0} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" />Podgląd w oknie obrazu</label>
          <p className="text-[12px] opacity-70">JPEG nie ma przezroczystości: przezroczyste miejsca będą białe. {layers.length > 1 ? 'Warstwy zostaną spłaszczone.' : ''}</p>
        </GDialog>
      )}
      {dlg === 'exportType' && ext === 'png' && (
        <GDialog title="Eksportuj obraz jako PNG" head="Eksportuj obraz jako PNG" sub={name} onClose={() => setDlg(null)} buttons={<><button className={btn}>Pomoc</button><button className={btn}>Wczytaj ustawienia domyślne</button><span className="flex-1" /><button className={btn} onClick={() => void doExport()}>Eksportuj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          {['Przeplot (Adam7)', 'Zapis koloru tła', 'Zapis gammy', 'Zapis przesunięcia warstwy', 'Zapis rozdzielczości', 'Zapis czasu utworzenia', 'Zapis komentarza', 'Zapis wartości kolorów z przezroczystych pikseli'].map((t, i) => <label key={t} className="flex items-center gap-2"><input type="checkbox" defaultChecked={[4, 5].includes(i)} />{t}</label>)}
          <label className="flex items-center justify-between">Poziom kompresji <input type="range" min={0} max={9} defaultValue={9} className="w-40" /></label>
        </GDialog>
      )}
    </div>
  );
}

function flipOne(c: HTMLCanvasElement, d: 'h' | 'v') { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; const g = n.getContext('2d')!; if (d === 'h') { g.translate(c.width, 0); g.scale(-1, 1); } else { g.translate(0, c.height); g.scale(1, -1); } g.drawImage(c, 0, 0); return n; }
