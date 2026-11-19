import { useEffect, useRef, useState } from 'react';
import { SquareDashed, Crop, Scaling, RotateCw, Pencil, PaintBucket, Type, Eraser, Pipette, ZoomIn, Undo2, Redo2, Save, X, ChevronDown } from 'lucide-react';
import { useOS, type Win, useWinKeys } from '../os';
import { base, ext, parent, DESKTOP } from '../../../lib/vfs';
import { blank, clone, loadCanvas, canvasSize, scale, rotate, flip, stroke, bucket, exportGif, rgbOf } from '../../../lib/imageOps';

type Tool = 'select' | 'pencil' | 'fill' | 'text' | 'eraser' | 'picker' | 'zoom';
const COLORS = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'];
const FILTERS = [{ label: 'PNG (*.png)', exts: ['png'] }, { label: 'JPEG (*.jpg;*.jpeg;*.jpe;*.jfif)', exts: ['jpg', 'jpeg'] }, { label: 'Mapa bitowa 24-bitowa (*.bmp;*.dib)', exts: ['bmp'] }, { label: 'GIF (*.gif)', exts: ['gif'] }];

/** Mapa bitowa 24-bit (jak „Zapisz jako BMP” w Paint). */
function toBmp(c: HTMLCanvasElement) {
  const w = c.width, h = c.height, row = Math.ceil((w * 3) / 4) * 4, size = 54 + row * h;
  const b = new Uint8Array(size); const v = new DataView(b.buffer); const d = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  b[0] = 0x42; b[1] = 0x4d; v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true); v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, row * h, true); v.setInt32(38, 2835, true); v.setInt32(42, 2835, true);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((h - 1 - y) * w + x) * 4, o = 54 + y * row + x * 3; const a = d[s + 3] / 255; b[o] = Math.round(d[s + 2] * a + 255 * (1 - a)); b[o + 1] = Math.round(d[s + 1] * a + 255 * (1 - a)); b[o + 2] = Math.round(d[s] * a + 255 * (1 - a)); }
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return 'data:image/bmp;base64,' + btoa(s);
}
const white = (w: number, h: number) => { const c = blank(w, h); const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); return c; };

export default function Paint({ win }: { win: Win }) {
  const os = useOS();
  const [cv, setCv] = useState<HTMLCanvasElement>(() => white(1152, 648));
  const [path, setPath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [hist, setHist] = useState<HTMLCanvasElement[]>([]); const [redo, setRedo] = useState<HTMLCanvasElement[]>([]);
  const [tool, setTool] = useState<Tool>('pencil');
  const [c1, setC1] = useState('#000000'); const [c2, setC2] = useState('#ffffff'); const [size, setSize] = useState(3);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dlg, setDlg] = useState<null | 'resize'>(null); const [rs, setRs] = useState({ by: 'pct' as 'pct' | 'px', w: 100, h: 100, keep: true });
  const [rot, setRot] = useState(false); const [menu, setMenu] = useState<string | null>(null);
  const view = useRef<HTMLCanvasElement>(null); const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pts: { x: number; y: number }[]; work?: HTMLCanvasElement } | null>(null);
  const [fit, setFit] = useState(1);
  const z = zoom || fit;

  useEffect(() => { os.setTitle(win.id, `${dirty ? '*' : ''}${path ? base(path) : 'Bez tytułu'} - Paint`); }, [path, dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (win.args.path) void openPath(String(win.args.path)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const b = box.current; if (!b) return; const f = () => setFit(Math.min(1, (b.clientWidth - 40) / cv.width, (b.clientHeight - 40) / cv.height)); f(); const ro = new ResizeObserver(f); ro.observe(b); return () => ro.disconnect(); }, [cv]);
  useEffect(() => { const v = view.current; if (!v) return; v.width = cv.width; v.height = cv.height; const g = v.getContext('2d')!; g.drawImage(cv, 0, 0); if (sel) { g.setLineDash([5, 4]); g.strokeStyle = '#0067c0'; g.lineWidth = 1 / z; g.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w, sel.h); } }, [cv, sel, z]);

  const commit = (n: HTMLCanvasElement) => { setHist((h) => [...h.slice(-20), cv]); setRedo([]); setCv(n); setDirty(true); };
  const undo = () => { const h = hist[hist.length - 1]; if (!h) return; setRedo((r) => [...r, cv]); setCv(h); setHist(hist.slice(0, -1)); };
  const redoF = () => { const r = redo[redo.length - 1]; if (!r) return; setHist((h) => [...h, cv]); setCv(r); setRedo(redo.slice(0, -1)); };
  async function openPath(p: string) { try { const c = await loadCanvas(os.vfs.read(p)); setCv(c); setPath(p); setDirty(false); setHist([]); setSel(null); } catch { void os.alert('Paint', 'Paint nie może odczytać tego pliku.\nTo nie jest prawidłowy plik mapy bitowej lub jego format nie jest obecnie obsługiwany.', 'error'); } }
  async function paste() {
    const im = os.clip.image; if (!im) { void os.alert('Paint', 'Schowek jest pusty. Zrób zrzut ekranu (PrtSc) i spróbuj ponownie.', 'info'); return; }
    const p = await loadCanvas(im);
    let base0 = cv;
    if (p.width > cv.width || p.height > cv.height) {
      if (await os.confirm('Paint', 'Obraz, który próbujesz wkleić, jest większy niż kanwa.\nCzy chcesz powiększyć kanwę?')) { base0 = white(Math.max(cv.width, p.width), Math.max(cv.height, p.height)); base0.getContext('2d')!.drawImage(cv, 0, 0); }
    }
    const n = clone(base0); n.getContext('2d')!.drawImage(p, 0, 0); commit(n); setSel({ x: 0, y: 0, w: p.width, h: p.height }); setTool('select');
  }
  async function saveAs() {
    const p = await os.pick({ mode: 'save', title: 'Zapisz jako', dir: path ? parent(path) : DESKTOP, name: path ? base(path) : 'Bez tytułu.png', filters: FILTERS });
    if (p) await write(p);
  }
  async function write(p: string) {
    const e = ext(p);
    if ((e === 'jpg' || e === 'jpeg' || e === 'bmp' || e === 'gif') && !(await os.confirm('Paint', 'Zapisanie obrazu w tym formacie może spowodować utratę przezroczystości i jakości kolorów. Czy chcesz kontynuować?'))) return;
    const url = e === 'png' ? cv.toDataURL('image/png') : e === 'jpg' || e === 'jpeg' ? (() => { const n = white(cv.width, cv.height); n.getContext('2d')!.drawImage(cv, 0, 0); return n.toDataURL('image/jpeg', 0.92); })() : e === 'bmp' ? toBmp(cv) : e === 'gif' ? await exportGif([cv], { delay: 0, loop: false, replace: true }) : cv.toDataURL('image/png');
    os.vfs.write(p, url, true); setPath(p); setDirty(false);
  }
  const save = () => void (path ? write(path) : saveAs());
  const pt = (e: React.PointerEvent) => { const r = view.current!.getBoundingClientRect(); return { x: Math.round(((e.clientX - r.left) / r.width) * cv.width), y: Math.round(((e.clientY - r.top) / r.height) * cv.height) }; };
  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId); const p = pt(e); const col = e.button === 2 ? c2 : c1;
    if (tool === 'fill') { commit(bucket(cv, p.x, p.y, rgbOf(col), 32, null)); return; }
    if (tool === 'picker') { const d = cv.getContext('2d')!.getImageData(p.x, p.y, 1, 1).data; setC1('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')); setTool('pencil'); return; }
    if (tool === 'zoom') { setZoom(Math.min(8, z * (e.button === 2 ? 0.5 : 2))); return; }
    if (tool === 'text') { const t = prompt('Tekst:'); if (t) { const n = clone(cv); const g = n.getContext('2d')!; g.fillStyle = c1; g.font = `${size * 6 + 10}px Calibri, Arial`; g.textBaseline = 'top'; g.fillText(t, p.x, p.y); commit(n); } return; }
    drag.current = { x: p.x, y: p.y, pts: [p], work: tool === 'pencil' || tool === 'eraser' ? clone(cv) : undefined };
    if (tool === 'select') setSel(null);
  }
  function move(e: React.PointerEvent) {
    const p = pt(e); setPos(p); const d = drag.current; if (!d) return;
    if (tool === 'select') setSel({ x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), w: Math.abs(p.x - d.x), h: Math.abs(p.y - d.y) });
    if (d.work) { d.pts.push(p); const w = clone(cv); stroke(w, d.pts, tool === 'eraser' ? size * 4 : size, tool === 'eraser' ? c2 : c1, false); d.work = w; const g = view.current!.getContext('2d')!; g.drawImage(w, 0, 0); }
  }
  function up() { const d = drag.current; drag.current = null; if (d?.work && (tool === 'pencil' || tool === 'eraser')) commit(d.work); }
  const crop = () => { if (sel && sel.w > 1 && sel.h > 1) { commit(canvasSize(cv, sel.w, sel.h, sel.x, sel.y)); setSel(null); } };
  const kroot = useRef<HTMLDivElement>(null);
  useWinKeys(kroot, (e) => keys(e));
  const keys = (e: KeyboardEvent) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (c && k === 'v') { e.preventDefault(); void paste(); } else if (c && k === 's') { e.preventDefault(); if (e.shiftKey) void saveAs(); else save(); }
    else if (c && k === 'z') { e.preventDefault(); undo(); } else if (c && k === 'y') { e.preventDefault(); redoF(); } else if (c && k === 'o') { e.preventDefault(); void os.pick({ mode: 'open', title: 'Otwieranie', filters: [{ label: 'Wszystkie pliki obrazów', exts: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] }] }).then((p) => { if (p) void openPath(p); }); }
    else if (c && k === 'w') { e.preventDefault(); setRs({ by: 'pct', w: 100, h: 100, keep: true }); setDlg('resize'); } else if (c && e.shiftKey && k === 'x') { e.preventDefault(); crop(); }
    else if (c && k === 'a') { e.preventDefault(); setSel({ x: 0, y: 0, w: cv.width, h: cv.height }); setTool('select'); } else if (e.key === 'Delete' && sel) { const n = clone(cv); const g = n.getContext('2d')!; g.fillStyle = c2; g.fillRect(sel.x, sel.y, sel.w, sel.h); commit(n); }
  };
  const T = ({ t, I, label }: { t: Tool; I: typeof Pencil; label: string }) => <button title={label} onClick={() => setTool(t)} className={`grid h-8 w-8 place-items-center rounded-[4px] ${tool === t ? 'bg-[#dbe8f7] outline outline-1 outline-[#7aa7d8]' : 'hover:bg-black/[.05]'}`}><I size={17} strokeWidth={1.6} /></button>;
  const G = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="flex flex-col items-center border-r border-black/[.08] px-3"><div className="flex min-h-[52px] items-center gap-1">{children}</div><span className="text-[11px] text-[#555]">{label}</span></div>;
  const MENU: Record<string, [string, string, () => void][]> = {
    Plik: [['Nowy', 'Ctrl+N', () => { setCv(white(1152, 648)); setPath(null); setDirty(false); setHist([]); }], ['Otwórz', 'Ctrl+O', () => void os.pick({ mode: 'open', title: 'Otwieranie', filters: [{ label: 'Wszystkie pliki obrazów', exts: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] }] }).then((p) => { if (p) void openPath(p); })], ['Zapisz', 'Ctrl+S', save], ['Zapisz jako', 'Ctrl+Shift+S', () => void saveAs()], ['Zamknij', '', () => os.close(win.id)]],
    Edytuj: [['Cofnij', 'Ctrl+Z', undo], ['Wykonaj ponownie', 'Ctrl+Y', redoF], ['Wklej', 'Ctrl+V', () => void paste()], ['Zaznacz wszystko', 'Ctrl+A', () => { setSel({ x: 0, y: 0, w: cv.width, h: cv.height }); setTool('select'); }]],
    Widok: [['Powiększ', 'Ctrl++', () => setZoom(Math.min(8, z * 1.25))], ['Pomniejsz', 'Ctrl+-', () => setZoom(Math.max(0.05, z / 1.25))], ['Dopasuj do okna', 'Ctrl+Shift+H', () => setZoom(0)], ['Rzeczywisty rozmiar', 'Ctrl+0', () => setZoom(1)]],
  };
  return (
    <div ref={kroot} className="flex h-full flex-col bg-[#f3f3f3] text-[12.5px] text-[#1a1a1a] outline-none" tabIndex={0}>
      <div className="flex items-center gap-1 px-2 py-1">
        {Object.keys(MENU).map((m) => <div key={m} className="relative"><button onClick={() => setMenu(menu === m ? null : m)} className={`rounded px-3 py-1 hover:bg-black/[.05] ${menu === m ? 'bg-black/[.05]' : ''}`}>{m}</button>
          {menu === m && <div className="absolute left-0 top-full z-30 w-64 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl" onMouseLeave={() => setMenu(null)}>{MENU[m].map(([l, k, f]) => <button key={l} onClick={() => { setMenu(null); f(); }} className="flex w-full justify-between rounded px-3 py-1.5 hover:bg-black/[.05]"><span>{l}</span><span className="text-[11px] text-[#666]">{k}</span></button>)}</div>}</div>)}
        <span className="mx-2 h-5 w-px bg-black/10" /><button onClick={save} title="Zapisz (Ctrl+S)" className="rounded p-1.5 hover:bg-black/[.05]"><Save size={15} /></button><button onClick={undo} className="rounded p-1.5 hover:bg-black/[.05]"><Undo2 size={15} /></button><button onClick={redoF} className="rounded p-1.5 hover:bg-black/[.05]"><Redo2 size={15} /></button>
      </div>
      <div className="flex items-stretch border-y border-black/[.06] bg-[#f9f9f9] py-1.5">
        <G label="Zaznaczenie"><T t="select" I={SquareDashed} label="Zaznacz" /></G>
        <G label="Obraz"><button title="Przytnij (Ctrl+Shift+X)" onClick={crop} disabled={!sel} className="grid h-8 w-8 place-items-center rounded-[4px] hover:bg-black/[.05] disabled:opacity-35"><Crop size={17} /></button>
          <button title="Zmień rozmiar i pochyl (Ctrl+W)" onClick={() => { setRs({ by: 'pct', w: 100, h: 100, keep: true }); setDlg('resize'); }} className="grid h-8 w-8 place-items-center rounded-[4px] hover:bg-black/[.05]"><Scaling size={17} /></button>
          <div className="relative"><button title="Obróć" onClick={() => setRot((v) => !v)} className="flex h-8 items-center rounded-[4px] px-1 hover:bg-black/[.05]"><RotateCw size={17} /><ChevronDown size={11} /></button>
            {rot && <div className="absolute left-0 top-full z-30 w-52 rounded-[8px] border border-black/10 bg-[#f9f9f9] p-1 shadow-xl">{[['Obróć w prawo o 90°', () => commit(rotate(cv, 90))], ['Obróć w lewo o 90°', () => commit(rotate(cv, -90))], ['Obróć o 180°', () => commit(rotate(cv, 180))], ['Przerzuć w pionie', () => commit(flip(cv, 'v'))], ['Przerzuć w poziomie', () => commit(flip(cv, 'h'))]].map(([l, f]) => <button key={l as string} onClick={() => { setRot(false); (f as () => void)(); }} className="block w-full rounded px-3 py-1.5 text-left hover:bg-black/[.05]">{l as string}</button>)}</div>}</div></G>
        <G label="Narzędzia"><div className="grid grid-cols-3 gap-0.5"><T t="pencil" I={Pencil} label="Ołówek" /><T t="fill" I={PaintBucket} label="Wypełnij kolorem" /><T t="text" I={Type} label="Tekst" /><T t="eraser" I={Eraser} label="Gumka" /><T t="picker" I={Pipette} label="Selektor kolorów" /><T t="zoom" I={ZoomIn} label="Lupa" /></div></G>
        <G label="Rozmiar"><select value={size} onChange={(e) => setSize(+e.target.value)} className="rounded border border-black/15 bg-white px-1 py-1">{[1, 3, 5, 8, 12].map((s) => <option key={s} value={s}>{s} px</option>)}</select></G>
        <G label="Kolory"><div className="relative mr-2 h-9 w-9"><span className="absolute bottom-0 right-0 h-6 w-6 rounded-full border border-black/20" style={{ background: c2 }} /><span className="absolute left-0 top-0 h-6 w-6 rounded-full border-2 border-white shadow" style={{ background: c1 }} /></div>
          <div className="grid grid-cols-10 gap-1">{COLORS.map((c) => <button key={c} onClick={() => setC1(c)} onContextMenu={(e) => { e.preventDefault(); setC2(c); }} className="h-5 w-5 rounded-full border border-black/15" style={{ background: c }} />)}</div></G>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 overflow-auto bg-[#e6eaf0] p-5">
        <canvas ref={view} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setPos(null)} onContextMenu={(e) => e.preventDefault()}
          className="bg-white shadow-[0_2px_8px_rgba(0,0,0,.15)]" style={{ width: cv.width * z, height: cv.height * z, cursor: tool === 'select' ? 'crosshair' : tool === 'zoom' ? 'zoom-in' : 'crosshair', imageRendering: z >= 2 ? 'pixelated' : 'auto' }} />
      </div>
      <div className="flex h-7 items-center gap-6 border-t border-black/[.06] px-3 text-[12px] text-[#444]">
        <span className="w-28">{pos ? `${pos.x}, ${pos.y}px` : ''}</span><span className="w-28">{sel ? `${sel.w} × ${sel.h}px` : ''}</span><span>{cv.width} × {cv.height}px</span><span className="ml-auto">{Math.round(z * 100)}%</span>
        <input type="range" min={5} max={400} value={Math.round(z * 100)} onChange={(e) => setZoom(+e.target.value / 100)} className="w-28" />
      </div>
      {dlg === 'resize' && (
        <div className="fixed inset-0 z-[240] grid place-items-center bg-black/5"><div className="w-[340px] rounded-[8px] border border-black/15 bg-[#f9f9f9] p-5 shadow-2xl">
          <div className="mb-3 flex"><p className="flex-1 text-[16px] font-semibold">Zmień rozmiar i pochyl</p><button onClick={() => setDlg(null)}><X size={14} /></button></div>
          <p className="mb-2 font-semibold">Zmień rozmiar</p>
          <div className="mb-2 flex gap-4"><label><input type="radio" checked={rs.by === 'pct'} onChange={() => setRs({ ...rs, by: 'pct', w: 100, h: 100 })} /> Procent</label><label><input type="radio" checked={rs.by === 'px'} onChange={() => setRs({ ...rs, by: 'px', w: cv.width, h: cv.height })} /> Piksele</label></div>
          <label className="mb-1 flex items-center justify-between">W poziomie <input type="number" value={rs.w} onChange={(e) => { const v = +e.target.value; setRs({ ...rs, w: v, h: rs.keep ? (rs.by === 'pct' ? v : Math.round((v * cv.height) / cv.width)) : rs.h }); }} className="w-24 rounded border border-black/15 px-2 py-0.5" /></label>
          <label className="mb-1 flex items-center justify-between">W pionie <input type="number" value={rs.h} onChange={(e) => { const v = +e.target.value; setRs({ ...rs, h: v, w: rs.keep ? (rs.by === 'pct' ? v : Math.round((v * cv.width) / cv.height)) : rs.w }); }} className="w-24 rounded border border-black/15 px-2 py-0.5" /></label>
          <label className="mb-4 flex items-center gap-2"><input type="checkbox" checked={rs.keep} onChange={(e) => setRs({ ...rs, keep: e.target.checked })} />Zachowaj współczynnik proporcji</label>
          <div className="flex justify-end gap-2"><button onClick={() => { const w = rs.by === 'pct' ? Math.round((cv.width * rs.w) / 100) : rs.w, h = rs.by === 'pct' ? Math.round((cv.height * rs.h) / 100) : rs.h; if (w > 0 && h > 0) commit(scale(cv, w, h)); setDlg(null); }} className="h-8 w-24 rounded-[4px] bg-[#0067c0] text-white">OK</button><button onClick={() => setDlg(null)} className="h-8 w-24 rounded-[4px] border border-black/15 bg-white">Anuluj</button></div>
        </div></div>
      )}
    </div>
  );
}
