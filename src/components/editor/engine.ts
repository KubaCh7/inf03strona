// Wspolny stan i operacje edytora grafiki; GimpUI i PhotoshopUI to tylko dwa wyglady.
import { useCallback, useRef, useState } from 'react';
import * as op from '../../lib/imageOps';
import type { Sel } from '../../lib/imageOps';

export type ELayer = { id: number; name: string; c: HTMLCanvasElement; visible: boolean; opacity: number; text?: boolean };
export type Tool = 'move' | 'rect' | 'wand' | 'crop' | 'picker' | 'bucket' | 'text' | 'brush' | 'eraser' | 'magic' | 'zoom' | 'hand' | 'flip' | 'rotate' | 'scale';
export type Frame = { layerId: number; delay: number };
export type Src = { name: string; url: string };

export function useEditor(o: { onSave: (name: string, url: string) => void; paramShot?: { name: string; ext: string } | null; pickOpen?: (asLayer: boolean) => Promise<Src | null>; pickSave?: (name: string) => Promise<string | null> }) {
  const [layers, setLayers] = useState<ELayer[]>([]);
  const [act, setAct] = useState(0);
  const [docName, setDocName] = useState('');
  const [hist, setHist] = useState<{ label: string; layers: ELayer[]; sel: Sel }[]>([]);
  const [redo, setRedo] = useState<{ label: string; layers: ELayer[]; sel: Sel }[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  const [tool, setTool] = useState<Tool>('move');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [tol, setTol] = useState(32);
  const [contiguous, setContiguous] = useState(true);
  const [brush, setBrush] = useState(20);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(48);
  const [zoom, setZoom] = useState(0); // 0 = dopasuj
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loop, setLoop] = useState(true);
  const [toast, setToast] = useState('');
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const t = useRef<number | undefined>(undefined);

  const W = layers[0]?.c.width ?? 0, H = layers[0]?.c.height ?? 0;
  const L = layers[act];
  const flash = useCallback((m: string) => { setToast(m); clearTimeout(t.current); t.current = window.setTimeout(() => setToast(''), 2800); }, []);

  const commit = (label: string, next: ELayer[], a = act, nextSel: Sel = sel) => {
    setHist((h) => [...h.slice(-29), { label, layers, sel }]); setRedo([]);
    setLayers(next); setAct(Math.max(0, Math.min(a, next.length - 1))); setSel(nextSel);
  };
  const undo = () => { const h = hist[hist.length - 1]; if (!h) return; setRedo((r) => [...r, { label: h.label, layers, sel }]); setLayers(h.layers); setSel(h.sel); setAct((a) => Math.min(a, Math.max(0, h.layers.length - 1))); setHist(hist.slice(0, -1)); };
  const redoAct = () => { const r = redo[redo.length - 1]; if (!r) return; setHist((h) => [...h, { label: r.label, layers, sel }]); setLayers(r.layers); setSel(r.sel); setRedo(redo.slice(0, -1)); };
  const all = (label: string, f: (c: HTMLCanvasElement) => HTMLCanvasElement, clearSel = true) => L && commit(label, layers.map((l) => ({ ...l, c: f(l.c) })), act, clearSel ? null : sel);
  const one = (label: string, f: (c: HTMLCanvasElement) => HTMLCanvasElement) => L && commit(label, layers.map((l, i) => (i === act ? { ...l, c: f(l.c) } : l)));

  async function open(src: Src, asLayer: boolean) {
    try {
      const c = await op.loadCanvas(src.url);
      const nm = src.name.replace(/ \(twoja\)$/, '');
      const l: ELayer = { id: op.newId(), name: nm, c, visible: true, opacity: 1 };
      if (asLayer && layers.length) commit('Otwórz jako warstwy', [...layers, { ...l, c: c.width === W && c.height === H ? c : op.canvasSize(c, W, H) }], layers.length);
      else { setHist([]); setRedo([]); setLayers([l]); setAct(0); setSel(null); setDocName(nm); setFrames([]); setZoom(0); }
    } catch (e) { flash((e as Error).message); }
  }
  async function openFile(f: File, asLayer: boolean) {
    const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
    await open({ name: f.name, url }, asLayer);
  }

  const visible = () => op.composite(layers, W, H);
  const pick = (x: number, y: number) => op.hex(op.pixel(visible(), x, y));

  /** Eksport: png/jpg = widoczny obraz (splaszczony), gif = klatki (Photoshop: os czasu, GIMP: warstwy). */
  async function exportAs(name: string, o2: { quality?: number; anim?: boolean; delay?: number; loop?: boolean; replace?: boolean; shotEl?: HTMLElement | null }) {
    const ext = (/\.(\w+)$/.exec(name)?.[1] ?? '').toLowerCase();
    if (!/^(png|jpe?g|gif)$/.test(ext)) { flash('Nieznany typ pliku: nazwa musi kończyć się na .png, .jpg albo .gif'); return false; }
    let url: string;
    if (ext === 'gif') {
      if (o2.anim && frames.length) {
        const byId = new Map(layers.map((l) => [l.id, l]));
        const cs = frames.map((f) => byId.get(f.layerId)?.c).filter((c): c is HTMLCanvasElement => !!c);
        url = await op.exportGif(cs, { delay: frames.map((f) => f.delay), loop: o2.loop ?? loop, replace: o2.replace ?? true });
      } else if (o2.anim) {
        // GIMP: kazda warstwa = klatka; „(750ms)” w nazwie warstwy nadpisuje domyslne opoznienie
        const ds = layers.map((l) => Number(/\((\d+)\s*ms\)/.exec(l.name)?.[1] ?? o2.delay ?? 100));
        url = await op.exportGif(layers.map((l) => l.c), { delay: ds, loop: o2.loop ?? true, replace: o2.replace ?? true });
      } else url = await op.exportGif([visible()], { delay: 0, loop: false, replace: true });
    } else url = op.exportRaster(visible(), ext === 'png' ? 'png' : 'jpg', o2.quality ?? 0.9);
    // zrzut ekranu z otwartym oknem eksportu (arkusz kaze udokumentowac ustawienia animacji)
    o.onSave(name, url);
    if (ext === 'gif' && o2.anim && o.paramShot && o2.shotEl) {
      try {
        const html2canvas = (await import('html2canvas-pro')).default; // zwykly html2canvas nie zna kolorow oklab z Tailwinda
        const sc = Math.max(1, 1920 / Math.max(1, o2.shotEl.clientWidth));
        const cv = await html2canvas(o2.shotEl, { scale: sc, backgroundColor: '#333333', logging: false });
        o.onSave(`${o.paramShot.name}.${o.paramShot.ext}`, cv.toDataURL(o.paramShot.ext === 'png' ? 'image/png' : 'image/jpeg', 0.92));
      } catch { flash('Nie udało się zrobić zrzutu okna eksportu.'); }
    }
    if (ext === 'gif' && o2.anim && o.paramShot && o2.shotEl) {
      flash(`Wyeksportowano ${name} i zrzut ${o.paramShot.name}.${o.paramShot.ext} do folderu warsztatu`);
    } else flash(`Wyeksportowano ${name} (${W}×${H} px) do folderu warsztatu`);
    return true;
  }

  return {
    pickOpen: o.pickOpen, pickSave: o.pickSave,
    layers, setLayers, act, setAct, L, W, H, docName, hist, redo, sel, setSel, tool, setTool, fg, setFg, bg, setBg, tol, setTol, contiguous, setContiguous,
    crop, setCrop, applyCrop: () => { if (crop && crop.w > 0 && crop.h > 0) { all('Kadrowanie', (c) => op.canvasSize(c, crop.w, crop.h, crop.x, crop.y)); setCrop(null); } },
    brush, setBrush, font, setFont, fontSize, setFontSize, zoom, setZoom, frames, setFrames, loop, setLoop, toast, flash,
    commit, undo, redoAct, all, one, open, openFile, visible, pick, exportAs,
    scale: (w: number, h: number, label = 'Skalowanie obrazu') => all(label, (c) => op.scale(c, w, h)),
    canvas: (w: number, h: number, x: number, y: number, label = 'Rozmiar płótna') => all(label, (c) => op.canvasSize(c, w, h, x, y)),
    flip: (d: 'h' | 'v') => all(d === 'h' ? 'Odbij poziomo' : 'Odbij pionowo', (c) => op.flip(c, d), false),
    rotate: (deg: 90 | -90 | 180) => all(`Obróć o ${Math.abs(deg)}°`, (c) => op.rotate(c, deg)),
    cropToSel: () => sel && all('Przytnij do zaznaczenia', (c) => op.canvasSize(c, sel.w, sel.h, sel.x, sel.y)),
    clear: () => { if (sel) one('Wyczyść', (c) => op.clearSel(c, sel)); else flash('Najpierw zaznacz obszar (prostokąt albo różdżka).'); },
    c2a: (rgb: [number, number, number], tol2: number) => one('Kolor na alfa', (c) => op.colorToAlpha(c, rgb, tol2)),
    magic: (x: number, y: number) => one('Magiczna gumka', (c) => op.colorToAlpha(c, op.pixel(c, x, y), tol, contiguous ? { x, y } : undefined)),
    wand: (x: number, y: number) => { if (L) setSel(op.maskFlood(L.c, x, y, tol, contiguous)); },
    fill: (x: number, y: number) => one('Wypełnienie kubełkiem', (c) => op.bucket(c, x, y, op.rgbOf(fg), tol, sel)),
    addText: (text: string, x: number, y: number, bold = false) => text.trim() && commit('Tekst', [...layers, { id: op.newId(), name: text.split('\n')[0].slice(0, 30), c: op.textLayer(W, H, text, x, y, font, fontSize, fg, bold), visible: true, opacity: 1, text: true }], layers.length),
    newImage: (w: number, h: number, fill: 'white' | 'fg' | 'bg' | 'transparent', name = 'Bez nazwy') => {
      const c = op.blank(w, h); const g = c.getContext('2d')!;
      if (fill !== 'transparent') { g.fillStyle = fill === 'white' ? '#ffffff' : fill === 'fg' ? fg : bg; g.fillRect(0, 0, w, h); }
      setHist([]); setRedo([]); setLayers([{ id: op.newId(), name: 'Tło', c, visible: true, opacity: 1 }]); setAct(0); setSel(null); setDocName(name); setFrames([]); setZoom(0);
    },
    newLayer: (name = 'Warstwa') => commit('Nowa warstwa', [...layers, { id: op.newId(), name, c: op.blank(W, H), visible: true, opacity: 1 }], layers.length),
    dupLayer: () => L && commit('Duplikuj warstwę', [...layers.slice(0, act + 1), { ...L, id: op.newId(), name: L.name + ' kopia', c: op.clone(L.c) }, ...layers.slice(act + 1)], act + 1),
    delLayer: () => layers.length > 1 && commit('Usuń warstwę', layers.filter((_, i) => i !== act), act - 1),
    raise: () => { if (act < layers.length - 1) { const n = [...layers]; [n[act], n[act + 1]] = [n[act + 1], n[act]]; commit('Podnieś warstwę', n, act + 1); } },
    lower: () => { if (act > 0) { const n = [...layers]; [n[act], n[act - 1]] = [n[act - 1], n[act]]; commit('Obniż warstwę', n, act - 1); } },
    toggleVis: (i: number) => setLayers((ls) => ls.map((l, k) => (k === i ? { ...l, visible: !l.visible } : l))),
    setOpacity: (v: number) => setLayers((ls) => ls.map((l, k) => (k === act ? { ...l, opacity: v } : l))),
    rename: (i: number, name: string) => setLayers((ls) => ls.map((l, k) => (k === i ? { ...l, name } : l))),
    flatten: () => L && commit('Spłaszcz obraz', [{ id: op.newId(), name: 'Tło', c: visible(), visible: true, opacity: 1 }], 0),
    moveLayer: (dx: number, dy: number) => one('Przesuń warstwę', (c) => op.offset(c, dx, dy)),
    paint: (pts: { x: number; y: number }[], erase: boolean) => one(erase ? 'Gumka' : 'Pędzel', (c) => op.stroke(op.clone(c), pts, brush, fg, erase)),
  };
}
export type Ed = ReturnType<typeof useEditor>;
