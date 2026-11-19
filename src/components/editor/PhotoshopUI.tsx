import { useEffect, useRef, useState } from 'react';
import { Move, SquareDashed, Lasso, Wand2, Crop, Pipette, Brush, Eraser, PaintBucket, Type, Hand, ZoomIn, Eye, Lock, Link2, Link2Off, Plus, Trash2, FolderPlus, Contrast, Sparkles, SquareDot, SkipBack, StepBack, Play, Pause, StepForward, Copy, Minus, Square, X, ChevronDown, Menu as MenuIcon, Monitor, Download, Image as Img, Search } from 'lucide-react';
import Canvas from './Canvas';
import { MenuBar, type MItem, type Skin } from './Menu';
import type { Ed, Src, Tool } from './engine';

const SKIN: Skin = { bar: 'bg-[#535353] text-[#e8e8e8] text-[12.5px]', pop: 'bg-[#535353] text-[#e8e8e8] text-[12.5px] border border-[#3a3a3a]', hover: 'bg-[#1473e6] text-white', item: 'hover:bg-[#1473e6] hover:text-white', sep: 'bg-[#6a6a6a]', dim: 'text-[#9a9a9a]' };
type Dlg = null | 'open' | 'place' | 'new' | 'size' | 'canvas' | 'sfw' | 'exportAs' | 'save' | 'newLayer';
const inp = 'h-[22px] rounded-[2px] border border-[#3a3a3a] bg-[#454545] px-1.5 text-[#eee] outline-none focus:border-[#1473e6]';
const btn = 'h-[26px] min-w-[80px] rounded-[13px] border border-[#8a8a8a] px-4 text-[#eee] hover:bg-[#666]';
const btnP = 'h-[26px] min-w-[80px] rounded-[13px] bg-[#1473e6] px-4 font-bold text-white hover:bg-[#0d66d0]';
const DELAYS = [0, 0.1, 0.2, 0.5, 0.75, 1, 2, 5, 10];

function PDialog({ title, children, buttons, onClose, w = 520 }: { title: string; children: React.ReactNode; buttons: React.ReactNode; onClose: () => void; w?: number }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex max-h-[92vh] max-w-[96vw] flex-col border border-[#2b2b2b] bg-[#535353] text-[12.5px] text-[#e8e8e8] shadow-[0_10px_40px_rgba(0,0,0,.7)]" style={{ width: w }}>
        <div className="flex items-center bg-[#424242] px-3 py-1.5"><span className="flex-1">{title}</span><button onClick={onClose} className="px-1 hover:bg-[#c42b1c]"><X size={14} /></button></div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-4 pb-4">{buttons}</div>
      </div>
    </div>
  );
}

export default function PhotoshopUI({ ed, sources, hints, defaultName, hasParamShot, onClose, modeSwitch }: { ed: Ed; sources: Src[]; hints: string[]; defaultName?: string; hasParamShot: boolean; onClose: () => void; modeSwitch: React.ReactNode }) {
  const [dlg, setDlg] = useState<Dlg>(ed.L ? null : 'open');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [timeline, setTimeline] = useState(true);
  const [tlMenu, setTlMenu] = useState(false);
  const [curFrame, setCurFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hintOpen, setHintOpen] = useState(true);
  const file = useRef<HTMLInputElement>(null);
  const fileAsLayer = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const { W, H, L, layers, act, frames } = ed;
  const has = !!L;

  const [sw, setSw] = useState(0); const [sh, setSh] = useState(0); const [chain, setChain] = useState(true);
  const [cw, setCw] = useState(0); const [ch, setCh] = useState(0); const [anchor, setAnchor] = useState(4);
  const [nw, setNw] = useState(1920); const [nh, setNh] = useState(1080); const [nfill, setNfill] = useState<'white' | 'fg' | 'bg' | 'transparent'>('white');
  const [fmt, setFmt] = useState<'GIF' | 'JPEG' | 'PNG-8' | 'PNG-24'>('GIF'); const [quality, setQuality] = useState(60); const [transp, setTransp] = useState(true);
  const [name, setName] = useState(defaultName ?? 'Bez tytułu-1.png');
  const [lname, setLname] = useState('Warstwa 1');
  const show = (d: Dlg) => {
    if (d === 'size') { setSw(W); setSh(H); setChain(true); }
    if (d === 'canvas') { setCw(W); setCh(H); setAnchor(4); }
    if (d === 'sfw' || d === 'exportAs') { const e = (/\.(\w+)$/.exec(defaultName ?? '')?.[1] ?? '').toLowerCase(); setFmt(e === 'gif' || frames.length ? 'GIF' : e === 'jpg' || e === 'jpeg' ? 'JPEG' : 'PNG-24'); }
    setDlg(d);
  };

  // odtwarzanie osi czasu: pokazuje po kolei warstwy klatek
  const showFrame = (k: number) => { const f = frames[k]; if (!f) return; setCurFrame(k); ed.setLayers((ls) => ls.map((l) => ({ ...l, visible: l.id === f.layerId }))); };
  useEffect(() => {
    if (!playing || !frames.length) return;
    const tm = setTimeout(() => showFrame((curFrame + 1) % frames.length), Math.max(50, frames[curFrame]?.delay ?? 100));
    return () => clearTimeout(tm);
  }, [playing, curFrame, frames]); // eslint-disable-line react-hooks/exhaustive-deps
  const framesFromLayers = () => { if (!layers.length) return; ed.setFrames(layers.map((l) => ({ layerId: l.id, delay: frames[0]?.delay ?? 0 }))); setCurFrame(0); ed.setLayers((ls) => ls.map((l, i) => ({ ...l, visible: i === 0 }))); setTlMenu(false); };
  const setDelay = (k: number | 'all', d: number) => ed.setFrames(frames.map((f, i) => (k === 'all' || i === k ? { ...f, delay: d } : f)));

  const saveExt = fmt === 'GIF' ? 'gif' : fmt === 'JPEG' ? 'jpg' : 'png';
  const doSave = async () => {
    const nm = name.replace(/\.\w+$/, '') + '.' + saveExt;
    const ok = await ed.exportAs(nm, { quality: quality / 100, anim: saveExt === 'gif' && frames.length > 1, loop: ed.loop, replace: true, shotEl: root.current });
    if (ok) setDlg(null);
  };

  const T = (id: Tool, I: typeof Move, label: string, key: string) => ({ id, I, label, key });
  const TOOLS = [
    T('move', Move, 'Narzędzie Przesunięcie', 'V'), T('rect', SquareDashed, 'Narzędzie Zaznaczanie prostokątne', 'M'), T('hand', Lasso, 'Narzędzie Lasso (niedostępne)', 'L'), T('wand', Wand2, 'Narzędzie Różdżka', 'W'), T('crop', Crop, 'Narzędzie Kadrowanie', 'C'),
    T('picker', Pipette, 'Narzędzie Kroplomierz', 'I'), T('brush', Brush, 'Narzędzie Pędzel', 'B'), T('eraser', Eraser, 'Narzędzie Gumka', 'E'), T('magic', Sparkles, 'Narzędzie Magiczna gumka', 'E'), T('bucket', PaintBucket, 'Narzędzie Wiadro z farbą', 'G'),
    T('text', Type, 'Narzędzie Tekst poziomy', 'T'), T('hand', Hand, 'Narzędzie Rączka', 'H'), T('zoom', ZoomIn, 'Narzędzie Lupka', 'Z'),
  ];
  const off = (x = false) => ({ off: !has || x });
  const MENUS: [string, MItem[]][] = [
    ['Plik', [{ label: 'Nowy…', key: 'Ctrl+N', run: () => show('new') }, { label: 'Otwórz…', key: 'Ctrl+O', run: () => show('open') }, { label: 'Przeglądaj w programie Bridge…', off: true }, { label: 'Otwórz jako…', key: 'Alt+Shift+Ctrl+O', run: () => show('open') }, { label: 'Ostatnio otwierane', sub: [], off: true }, '-',
      { label: 'Zamknij', key: 'Ctrl+W', run: onClose }, { label: 'Zamknij wszystko', key: 'Alt+Ctrl+W', run: onClose }, { label: 'Zapisz', key: 'Ctrl+S', off: true }, { label: 'Zapisz jako…', key: 'Shift+Ctrl+S', off: true }, { label: 'Przywróć', key: 'F12', off: true }, '-',
      { label: 'Eksportuj', sub: [{ label: 'Szybki eksport jako PNG', run: () => { setFmt('PNG-24'); setDlg('save'); } }, { label: 'Eksportuj jako…', key: 'Alt+Shift+Ctrl+W', run: () => show('exportAs') }, '-', { label: 'Warstwy do plików…', off: true }, '-', { label: 'Zapisz dla Internetu (starsza wersja)…', key: 'Alt+Shift+Ctrl+S', run: () => show('sfw') }], ...off() },
      { label: 'Umieść osadzone…', run: () => show('place'), ...off() }, { label: 'Umieść połączone…', off: true }, '-', { label: 'Automatyzuj', sub: [], off: true }, { label: 'Skrypty', sub: [{ label: 'Wczytaj pliki do stosu…', run: () => show('place') }], ...off() }, { label: 'Importuj', sub: [], off: true }, '-', { label: 'Drukuj…', key: 'Ctrl+P', off: true }, '-', { label: 'Zakończ', key: 'Ctrl+Q', run: onClose }]],
    ['Edycja', [{ label: `Cofnij${ed.hist.length ? ' ' + ed.hist[ed.hist.length - 1].label : ''}`, key: 'Ctrl+Z', run: ed.undo, off: !ed.hist.length }, { label: 'Ponów', key: 'Shift+Ctrl+Z', run: ed.redoAct, off: !ed.redo.length }, { label: 'Przełącz ostatni stan', key: 'Alt+Ctrl+Z', off: true }, '-', { label: 'Wytnij', key: 'Ctrl+X', off: true }, { label: 'Kopiuj', key: 'Ctrl+C', off: true }, { label: 'Wklej', key: 'Ctrl+V', off: true }, { label: 'Wyczyść', run: ed.clear, off: !ed.sel }, '-',
      { label: 'Wypełnij…', key: 'Shift+F5', run: () => ed.sel && ed.fill(ed.sel.x, ed.sel.y), off: !ed.sel }, { label: 'Obrysuj…', off: true }, { label: 'Wypełnienie z uwzględnieniem zawartości…', off: true }, '-', { label: 'Swobodne przekształcanie', key: 'Ctrl+T', run: () => show('size'), ...off() },
      { label: 'Przekształć', sub: [{ label: 'Skaluj', run: () => show('size') }, { label: 'Obróć', off: true }, '-', { label: 'Obróć o 180°', run: () => ed.rotate(180) }, { label: 'Obróć o 90° zgodnie z ruchem wskazówek zegara', run: () => ed.rotate(90) }, { label: 'Obróć o 90° przeciwnie do ruchu wskazówek zegara', run: () => ed.rotate(-90) }, '-', { label: 'Odwróć w poziomie', run: () => ed.flip('h') }, { label: 'Odwróć w pionie', run: () => ed.flip('v') }], ...off() }, '-',
      { label: 'Preferencje', sub: [], off: true }]],
    ['Obraz', [{ label: 'Tryb', sub: [{ label: 'Kolor RGB', check: true }], off: true }, '-', { label: 'Dopasowania', sub: [], off: true }, '-', { label: 'Automatyczny ton', key: 'Shift+Ctrl+L', off: true }, '-', { label: 'Rozmiar obrazu…', key: 'Alt+Ctrl+I', run: () => show('size'), ...off() }, { label: 'Rozmiar obszaru roboczego…', key: 'Alt+Ctrl+C', run: () => show('canvas'), ...off() },
      { label: 'Obrót obrazu', sub: [{ label: '180°', run: () => ed.rotate(180) }, { label: '90° zgodnie z ruchem wskazówek zegara', run: () => ed.rotate(90) }, { label: '90° przeciwnie do ruchu wskazówek zegara', run: () => ed.rotate(-90) }, { label: 'Dowolny…', off: true }, '-', { label: 'Odbij obszar roboczy w poziomie', run: () => ed.flip('h') }, { label: 'Odbij obszar roboczy w pionie', run: () => ed.flip('v') }], ...off() },
      { label: 'Kadruj', run: ed.cropToSel, off: !ed.sel }, { label: 'Przytnij…', off: true }, { label: 'Pokaż wszystko', off: true }, '-', { label: 'Duplikuj…', off: true }]],
    ['Warstwa', [{ label: 'Nowa', sub: [{ label: 'Warstwa…', key: 'Shift+Ctrl+N', run: () => show('newLayer') }, { label: 'Warstwa z pliku…', run: () => show('place') }], ...off() }, { label: 'Duplikuj warstwę…', run: ed.dupLayer, ...off() }, { label: 'Usuń', sub: [{ label: 'Warstwa', run: ed.delLayer }], off: layers.length < 2 }, '-',
      { label: 'Ułóż', sub: [{ label: 'Przesuń do przodu', key: 'Ctrl+]', run: ed.raise }, { label: 'Przesuń do tyłu', key: 'Ctrl+[', run: ed.lower }, { label: 'Odwróć', run: () => ed.commit('Odwróć', [...layers].reverse(), layers.length - 1 - act) }], ...off() }, '-',
      { label: 'Scal w dół', key: 'Ctrl+E', off: true }, { label: 'Scal widoczne', key: 'Shift+Ctrl+E', run: ed.flatten, ...off() }, { label: 'Spłaszcz obraz', run: ed.flatten, ...off() }]],
    ['Tekst', [{ label: 'Panele', sub: [], off: true }, { label: 'Wygładzanie', sub: [], off: true }, { label: 'Orientacja', sub: [], off: true }, '-', { label: 'Rasteryzuj warstwę tekstową', off: true }]],
    ['Zaznacz', [{ label: 'Wszystko', key: 'Ctrl+A', run: () => ed.setSel({ x: 0, y: 0, w: W, h: H }), ...off() }, { label: 'Odznacz', key: 'Ctrl+D', run: () => ed.setSel(null), off: !ed.sel }, { label: 'Zaznacz ponownie', key: 'Shift+Ctrl+D', off: true }, { label: 'Odwrotność', key: 'Shift+Ctrl+I', off: true }, '-', { label: 'Wszystkie warstwy', key: 'Alt+Ctrl+A', off: true }, '-', { label: 'Zakres koloru…', off: true }, { label: 'Zaznacz i maskuj…', key: 'Alt+Ctrl+R', off: true }]],
    ['Filtr', [{ label: 'Ostatni filtr', key: 'Alt+Ctrl+F', off: true }, '-', ...['Galeria filtrów…', 'Filtr Szeroki kąt…', 'Filtr Camera Raw…', 'Korekcja obiektywu…', 'Skraplanie…', 'Punkt zbiegu…'].map((x) => ({ label: x, off: true })), '-', ...['Rozmycie', 'Szum', 'Wyostrzanie', 'Stylizacja', 'Renderowanie', 'Inne'].map((x) => ({ label: x, sub: [], off: true }))]],
    ['3D', [{ label: 'Nowa warstwa 3D z pliku…', off: true }]],
    ['Widok', [{ label: 'Powiększ', key: 'Ctrl++', run: () => ed.setZoom(Math.min(16, (ed.zoom || 1) * 2)), ...off() }, { label: 'Pomniejsz', key: 'Ctrl+-', run: () => ed.setZoom(Math.max(0.05, (ed.zoom || 1) / 2)), ...off() }, { label: 'Dopasuj do ekranu', key: 'Ctrl+0', run: () => ed.setZoom(0), ...off() }, { label: '100%', key: 'Ctrl+1', run: () => ed.setZoom(1), ...off() }, '-', { label: 'Linijki', key: 'Ctrl+R', check: false, off: true }]],
    ['Wtyczki', [{ label: 'Panel wtyczek', off: true }]],
    ['Okno', [{ label: 'Rozmieść', sub: [], off: true }, { label: 'Obszar roboczy', sub: [], off: true }, '-', { label: 'Kolor', key: 'F6', check: true, off: true }, { label: 'Oś czasu', check: timeline, run: () => setTimeline((v) => !v) }, { label: 'Warstwy', key: 'F7', check: true, off: true }, { label: 'Właściwości', check: true, off: true }]],
    ['Pomoc', [{ label: 'Pomoc programu Photoshop…', key: 'F1', off: true }]],
  ];

  const keys = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input,textarea,select')) return;
    const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const map: [boolean, () => void][] = [
      [c && !e.shiftKey && !e.altKey && k === 'z', ed.undo], [c && e.shiftKey && k === 'z', ed.redoAct], [c && !e.altKey && k === 'o', () => show('open')], [c && !e.shiftKey && k === 'n', () => show('new')],
      [c && e.altKey && k === 'i', () => has && show('size')], [c && e.altKey && k === 'c', () => has && show('canvas')], [c && e.altKey && e.shiftKey && k === 's', () => has && show('sfw')], [c && e.altKey && e.shiftKey && k === 'w', () => has && show('exportAs')],
      [c && !e.shiftKey && k === 'a', () => has && ed.setSel({ x: 0, y: 0, w: W, h: H })], [c && !e.shiftKey && k === 'd', () => ed.setSel(null)], [c && k === 't', () => has && show('size')],
      [e.key === 'Delete' || e.key === 'Backspace', ed.clear], [e.key === 'Enter' && ed.tool === 'crop', ed.applyCrop], [e.key === 'Escape', () => { ed.setCrop(null); setDlg(null); }],
      [c && k === '0', () => ed.setZoom(0)], [c && k === '1', () => ed.setZoom(1)],
      [!c && k === 'v', () => ed.setTool('move')], [!c && k === 'm', () => ed.setTool('rect')], [!c && k === 'w', () => ed.setTool('wand')], [!c && k === 'c', () => ed.setTool('crop')], [!c && k === 'i', () => ed.setTool('picker')], [!c && k === 'b', () => ed.setTool('brush')],
      [!c && k === 'e', () => ed.setTool(e.shiftKey ? (ed.tool === 'eraser' ? 'magic' : 'eraser') : 'eraser')], [!c && k === 'g', () => ed.setTool('bucket')], [!c && k === 't', () => ed.setTool('text')], [!c && k === 'h', () => ed.setTool('hand')], [!c && k === 'z', () => ed.setTool('zoom')],
    ];
    const hit = map.find(([m]) => m); if (hit) { e.preventDefault(); hit[1](); }
  };

  const tool = TOOLS.find((t) => t.id === ed.tool && (t.id !== 'hand' || t.I === Hand)) ?? TOOLS[0];
  const zoomPct = ed.zoom ? Math.round(ed.zoom * 100) : null;
  const sizeK = ((W * H * 3) / 1024).toFixed(1).replace('.', ',');
  const ax = anchor % 3, ay = Math.floor(anchor / 3);

  useEffect(() => { const h = (e: KeyboardEvent) => { if (!dlg || e.key === 'Escape') keys(e); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  return (
    <div ref={root} className="fixed inset-0 z-[90] flex flex-col bg-[#535353] font-['Segoe_UI',Tahoma,sans-serif] text-[12.5px] text-[#e8e8e8] outline-none">
      <input ref={file} type="file" accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void ed.openFile(f, fileAsLayer.current); e.target.value = ''; setDlg(null); }} />
      <MenuBar menus={MENUS} skin={SKIN} lead={<span className="mx-2 grid h-[20px] w-[22px] place-items-center rounded-[3px] bg-[#3a3a3a] text-[#9fd0ff]"><Img size={13} /></span>} />
      <div className="absolute right-0 top-0 z-[60] flex h-[26px] items-center">{modeSwitch}<button className="h-full px-3 hover:bg-[#666]"><Minus size={13} /></button><button className="h-full px-3 hover:bg-[#666]"><Square size={11} /></button><button className="h-full px-3 hover:bg-[#c42b1c]" onClick={onClose} title="Zamknij"><X size={14} /></button></div>

      {/* pasek opcji narzedzia */}
      <div className="flex h-[36px] items-center gap-3 border-y border-[#3a3a3a] bg-[#535353] px-3">
        <span className="flex items-center gap-1"><tool.I size={18} /><ChevronDown size={11} /></span>
        <span className="h-5 w-px bg-[#6a6a6a]" />
        {ed.tool === 'move' && <><label className="flex items-center gap-1"><input type="checkbox" />Automatyczne zaznaczanie:</label><select className={inp}><option>Warstwa</option></select><label className="flex items-center gap-1"><input type="checkbox" />Pokaż elementy sterujące przekształcaniem</label></>}
        {(ed.tool === 'wand' || ed.tool === 'magic' || ed.tool === 'bucket') && <>
          {ed.tool === 'wand' && <label className="flex items-center gap-1">Rozmiar próbki: <select className={inp}><option>Próbka punktowa</option></select></label>}
          {ed.tool === 'bucket' && <select className={inp}><option>Pierwszy plan</option></select>}
          <label className="flex items-center gap-1">Tolerancja: <input type="number" className={`${inp} w-14`} value={ed.tol} onChange={(e) => ed.setTol(Math.max(0, Math.min(255, +e.target.value)))} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Wygładzanie</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={ed.contiguous} onChange={(e) => ed.setContiguous(e.target.checked)} />{ed.tool === 'magic' ? 'Ciągłe' : 'Ciągły'}</label>
          {ed.tool === 'magic' && <label className="flex items-center gap-1">Krycie: <input className={`${inp} w-14`} defaultValue="100%" /></label>}
          {ed.tool === 'wand' && <button className="rounded-[2px] border border-[#6a6a6a] px-2 py-0.5 opacity-70">Zaznacz temat</button>}
        </>}
        {ed.tool === 'crop' && <><select className={inp}><option>Proporcje</option><option>Szer. x wys. x rozdz.</option></select>
          <input type="number" className={`${inp} w-16`} placeholder="szer." value={ed.crop?.w ?? ''} onChange={(e) => ed.setCrop({ ...(ed.crop ?? { x: 0, y: 0, w: W, h: H }), w: +e.target.value })} /><span>⇄</span>
          <input type="number" className={`${inp} w-16`} placeholder="wys." value={ed.crop?.h ?? ''} onChange={(e) => ed.setCrop({ ...(ed.crop ?? { x: 0, y: 0, w: W, h: H }), h: +e.target.value })} />
          <button className="opacity-80 hover:opacity-100" onClick={() => ed.setCrop(null)}>Wyczyść</button><label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Usuń kadrowane piksele</label>
          <button className="ml-2 rounded-[2px] bg-[#1473e6] px-2 py-0.5 text-white" onClick={ed.applyCrop}>✓ Zatwierdź (Enter)</button></>}
        {ed.tool === 'text' && <><select className={`${inp} w-36`} value={ed.font} onChange={(e) => ed.setFont(e.target.value)}>{['Arial', 'Verdana', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New', 'Comic Sans MS', 'Impact'].map((f) => <option key={f}>{f}</option>)}</select>
          <select className={inp}><option>Regular</option></select>
          <label className="flex items-center gap-1"><Type size={12} /><input type="number" className={`${inp} w-16`} value={ed.fontSize} onChange={(e) => ed.setFontSize(Math.max(4, +e.target.value))} /> pt</label>
          <select className={inp}><option>Ostry</option></select><input type="color" value={ed.fg} onChange={(e) => ed.setFg(e.target.value)} className="h-5 w-8" /><span className="opacity-70">Kliknij na obrazie, Ctrl+Enter zatwierdza</span></>}
        {(ed.tool === 'brush' || ed.tool === 'eraser') && <><label className="flex items-center gap-1">Rozmiar: <input type="number" className={`${inp} w-14`} value={ed.brush} onChange={(e) => ed.setBrush(Math.max(1, +e.target.value))} /> px</label><label className="flex items-center gap-1">Tryb: <select className={inp}><option>{ed.tool === 'eraser' ? 'Pędzel' : 'Zwykły'}</option></select></label><label className="flex items-center gap-1">Krycie: <input className={`${inp} w-14`} defaultValue="100%" /></label></>}
        {ed.tool === 'rect' && <><label className="flex items-center gap-1">Wtapianie: <input className={`${inp} w-14`} defaultValue="0 px" /></label><label className="flex items-center gap-1">Styl: <select className={inp}><option>Normalny</option></select></label><span className="opacity-70">Delete = usuń zaznaczone (przezroczystość) · Obraz → Kadruj</span></>}
        {ed.tool === 'picker' && <label className="flex items-center gap-1">Rozmiar próbki: <select className={inp}><option>Próbka punktowa</option></select></label>}
        {ed.tool === 'zoom' && <span className="opacity-70">Klik = powiększ, Alt+klik = pomniejsz</span>}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* pasek narzedzi */}
        <div className="flex w-[40px] shrink-0 flex-col items-center gap-[1px] border-r border-[#3a3a3a] bg-[#535353] pt-1">
          <span className="mb-1 text-[9px] opacity-60">»</span>
          {TOOLS.map((t, i) => (
            <button key={i} title={`${t.label} (${t.key})`} disabled={!has || t.I === Lasso} onClick={() => ed.setTool(t.id)} className={`grid h-[30px] w-[32px] place-items-center rounded-[3px] ${ed.tool === t.id && (t.id !== 'hand' || t.I === Hand) ? 'bg-[#3a3a3a]' : 'hover:bg-[#666]'} disabled:opacity-40`}><t.I size={17} strokeWidth={1.6} /></button>
          ))}
          <div className="relative mt-2 h-[40px] w-[34px]">
            <input type="color" value={ed.bg} onChange={(e) => ed.setBg(e.target.value)} className="absolute left-[12px] top-[13px] h-[22px] w-[22px] cursor-pointer border border-[#222] p-0" title="Kolor tła" />
            <input type="color" value={ed.fg} onChange={(e) => ed.setFg(e.target.value)} className="absolute left-0 top-0 h-[22px] w-[22px] cursor-pointer border border-[#222] p-0" title="Kolor narzędzia" />
          </div>
        </div>

        {/* dokument */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[26px] items-end bg-[#424242]">
            {has && <span className="flex h-full items-center gap-2 border-t-2 border-[#1473e6] bg-[#535353] px-3 text-[12px]">{ed.docName} @ {zoomPct ?? 'Dopasuj'}{zoomPct ? '%' : ''} ({L?.name}, RGB/8) <X size={11} className="cursor-pointer opacity-70" onClick={onClose} /></span>}
          </div>
          {has ? <Canvas ed={ed} pasteboard="#282828" onPos={setPos} onOpen={(f) => void ed.openFile(f, false)} />
            : <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#282828]"><button className={btnP} onClick={() => show('open')}>Otwórz…</button><button className={btn} onClick={() => show('new')}>Nowy plik</button></div>}
          <div className="flex h-[22px] items-center gap-3 border-t border-[#3a3a3a] bg-[#535353] px-2 text-[11.5px]">
            <span>{zoomPct ? `${zoomPct}%` : 'Dopasuj'}</span><span>{has ? `${W} px x ${H} px (72 ppi)` : ''}</span><span className="opacity-70">{pos ? `X: ${pos.x}  Y: ${pos.y}` : ''}</span>
          </div>
          {/* os czasu */}
          {timeline && (
            <div className="relative border-t border-[#2b2b2b] bg-[#535353]">
              <div className="flex h-[24px] items-center bg-[#424242] px-2"><span className="flex-1">Oś czasu</span><button onClick={() => setTlMenu((v) => !v)} title="Menu panelu"><MenuIcon size={14} /></button></div>
              {tlMenu && <div className="absolute bottom-full right-2 z-50 min-w-[220px] border border-[#3a3a3a] bg-[#535353] py-1 shadow-xl">
                {[['Utwórz klatki z warstw', framesFromLayers, !has], ['Nowa klatka', () => { if (L) ed.setFrames([...frames, { layerId: L.id, delay: frames[frames.length - 1]?.delay ?? 0 }]); setTlMenu(false); }, !has], ['Usuń klatki', () => { ed.setFrames([]); setTlMenu(false); }, !frames.length], ['Zaznacz wszystkie klatki', () => setTlMenu(false), !frames.length]].map(([l, f, o]) => <button key={l as string} disabled={o as boolean} onClick={f as () => void} className="block w-full px-4 py-1 text-left hover:bg-[#1473e6] disabled:opacity-40">{l as string}</button>)}
              </div>}
              {!frames.length ? (
                <div className="flex h-[118px] items-center justify-center gap-2">
                  <button disabled={!has} onClick={() => { if (L) { ed.setFrames([{ layerId: L.id, delay: 0 }]); setCurFrame(0); } }} className="flex items-center gap-2 rounded-[2px] border border-[#8a8a8a] px-3 py-1 hover:bg-[#666] disabled:opacity-40">Utwórz animację klatkową <ChevronDown size={12} /></button>
                  {layers.length > 1 && <span className="opacity-70">potem ≡ → „Utwórz klatki z warstw”</span>}
                </div>
              ) : (
                <>
                  <div className="flex h-[118px] items-center gap-1 overflow-x-auto px-2">
                    {frames.map((f, k) => {
                      const l = layers.find((x) => x.id === f.layerId);
                      return (
                        <div key={k} onClick={() => showFrame(k)} className={`flex w-[86px] shrink-0 flex-col items-center rounded-[2px] border p-1 ${k === curFrame ? 'border-[#1473e6] bg-[#4a5d78]' : 'border-[#444] bg-[#4a4a4a]'}`}>
                          <span className="self-start text-[10px]">{k + 1}</span>
                          {l && <img src={l.c.toDataURL()} alt="" className="h-[52px] w-[76px] bg-white object-contain" />}
                          <select value={String(f.delay / 1000)} onClick={(e) => e.stopPropagation()} onChange={(e) => { const v = e.target.value; if (v === 'inne') { const x = prompt('Ustaw opóźnienie klatki (sekundy):', String(f.delay / 1000).replace('.', ',')); if (x) setDelay(k, Math.round(parseFloat(x.replace(',', '.')) * 1000)); } else setDelay(k, Math.round(+v * 1000)); }}
                            className="mt-1 bg-transparent text-[11px] outline-none">
                            {[...new Set([...DELAYS, f.delay / 1000])].sort((a, b) => a - b).map((d) => <option key={d} value={String(d)} className="bg-[#535353]">{String(d).replace('.', ',')} s</option>)}
                            <option value="inne" className="bg-[#535353]">Inne…</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex h-[28px] items-center gap-2 border-t border-[#3a3a3a] px-2">
                    <select className={inp} value={ed.loop ? 'z' : 'r'} onChange={(e) => ed.setLoop(e.target.value === 'z')}><option value="z">Zawsze</option><option value="r">Raz</option></select>
                    <button onClick={() => showFrame(0)}><SkipBack size={14} /></button><button onClick={() => showFrame(Math.max(0, curFrame - 1))}><StepBack size={14} /></button>
                    <button onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button><button onClick={() => showFrame(Math.min(frames.length - 1, curFrame + 1))}><StepForward size={14} /></button>
                    <span className="h-4 w-px bg-[#6a6a6a]" />
                    <button title="Ustaw opóźnienie wszystkim klatkom" className="text-[11px] opacity-80 hover:opacity-100" onClick={() => { const x = prompt('Opóźnienie dla wszystkich klatek (sekundy):', '0,75'); if (x) setDelay('all', Math.round(parseFloat(x.replace(',', '.')) * 1000)); }}>Opóźnienie wszystkich…</button>
                    <span className="flex-1" />
                    <button title="Powiela zaznaczone klatki" onClick={() => L && ed.setFrames([...frames, { layerId: frames[curFrame]?.layerId ?? L.id, delay: frames[curFrame]?.delay ?? 0 }])}><Copy size={14} /></button>
                    <button title="Usuwa zaznaczone klatki" onClick={() => { ed.setFrames(frames.filter((_, i) => i !== curFrame)); setCurFrame(Math.max(0, curFrame - 1)); }}><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
          )}
          {hints.length > 0 && <div className="border-t border-[#3a3a3a] bg-[#424242] px-2 py-1 text-[12px]"><button className="font-bold text-[#7bbcff]" onClick={() => setHintOpen((v) => !v)}>{hintOpen ? '▾' : '▸'} Polecenie z arkusza</button>{hintOpen && <p className="max-h-16 overflow-auto opacity-90">{hints.join(' · ')}</p>}</div>}
        </div>

        {/* panele */}
        <div className="flex w-[272px] shrink-0 flex-col gap-[2px] border-l border-[#3a3a3a] bg-[#3e3e3e]">
          <div className="bg-[#535353]">
            <div className="flex bg-[#424242] text-[12px]">{['Kolor', 'Próbki', 'Gradienty', 'Wzorki'].map((t, i) => <span key={t} className={`px-2 py-1 ${i === 0 ? 'bg-[#535353] font-bold' : 'opacity-70'}`}>{t}</span>)}</div>
            <div className="flex gap-2 p-2">
              <div className="h-[86px] flex-1 rounded-[2px]" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${ed.fg})` }} />
              <div className="w-3 rounded-[2px]" style={{ background: 'linear-gradient(red, #ff0, lime, cyan, blue, #f0f, red)' }} />
            </div>
          </div>
          <div className="bg-[#535353]">
            <div className="flex bg-[#424242] text-[12px]">{['Właściwości', 'Dopasowania', 'Biblioteki'].map((t, i) => <span key={t} className={`px-2 py-1 ${i === 0 ? 'bg-[#535353] font-bold' : 'opacity-70'}`}>{t}</span>)}</div>
            <div className="space-y-1 p-2 text-[12px]">
              <p className="flex items-center gap-2"><Img size={13} />{L?.text ? 'Warstwa tekstowa' : 'Dokument'}</p>
              <p>Obszar roboczy</p>
              <p className="flex gap-3"><span>S <b>{W} px</b></span><span>W <b>{H} px</b></span></p>
              <p className="opacity-80">Rozdzielczość: 72 piksele/cal · Tryb: Kolor RGB</p>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-[#535353]">
            <div className="flex bg-[#424242] text-[12px]">{['Warstwy', 'Kanały', 'Ścieżki'].map((t, i) => <span key={t} className={`px-2 py-1 ${i === 0 ? 'bg-[#535353] font-bold' : 'opacity-70'}`}>{t}</span>)}</div>
            <div className="space-y-1 border-b border-[#3a3a3a] p-2 text-[12px]">
              <div className="flex items-center gap-1"><Search size={12} /><select className={`${inp} w-20`}><option>Rodzaj</option></select><span className="ml-auto flex gap-1 opacity-70"><Img size={12} /><Contrast size={12} /><Type size={12} /><SquareDot size={12} /></span></div>
              <div className="flex items-center gap-2"><select className={`${inp} flex-1`}><option>Normalny</option></select>Krycie: <input className={`${inp} w-14`} value={`${Math.round((L?.opacity ?? 1) * 100)}%`} onChange={(e) => ed.setOpacity(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100)} /></div>
              <div className="flex items-center gap-2">Blokuj: <Lock size={11} /><span className="ml-auto">Wypełnienie: <input className={`${inp} w-14`} defaultValue="100%" /></span></div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {[...layers.map((l, i) => ({ l, i }))].reverse().map(({ l, i }) => (
                <div key={l.id} onClick={() => ed.setAct(i)} className={`flex h-[40px] items-center gap-2 border-b border-[#4a4a4a] px-1 ${i === act ? 'bg-[#6b6b6b]' : 'hover:bg-[#5c5c5c]'}`}>
                  <button onClick={(e) => { e.stopPropagation(); ed.toggleVis(i); }} className="w-5">{l.visible ? <Eye size={14} /> : <span className="inline-block h-3 w-3" />}</button>
                  {l.text ? <span className="grid h-[30px] w-[30px] place-items-center border border-[#333] bg-[#6b6b6b] text-[15px] font-bold">T</span> : <img src={l.c.toDataURL()} alt="" className="h-[30px] w-[36px] border border-[#333] object-contain" style={{ backgroundImage: 'conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)', backgroundSize: '8px 8px' }} />}
                  <span className={`flex-1 truncate ${i === 0 && layers.length === 1 ? 'italic' : ''}`} onDoubleClick={() => { const n = prompt('Nazwa warstwy', l.name); if (n) ed.rename(i, n); }}>{i === 0 && l.name === ed.docName ? 'Tło' : l.name}</span>
                  {i === 0 && <Lock size={11} className="opacity-70" />}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#3a3a3a] p-1.5 opacity-90">
              {[[Link2, 'Połącz warstwy', () => {}], [Sparkles, 'Dodaj styl warstwy', () => {}], [SquareDot, 'Dodaj maskę', () => {}], [Contrast, 'Nowa warstwa wypełnienia/dopasowania', () => {}], [FolderPlus, 'Nowa grupa', () => {}], [Plus, 'Utwórz nową warstwę', () => ed.newLayer(`Warstwa ${layers.length}`)], [Trash2, 'Usuń warstwę', ed.delLayer]].map(([I, t, f], k) => {
                const Ic = I as typeof Plus; return <button key={k} title={t as string} disabled={!has} onClick={f as () => void} className="disabled:opacity-40"><Ic size={14} /></button>;
              })}
            </div>
          </div>
        </div>
      </div>

      {ed.toast && <div className="pointer-events-none absolute bottom-12 left-1/2 z-[60] -translate-x-1/2 rounded bg-black/85 px-3 py-2 text-white">{ed.toast}</div>}

      {/* ---------- okna dialogowe Photoshop ---------- */}
      {(dlg === 'open' || dlg === 'place') && (
        <PDialog w={760} title={dlg === 'open' ? 'Otwórz' : 'Umieść osadzone'} onClose={() => setDlg(null)} buttons={<>
          <button className={btn} onClick={() => { fileAsLayer.current = dlg === 'place'; file.current?.click(); }}>Ten komputer (przeglądaj)…</button>
          <button className={btn} onClick={() => setDlg(null)}>{dlg === 'place' ? 'Gotowe' : 'Anuluj'}</button></>}>
          <div className="flex h-[330px] gap-3">
            <div className="w-[150px] space-y-1 text-[12px]">{[[Monitor, 'Pulpit'], [Download, 'Pobrane'], [Img, 'pliki z arkusza']].map(([I, t], k) => { const Ic = I as typeof Monitor; return <p key={k} className={`flex items-center gap-2 rounded px-2 py-1 ${k === 2 ? 'bg-[#1473e6] text-white' : ''}`}><Ic size={13} />{t as string}</p>; })}</div>
            <div className="grid min-w-0 flex-1 grid-cols-4 content-start gap-2 overflow-auto rounded-[2px] bg-[#454545] p-2">
              {sources.map((s) => <button key={s.name} onClick={() => { if (dlg === 'place') { void ed.open(s, true); ed.flash(`Umieszczono ${s.name} jako nową warstwę`); } else { void ed.open(s, false); setDlg(null); } }} className="rounded p-1 text-center hover:bg-[#1473e6]/40">
                <img src={s.url} alt="" className="mx-auto h-[60px] w-full object-contain" /><span className="block truncate text-[11px]">{s.name}</span></button>)}
              {!sources.length && <p className="col-span-4 p-2 opacity-70">Brak plików. Użyj „Ten komputer”.</p>}
            </div>
          </div>
          <p className="mt-2 text-[12px] opacity-80">Nazwa pliku: <span className={`${inp} inline-block w-60 align-middle`} /> &nbsp; Wszystkie formaty (*.*)</p>
        </PDialog>
      )}
      {dlg === 'new' && (
        <PDialog w={620} title="Nowy dokument" onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => { ed.newImage(nw, nh, nfill, 'Bez tytułu-1'); setDlg(null); }}>Utwórz</button><button className={btn} onClick={() => setDlg(null)}>Zamknij</button></>}>
          <div className="flex gap-4">
            <div className="flex-1"><p className="mb-2 flex gap-4 border-b border-[#6a6a6a] pb-1">{['Ostatnie', 'Zapisane', 'Zdjęcie', 'Drukowanie', 'Sieć Web'].map((t, i) => <span key={t} className={i === 4 ? 'border-b-2 border-white font-bold' : 'opacity-70'}>{t}</span>)}</p>
              <div className="grid grid-cols-3 gap-2">{[[1920, 1080, 'Sieć Web, duży'], [1366, 768, 'Sieć Web, typowy'], [1280, 800, 'Sieć Web, średni'], [1024, 768, 'Sieć Web, mały'], [800, 600, 'Mały'], [500, 500, 'Kwadrat']].map(([w, h, t]) => <button key={t as string} onClick={() => { setNw(w as number); setNh(h as number); }} className="rounded-[2px] bg-[#454545] p-2 text-left text-[11px] hover:outline hover:outline-1 hover:outline-[#1473e6]"><b>{t as string}</b><br />{w} x {h} px</button>)}</div></div>
            <div className="w-[220px] space-y-2 border-l border-[#6a6a6a] pl-3">
              <p className="text-[11px] uppercase opacity-70">Szczegóły ustawień</p><p className="text-[16px]">Bez tytułu-1</p>
              <label className="block">Szerokość<div className="flex gap-1"><input type="number" className={`${inp} w-24`} value={nw} onChange={(e) => setNw(+e.target.value)} /><select className={inp}><option>Piksele</option></select></div></label>
              <label className="block">Wysokość<input type="number" className={`${inp} w-24`} value={nh} onChange={(e) => setNh(+e.target.value)} /></label>
              <label className="block">Rozdzielczość<div className="flex gap-1"><input className={`${inp} w-24`} defaultValue="72" /><select className={inp}><option>Piksele/cal</option></select></div></label>
              <label className="block">Tryb koloru<select className={`${inp} w-full`}><option>Kolor RGB · 8 bitów</option></select></label>
              <label className="block">Zawartość tła<select className={`${inp} w-full`} value={nfill} onChange={(e) => setNfill(e.target.value as typeof nfill)}><option value="white">Biały</option><option value="fg">Czarny / kolor narzędzia</option><option value="bg">Kolor tła</option><option value="transparent">Przezroczysty</option></select></label>
            </div>
          </div>
        </PDialog>
      )}
      {dlg === 'size' && (
        <PDialog w={640} title="Rozmiar obrazu" onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => { ed.scale(sw, sh, 'Rozmiar obrazu'); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <div className="flex gap-4">
            <div className="grid h-[220px] w-[220px] place-items-center bg-[#3a3a3a]">{L && <img src={ed.visible().toDataURL()} alt="" className="max-h-full max-w-full" />}</div>
            <div className="flex-1 space-y-2">
              <p>Rozmiar obrazu: <b>{((sw * sh * 3) / 1024).toFixed(1).replace('.', ',')}K</b> <span className="opacity-60">(było {sizeK}K)</span></p>
              <p>Wymiary: <b>{sw} px × {sh} px</b></p>
              <label className="flex items-center gap-2">Dopasuj do: <select className={`${inp} flex-1`}><option>Oryginalny rozmiar</option></select></label>
              <div className="flex items-center gap-2">
                <button onClick={() => setChain((v) => !v)} title="Ogranicz proporcje" className="rounded p-1 hover:bg-[#666]">{chain ? <Link2 size={16} /> : <Link2Off size={16} />}</button>
                <div className="flex-1 space-y-2">
                  <label className="flex items-center justify-between">Szerokość: <span><input type="number" className={`${inp} w-20`} value={sw} onChange={(e) => { const v = +e.target.value; setSw(v); if (chain) setSh(Math.round((v * H) / W)); }} /> <select className={inp}><option>Piksele</option></select></span></label>
                  <label className="flex items-center justify-between">Wysokość: <span><input type="number" className={`${inp} w-20`} value={sh} onChange={(e) => { const v = +e.target.value; setSh(v); if (chain) setSw(Math.round((v * W) / H)); }} /> <select className={inp}><option>Piksele</option></select></span></label>
                </div>
              </div>
              <label className="flex items-center justify-between">Rozdzielczość: <span><input className={`${inp} w-20`} defaultValue="72" /> <select className={inp}><option>Piksele/cal</option></select></span></label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked />Ponowne próbkowanie: <select className={`${inp} flex-1`}><option>Automatycznie</option><option>Dwusześcienne wyostrzanie</option></select></label>
            </div>
          </div>
        </PDialog>
      )}
      {dlg === 'canvas' && (
        <PDialog title="Rozmiar obszaru roboczego" onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => { const dx = Math.round(((W - cw) * ax) / 2), dy = Math.round(((H - ch) * ay) / 2); ed.canvas(cw, ch, dx, dy, 'Rozmiar obszaru roboczego'); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <fieldset className="mb-3 border border-[#6a6a6a] p-2"><legend className="px-1">Bieżący rozmiar: {sizeK}K</legend><p>Szerokość: {W} pikseli</p><p>Wysokość: {H} pikseli</p></fieldset>
          <fieldset className="space-y-2 border border-[#6a6a6a] p-2"><legend className="px-1">Nowy rozmiar: {((cw * ch * 3) / 1024).toFixed(1).replace('.', ',')}K</legend>
            <label className="flex items-center justify-between">Szerokość: <span><input type="number" className={`${inp} w-24`} value={cw} onChange={(e) => setCw(+e.target.value)} /> <select className={inp}><option>Piksele</option></select></span></label>
            <label className="flex items-center justify-between">Wysokość: <span><input type="number" className={`${inp} w-24`} value={ch} onChange={(e) => setCh(+e.target.value)} /> <select className={inp}><option>Piksele</option></select></span></label>
            <label className="flex items-center gap-2"><input type="checkbox" />Względny</label>
            <div className="flex items-center gap-3">Kotwica: <div className="grid grid-cols-3 gap-[2px]">{Array.from({ length: 9 }).map((_, k) => <button key={k} onClick={() => setAnchor(k)} className={`h-6 w-6 border border-[#6a6a6a] ${k === anchor ? 'bg-[#e8e8e8]' : 'bg-[#454545]'}`} />)}</div></div>
          </fieldset>
          <label className="mt-3 flex items-center gap-2">Kolor rozszerzenia obszaru roboczego: <select className={inp}><option>Przezroczysty</option></select></label>
        </PDialog>
      )}
      {dlg === 'newLayer' && (
        <PDialog title="Nowa warstwa" onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => { ed.newLayer(lname); setDlg(null); }}>OK</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <label className="flex items-center gap-2">Nazwa: <input className={`${inp} flex-1`} value={lname} onChange={(e) => setLname(e.target.value)} /></label>
        </PDialog>
      )}
      {dlg === 'sfw' && (
        <PDialog w={980} title="Zapisz dla Internetu (100%)" onClose={() => setDlg(null)} buttons={<><button className={btn} onClick={() => setDlg('save')}>Zapisz…</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button><button className={btnP} onClick={() => setDlg('save')}>Gotowe</button></>}>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-1 flex gap-1">{['Oryginalny', 'Zoptymalizowany', '2 obrazy', '4 obrazy'].map((t, i) => <span key={t} className={`px-3 py-1 ${i === 1 ? 'bg-[#454545] font-bold' : 'opacity-70'}`}>{t}</span>)}</p>
              <div className="grid h-[340px] place-items-center bg-[#454545] p-2" style={{ backgroundImage: 'conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)', backgroundSize: '16px 16px' }}>{L && <img src={(frames.length ? layers.find((x) => x.id === frames[curFrame]?.layerId)?.c : ed.visible())?.toDataURL()} alt="" className="max-h-full max-w-full" />}</div>
              <p className="mt-1 text-[11px] opacity-80">{fmt} · {sizeK}K · Kolory: 256 · 100% jakości</p>
            </div>
            <div className="w-[280px] space-y-2">
              <label className="flex items-center gap-2">Ustawienie wstępne: <select className={`${inp} flex-1`}><option>[Bez nazwy]</option></select></label>
              <select className={`${inp} w-full`} value={fmt} onChange={(e) => setFmt(e.target.value as typeof fmt)}>{['GIF', 'JPEG', 'PNG-8', 'PNG-24'].map((f) => <option key={f}>{f}</option>)}</select>
              {fmt === 'GIF' || fmt === 'PNG-8' ? <>
                <div className="grid grid-cols-2 gap-1"><select className={inp}><option>Selektywny</option></select><label>Kolory: <select className={inp}><option>256</option></select></label><select className={inp}><option>Rozproszenie</option></select><label>Rozpr.: <input className={`${inp} w-12`} defaultValue="100%" /></label></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={transp} onChange={(e) => setTransp(e.target.checked)} />Przezroczystość</label>
                <label className="flex items-center gap-2"><input type="checkbox" />Z przeplotem</label>
              </> : fmt === 'JPEG' ? <>
                <div className="flex items-center gap-2"><select className={inp}><option>Wysoka</option></select>Jakość: <input type="number" className={`${inp} w-14`} value={quality} onChange={(e) => setQuality(Math.max(1, Math.min(100, +e.target.value)))} /></div>
                <label className="flex items-center gap-2"><input type="checkbox" />Progresywny</label>
              </> : <label className="flex items-center gap-2"><input type="checkbox" checked={transp} onChange={(e) => setTransp(e.target.checked)} />Przezroczystość</label>}
              <fieldset className="border border-[#6a6a6a] p-2"><legend className="px-1">Rozmiar obrazu</legend><p>S: <b>{W}</b> px &nbsp; W: <b>{H}</b> px &nbsp; Procent: 100%</p><p className="text-[11px] opacity-70">Jakość: Dwusześcienna</p></fieldset>
              {fmt === 'GIF' && <fieldset className="space-y-1 border border-[#6a6a6a] p-2"><legend className="px-1">Animacja</legend>
                <label className="flex items-center gap-2">Opcje zapętlania: <select className={inp} value={ed.loop ? 'z' : 'r'} onChange={(e) => ed.setLoop(e.target.value === 'z')}><option value="z">Zawsze</option><option value="r">Raz</option></select></label>
                <p className="flex items-center gap-2">{frames.length ? `${curFrame + 1} z ${frames.length}` : '1 z 1'} <SkipBack size={12} /><StepBack size={12} /><Play size={12} /><StepForward size={12} /></p>
                {!frames.length && layers.length > 1 && <p className="text-[11px] text-[#ffcf6b]">Brak klatek na osi czasu: zapisze się jeden obraz. Okno → Oś czasu → „Utwórz klatki z warstw”.</p>}
                {frames.length > 0 && <p className="text-[11px] opacity-80">Opóźnienia: {frames.map((f) => String(f.delay / 1000).replace('.', ',') + ' s').join(', ')}</p>}
              </fieldset>}
              {hasParamShot && fmt === 'GIF' && <p className="text-[11px] text-[#7bbcff]">Przy zapisie zrobi się zrzut ekranu z tym oknem i osią czasu (arkusz wymaga udokumentowania ustawień).</p>}
            </div>
          </div>
        </PDialog>
      )}
      {dlg === 'exportAs' && (
        <PDialog w={760} title="Eksportuj jako" onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => setDlg('save')}>Eksportuj</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <div className="flex gap-3">
            <div className="grid h-[300px] flex-1 place-items-center bg-[#454545]">{L && <img src={ed.visible().toDataURL()} alt="" className="max-h-full max-w-full" />}</div>
            <div className="w-[240px] space-y-2">
              <p className="font-bold">Ustawienia pliku</p>
              <label className="flex items-center justify-between">Format <select className={inp} value={fmt === 'JPEG' ? 'JPEG' : fmt === 'GIF' ? 'GIF' : 'PNG-24'} onChange={(e) => setFmt(e.target.value as typeof fmt)}><option value="PNG-24">PNG</option><option value="JPEG">JPG</option><option value="GIF">GIF</option></select></label>
              {fmt === 'JPEG' ? <label className="flex items-center justify-between">Jakość <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></label> : <label className="flex items-center gap-2"><input type="checkbox" checked={transp} onChange={(e) => setTransp(e.target.checked)} />Przezroczystość</label>}
              <p className="font-bold">Rozmiar obrazu</p><p>Szer. {W} · Wys. {H} px · Skala 100%</p>
              {fmt === 'GIF' && frames.length > 1 && <p className="text-[11px] text-[#ffcf6b]">„Eksportuj jako” zapisuje GIF bez animacji. Animację zapisz przez Zapisz dla Internetu.</p>}
            </div>
          </div>
        </PDialog>
      )}
      {dlg === 'save' && (
        <PDialog title={dlg === 'save' && fmt === 'GIF' ? 'Zapisz zoptymalizowany jako' : 'Zapisz jako'} onClose={() => setDlg(null)} buttons={<><button className={btnP} onClick={() => void doSave()}>Zapisz</button><button className={btn} onClick={() => setDlg(null)}>Anuluj</button></>}>
          <p className="mb-2 text-[12px] opacity-80">Pulpit › folder zdającego</p>
          <label className="flex items-center gap-2">Nazwa pliku: <input autoFocus className={`${inp} flex-1`} value={name.replace(/\.\w+$/, '') + '.' + saveExt} onChange={(e) => setName(e.target.value.trim())} /></label>
          <label className="mt-2 flex items-center gap-2">Zapisz jako typ: <select className={`${inp} flex-1`}><option>{fmt === 'GIF' ? 'Tylko obrazy (*.gif)' : fmt === 'JPEG' ? 'Tylko obrazy (*.jpg)' : 'Tylko obrazy (*.png)'}</option></select></label>
        </PDialog>
      )}
    </div>
  );
}
