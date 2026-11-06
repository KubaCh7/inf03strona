/** Krotkie efekty nagrody (kupione w sklepie). Nie blokuja interfejsu: pointer-events none, znikaja po ~1,2 s. */
export function celebrate(kind: string) {
  if (kind === 'none' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90;overflow:hidden';
  document.body.appendChild(layer);
  const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', 'var(--accent)'];
  const n = kind === 'code' ? 18 : 40;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    const x = 30 + Math.random() * 40;
    const dx = (Math.random() - 0.5) * 70;
    const dy = 40 + Math.random() * 50;
    const rot = (Math.random() - 0.5) * 720;
    el.textContent = kind === 'stars' ? '★' : kind === 'code' ? ['</>', '{ }', ';', '$', '#'][i % 5] : '';
    el.style.cssText = `position:absolute;left:${x}vw;top:${kind === 'code' ? -5 : 55}vh;font:700 ${kind === 'code' ? 16 : 18}px var(--font-mono);color:${colors[i % colors.length]};` +
      (kind === 'confetti' ? `width:8px;height:12px;background:${colors[i % colors.length]};border-radius:2px;` : '');
    layer.appendChild(el);
    const anim = kind === 'code'
      ? [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx / 3}vw, ${dy + 40}vh)`, opacity: 0 }]
      : [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx}vw, ${-dy / 2}vh) rotate(${rot}deg)`, opacity: 1, offset: 0.4 }, { transform: `translate(${dx * 1.2}vw, ${dy / 3}vh) rotate(${rot * 1.5}deg)`, opacity: 0 }];
    el.animate(anim, { duration: 1100 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 1700);
}
