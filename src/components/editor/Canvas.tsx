import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { composite, selOutline } from '../../lib/imageOps';
import type { Ed } from './engine';

/** Plotno edytora: widok warstw, narzedzia myszy, zaznaczenie, kadrowanie, linijki (GIMP). */
export default function Canvas({ ed, pasteboard, rulers, onPos, onScaleTool, onOpen }: {
  ed: Ed; pasteboard: string; rulers?: boolean; onPos: (p: { x: number; y: number } | null) => void; onScaleTool?: () => void; onOpen?: (f: File) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const over = useRef<HTMLCanvasElement>(null);
  const [fit, setFit] = useState(1);
  const [drag, setDrag] = useState<{ x: number; y: number; cx: number; cy: number; pts?: { x: number; y: number }[] } | null>(null);
  const [mv, setMv] = useState<{ dx: number; dy: number } | null>(null);
  const [text, setText] = useState<{ x: number; y: number; v: string } | null>(null);
  const { W, H, layers, act, sel, crop, tool } = ed;
  const z = ed.zoom || fit;

  useLayoutEffect(() => {
    const b = box.current; if (!b || !W) return;
    const f = () => setFit(Math.min(1, (b.clientWidth - 60) / W, (b.clientHeight - 60) / H) || 1);
    f(); const ro = new ResizeObserver(f); ro.observe(b); return () => ro.disconnect();
  }, [W, H]);

  // obraz: wszystkie widoczne warstwy (aktywna przesunieta podczas przeciagania narzedziem przesuniecia)
  useEffect(() => {
    const v = view.current; if (!v || !W) return;
    v.width = W; v.height = H;
    const ls = layers.map((l, i) => (i === act && mv ? { ...l, c: shifted(l.c, mv.dx, mv.dy) } : l));
    v.getContext('2d')!.drawImage(composite(ls, W, H), 0, 0);
  }, [layers, act, mv, W, H]);
  // nakladka: zaznaczenie, kadrowanie, pedzel
  useEffect(() => {
    const o = over.current; if (!o || !W) return;
    o.width = W; o.height = H; const g = o.getContext('2d')!;
    if (sel) g.drawImage(selOutline(sel, W, H), 0, 0);
    if (crop) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, crop.y); g.fillRect(0, crop.y + crop.h, W, H); g.fillRect(0, crop.y, crop.x, crop.h); g.fillRect(crop.x + crop.w, crop.y, W, crop.h); g.strokeStyle = '#fff'; g.lineWidth = 1 / z; g.strokeRect(crop.x, crop.y, crop.w, crop.h); for (const k of [1, 2]) { g.beginPath(); g.moveTo(crop.x + (crop.w * k) / 3, crop.y); g.lineTo(crop.x + (crop.w * k) / 3, crop.y + crop.h); g.moveTo(crop.x, crop.y + (crop.h * k) / 3); g.lineTo(crop.x + crop.w, crop.y + (crop.h * k) / 3); g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke(); } }
    if (drag?.pts && (tool === 'brush' || tool === 'eraser')) { g.strokeStyle = tool === 'eraser' ? 'rgba(255,255,255,.8)' : ed.fg; g.lineWidth = ed.brush; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); drag.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
  }, [sel, crop, drag, tool, W, H, z, ed.fg, ed.brush]);

  const pt = (e: React.PointerEvent | React.MouseEvent) => { const r = view.current!.getBoundingClientRect(); return { x: Math.max(0, Math.min(W - 1, Math.round(((e.clientX - r.left) / r.width) * W))), y: Math.max(0, Math.min(H - 1, Math.round(((e.clientY - r.top) / r.height) * H))) }; };

  function down(e: React.PointerEvent) {
    if (!W || e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = pt(e);
    if (text) { ed.addText(text.v, text.x, text.y); setText(null); return; }
    switch (tool) {
      case 'wand': ed.wand(p.x, p.y); break;
      case 'picker': ed.setFg(ed.pick(p.x, p.y)); ed.flash(`Kolor pierwszoplanowy: ${ed.pick(p.x, p.y)}`); break;
      case 'bucket': ed.fill(p.x, p.y); break;
      case 'magic': ed.magic(p.x, p.y); break;
      case 'text': setText({ x: p.x, y: p.y, v: '' }); break;
      case 'zoom': ed.setZoom(Math.max(0.05, Math.min(16, z * (e.altKey ? 0.5 : 2)))); break;
      case 'flip': ed.flip(e.shiftKey ? 'v' : 'h'); break;
      case 'rotate': ed.rotate(e.shiftKey ? -90 : 90); break;
      case 'scale': onScaleTool?.(); break;
      default: setDrag({ x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, pts: [p] });
    }
  }
  function move(e: React.PointerEvent) {
    if (!W) return;
    const p = pt(e); onPos(p);
    if (!drag) return;
    if (tool === 'rect') ed.setSel({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x) || 1, h: Math.abs(p.y - drag.y) || 1 });
    if (tool === 'crop') ed.setCrop({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
    if (tool === 'move') setMv({ dx: p.x - drag.x, dy: p.y - drag.y });
    if (tool === 'hand' && box.current) { box.current.scrollLeft -= e.clientX - drag.cx; box.current.scrollTop -= e.clientY - drag.cy; setDrag({ ...drag, cx: e.clientX, cy: e.clientY }); }
    if (tool === 'brush' || tool === 'eraser') setDrag({ ...drag, pts: [...(drag.pts ?? []), p] });
  }
  function up() {
    if (drag && (tool === 'brush' || tool === 'eraser') && drag.pts) ed.paint(drag.pts, tool === 'eraser');
    if (tool === 'move' && mv && (mv.dx || mv.dy)) ed.moveLayer(mv.dx, mv.dy);
    if (tool === 'rect' && ed.sel && ed.sel.w <= 1 && ed.sel.h <= 1) ed.setSel(null);
    setMv(null); setDrag(null);
  }

  const cursor = { move: 'move', rect: 'crosshair', wand: 'crosshair', crop: 'crosshair', picker: 'crosshair', bucket: 'crosshair', text: 'text', brush: 'crosshair', eraser: 'crosshair', magic: 'crosshair', zoom: 'zoom-in', hand: drag ? 'grabbing' : 'grab', flip: 'pointer', rotate: 'pointer', scale: 'pointer' }[tool];
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {rulers && W > 0 && <Ruler dir="h" z={z} len={W} />}
      {rulers && W > 0 && <Ruler dir="v" z={z} len={H} />}
      <div ref={box} className="min-h-0 min-w-0 flex-1 overflow-auto" style={{ background: pasteboard, marginTop: rulers ? 18 : 0, marginLeft: rulers ? 18 : 0 }}
        onPointerLeave={() => onPos(null)}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && onOpen) onOpen(f); }}>
        <div className="flex min-h-full min-w-full items-center justify-center p-[30px]" style={{ width: W ? W * z + 60 : undefined, height: H ? H * z + 60 : undefined }}>
          {W > 0 && (
            <div className="relative shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,.6),0_4px_20px_rgba(0,0,0,.5)]" style={{ width: W * z, height: H * z, backgroundImage: 'conic-gradient(#999 25%, #666 0 50%, #999 0 75%, #666 0)', backgroundSize: '16px 16px' }}>
              <canvas ref={view} className="absolute inset-0 h-full w-full" style={{ imageRendering: z >= 2 ? 'pixelated' : 'auto' }} />
              <canvas ref={over} className="absolute inset-0 h-full w-full" style={{ cursor, imageRendering: 'pixelated', touchAction: 'none' }} onPointerDown={down} onPointerMove={move} onPointerUp={up}
                onDoubleClick={() => tool === 'crop' && ed.applyCrop()} />
              {text && (
                <textarea autoFocus value={text.v} onChange={(e) => setText({ ...text, v: e.target.value })} onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setText(null); } if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { ed.addText(text.v, text.x, text.y); setText(null); } }}
                  className="absolute resize border border-dashed border-[#4a9eff] bg-transparent p-0 outline-none" placeholder="Wpisz tekst…"
                  style={{ left: text.x * z, top: text.y * z, fontFamily: ed.font, fontSize: ed.fontSize * z, color: ed.fg, lineHeight: 1.2, minWidth: 120, minHeight: ed.fontSize * z * 1.3 }} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function shifted(c: HTMLCanvasElement, dx: number, dy: number) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d')!.drawImage(c, dx, dy); return n; }

function Ruler({ dir, z, len }: { dir: 'h' | 'v'; z: number; len: number }) {
  const step = z >= 2 ? 10 : z >= 0.5 ? 50 : z >= 0.2 ? 100 : 500;
  const marks: number[] = []; for (let v = 0; v <= len; v += step) marks.push(v);
  return (
    <div className={`absolute z-10 overflow-hidden bg-[#3a3a3a] text-[9px] text-[#bbb] ${dir === 'h' ? 'left-[18px] right-0 top-0 h-[18px] border-b' : 'bottom-0 left-0 top-[18px] w-[18px] border-r'} border-[#222]`}>
      <div className="relative" style={dir === 'h' ? { marginLeft: 30, height: 18 } : { marginTop: 30, width: 18 }}>
        {marks.map((m) => <span key={m} className="absolute border-[#888]" style={dir === 'h' ? { left: m * z, top: 0, height: 18, borderLeftWidth: 1, paddingLeft: 2 } : { top: m * z, left: 0, width: 18, borderTopWidth: 1, writingMode: 'vertical-rl' }}>{m}</span>)}
      </div>
    </div>
  );
}
