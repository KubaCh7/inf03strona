import { useEffect, useRef, useState } from 'react';
import { X, Crop, Eraser, MousePointer2, Link2, Link2Off, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { canvasSize, colorToAlpha, exportGif, exportRaster, flip, loadCanvas, newId, pixel, rotate, scale, hasAlpha, type Layer } from '../lib/imageOps';
import { renderShot, windowScreen } from '../lib/autoShots';

export type EditorMode = 'gimp' | 'photoshop';
type Dialog = null | 'open' | 'layers' | 'scale' | 'canvas' | 'c2a' | 'export';
type Tool = 'move' | 'crop' | 'eraser' | 'pick';
type Item = { label: string; key?: string; run?: () => void; sub?: Item[]; off?: boolean } | '-';

const dark = 'bg-[#2b2b2b] text-[#ddd]';
const field = 'mono w-24 rounded border border-[#555] bg-[#1e1e1e] px-2 py-1 text-[#eee]';
function Modal({ title, children, ok, okLabel = 'OK', onCancel }: { title: string; children: React.ReactNode; ok?: () => void; okLabel?: string; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={`${dark} w-[440px] max-w-[95vw] rounded border border-[#555] shadow-2xl`}>
        <p className="bg-[#1e1e1e] px-3 py-2 text-sm font-bold">{title}</p>
        <div className="space-y-3 p-4 text-sm">{children}</div>
        {ok && <div className="flex justify-end gap-2 border-t border-[#444] p-3"><button className="rounded bg-[#444] px-3 py-1" onClick={onCancel}>Anuluj</button><button className="rounded bg-[#3d7bd9] px-3 py-1 font-bold text-white" onClick={ok}>{okLabel}</button></div>}
      </div>
    </div>
  );
}
function SourceList({ sources, onPick }: { sources: { name: string; url: string }[]; onPick: (s: { name: string; url: string }) => void }) {
  return (
    <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto">
      {sources.map((s) => <button key={s.name} className="rounded border border-[#555] p-1 text-left hover:border-[#3d7bd9]" onClick={() => onPick(s)}><img src={s.url} alt="" className="h-16 w-full object-contain" /><span className="mono block truncate text-[11px]">{s.name}</span></button>)}
      {!sources.length && <p className="col-span-3 text-[#aaa]">Brak grafik w tym arkuszu.</p>}
    </div>
  );
}

export default function ImageEditor({ mode, onMode, sources, hints, defaultName, paramShot, onSave, onClose }: {
  mode: EditorMode; onMode: (m: EditorMode) => void;
  sources: { name: string; url: string }[]; hints: string[]; defaultName?: string;
  paramShot?: { name: string; ext: string } | null;
  onSave: (name: string, dataUrl: string) => void; onClose: () => void;
}) {
  const gimp = mode === 'gimp';
  const [layers, setLayers] = useState<Layer[]>([]);
  const [act, setAct] = useState(0);
  const [hist, setHist] = useState<Layer[][]>([]);
  const [dlg, setDlg] = useState<Dialog>('open');
  const [tool, setTool] = useState<Tool>('move');
  const [menu, setMenu] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tol, setTol] = useState(30);
  const [toast, setToast] = useState('');
  const view = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const L = layers[act];
  const W = layers[0]?.c.width ?? 0, H = layers[0]?.c.height ?? 0;

  // ---------- rysowanie ----------
  useEffect(() => {
    const v = view.current; if (!v || !L) return;
    v.width = L.c.width; v.height = L.c.height;
    const x = v.getContext('2d')!;
    for (let yy = 0; yy < v.height; yy += 16) for (let xx = 0; xx < v.width; xx += 16) { x.fillStyle = ((xx + yy) / 16) % 2 ? '#ccc' : '#fff'; x.fillRect(xx, yy, 16, 16); }
    x.drawImage(L.c, 0, 0);
    if (crop) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, v.width, crop.y); x.fillRect(0, crop.y + crop.h, v.width, v.height); x.fillRect(0, crop.y, crop.x, crop.h); x.fillRect(crop.x + crop.w, crop.y, v.width, crop.h); x.strokeStyle = '#fbbf24'; x.lineWidth = Math.max(1, v.width / 400); x.strokeRect(crop.x, crop.y, crop.w, crop.h); }
  }, [L, crop, layers]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500); };
  const commit = (next: Layer[], a = act) => { setHist((h) => [...h.slice(-19), layers]); setLayers(next); setAct(Math.min(a, Math.max(0, next.length - 1))); };
  const all = (f: (c: HTMLCanvasElement) => HTMLCanvasElement) => L && commit(layers.map((l) => ({ ...l, c: f(l.c) })));
  const undo = () => setHist((h) => { if (!h.length) return h; setLayers(h[h.length - 1]); setAct(0); return h.slice(0, -1); });

  async function open(src: { name: string; url: string }, asLayer: boolean) {
    try {
      const c = await loadCanvas(src.url);
      const l = { id: newId(), name: src.name, c };
      if (asLayer && layers.length) commit([...layers, l], layers.length); else { setHist([]); setLayers([l]); setAct(0); }
    } catch (e) { flash((e as Error).message); }
  }
  const pt = (e: React.MouseEvent) => { const r = view.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  function down(e: React.MouseEvent) {
    if (!L) return; const p = pt(e);
    if (tool === 'crop') { drag.current = p; setCrop({ x: p.x, y: p.y, w: 0, h: 0 }); }
    if (tool === 'eraser') { commit(layers.map((l, i) => (i === act ? { ...l, c: colorToAlpha(l.c, pixel(l.c, p.x, p.y), tol, { x: p.x, y: p.y }) } : l))); }
    if (tool === 'pick') { const c = pixel(L.c, p.x, p.y); setPick(c); setTool('move'); setDlg('c2a'); }
  }
  function move(e: React.MouseEvent) { if (tool !== 'crop' || !drag.current) return; const p = pt(e), s = drag.current; setCrop({ x: Math.round(Math.min(s.x, p.x)), y: Math.round(Math.min(s.y, p.y)), w: Math.round(Math.abs(p.x - s.x)), h: Math.round(Math.abs(p.y - s.y)) }); }
  const applyCrop = () => { if (crop && crop.w > 0 && crop.h > 0) { all((c) => canvasSize(c, crop.w, crop.h, crop.x, crop.y)); setCrop(null); setTool('move'); } };

  // ---------- dialogi ----------
  const [sw, setSw] = useState(0); const [sh, setSh] = useState(0); const [chain, setChain] = useState(true);
  const [cw, setCw] = useState(0); const [ch, setCh] = useState(0); const [ox, setOx] = useState(0); const [oy, setOy] = useState(0);
  const [pick, setPick] = useState<[number, number, number]>([255, 255, 255]);
  const [name, setName] = useState(defaultName ?? 'obraz.png');
  const [quality, setQuality] = useState(90);
  const [anim, setAnim] = useState(true); const [loop, setLoop] = useState(true); const [delay, setDelay] = useState(100); const [replace, setReplace] = useState(true);
  useEffect(() => { if (dlg === 'scale') { setSw(W); setSh(H); } if (dlg === 'canvas') { setCw(W); setCh(H); setOx(0); setOy(0); } }, [dlg]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (defaultName) setName(defaultName); }, [defaultName]);
  const ext = (/\.(\w+)$/.exec(name)?.[1] ?? '').toLowerCase();

  async function doExport() {
    if (!L) return;
    if (!/^(png|jpe?g|gif)$/.test(ext)) { flash('Nazwa musi kończyć się na .png, .jpg albo .gif'); return; }
    let url: string;
    if (ext === 'gif') url = await exportGif(anim ? layers.map((l) => l.c) : [L.c], { delay, loop, replace });
    else {
      if (layers.length > 1) flash('Zapisuję tylko aktywną warstwę (PNG/JPG nie mają klatek).');
      url = exportRaster(L.c, ext === 'png' ? 'png' : 'jpg', quality / 100);
    }
    onSave(name, url);
    if (ext === 'gif' && anim && paramShot) {
      const rows = gimp
        ? `<b>Eksportuj obraz jako GIF</b><br>☑ Jako animację<br>${loop ? '☑' : '☐'} Pętla nieskończona<br>Opóźnienie między klatkami, jeśli nie podano: <b>${delay}</b> milisekund<br>Tryb ramek, jeśli nie podano: <b>${replace ? 'Jedna ramka na warstwę (zastąpienie)' : 'Kumulacja warstw (łączenie)'}</b><br>Liczba warstw (klatek): ${layers.length}<br>Plik: ${name}`
        : `<b>Zapisz dla Internetu</b><br>Format: <b>GIF</b><br>Opcje zapętlania: <b>${loop ? 'Zawsze' : 'Raz'}</b><br>Oś czasu: ${layers.length} klatek, opóźnienie klatki <b>${(delay / 1000).toFixed(2)} s</b> (${delay} ms)<br>Metoda usuwania: <b>${replace ? 'Usuń' : 'Nie usuwaj'}</b><br>Rozmiar obrazu: ${W} × ${H} px<br>Plik: ${name}`;
      onSave(`${paramShot.name}.${paramShot.ext}`, await renderShot(windowScreen(gimp ? 'Eksportuj obraz jako GIF' : 'Zapisz dla Internetu', rows), paramShot.ext));
      flash(`Zapisano ${name} i zrzut ${paramShot.name}.${paramShot.ext} w grafikach warsztatu`);
    } else flash(`Zapisano ${name} (${W}×${H}${ext !== 'jpg' && ext !== 'jpeg' && hasAlpha(L.c) ? ', z przezroczystością' : ''}) w grafikach warsztatu`);
    setDlg(null);
  }

  // ---------- menu ----------
  const has = !!L;
  const MENUS: [string, Item[]][] = gimp ? [
    ['Plik', [{ label: 'Otwórz…', key: 'Ctrl+O', run: () => setDlg('open') }, { label: 'Otwórz jako warstwy…', key: 'Ctrl+Alt+O', run: () => setDlg('layers'), off: !has }, '-', { label: 'Eksportuj jako…', key: 'Shift+Ctrl+E', run: () => setDlg('export'), off: !has }, '-', { label: 'Zamknij', run: onClose }]],
    ['Edycja', [{ label: 'Cofnij', key: 'Ctrl+Z', run: undo, off: !hist.length }]],
    ['Obraz', [{ label: 'Rozmiar płótna…', run: () => setDlg('canvas'), off: !has }, { label: 'Skaluj obraz…', run: () => setDlg('scale'), off: !has }, '-',
      { label: 'Przekształcenie', sub: [{ label: 'Odbij poziomo', run: () => all((c) => flip(c, 'h')) }, { label: 'Odbij pionowo', run: () => all((c) => flip(c, 'v')) }, '-', { label: 'Obróć o 90° w prawo', run: () => all((c) => rotate(c, 90)) }, { label: 'Obróć o 90° w lewo', run: () => all((c) => rotate(c, -90)) }, { label: 'Obróć o 180°', run: () => all((c) => rotate(c, 180)) }], off: !has }]],
    ['Warstwa', [{ label: 'Nowa warstwa z pliku…', run: () => setDlg('layers'), off: !has }, { label: 'Usuń warstwę', run: () => layers.length > 1 && commit(layers.filter((_, i) => i !== act)), off: layers.length < 2 },
      { label: 'Przezroczystość', sub: [{ label: 'Dodaj kanał alfa', run: () => flash('Kanał alfa dodany: warstwa może mieć przezroczyste piksele.') }], off: !has }]],
    ['Kolory', [{ label: 'Kolor na alfa…', run: () => setDlg('c2a'), off: !has }]],
    ['Narzędzia', [{ label: 'Kadrowanie', key: 'Shift+C', run: () => setTool('crop'), off: !has }, { label: 'Wybór koloru do przezroczystości', run: () => setTool('pick'), off: !has }]],
  ] : [
    ['Plik', [{ label: 'Otwórz…', key: 'Ctrl+O', run: () => setDlg('open') }, { label: 'Skrypty', sub: [{ label: 'Wczytaj pliki do stosu…', run: () => setDlg('layers') }], off: !has }, '-',
      { label: 'Eksportuj', sub: [{ label: 'Eksportuj jako…', run: () => setDlg('export') }, { label: 'Zapisz dla Internetu (starsza wersja)…', run: () => setDlg('export') }], off: !has }, '-', { label: 'Zamknij', run: onClose }]],
    ['Edycja', [{ label: 'Cofnij', key: 'Ctrl+Z', run: undo, off: !hist.length }, '-', { label: 'Przekształć', sub: [{ label: 'Obróć o 180°', run: () => all((c) => rotate(c, 180)) }, { label: 'Obróć o 90° zgodnie z ruchem wskazówek', run: () => all((c) => rotate(c, 90)) }, { label: 'Obróć o 90° przeciwnie do ruchu wskazówek', run: () => all((c) => rotate(c, -90)) }, '-', { label: 'Odwróć w poziomie', run: () => all((c) => flip(c, 'h')) }, { label: 'Odwróć w pionie', run: () => all((c) => flip(c, 'v')) }], off: !has }]],
    ['Obraz', [{ label: 'Rozmiar obrazu…', key: 'Alt+Ctrl+I', run: () => setDlg('scale'), off: !has }, { label: 'Rozmiar obszaru roboczego…', key: 'Alt+Ctrl+C', run: () => setDlg('canvas'), off: !has },
      { label: 'Obrót obrazu', sub: [{ label: '180°', run: () => all((c) => rotate(c, 180)) }, { label: '90° w prawo', run: () => all((c) => rotate(c, 90)) }, { label: '90° w lewo', run: () => all((c) => rotate(c, -90)) }, '-', { label: 'Odbij obszar roboczy w poziomie', run: () => all((c) => flip(c, 'h')) }, { label: 'Odbij obszar roboczy w pionie', run: () => all((c) => flip(c, 'v')) }], off: !has }]],
    ['Warstwa', [{ label: 'Nowa', sub: [{ label: 'Warstwa z pliku…', run: () => setDlg('layers') }], off: !has }, { label: 'Usuń warstwę', run: () => layers.length > 1 && commit(layers.filter((_, i) => i !== act)), off: layers.length < 2 }]],
    ['Okno', [{ label: 'Oś czasu (klatki animacji)', run: () => flash('Oś czasu: każda warstwa to klatka. Czas klatki i zapętlanie ustawiasz w „Zapisz dla Internetu”.') }]],
  ];
  const runItem = (it: Item) => { if (it === '-' || it.off || !it.run) return; setMenu(null); it.run(); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input')) { if (e.key === 'Enter' && tool === 'crop') applyCrop(); return; }
      const c = e.ctrlKey || e.metaKey;
      if (c && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (c && e.key.toLowerCase() === 'o') { e.preventDefault(); setDlg(e.altKey ? 'layers' : 'open'); }
      else if (c && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); if (has) setDlg('export'); }
      else if (c && e.altKey && e.key.toLowerCase() === 'i') { e.preventDefault(); if (has) setDlg('scale'); }
      else if (c && e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); if (has) setDlg('canvas'); }
      else if (gimp && e.shiftKey && e.key.toLowerCase() === 'c') setTool('crop');
      else if (!gimp && !c && e.key.toLowerCase() === 'c') setTool('crop');
      else if (!gimp && !c && e.key.toLowerCase() === 'e') setTool('eraser');
      else if (e.key === 'Enter' && tool === 'crop') applyCrop();
      else if (e.key === 'Escape') { setMenu(null); setCrop(null); setTool('move'); if (dlg) setDlg(null); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const pickSource = (src: { name: string; url: string }, asLayer: boolean) => { void open(src, asLayer); if (!asLayer) setDlg(null); else flash(`Dodano warstwę ${src.name}`); };
  const ratio = W && H ? W / H : 1;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#3c3c3c] text-sm" onMouseDown={() => menu && setMenu(null)}>
      {/* pasek tytulu i menu */}
      <div className={`${dark} relative z-30 flex items-center gap-1 border-b border-[#222] px-2`}>
        <span className="mr-2 py-1.5 text-xs font-bold text-[#9cf]">{gimp ? 'Edytor (układ GIMP)' : 'Edytor (układ Photoshop)'}</span>
        {MENUS.map(([m, items]) => (
          <div key={m} className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button className={`rounded px-2 py-1.5 ${menu === m ? 'bg-[#3d7bd9] text-white' : 'hover:bg-[#444]'}`} onClick={() => setMenu(menu === m ? null : m)} onMouseEnter={() => menu && setMenu(m)}>{m}</button>
            {menu === m && (
              <div className={`${dark} absolute left-0 top-full z-30 min-w-[260px] rounded border border-[#555] py-1 shadow-2xl`}>
                {items.map((it, i) => it === '-' ? <hr key={i} className="my-1 border-[#444]" /> : (
                  <div key={i} className="group relative">
                    <button disabled={it.off} className="flex w-full justify-between gap-6 px-3 py-1 text-left hover:bg-[#3d7bd9] hover:text-white disabled:opacity-40" onClick={() => runItem(it)}><span>{it.label}{it.sub ? ' ▸' : it.run && /…$/.test(it.label) ? '' : ''}</span><span className="text-xs opacity-60">{it.key}</span></button>
                    {it.sub && !it.off && <div className={`${dark} absolute left-full top-0 hidden min-w-[240px] rounded border border-[#555] py-1 shadow-2xl group-hover:block`}>{it.sub.map((s, k) => s === '-' ? <hr key={k} className="my-1 border-[#444]" /> : <button key={k} className="block w-full px-3 py-1 text-left hover:bg-[#3d7bd9] hover:text-white" onClick={() => runItem(s)}>{s.label}</button>)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="opacity-60">Układ:</span>
          {(['gimp', 'photoshop'] as const).map((m) => <button key={m} className={`rounded px-2 py-1 ${mode === m ? 'bg-[#3d7bd9] text-white' : 'bg-[#444]'}`} onClick={() => onMode(m)}>{m === 'gimp' ? 'GIMP' : 'Photoshop'}</button>)}
          <button className="ml-2 rounded p-1 hover:bg-[#555]" onClick={onClose} aria-label="Zamknij edytor"><X size={16} /></button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* narzedzia */}
        <div className={`${dark} flex w-11 flex-col items-center gap-1 border-r border-[#222] py-2`}>
          {([['move', MousePointer2, 'Przesuwanie (zwykły kursor)'], ['crop', Crop, gimp ? 'Kadrowanie (Shift+C)' : 'Kadrowanie (C)'], [gimp ? 'pick' : 'eraser', Eraser, gimp ? 'Wybierz kolor do „Kolor na alfa”' : 'Magiczna gumka (E): klik usuwa tło tego koloru']] as const).map(([t, I, label]) => (
            <button key={t} title={label} disabled={!has} className={`rounded p-2 ${tool === t ? 'bg-[#3d7bd9] text-white' : 'hover:bg-[#444]'} disabled:opacity-40`} onClick={() => setTool(t as Tool)}><I size={17} /></button>
          ))}
        </div>

        {/* plotno */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className={`${dark} flex flex-wrap items-center gap-3 border-b border-[#222] px-3 py-1.5 text-xs`}>
            {tool === 'crop' && <>Kadrowanie: przeciągnij na obrazie albo wpisz:
              {(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k} className="flex items-center gap-1">{{ x: 'X', y: 'Y', w: 'Szer.', h: 'Wys.' }[k]}<input type="number" className={field} value={crop?.[k] ?? 0} onChange={(e) => setCrop({ ...(crop ?? { x: 0, y: 0, w: W, h: H }), [k]: Math.max(0, +e.target.value) })} /></label>)}
              <button className="rounded bg-[#3d7bd9] px-2 py-1 text-white" onClick={applyCrop}>Kadruj (Enter)</button></>}
            {tool === 'eraser' && <>Magiczna gumka · Tolerancja <input type="number" className={field} value={tol} onChange={(e) => setTol(+e.target.value)} /> · ciągłe: tak · kliknij tło</>}
            {tool === 'pick' && <>Kliknij kolor na obrazie, który ma stać się przezroczysty</>}
            {tool === 'move' && has && <>{L.name} · {W} × {H} px · warstw: {layers.length}{hasAlpha(L.c) ? ' · ma przezroczystość' : ''}</>}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
            {has
              ? <canvas ref={view} className={`max-h-full max-w-full shadow-xl ${tool === 'move' ? '' : 'cursor-crosshair'}`} style={{ imageRendering: W < 300 ? 'pixelated' : 'auto', width: W < 400 ? W * 2 : undefined }} onMouseDown={down} onMouseMove={move} onMouseUp={() => { drag.current = null; }} />
              : <button className="rounded bg-[#444] px-4 py-3 text-[#ddd]" onClick={() => setDlg('open')}>Plik → Otwórz… (Ctrl+O)</button>}
          </div>
          {hints.length > 0 && <div className="max-h-28 overflow-auto border-t border-[#222] bg-[#252525] px-3 py-2 text-xs text-[#ccc]"><b className="text-[#9cf]">Z arkusza:</b> {hints.join(' · ')}</div>}
          {toast && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-black/80 px-3 py-2 text-white">{toast}</div>}
        </div>

        {/* warstwy / klatki */}
        <div className={`${dark} w-56 border-l border-[#222] p-2`}>
          <p className="mb-2 text-xs font-bold uppercase opacity-70">{gimp ? 'Warstwy' : 'Warstwy / klatki osi czasu'}</p>
          <div className="space-y-1">
            {[...layers.map((l, i) => ({ l, i }))].reverse().map(({ l, i }) => (
              <div key={l.id} className={`flex items-center gap-2 rounded p-1 ${i === act ? 'bg-[#3d7bd9] text-white' : 'hover:bg-[#444]'}`} onClick={() => setAct(i)}>
                <img src={l.c.toDataURL()} alt="" className="h-8 w-10 bg-white object-contain" />
                <span className="flex-1 truncate text-xs">{l.name}</span>
                <button title="Wyżej" onClick={(e) => { e.stopPropagation(); if (i < layers.length - 1) { const n = [...layers]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; commit(n, i + 1); } }}><ChevronUp size={13} /></button>
                <button title="Niżej" onClick={(e) => { e.stopPropagation(); if (i > 0) { const n = [...layers]; [n[i], n[i - 1]] = [n[i - 1], n[i]]; commit(n, i - 1); } }}><ChevronDown size={13} /></button>
                <button title="Usuń" onClick={(e) => { e.stopPropagation(); if (layers.length > 1) commit(layers.filter((_, k) => k !== i)); }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          {layers.length > 1 && <p className="mt-2 text-[11px] opacity-60">W GIF każda warstwa to jedna klatka, od dolnej do górnej.</p>}
        </div>
      </div>

      {/* okna dialogowe */}
      {dlg === 'open' && <Modal onCancel={() => setDlg(null)} title={gimp ? 'Otwórz obraz' : 'Otwórz'}><SourceList sources={sources} onPick={(x) => pickSource(x, false)} /></Modal>}
      {dlg === 'layers' && <Modal onCancel={() => setDlg(null)} title={gimp ? 'Otwórz jako warstwy' : 'Wczytaj warstwy'} ok={() => setDlg(null)} okLabel="Gotowe"><p className="text-xs opacity-70">Klikaj obrazy po kolei: każdy będzie nową warstwą (klatką animacji).</p><SourceList sources={sources} onPick={(x) => pickSource(x, true)} /></Modal>}
      {dlg === 'scale' && <Modal onCancel={() => setDlg(null)} title={gimp ? 'Skalowanie obrazu' : 'Rozmiar obrazu'} ok={() => { all((c) => scale(c, sw, sh)); setDlg(null); }} okLabel={gimp ? 'Skaluj' : 'OK'}>
        <p className="opacity-70">Teraz: {W} × {H} px</p>
        <div className="flex items-center gap-2">
          <label>Szerokość <input type="number" className={field} value={sw} onChange={(e) => { const v = +e.target.value; setSw(v); if (chain) setSh(Math.round(v / ratio)); }} /></label>
          <button title={chain ? 'Proporcje zachowane (kliknij, żeby rozpiąć)' : 'Proporcje odpięte'} className={`rounded p-1 ${chain ? 'text-[#9cf]' : 'opacity-60'}`} onClick={() => setChain((v) => !v)}>{chain ? <Link2 size={18} /> : <Link2Off size={18} />}</button>
          <label>Wysokość <input type="number" className={field} value={sh} onChange={(e) => { const v = +e.target.value; setSh(v); if (chain) setSw(Math.round(v * ratio)); }} /></label> px
        </div>
        <p className="text-xs opacity-60">{gimp ? 'Łańcuszek zamknięty = zachowanie proporcji.' : 'Ikona ogniwa = „Ogranicz proporcje”.'} Skalowanie dotyczy wszystkich warstw.</p>
      </Modal>}
      {dlg === 'canvas' && <Modal onCancel={() => setDlg(null)} title={gimp ? 'Zmiana rozmiaru płótna' : 'Rozmiar obszaru roboczego'} ok={() => { all((c) => canvasSize(c, cw, ch, ox, oy)); setDlg(null); }} okLabel={gimp ? 'Zmień rozmiar' : 'OK'}>
        <div className="flex flex-wrap gap-3"><label>Szerokość <input type="number" className={field} value={cw} onChange={(e) => setCw(+e.target.value)} /></label><label>Wysokość <input type="number" className={field} value={ch} onChange={(e) => setCh(+e.target.value)} /></label></div>
        <div className="flex flex-wrap gap-3"><label>Przesunięcie X <input type="number" className={field} value={ox} onChange={(e) => setOx(+e.target.value)} /></label><label>Y <input type="number" className={field} value={oy} onChange={(e) => setOy(+e.target.value)} /></label>
          <button className="rounded bg-[#444] px-2" onClick={() => { setOx(Math.round((W - cw) / 2)); setOy(Math.round((H - ch) / 2)); }}>Wyśrodkuj</button></div>
        <p className="text-xs opacity-60">Mniejsze płótno przycina obraz (kadrowanie do dokładnych wymiarów), większe dodaje przezroczysty margines.</p>
      </Modal>}
      {dlg === 'c2a' && <Modal onCancel={() => setDlg(null)} title="Kolor na alfa" ok={() => { if (L) commit(layers.map((l, i) => (i === act ? { ...l, c: colorToAlpha(l.c, pick, tol) } : l))); setDlg(null); }}>
        <div className="flex items-center gap-3">Kolor <input type="color" value={'#' + pick.map((v) => v.toString(16).padStart(2, '0')).join('')} onChange={(e) => { const h = e.target.value; setPick([1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)) as [number, number, number]); }} />
          <button className="rounded bg-[#444] px-2 py-1" onClick={() => { setDlg(null); setTool('pick'); }}>Pobierz z obrazu</button></div>
        <label className="flex items-center gap-2">Próg (tolerancja) <input type="range" min={0} max={120} value={tol} onChange={(e) => setTol(+e.target.value)} /> <span className="mono">{tol}</span></label>
        <p className="text-xs opacity-60">Wszystkie piksele tego koloru (w całej warstwie) staną się przezroczyste. Zapisz potem jako PNG lub GIF: JPG nie ma przezroczystości.</p>
      </Modal>}
      {dlg === 'export' && <Modal onCancel={() => setDlg(null)} title={gimp ? 'Eksportuj obraz' : 'Zapisz dla Internetu'} ok={() => void doExport()} okLabel={gimp ? 'Eksportuj' : 'Zapisz'}>
        <label className="block">Nazwa pliku <input className={`${field} w-full`} value={name} onChange={(e) => setName(e.target.value.trim())} /></label>
        <p className="text-xs opacity-70">Format wynika z rozszerzenia: {ext ? ext.toUpperCase() : '—'} · obraz {W} × {H} px · warstw {layers.length}</p>
        {(ext === 'jpg' || ext === 'jpeg') && <label className="flex items-center gap-2">Jakość <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /> {quality}</label>}
        {ext === 'gif' && (gimp ? <div className="space-y-2 rounded border border-[#444] p-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={anim} onChange={(e) => setAnim(e.target.checked)} />Jako animację</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={loop} disabled={!anim} onChange={(e) => setLoop(e.target.checked)} />Pętla nieskończona</label>
          <label className="flex items-center gap-2">Opóźnienie między klatkami <input type="number" className={field} value={delay} disabled={!anim} onChange={(e) => setDelay(Math.max(10, +e.target.value))} /> milisekund</label>
          <label className="flex items-center gap-2">Tryb ramek <select className={field + ' w-auto'} value={replace ? 'r' : 'c'} disabled={!anim} onChange={(e) => setReplace(e.target.value === 'r')}><option value="r">Jedna ramka na warstwę (zastąpienie)</option><option value="c">Kumulacja warstw (łączenie)</option></select></label>
        </div> : <div className="space-y-2 rounded border border-[#444] p-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={anim} onChange={(e) => setAnim(e.target.checked)} />Animacja z osi czasu ({layers.length} klatek)</label>
          <label className="flex items-center gap-2">Opóźnienie klatki <input type="number" className={field} step={0.05} value={delay / 1000} disabled={!anim} onChange={(e) => setDelay(Math.max(10, Math.round(+e.target.value * 1000)))} /> s</label>
          <label className="flex items-center gap-2">Opcje zapętlania <select className={field + ' w-auto'} value={loop ? 'a' : 'o'} disabled={!anim} onChange={(e) => setLoop(e.target.value === 'a')}><option value="a">Zawsze</option><option value="o">Raz</option></select></label>
          <label className="flex items-center gap-2">Usuwanie klatek <select className={field + ' w-auto'} value={replace ? 'r' : 'c'} disabled={!anim} onChange={(e) => setReplace(e.target.value === 'r')}><option value="r">Usuń</option><option value="c">Nie usuwaj</option></select></label>
        </div>)}
        {paramShot && ext === 'gif' && <p className="text-xs text-[#9cf]">Przy eksporcie zrobię też zrzut tego okna jako {paramShot.name}.{paramShot.ext} (arkusz go wymaga).</p>}
      </Modal>}
      {tool === 'crop' && crop && crop.w > 0 && <div className="pointer-events-none absolute bottom-3 right-64 rounded bg-black/70 px-2 py-1 text-xs text-white">{crop.w} × {crop.h} px · Enter = kadruj</div>}
    </div>
  );
}

