import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import type { Win } from './os';
export type Snap = 'max' | 'left' | 'right';
/** Dla aplikacji z wlasnym paskiem tytulu (VS Code): przesuwanie i przyciski okna. */
export type Frame = { startMove: (e: React.PointerEvent) => void; toggleMax: () => void; minimize: () => void; close: () => void; max: boolean; active: boolean };
const FrameCtx = createContext<Frame | null>(null);
export const useFrame = () => useContext(FrameCtx);
import { APPS } from './os';

/** Okno Windows 11: pasek tytulu, przeciaganie, zmiana rozmiaru, min/max/zamknij. */
export default function Window({ win, active, onFocus, onChange, onClose, children, bar, dark, onSnapHint, onSnap, ghost, closing, frameless }: {
  ghost?: boolean; closing?: boolean; frameless?: boolean;
  win: Win; active: boolean; onFocus: () => void; onChange: (p: Partial<Win>) => void; onClose: () => void; children: React.ReactNode; bar?: React.ReactNode; dark?: boolean;
  onSnapHint?: (s: Snap | null) => void; onSnap?: (s: Snap) => void;
}) {
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; w: number; h: number; mode: string } | null>(null);
  const start = (e: React.PointerEvent, mode: string) => {
    if (e.button !== 0) return;
    e.stopPropagation(); onFocus();
    let x0 = win.x, y0 = win.y;
    // przeciagniecie zmaksymalizowanego okna przywraca je pod kursorem (jak w Windows)
    if (win.max && mode === 'move') { x0 = Math.max(0, e.clientX - win.w / 2); y0 = 0; }
    let hint: Snap | null = null; let moved = false;
    drag.current = { sx: e.clientX, sy: e.clientY, x: x0, y: y0, w: win.w, h: win.h, mode };
    const mv = (ev: PointerEvent) => {
      const d = drag.current!; const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      if (d.mode === 'move') {
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        onChange({ x: d.x + dx, y: Math.max(0, d.y + dy), max: false });
        const h2: Snap | null = ev.clientY <= 2 ? 'max' : ev.clientX <= 2 ? 'left' : ev.clientX >= window.innerWidth - 3 ? 'right' : null;
        if (h2 !== hint) { hint = h2; onSnapHint?.(h2); }
      }
      else {
        const p: Partial<Win> = {};
        if (d.mode.includes('e')) p.w = Math.max(320, d.w + dx);
        if (d.mode.includes('s')) p.h = Math.max(200, d.h + dy);
        if (d.mode.includes('w')) { p.w = Math.max(320, d.w - dx); p.x = d.x + d.w - p.w; }
        if (d.mode.includes('n')) { p.h = Math.max(200, d.h - dy); p.y = d.y + d.h - p.h; }
        onChange(p);
      }
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); drag.current = null; if (hint) { onSnap?.(hint); onSnapHint?.(null); } };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  // animacje: otwarcie, maksymalizacja/przywrocenie (tylko wtedy przejscie wymiarow, nie przy przeciaganiu)
  const [opening, setOpening] = useState(true);
  const [morph, setMorph] = useState(false);
  const prevMax = useRef(win.max);
  useEffect(() => { const t = setTimeout(() => setOpening(false), 220); return () => clearTimeout(t); }, []);
  useEffect(() => { if (prevMax.current === win.max) return; prevMax.current = win.max; setMorph(true); const t = setTimeout(() => setMorph(false), 260); return () => clearTimeout(t); }, [win.max]);
  if (win.min && ghost) return null;
  // okno bez ramki: same okna dialogowe (np. wypakowanie z menu kontekstowego)
  if (ghost) return <div data-win={win.id} data-active={active ? '1' : '0'} onPointerDown={onFocus} style={{ zIndex: win.z }} className="pointer-events-none fixed inset-0 [&_*]:pointer-events-auto">{children}</div>;
  const style = win.max ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 48px)', zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };
  const ctl = dark ? 'text-[#ddd] hover:bg-white/10' : 'text-[#1a1a1a] hover:bg-black/[.06]';
  return (
    <div data-win={win.id} data-active={active ? '1' : '0'} {...(dark ? { 'data-dark-app': '' } : {})} onPointerDown={onFocus} style={style}
      aria-hidden={win.min || undefined}
      className={`p03-win ${opening && !win.min ? 'p03-opening' : ''} ${closing ? 'p03-closing' : ''} ${win.min ? 'p03-min' : ''} ${morph ? 'p03-morph' : ''} absolute flex flex-col overflow-hidden border ${win.max ? 'rounded-none' : 'rounded-[8px]'} ${active ? 'border-[#8a8a8a]/60 shadow-[0_8px_32px_rgba(0,0,0,.35)]' : 'border-[#aaa]/40 shadow-[0_4px_16px_rgba(0,0,0,.2)]'} ${dark ? 'bg-[#202020]' : 'bg-[#f3f3f3]'}`}>
      {!frameless && <div className={`flex ${bar ? 'h-[44px]' : 'h-[32px]'} shrink-0 select-none items-center ${dark ? 'bg-[#202020] text-[#ddd]' : active ? 'bg-[#f3f3f3] text-[#1a1a1a]' : 'bg-[#f3f3f3] text-[#7a7a7a]'}`}
        onPointerDown={(e) => start(e, 'move')} onDoubleClick={() => onChange({ max: !win.max })}>
        {!bar && <span className="ml-2.5 mr-2 grid w-4 place-items-center">{APPS[win.app].icon(16)}</span>}
        {bar ?? <span className="flex-1 truncate text-[12px]">{win.title}</span>}
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ min: true })} className={`grid h-full w-[46px] place-items-center ${ctl}`} aria-label="Minimalizuj"><Minus size={14} strokeWidth={1.2} /></button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ max: !win.max })} className={`grid h-full w-[46px] place-items-center ${ctl}`} aria-label="Maksymalizuj">{win.max ? <Copy size={12} strokeWidth={1.2} className="-scale-x-100" /> : <Square size={11} strokeWidth={1.2} />}</button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className={`grid h-full w-[46px] place-items-center hover:bg-[#c42b1c] hover:text-white ${dark ? 'text-[#ddd]' : ''}`} aria-label="Zamknij"><X size={15} strokeWidth={1.2} /></button>
      </div>}
      <FrameCtx.Provider value={{ startMove: (e) => start(e, 'move'), toggleMax: () => onChange({ max: !win.max }), minimize: () => onChange({ min: true }), close: onClose, max: win.max, active }}>
        <div className="relative min-h-0 flex-1">{children}</div>
      </FrameCtx.Provider>
      {!win.max && ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((m) => (
        <div key={m} onPointerDown={(e) => start(e, m)} className="absolute z-10" style={{
          cursor: `${m}-resize`,
          ...(m.includes('n') ? { top: -3, height: 7 } : m.includes('s') ? { bottom: -3, height: 7 } : { top: 6, bottom: 6 }),
          ...(m.includes('w') ? { left: -3, width: 7 } : m.includes('e') ? { right: -3, width: 7 } : { left: 6, right: 6 }),
        }} />
      ))}
    </div>
  );
}
