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
  vscode: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><path d="M34 4.5 18.5 18.8 10 12.3l-3.5 1.8v19.8l3.5 1.8 8.5-6.5L34 43.5l7.5-3.6V8.1z" fill="#0065a9" /><path d="M34 4.5 18.5 18.8 10 12.3l-3.5 1.8v19.8l3.5 1.8 8.5-6.5L34 43.5l7.5-3.6V8.1z" fill="#007acc" clipPath="inset(0 0 0 0)" opacity=".0" /><path d="M41.5 8.1v31.8L34 43.5V4.5z" fill="#1f9cf0" /><path d="M10 14.5 26 24 10 33.5z" fill="#fff" fillOpacity=".25" /><path d="M34 15.5 22 24l12 8.5z" fill="#0b4f8a" /></svg>,
  browser: (s: number) => { const id = `br${s}`; return <svg width={s} height={s} viewBox="0 0 48 48"><defs><linearGradient id={`${id}a`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0c59a4" /><stop offset="1" stopColor="#114a8b" /></linearGradient><linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b9de2" /><stop offset=".6" stopColor="#1595df" /><stop offset="1" stopColor="#0680d7" /></linearGradient><radialGradient id={`${id}c`} cx=".7" cy=".2" r=".9"><stop offset="0" stopColor="#35c1f1" /><stop offset=".6" stopColor="#34c1ed" /><stop offset="1" stopColor="#66eb6e" /></radialGradient></defs>
      <path d="M41.5 33.6c-.6.3-1.2.6-1.9.8a18 18 0 0 1-6.4 1.2c-8.4 0-15.7-5.8-15.7-13.2a5.7 5.7 0 0 1 3-4.9C12.9 17.8 11 26.6 13.5 32.3c2.6 6 10 10.6 18.4 9.3a20.4 20.4 0 0 0 9.6-8z" fill={`url(#${id}a)`} />
      <path d="M19.3 41.9A19.7 19.7 0 0 1 13.8 36.4 20 20 0 0 1 20.3 7a5.7 5.7 0 0 0-3 4.9c0 7.4 7.3 13.2 15.7 13.2-.2 0-11.3-.6-13.7 16.8z" fill={`url(#${id}b)`} />
      <path d="M28.6 26.1c-.2.2-.7.5-.7 1.1 0 .5.3 1 1 1.4 2.8 1.9 8 1.7 8 1.7a11.6 11.6 0 0 0 5.9-1.6A11.9 11.9 0 0 0 48.6 18.4c.1-4.6-1.7-7.7-2.3-8.9C42.7 2.6 35 0 26.7 0 15.4 0 6.2 9.1 6 20.4c.1-7.4 7.5-13.4 16.2-13.4.7 0 4.7.1 8.4 2 3.3 1.7 5 3.8 6.2 5.9 1.3 2.1 1.5 4.8 1.5 5.9 0 1-.5 2.6-1.6 3.9z" fill={`url(#${id}c)`} transform="translate(-3 3) scale(.92)" />
    </svg>; },
  xampp: (s: number) => sq(s, '#fb7a24', <><path d="M15 14l18 20M33 14L15 34" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" /><circle cx="24" cy="24" r="4" fill="#fb7a24" stroke="#fff" strokeWidth="2.5" /></>, 8),
  paint: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><path d="M24 5C12 5 4 13 4 23c0 9 7 15 13 15 3 0 4-2 4-4s-2-3-2-5 2-4 5-4h6c8 0 14-5 14-12C44 8 35 5 24 5z" fill="#f4f4f4" stroke="#b9b9b9" />{[[14, 17, '#ed1c24'], [22, 12, '#ffc90e'], [31, 13, '#22b14c'], [37, 20, '#00a2e8']].map(([x, y, c]) => <circle key={String(c)} cx={x as number} cy={y as number} r="3.6" fill={c as string} />)}<path d="M30 44l6-14 4 1.6-6 14z" fill="#a0522d" /></svg>,
  gimp: (s: number) => <svg width={s} height={s} viewBox="0 0 48 48"><circle cx="24" cy="26" r="17" fill="#8c7a5b" /><circle cx="18" cy="21" r="4.2" fill="#fff" /><circle cx="29" cy="21" r="4.2" fill="#fff" /><circle cx="18.6" cy="21.6" r="2" fill="#222" /><circle cx="29.6" cy="21.6" r="2" fill="#222" /><path d="M17 32c4 3 10 3 14 0" stroke="#3b2f1f" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M33 9l9-6-3 10z" fill="#f2c94c" stroke="#6b5532" /></svg>,
  photoshop: (s: number) => sq(s, '#0b1f3a', <><rect x="12" y="14" width="24" height="20" rx="2" fill="none" stroke="#31a8ff" strokeWidth="2.4" /><circle cx="29" cy="20" r="2.6" fill="#31a8ff" /><path d="M13 32l7-8 5 5 3-3 7 8" stroke="#31a8ff" strokeWidth="2.4" fill="none" strokeLinejoin="round" /></>),
  pdf: (s: number) => <FileSvg path="x.pdf" size={s} />,
  sevenzip: (s: number) => sq(s, '#111', <text x="24" y="31" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="Segoe UI,Arial" fill="#fff">7z</text>, 4),
};

// ---------- ikony panelu nawigacji Eksploratora (styl Fluent) ----------
const ns = (s: number, inner: React.ReactNode) => <svg width={s} height={s} viewBox="0 0 24 24">{inner}</svg>;
export const NavSvg = {
  home: (s = 16) => ns(s, <><path d="M3 11 12 3.5 21 11v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="#3c8fdd" /><path d="M9 21v-6h6v6" fill="#a7d3ff" /></>),
  gallery: (s = 16) => ns(s, <><rect x="5" y="3" width="16" height="13" rx="2" fill="#7fc1f4" /><rect x="2.5" y="6.5" width="16" height="14" rx="2" fill="#2f8be0" /><circle cx="13.5" cy="10.5" r="1.6" fill="#fff" /><path d="M3 18l5-5 4 4 2-2 4 4v.5H3z" fill="#bfe3ff" /></>),
  desktop: (s = 16) => ns(s, <><rect x="2" y="3.5" width="20" height="14" rx="1.8" fill="#2f8be0" /><rect x="2" y="15" width="20" height="2.5" fill="#1f6fbf" /><rect x="9" y="18" width="6" height="2.6" rx=".6" fill="#7a7a7a" /></>),
  downloads: (s = 16) => ns(s, <><path d="M12 3v11" stroke="#2fa84f" strokeWidth="2.6" strokeLinecap="round" /><path d="M7 10l5 5 5-5" stroke="#2fa84f" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x="3" y="18" width="18" height="3" rx="1.5" fill="#2fa84f" /></>),
  documents: (s = 16) => ns(s, <><path d="M6 2.5h8.5L19 7v13.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" fill="#3c8fdd" /><path d="M14.5 2.5V7H19" fill="#a7d3ff" /><path d="M8 11h8M8 14h8M8 17h5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /></>),
  pictures: (s = 16) => ns(s, <><rect x="2.5" y="4" width="19" height="16" rx="2" fill="#35a3c9" /><circle cx="16" cy="9" r="2" fill="#fff3a0" /><path d="M2.5 17l6-6 5 5 2.5-2.5 5.5 5.5H4.5a2 2 0 0 1-2-2z" fill="#1d7a43" /></>),
  music: (s = 16) => ns(s, <><path d="M9 17V5l11-2v12" stroke="#e8743b" strokeWidth="2" fill="none" /><circle cx="6.5" cy="17.5" r="3" fill="#e8743b" /><circle cx="17.5" cy="15.5" r="3" fill="#e8743b" /></>),
  videos: (s = 16) => ns(s, <><rect x="2.5" y="5" width="19" height="15" rx="2" fill="#8a5cc7" /><path d="M2.5 9h19" stroke="#fff" strokeOpacity=".5" /><path d="M10 11.5v6l5-3z" fill="#fff" /><path d="M5 5l2 4M10 5l2 4M15 5l2 4" stroke="#fff" strokeOpacity=".6" /></>),
  pc: (s = 16) => <PcSvg size={s} />,
  drive: (s = 16) => ns(s, <><rect x="2" y="8" width="20" height="10" rx="2" fill="#c9c9c9" stroke="#8a8a8a" strokeWidth=".8" /><rect x="3.5" y="15" width="17" height="1.4" rx=".7" fill="#7a7a7a" /><g transform="translate(9 3)"><rect width="2.7" height="2.7" fill="#2f8be0" /><rect x="3.1" width="2.7" height="2.7" fill="#2f8be0" /><rect y="3.1" width="2.7" height="2.7" fill="#2f8be0" /><rect x="3.1" y="3.1" width="2.7" height="2.7" fill="#2f8be0" /></g></>),
  network: (s = 16) => ns(s, <><circle cx="12" cy="12" r="9" fill="#3c8fdd" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="#fff" strokeWidth="1.2" fill="none" /></>),
  pin: (s = 12) => ns(s, <path d="M14 3l7 7-3 1-4 4 1 4-2 1-4-4-5 5-1-1 5-5-4-4 1-2 4 1 4-4z" fill="none" stroke="#777" strokeWidth="1.6" strokeLinejoin="round" />),
};
