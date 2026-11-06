import { useRef, useState, type ReactNode } from 'react';

/**
 * Dwa panele z przeciaganym separatorem, jak w VS Code. Rozmiar (ulamek pierwszego panelu)
 * zapamietywany w localStorage pod `id`. Dwuklik na separatorze przywraca domyslny.
 */
export default function Split({ id, dir, a, b, initial = 0.5, min = 0.15, reverse = false }: {
  id: string; dir: 'row' | 'col'; a: ReactNode; b: ReactNode; initial?: number; min?: number; reverse?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [frac, setFrac] = useState(() => {
    try { const v = Number(localStorage.getItem(`p03:split:${id}`)); return v > 0 && v < 1 ? v : initial; } catch { return initial; }
  });
  const [drag, setDrag] = useState(false);
  const save = (v: number) => { try { localStorage.setItem(`p03:split:${id}`, String(v)); } catch { /* ignore */ } };

  function down(e: React.PointerEvent) {
    e.preventDefault();
    const el = box.current;
    if (!el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag(true);
    const r = el.getBoundingClientRect();
    let last = frac;
    const move = (ev: PointerEvent) => {
      let f = dir === 'row' ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
      if (reverse) f = 1 - f;
      last = Math.min(1 - min, Math.max(min, f));
      setFrac(last);
    };
    const up = () => { setDrag(false); save(last); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const row = dir === 'row';
  const first = <div className="min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: `${frac * 100}%`, flexGrow: 0, flexShrink: 0 }}>{a}</div>;
  const second = <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{b}</div>;
  const handle = (
    <div role="separator" aria-orientation={row ? 'vertical' : 'horizontal'} title="Przeciągnij, żeby zmienić rozmiar (dwuklik: domyślny)"
      onPointerDown={down} onDoubleClick={() => { setFrac(initial); save(initial); }}
      className={`group relative shrink-0 ${row ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'}`}>
      <span className={`absolute rounded-full transition-colors ${row ? 'inset-y-0 left-1/2 w-[3px] -translate-x-1/2' : 'inset-x-0 top-1/2 h-[3px] -translate-y-1/2'} ${drag ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/60'}`} />
    </div>
  );
  return (
    <div ref={box} className={`flex h-full min-h-0 w-full ${row ? (reverse ? 'flex-row-reverse' : 'flex-row') : (reverse ? 'flex-col-reverse' : 'flex-col')}`}>
      {first}{handle}{second}
      {/* podczas przeciagania iframe (podglad, PDF) nie moze lapac myszy */}
      {drag && <div className={`fixed inset-0 z-50 ${row ? 'cursor-col-resize' : 'cursor-row-resize'}`} />}
    </div>
  );
}
