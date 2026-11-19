import { useRef } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import type { Win } from './os';
import { APPS } from './os';

/** Okno Windows 11: pasek tytulu, przeciaganie, zmiana rozmiaru, min/max/zamknij. */
export default function Window({ win, active, onFocus, onChange, onClose, children, bar, dark }: {
  win: Win; active: boolean; onFocus: () => void; onChange: (p: Partial<Win>) => void; onClose: () => void; children: React.ReactNode; bar?: React.ReactNode; dark?: boolean;
}) {
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; w: number; h: number; mode: string } | null>(null);
  const start = (e: React.PointerEvent, mode: string) => {
    if (e.button !== 0) return;
    e.stopPropagation(); onFocus();
    if (win.max && mode === 'move') return;
    drag.current = { sx: e.clientX, sy: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h, mode };
    const mv = (ev: PointerEvent) => {
      const d = drag.current!; const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      if (d.mode === 'move') onChange({ x: d.x + dx, y: Math.max(0, d.y + dy) });
      else {
        const p: Partial<Win> = {};
        if (d.mode.includes('e')) p.w = Math.max(320, d.w + dx);
        if (d.mode.includes('s')) p.h = Math.max(200, d.h + dy);
        if (d.mode.includes('w')) { p.w = Math.max(320, d.w - dx); p.x = d.x + d.w - p.w; }
        if (d.mode.includes('n')) { p.h = Math.max(200, d.h - dy); p.y = d.y + d.h - p.h; }
        onChange(p);
      }
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); drag.current = null; };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  if (win.min) return null;
  const style = win.max ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 48px)', zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };
  const ctl = dark ? 'text-[#ddd] hover:bg-white/10' : 'text-[#1a1a1a] hover:bg-black/[.06]';
  return (
    <div data-win={win.id} onPointerDown={onFocus} style={style}
      className={`absolute flex flex-col overflow-hidden border ${win.max ? 'rounded-none' : 'rounded-[8px]'} ${active ? 'border-[#8a8a8a]/60 shadow-[0_8px_32px_rgba(0,0,0,.35)]' : 'border-[#aaa]/40 shadow-[0_4px_16px_rgba(0,0,0,.2)]'} ${dark ? 'bg-[#202020]' : 'bg-[#f3f3f3]'}`}>
      <div className={`flex h-[32px] shrink-0 select-none items-center ${dark ? 'bg-[#202020] text-[#ddd]' : active ? 'bg-[#f3f3f3] text-[#1a1a1a]' : 'bg-[#f3f3f3] text-[#7a7a7a]'}`}
        onPointerDown={(e) => start(e, 'move')} onDoubleClick={() => onChange({ max: !win.max })}>
        <span className="ml-2.5 mr-2 grid w-4 place-items-center">{APPS[win.app].icon(16)}</span>
        {bar ?? <span className="flex-1 truncate text-[12px]">{win.title}</span>}
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ min: true })} className={`grid h-full w-[46px] place-items-center ${ctl}`} aria-label="Minimalizuj"><Minus size={14} strokeWidth={1.2} /></button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange({ max: !win.max })} className={`grid h-full w-[46px] place-items-center ${ctl}`} aria-label="Maksymalizuj">{win.max ? <Copy size={12} strokeWidth={1.2} className="-scale-x-100" /> : <Square size={11} strokeWidth={1.2} />}</button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className={`grid h-full w-[46px] place-items-center hover:bg-[#c42b1c] hover:text-white ${dark ? 'text-[#ddd]' : ''}`} aria-label="Zamknij"><X size={15} strokeWidth={1.2} /></button>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
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
