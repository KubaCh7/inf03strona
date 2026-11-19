// Narzedzie Wycinanie jak w Windows 11: nakladka wyboru obszaru, powiadomienie i okno edycji z zapisem.
import { useEffect, useRef, useState } from 'react';
import { SquareDashed, AppWindow, Monitor, X, Plus, Save, Copy, MoreHorizontal, Pen, Highlighter, Eraser, Crop, Undo2, Redo2, ChevronDown, Clock, Check } from 'lucide-react';
import { useOS, useWinKeys, type Win } from './os';
import { exportGif, stroke, canvasSize, loadCanvas, clone } from '../../lib/imageOps';

export type Frozen = { img: string; scale: number; wins: { x: number; y: number; w: number; h: number; title: string }[] };
type Mode = 'rect' | 'window' | 'full';
export const SHOTS_DIR = 'C:/Users/Egzamin/Pictures/Zrzuty ekranu';
export const shotName = (d = new Date()) => `Zrzut ekranu ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.png`;

async function crop(img: string, x: number, y: number, w: number, h: number) {
  const c = await loadCanvas(img);
  return canvasSize(c, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), Math.round(x), Math.round(y)).toDataURL('image/png');
}

/** Przyciemniony ekran z paskiem trybow (Win+Shift+S / PrtSc). */
export function SnipOverlay({ frozen, onDone, onCancel }: { frozen: Frozen; onDone: (url: string) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<Mode>('rect');
  const [a, setA] = useState<{ x: number; y: number } | null>(null);
  const [r, setR] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [onCancel]);
  const s = frozen.scale;
  const finish = (x: number, y: number, w: number, h: number) => void crop(frozen.img, x * s, y * s, w * s, h * s).then(onDone);
  const full = () => onDone(frozen.img);
  const sel = mode === 'window' && hover !== null ? frozen.wins[hover] : r;
  return (
    <div className="fixed inset-0 z-[400] cursor-crosshair select-none" style={{ backgroundImage: `url(${frozen.img})`, backgroundSize: '100% 100%' }}
      onPointerDown={(e) => { if (mode === 'rect') { setA({ x: e.clientX, y: e.clientY }); setR({ x: e.clientX, y: e.clientY, w: 0, h: 0 }); } }}
      onPointerMove={(e) => {
        if (mode === 'rect' && a) setR({ x: Math.min(a.x, e.clientX), y: Math.min(a.y, e.clientY), w: Math.abs(e.clientX - a.x), h: Math.abs(e.clientY - a.y) });
        if (mode === 'window') { const i = [...frozen.wins].reverse().findIndex((w) => e.clientX >= w.x && e.clientX <= w.x + w.w && e.clientY >= w.y && e.clientY <= w.y + w.h); setHover(i < 0 ? null : frozen.wins.length - 1 - i); }
      }}
      onPointerUp={() => { if (mode === 'rect' && r && r.w > 4 && r.h > 4) finish(r.x, r.y, r.w, r.h); setA(null); }}
      onClick={() => { if (mode === 'full') full(); if (mode === 'window' && hover !== null) { const w = frozen.wins[hover]; finish(w.x, w.y, w.w, w.h); } }}>
      {/* przyciemnienie poza zaznaczeniem */}
      {sel ? <div className="pointer-events-none absolute border border-white" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h, boxShadow: '0 0 0 9999px rgba(0,0,0,.45)' }} />
        : <div className={`pointer-events-none absolute inset-0 ${mode === 'full' ? 'bg-black/10 outline outline-2 -outline-offset-2 outline-white' : 'bg-black/45'}`} />}
      {mode === 'rect' && r && r.w > 0 && <div className="pointer-events-none absolute rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white" style={{ left: r.x + r.w + 6, top: r.y + r.h + 6 }}>{Math.round(r.w * s)} × {Math.round(r.h * s)}</div>}
      <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="absolute left-1/2 top-3 flex -translate-x-1/2 cursor-default items-center gap-1 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">
        {([['rect', SquareDashed, 'Tryb prostokąta'], ['window', AppWindow, 'Tryb okna'], ['full', Monitor, 'Tryb pełnoekranowy']] as const).map(([m, I, t]) => (
          <button key={m} title={t} onClick={() => { setMode(m); setR(null); }} className={`grid h-9 w-11 place-items-center rounded-[4px] ${mode === m ? 'bg-[#cfe3f7] text-[#0067c0]' : 'hover:bg-black/[.06]'}`}><I size={18} /></button>
        ))}
        <span className="mx-1 h-6 w-px bg-black/10" />
        <button title="Zamknij (Esc)" onClick={onCancel} className="grid h-9 w-11 place-items-center rounded-[4px] hover:bg-black/[.06]"><X size={17} /></button>
      </div>
      <p className="pointer-events-none absolute left-1/2 top-[64px] -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-[12px] text-white">
        {mode === 'rect' ? 'Przeciągnij, aby zaznaczyć obszar' : mode === 'window' ? 'Kliknij okno, które chcesz uchwycić' : 'Kliknij, aby uchwycić cały ekran (tego wymaga arkusz)'}
      </p>
    </div>
  );
}

/** Powiadomienie w prawym dolnym rogu: klik otwiera Narzedzie Wycinanie. */
export function SnipToast({ img, onOpen, onClose }: { img: string; onOpen: () => void; onClose: () => void }) {
  return (
    <div data-noshot="1" onClick={onOpen} className="absolute bottom-[60px] right-3 z-[160] w-[364px] cursor-pointer rounded-[8px] border border-black/10 bg-[#f9f9f9]/95 p-3 text-[12.5px] text-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,.3)] backdrop-blur hover:bg-white">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-[#444]"><SnipIcon size={16} />Narzędzie Wycinanie<span className="flex-1" /><MoreHorizontal size={14} /><button onClick={(e) => { e.stopPropagation(); onClose(); }} className="rounded p-0.5 hover:bg-black/10"><X size={13} /></button></div>
      <p className="font-semibold">Wycinek skopiowany do schowka</p>
      <p className="text-[#555]">Wybierz tutaj, aby oznaczyć i zapisać. Zrzut zapisano też automatycznie w folderze Obrazy\Zrzuty ekranu.</p>
      <img src={img} alt="" className="mt-2 max-h-[180px] w-full rounded border border-black/10 object-contain" />
    </div>
  );
}
export function SnipIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="15" rx="2.5" fill="#e8f1fb" stroke="#2f8be0" strokeWidth="1.4" strokeDasharray="3 2" /><circle cx="8" cy="15" r="2.6" fill="none" stroke="#c4314b" strokeWidth="1.6" /><circle cx="14" cy="15" r="2.6" fill="none" stroke="#c4314b" strokeWidth="1.6" /><path d="M9.5 13 17 5M12.5 13 6 6" stroke="#444" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

/** Okno Narzedzia Wycinanie: piórko, zakreślacz, przycinanie, zapis (Ctrl+S), kopiowanie. */
export default function SnipApp({ win }: { win: Win }) {
  const os = useOS();
  const [img, setImg] = useState<HTMLCanvasElement | null>(null);
  const [hist, setHist] = useState<HTMLCanvasElement[]>([]); const [redo, setRedo] = useState<HTMLCanvasElement[]>([]);
  const [tool, setTool] = useState<'none' | 'pen' | 'hl' | 'crop'>('none');
  const [color, setColor] = useState('#000000');
  const [cropR, setCropR] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const view = useRef<HTMLCanvasElement>(null); const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pts: { x: number; y: number }[] } | null>(null);
  useEffect(() => { const u = String(win.args.img ?? os.clip.image ?? ''); if (u) void loadCanvas(u).then(setImg); }, [win.args.img]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { os.setTitle(win.id, 'Narzędzie Wycinanie'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const v = view.current; if (!v || !img) return; v.width = img.width; v.height = img.height; const g = v.getContext('2d')!; g.drawImage(img, 0, 0); if (cropR) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, img.width, cropR.y); g.fillRect(0, cropR.y + cropR.h, img.width, img.height); g.fillRect(0, cropR.y, cropR.x, cropR.h); g.fillRect(cropR.x + cropR.w, cropR.y, img.width, cropR.h); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(cropR.x, cropR.y, cropR.w, cropR.h); } }, [img, cropR]);
  const commit = (c: HTMLCanvasElement) => { if (img) setHist((h) => [...h, img]); setRedo([]); setImg(c); setSaved(null); };
  const pt = (e: React.PointerEvent) => { const r = view.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * img!.width, y: ((e.clientY - r.top) / r.height) * img!.height }; };
  async function saveAs() {
    if (!img) return;
    const p = await os.pick({ mode: 'save', title: 'Zapisz jako', dir: SHOTS_DIR, name: shotName(), filters: [{ label: 'PNG (*.png)', exts: ['png'] }, { label: 'JPG (*.jpg)', exts: ['jpg'] }, { label: 'GIF (*.gif)', exts: ['gif'] }] });
    if (!p) return;
    const e = p.toLowerCase().split('.').pop();
    const url = e === 'jpg' || e === 'jpeg' ? (() => { const n = document.createElement('canvas'); n.width = img.width; n.height = img.height; const g = n.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, n.width, n.height); g.drawImage(img, 0, 0); return n.toDataURL('image/jpeg', 0.92); })() : e === 'gif' ? await exportGif([img], { delay: 0, loop: false, replace: true }) : img.toDataURL('image/png');
    os.vfs.write(p, url, true); setSaved(p.replace(/\//g, '\\'));
  }
  useWinKeys(root, (e) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 's') { e.preventDefault(); void saveAs(); } else if (c && k === 'c' && img) { e.preventDefault(); os.setClip({ ...os.clip, image: img.toDataURL('image/png') }); }
    else if (c && k === 'n') { e.preventDefault(); void os.screenshot(); } else if (c && k === 'z' && hist.length) { e.preventDefault(); setRedo((r) => [...r, img!]); setImg(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }
    else if (e.key === 'Enter' && cropR) { commit(canvasSize(img!, cropR.w, cropR.h, cropR.x, cropR.y)); setCropR(null); setTool('none'); }
  });
  const tb = 'flex h-9 items-center gap-1.5 rounded-[4px] px-2.5 hover:bg-black/[.05] disabled:opacity-35';
  return (
    <div ref={root} className="flex h-full flex-col bg-[#f3f3f3] text-[12.5px] text-[#1a1a1a]">
      <div className="flex items-center gap-1 border-b border-black/[.06] px-2 py-1">
        <button onClick={() => void os.screenshot()} className={`${tb} bg-[#0067c0] text-white hover:bg-[#1975c5]`}><Plus size={15} />Nowy</button>
        <button className={tb}><SquareDashed size={16} /><ChevronDown size={12} /></button>
        <button className={tb}><Clock size={15} />Bez opóźnienia<ChevronDown size={12} /></button>
        <span className="flex-1" />
        <button title="Zapisz jako (Ctrl+S)" disabled={!img} onClick={() => void saveAs()} className={tb}><Save size={17} /></button>
        <button title="Kopiuj (Ctrl+C)" disabled={!img} onClick={() => img && os.setClip({ ...os.clip, image: img.toDataURL('image/png') })} className={tb}><Copy size={16} /></button>
        <button className={tb}><MoreHorizontal size={16} /></button>
      </div>
      {img && <div className="flex items-center justify-center gap-1 border-b border-black/[.06] py-1">
        {([['pen', Pen, 'Długopis'], ['hl', Highlighter, 'Zakreślacz']] as const).map(([t, I, l]) => <button key={t} title={l} onClick={() => setTool(tool === t ? 'none' : t)} className={`grid h-9 w-10 place-items-center rounded-[4px] ${tool === t ? 'bg-[#cfe3f7] text-[#0067c0]' : 'hover:bg-black/[.05]'}`}><I size={17} /></button>)}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-7 cursor-pointer" title="Kolor" />
        <button title="Gumka (cofa ostatni rysunek)" disabled={!hist.length} onClick={() => { setRedo((r) => [...r, img]); setImg(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }} className="grid h-9 w-10 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-35"><Eraser size={17} /></button>
        <span className="mx-1 h-6 w-px bg-black/10" />
        <button title="Przycinanie obrazu" onClick={() => { setTool(tool === 'crop' ? 'none' : 'crop'); setCropR(tool === 'crop' ? null : { x: 0, y: 0, w: img.width, h: img.height }); }} className={`grid h-9 w-10 place-items-center rounded-[4px] ${tool === 'crop' ? 'bg-[#cfe3f7] text-[#0067c0]' : 'hover:bg-black/[.05]'}`}><Crop size={17} /></button>
        {tool === 'crop' && cropR && <button title="Zastosuj (Enter)" onClick={() => { commit(canvasSize(img, Math.round(cropR.w), Math.round(cropR.h), Math.round(cropR.x), Math.round(cropR.y))); setCropR(null); setTool('none'); }} className="grid h-9 w-10 place-items-center rounded-[4px] text-[#0067c0] hover:bg-black/[.05]"><Check size={18} /></button>}
        <span className="mx-1 h-6 w-px bg-black/10" />
        <button title="Cofnij" disabled={!hist.length} onClick={() => { setRedo((r) => [...r, img]); setImg(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }} className="grid h-9 w-10 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-35"><Undo2 size={16} /></button>
        <button title="Wykonaj ponownie" disabled={!redo.length} onClick={() => { setHist((h) => [...h, img]); setImg(redo[redo.length - 1]); setRedo(redo.slice(0, -1)); }} className="grid h-9 w-10 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-35"><Redo2 size={16} /></button>
      </div>}
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-[#e9e9e9] p-4">
        {img ? <canvas ref={view} className="max-h-full max-w-full bg-white shadow-lg" style={{ cursor: tool === 'none' ? 'default' : 'crosshair' }}
          onPointerDown={(e) => { if (tool === 'none') return; (e.target as HTMLElement).setPointerCapture(e.pointerId); const p = pt(e); drag.current = { ...p, pts: [p] }; }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const p = pt(e);
            if (tool === 'crop') setCropR({ x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), w: Math.abs(p.x - d.x), h: Math.abs(p.y - d.y) });
            else { d.pts.push(p); const g = view.current!.getContext('2d')!; g.strokeStyle = tool === 'hl' ? '#ffeb3b88' : color; g.lineWidth = tool === 'hl' ? 18 : 3; g.lineCap = 'round'; const a = d.pts[d.pts.length - 2]; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(p.x, p.y); g.stroke(); } }}
          onPointerUp={() => { const d = drag.current; drag.current = null; if (d && (tool === 'pen' || tool === 'hl') && img) commit(stroke(clone(img), d.pts, tool === 'hl' ? 18 : 3, tool === 'hl' ? '#ffeb3b88' : color, false)); }} />
          : <div className="text-center text-[#555]"><SnipIcon size={64} /><p className="mt-3 text-[15px]">Naciśnij <b>PrtSc</b> albo <b>Win+Shift+S</b>, aby rozpocząć wycinanie.</p><button onClick={() => void os.screenshot()} className="mt-3 rounded-[4px] bg-[#0067c0] px-4 py-1.5 text-white">+ Nowy</button></div>}
      </div>
      {saved && <div className="border-t border-black/[.06] bg-[#dff6dd] px-3 py-1.5 text-[12px] text-[#0e700e]">Zapisano: {saved}</div>}
    </div>
  );
}
