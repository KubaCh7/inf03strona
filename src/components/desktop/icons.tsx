// Ikony w stylu Windows 11 (wlasne rysunki SVG, bez grafik Microsoftu i logotypow firm).
import { useId } from 'react';
import { ext } from '../../lib/vfs';

export function FolderSvg({ size = 48, open }: { size?: number; open?: boolean }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5b301" /><stop offset="1" stopColor="#e39c00" /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd86b" /><stop offset="1" stopColor="#ffc533" /></linearGradient>
      </defs>
      <path d="M4 11a3 3 0 0 1 3-3h11.2a3 3 0 0 1 2.1.9L23 11.6h18a3 3 0 0 1 3 3V38a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={`url(#${id}b)`} />
      {open ? <path d="M8.5 19h37a2 2 0 0 1 1.9 2.6l-4.6 17.3A3 3 0 0 1 39.9 41H6.8a2 2 0 0 1-1.9-2.6l4.6-17.3A3 3 0 0 1 8.5 19z" fill={`url(#${id}f)`} />
        : <path d="M4 17.5a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3V38a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={`url(#${id}f)`} />}
      <path d="M4 17.5a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth=".8" />
    </svg>
  );
}

const BADGE: Record<string, [string, string]> = {
  html: ['HTML', '#e44d26'], htm: ['HTML', '#e44d26'], php: ['PHP', '#777bb3'], css: ['CSS', '#2965f1'], js: ['JS', '#d4b106'], sql: ['SQL', '#e48e00'],
  json: ['JSON', '#6b6b6b'], xml: ['XML', '#6b6b6b'], csv: ['CSV', '#1d7a43'], pdf: ['PDF', '#d13438'], mp4: ['MP4', '#6b3fa0'], webm: ['VID', '#6b3fa0'], ico: ['ICO', '#555'],
};

/** Kartka z zagietym rogiem + oznaczenie typu (jak ikony plikow w Eksploratorze Windows 11). */
export function FileSvg({ path, size = 48 }: { path: string; size?: number }) {
  const id = useId();
  const e = ext(path);
  const page = (
    <>
      <defs><linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f1f1f1" /></linearGradient></defs>
      <path d="M11 4h17.5L38 13.5V42a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={`url(#${id}p)`} stroke="#c4c4c4" strokeWidth=".9" />
      <path d="M28.5 4v7.5a2 2 0 0 0 2 2H38" fill="#e7e7e7" stroke="#c4c4c4" strokeWidth=".9" strokeLinejoin="round" />
    </>
  );
  if (/^(png|jpe?g|gif|bmp|webp|svg)$/.test(e)) return (
    <svg width={size} height={size} viewBox="0 0 48 48">{page}
      <rect x="13" y="19" width="21" height="17" rx="1.5" fill="#4aa3df" /><circle cx="28.5" cy="23.5" r="2.4" fill="#ffe27a" />
      <path d="M13 36v-4l6-6 5 5 3-3 7 7v1z" fill="#2e8b57" /><text x="23.5" y="42" textAnchor="middle" fontSize="5" fontFamily="Segoe UI,Arial" fill="#6b6b6b">{e.toUpperCase()}</text>
    </svg>
  );
  if (e === '7z' || e === 'zip' || e === 'rar') return (
    <svg width={size} height={size} viewBox="0 0 48 48">{page}
      <rect x="20" y="4.5" width="5" height="28" fill="#f2c94c" /><path d="M20 8h2.5v2.5H20zm2.5 2.5H25V13h-2.5zM20 13h2.5v2.5H20zm2.5 2.5H25V18h-2.5zM20 18h2.5v2.5H20zm2.5 2.5H25V23h-2.5z" fill="#8a6d1d" />
      <rect x="18.5" y="25" width="8" height="9" rx="1.2" fill="#555" /><rect x="20.5" y="27" width="4" height="4" rx=".6" fill="#ddd" />
      <text x="23.5" y="41.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fontFamily="Segoe UI,Arial" fill="#333">{e.toUpperCase()}</text>
    </svg>
  );
  const b = BADGE[e];
  if (b) return (
    <svg width={size} height={size} viewBox="0 0 48 48">{page}
      {[20, 24, 28].map((y) => <rect key={y} x="14" y={y} width={y === 28 ? 12 : 19} height="1.6" rx=".8" fill="#c8c8c8" />)}
      <rect x="6" y="31" width="25" height="10" rx="1.6" fill={b[1]} /><text x="18.5" y="38.6" textAnchor="middle" fontSize="6.4" fontWeight="700" fontFamily="Segoe UI,Arial" fill="#fff">{b[0]}</text>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">{page}
      {(e === 'txt' || e === 'log' || e === 'ini' || e === 'md' ? [17, 21, 25, 29, 33] : []).map((y) => <rect key={y} x="14" y={y} width={y === 33 ? 12 : 19} height="1.6" rx=".8" fill="#9a9a9a" />)}
    </svg>
  );
}

export function PcSvg({ size = 48 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs><linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fc3ff" /><stop offset="1" stopColor="#1a73d9" /></linearGradient></defs>
      <rect x="4" y="7" width="40" height="27" rx="2.5" fill="#3b3b3b" /><rect x="6" y="9" width="36" height="23" rx="1.2" fill={`url(#${id}s)`} />
      <path d="M8 26c6-6 14-9 32-10v16H8z" fill="#fff" fillOpacity=".18" /><path d="M20 34h8l1.5 5h-11z" fill="#9a9a9a" /><rect x="14" y="39" width="20" height="2.6" rx="1.3" fill="#7a7a7a" />
    </svg>
  );
}
export function BinSvg({ size = 48, full }: { size?: number; full?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {full && <><path d="M17 9l7-3 3 6-7 3z" fill="#fff" stroke="#bbb" strokeWidth=".6" /><path d="M24 8l8 1-1 7-8-1z" fill="#ffe6a8" stroke="#d9b45a" strokeWidth=".6" /></>}
      <path d="M11 13h26l-2.6 28.2a3 3 0 0 1-3 2.8H16.6a3 3 0 0 1-3-2.8z" fill="#dfe6ee" fillOpacity=".75" stroke="#9fb0c2" strokeWidth="1" />
      <rect x="9" y="10.5" width="30" height="4" rx="1.5" fill="#c8d3df" stroke="#9fb0c2" strokeWidth=".8" />
      {[19, 24, 29].map((x) => <path key={x} d={`M${x} 18v20`} stroke="#9fb0c2" strokeWidth="1.2" strokeLinecap="round" />)}
    </svg>
  );
}
export function PdfShortcutSvg({ size = 48 }: { size?: number }) { return <FileSvg path="arkusz.pdf" size={size} />; }

/** Przycisk Start (cztery kafelki). */
export function StartSvg({ size = 24 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ccbf4" /><stop offset="1" stopColor="#1a6fd8" /></linearGradient></defs>
      {[[2, 2], [12.6, 2], [2, 12.6], [12.6, 12.6]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="9.4" height="9.4" rx="1.2" fill={`url(#${id})`} />)}
    </svg>
  );
}

// ---------- ikony programow (wlasne, uproszczone) ----------
const sq = (s: number, bg: string, inner: React.ReactNode, r = 9) => <svg width={s} height={s} viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx={r} fill={bg} />{inner}</svg>;
export const AppSvg = {
  explorer: (s: number) => <FolderSvg size={s} open />,
  notepad: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><rect x="9" y="6" width="30" height="38" rx="3" fill="#fff" stroke="#2b88d8" strokeWidth="1.5" /><rect x="9" y="6" width="30" height="8" rx="3" fill="#2b88d8" />{[20, 25, 30, 35].map((y) => <rect key={y} x="14" y={y} width={y === 35 ? 12 : 20} height="2" rx="1" fill="#8ab8e6" />)}{[15, 22, 29].map((x) => <circle key={x} cx={x + 2} cy="6" r="1.8" fill="#1a5fa8" />)}</svg>,
  notepadpp: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><rect x="8" y="5" width="28" height="38" rx="2.5" fill="#fff" stroke="#6a9c2f" strokeWidth="1.6" />{[13, 18, 23, 28].map((y) => <rect key={y} x="12" y={y} width="20" height="1.8" rx=".9" fill="#a5c97a" />)}<path d="M30 33l9-12 4 3-9 12-5 2z" fill="#7bc043" stroke="#3e6d16" strokeWidth="1" /><circle cx="39" cy="38" r="5" fill="#7bc043" stroke="#3e6d16" /></svg>,
  vscode: (s: number) => sq(s, '#0a6ebd', <><path d="M19 16l-8 8 8 8" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M29 16l8 8-8 8" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M26 13l-4 22" stroke="#9fd4ff" strokeWidth="2.6" strokeLinecap="round" /></>),
  browser: (s: number) => { const id = `br${s}`; return <svg width={s} height={s} viewBox="0 0 48 48"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ccbf4" /><stop offset=".55" stopColor="#1873d3" /><stop offset="1" stopColor="#36c95c" /></linearGradient></defs><circle cx="24" cy="24" r="20" fill={`url(#${id})`} /><path d="M8 28c4-10 18-15 30-7-6-2-14 0-14 7 0 6 8 9 16 6-5 7-17 10-26 4-3-2-5-6-6-10z" fill="#fff" fillOpacity=".85" /></svg>; },
  xampp: (s: number) => sq(s, '#fb7a24', <><path d="M15 14l18 20M33 14L15 34" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" /><circle cx="24" cy="24" r="4" fill="#fb7a24" stroke="#fff" strokeWidth="2.5" /></>, 8),
  paint: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><path d="M24 5C12 5 4 13 4 23c0 9 7 15 13 15 3 0 4-2 4-4s-2-3-2-5 2-4 5-4h6c8 0 14-5 14-12C44 8 35 5 24 5z" fill="#f4f4f4" stroke="#b9b9b9" />{[[14, 17, '#ed1c24'], [22, 12, '#ffc90e'], [31, 13, '#22b14c'], [37, 20, '#00a2e8']].map(([x, y, c]) => <circle key={String(c)} cx={x as number} cy={y as number} r="3.6" fill={c as string} />)}<path d="M30 44l6-14 4 1.6-6 14z" fill="#a0522d" /></svg>,
  gimp: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><circle cx="24" cy="26" r="17" fill="#8c7a5b" /><circle cx="18" cy="21" r="4.2" fill="#fff" /><circle cx="29" cy="21" r="4.2" fill="#fff" /><circle cx="18.6" cy="21.6" r="2" fill="#222" /><circle cx="29.6" cy="21.6" r="2" fill="#222" /><path d="M17 32c4 3 10 3 14 0" stroke="#3b2f1f" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M33 9l9-6-3 10z" fill="#f2c94c" stroke="#6b5532" /></svg>,
  photoshop: (s: number) => sq(s, '#0b1f3a', <><rect x="12" y="14" width="24" height="20" rx="2" fill="none" stroke="#31a8ff" strokeWidth="2.4" /><circle cx="29" cy="20" r="2.6" fill="#31a8ff" /><path d="M13 32l7-8 5 5 3-3 7 8" stroke="#31a8ff" strokeWidth="2.4" fill="none" strokeLinejoin="round" /></>),
  pdf: (s: number) => <FileSvg path="x.pdf" size={s} />,
  sevenzip: (s: number) => sq(s, '#111', <text x="24" y="31" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="Segoe UI,Arial" fill="#fff">7z</text>, 4),
};
