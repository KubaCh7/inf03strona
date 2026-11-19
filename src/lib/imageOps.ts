// Operacje edytora grafiki (canvas): skalowanie, kadrowanie/rozmiar plotna, odbicia, obroty,
// kolor -> przezroczystosc, eksport PNG/JPG/GIF (animowany, gifenc).
export type Layer = { id: number; name: string; c: HTMLCanvasElement };
let nextId = 1;
export const newId = () => nextId++;

export function blank(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const ctx = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;
export function clone(c: HTMLCanvasElement) { const n = blank(c.width, c.height); ctx(n).drawImage(c, 0, 0); return n; }

export function loadCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => { const c = blank(i.naturalWidth, i.naturalHeight); ctx(c).drawImage(i, 0, 0); res(c); };
    i.onerror = () => rej(new Error('Nie da się otworzyć obrazu'));
    i.src = url;
  });
}

/** Skalowanie wysokiej jakosci (kilka krokow przy duzym zmniejszeniu). */
export function scale(c: HTMLCanvasElement, w: number, h: number) {
  let cur = c;
  while (cur.width / 2 > w && cur.height / 2 > h) { const n = blank(cur.width / 2, cur.height / 2); const x = ctx(n); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); cur = n; }
  const out = blank(w, h); const x = ctx(out); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}
/** Nowe plotno w x h, obraz przesuniety o (-x, -y): kadrowanie i rozmiar plotna. */
export function canvasSize(c: HTMLCanvasElement, w: number, h: number, x = 0, y = 0) { const n = blank(w, h); ctx(n).drawImage(c, -x, -y); return n; }
export function flip(c: HTMLCanvasElement, dir: 'h' | 'v') {
  const n = blank(c.width, c.height); const x = ctx(n);
  if (dir === 'h') { x.translate(c.width, 0); x.scale(-1, 1); } else { x.translate(0, c.height); x.scale(1, -1); }
  x.drawImage(c, 0, 0); return n;
}
export function rotate(c: HTMLCanvasElement, deg: 90 | -90 | 180) {
  const n = deg === 180 ? blank(c.width, c.height) : blank(c.height, c.width); const x = ctx(n);
  x.translate(n.width / 2, n.height / 2); x.rotate((deg * Math.PI) / 180); x.drawImage(c, -c.width / 2, -c.height / 2); return n;
}
export function pixel(c: HTMLCanvasElement, px: number, py: number): [number, number, number] {
  const d = ctx(c).getImageData(Math.max(0, Math.min(c.width - 1, Math.round(px))), Math.max(0, Math.min(c.height - 1, Math.round(py))), 1, 1).data;
  return [d[0], d[1], d[2]];
}
/** Kolor -> przezroczystosc. tol 0–255: piksele blizej niz tol znikaja, z miekka krawedzia. contiguous: tylko obszar polaczony z (sx, sy). */
export function colorToAlpha(c: HTMLCanvasElement, rgb: [number, number, number], tol: number, contiguous?: { x: number; y: number }) {
  const n = clone(c); const x = ctx(n); const im = x.getImageData(0, 0, n.width, n.height); const d = im.data;
  const dist = (i: number) => Math.max(Math.abs(d[i] - rgb[0]), Math.abs(d[i + 1] - rgb[1]), Math.abs(d[i + 2] - rgb[2]));
  const soft = Math.max(1, tol * 0.25);
  const apply = (i: number) => { const dd = dist(i); if (dd <= tol) d[i + 3] = 0; else if (dd <= tol + soft) d[i + 3] = Math.min(d[i + 3], Math.round(((dd - tol) / soft) * 255)); };
  if (!contiguous) { for (let i = 0; i < d.length; i += 4) apply(i); }
  else {
    const W = n.width, H = n.height, seen = new Uint8Array(W * H); const st = [Math.round(contiguous.y) * W + Math.round(contiguous.x)];
    while (st.length) {
      const p = st.pop()!; if (p < 0 || p >= W * H || seen[p]) continue; seen[p] = 1;
      if (dist(p * 4) > tol + soft) continue;
      apply(p * 4);
      const px = p % W; if (px > 0) st.push(p - 1); if (px < W - 1) st.push(p + 1); st.push(p - W, p + W);
    }
  }
  x.putImageData(im, 0, 0); return n;
}
export function hasAlpha(c: HTMLCanvasElement) { const d = ctx(c).getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true; return false; }

function b64(u: Uint8Array) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }

export function exportRaster(c: HTMLCanvasElement, fmt: 'png' | 'jpg', quality = 0.9) {
  if (fmt === 'png') return c.toDataURL('image/png');
  const n = blank(c.width, c.height); const x = ctx(n); x.fillStyle = '#fff'; x.fillRect(0, 0, n.width, n.height); x.drawImage(c, 0, 0);
  return n.toDataURL('image/jpeg', quality);
}
/** GIF: kazda warstwa = klatka (od dolnej do gornej), czas w ms, petla, tryb zastapienia klatek. */
export async function exportGif(frames: HTMLCanvasElement[], o: { delay: number; loop: boolean; replace: boolean }) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const W = frames[0].width, H = frames[0].height;
  const gif = GIFEncoder();
  frames.forEach((f, k) => {
    const c = f.width === W && f.height === H ? f : canvasSize(f, W, H);
    const data = ctx(c).getImageData(0, 0, W, H).data;
    const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
    const index = applyPalette(data, palette, 'rgba4444');
    const ti = palette.findIndex((p) => p[3] === 0);
    gif.writeFrame(index, W, H, { palette, delay: o.delay, repeat: k === 0 ? (o.loop ? 0 : -1) : undefined, transparent: ti >= 0, transparentIndex: ti >= 0 ? ti : 0, dispose: o.replace ? 2 : 1 });
  });
  gif.finish();
  return 'data:image/gif;base64,' + b64(gif.bytes());
}
