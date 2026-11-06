export type AvatarLook = {
  skin: string; hair: string; hairColor: string; top: string; topColor: string; hat: string; glasses: string; accessory: string; bg: string;
};
export const DEFAULT_LOOK: AvatarLook = { skin: 's2', hair: 'short', hairColor: 'brown', top: 'tee', topColor: 'accent', hat: 'none', glasses: 'none', accessory: 'none', bg: 'soft' };

const SKIN: Record<string, string> = { s1: '#FCE1CC', s2: '#F2C6A0', s3: '#D9A066', s4: '#A86B3C', s5: '#6B3F22' };
const HAIRC: Record<string, string> = { black: '#1F1A17', brown: '#5A3825', blond: '#D9B26A', red: '#B5452C', gray: '#9AA0A6', pink: '#F472B6', blue: '#3B82F6', green: '#22C55E', purple: '#8B5CF6' };
const TOPC: Record<string, string> = { accent: 'var(--accent)', ink: '#2B2B2B', white: '#F4F4F4', navy: '#1E3A8A', green: '#2F7D4F', yellow: '#EAB308', neon: '#39FF14', pink: '#EC4899' };

export const LOOK_OPTIONS = { SKIN, HAIRC, TOPC };

function Bg({ id }: { id: string }) {
  if (id === 'matrix') return (<g><rect width="120" height="120" fill="#03140A" />{Array.from({ length: 12 }, (_, i) => <text key={i} x={6 + i * 10} y={(i * 37) % 110 + 10} fill="#22C55E" fontSize="9" fontFamily="monospace" opacity=".7">{i % 2 ? '1' : '0'}</text>)}</g>);
  if (id === 'space') return (<g><rect width="120" height="120" fill="#0B1026" />{[[14, 20], [90, 14], [104, 60], [30, 92], [70, 40], [50, 12], [100, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.8} fill="#fff" />)}<circle cx="96" cy="28" r="9" fill="#F59E0B" opacity=".85" /></g>);
  if (id === 'sunset') return (<g><defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F97316" /><stop offset="1" stopColor="#DB2777" /></linearGradient></defs><rect width="120" height="120" fill="url(#sun)" /></g>);
  if (id === 'code') return (<g><rect width="120" height="120" fill="#1E1E1E" /><text x="8" y="22" fill="#569CD6" fontSize="9" fontFamily="monospace">&lt;html&gt;</text><text x="16" y="36" fill="#9CDCFE" fontSize="9" fontFamily="monospace">SELECT *</text><text x="70" y="110" fill="#CE9178" fontSize="9" fontFamily="monospace">&lt;/html&gt;</text></g>);
  if (id === 'grid') return (<g><rect width="120" height="120" fill="var(--surface-2)" />{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 10} 0V120M0 ${i * 10}H120`} stroke="var(--line)" strokeWidth="1" />)}</g>);
  return <rect width="120" height="120" fill="var(--accent-soft)" />;
}

export default function Avatar({ look = DEFAULT_LOOK, size = 96, className = '', ring }: { look?: AvatarLook; size?: number; className?: string; ring?: string }) {
  const skin = SKIN[look.skin] ?? SKIN.s2;
  const hc = HAIRC[look.hairColor] ?? HAIRC.brown;
  const tc = TOPC[look.topColor] ?? TOPC.accent;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`shrink-0 rounded-full ${className}`} style={ring ? { boxShadow: ring } : undefined} aria-label="Twój ludzik">
      <clipPath id="ava-clip"><circle cx="60" cy="60" r="60" /></clipPath>
      <g clipPath="url(#ava-clip)">
        <Bg id={look.bg} />
        {/* tulow */}
        {look.top === 'hoodie' && <path d="M22 120c2-26 16-38 38-38s36 12 38 38z" fill={tc} />}
        {look.top === 'hoodie' && <path d="M44 84c4 8 10 12 16 12s12-4 16-12" stroke="rgba(0,0,0,.25)" strokeWidth="3" fill="none" />}
        {look.top === 'shirt' && <><path d="M22 120c2-26 16-38 38-38s36 12 38 38z" fill={tc} /><path d="M52 82l8 14 8-14" fill="#fff" /><path d="M60 96v24" stroke="rgba(0,0,0,.2)" strokeWidth="1.5" /></>}
        {look.top === 'suit' && <><path d="M22 120c2-26 16-38 38-38s36 12 38 38z" fill="#1F2937" /><path d="M50 82l10 18 10-18z" fill="#fff" /><path d="M58 92h4l1 10h-6z" fill={tc} /></>}
        {look.top === 'sweater' && <><path d="M22 120c2-26 16-38 38-38s36 12 38 38z" fill={tc} /><text x="60" y="110" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="700" fill="rgba(255,255,255,.9)">&lt;h1&gt;</text></>}
        {look.top === 'tee' && <><path d="M22 120c2-26 16-38 38-38s36 12 38 38z" fill={tc} /><path d="M50 84c3 5 7 7 10 7s7-2 10-7" fill={skin} /></>}
        {/* szyja i glowa */}
        <rect x="53" y="70" width="14" height="14" rx="5" fill={skin} />
        <circle cx="60" cy="52" r="24" fill={skin} />
        {/* wlosy */}
        {look.hair === 'short' && <path d="M36 50c0-16 11-25 24-25s24 9 24 25c-4-8-12-11-24-11s-20 3-24 11z" fill={hc} />}
        {look.hair === 'long' && <path d="M34 54c-2-20 10-30 26-30s28 10 26 30l2 26c-6 2-10-2-10-8V46c-4-6-10-8-18-8s-14 2-18 8v26c0 6-4 10-10 8z" fill={hc} />}
        {look.hair === 'ponytail' && <><path d="M36 50c0-16 11-25 24-25s24 9 24 25c-4-8-12-11-24-11s-20 3-24 11z" fill={hc} /><path d="M82 40c10 4 12 18 6 28-2-8-6-14-10-16z" fill={hc} /></>}
        {look.hair === 'mohawk' && <path d="M52 34c2-14 6-20 8-22 2 2 6 8 8 22-4-2-12-2-16 0z" fill={hc} />}
        {look.hair === 'bun' && <><path d="M36 50c0-16 11-25 24-25s24 9 24 25c-4-8-12-11-24-11s-20 3-24 11z" fill={hc} /><circle cx="60" cy="22" r="9" fill={hc} /></>}
        {look.hair === 'curly' && [40, 48, 56, 64, 72, 80, 44, 76].map((x, i) => <circle key={i} cx={x} cy={i > 5 ? 40 : 32 + (i % 2) * 3} r="7" fill={hc} />)}
        {/* twarz */}
        <circle cx="51" cy="54" r="2.4" fill="#2B2B2B" />
        <circle cx="69" cy="54" r="2.4" fill="#2B2B2B" />
        <path d="M52 63c4 4 12 4 16 0" stroke="#2B2B2B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="45" cy="61" r="3" fill="#F87171" opacity=".25" /><circle cx="75" cy="61" r="3" fill="#F87171" opacity=".25" />
        {/* okulary */}
        {look.glasses === 'nerd' && <g stroke="#1F2937" strokeWidth="2.2" fill="rgba(255,255,255,.15)"><circle cx="51" cy="54" r="7" /><circle cx="69" cy="54" r="7" /><path d="M58 54h4" /></g>}
        {look.glasses === 'sun' && <g fill="#111"><rect x="42" y="49" width="16" height="10" rx="4" /><rect x="62" y="49" width="16" height="10" rx="4" /><rect x="57" y="51" width="6" height="2" /></g>}
        {look.glasses === 'vr' && <g><rect x="38" y="46" width="44" height="16" rx="6" fill="#111827" /><rect x="42" y="49" width="36" height="6" rx="3" fill="#22D3EE" opacity=".8" /></g>}
        {look.glasses === 'pixel' && <g fill="#111"><rect x="42" y="50" width="16" height="6" /><rect x="62" y="50" width="16" height="6" /><rect x="56" y="50" width="8" height="3" /><rect x="44" y="51" width="3" height="2" fill="#fff" /><rect x="64" y="51" width="3" height="2" fill="#fff" /></g>}
        {/* nakrycie glowy */}
        {look.hat === 'cap' && <g><path d="M35 40c2-12 12-18 25-18s23 6 25 18z" fill={tc} /><path d="M60 40h34c0 4-4 6-10 6H60z" fill={tc} opacity=".85" /></g>}
        {look.hat === 'beanie' && <g><path d="M35 42c0-14 11-22 25-22s25 8 25 22z" fill="#DC2626" /><rect x="34" y="38" width="52" height="7" rx="3" fill="#B91C1C" /><circle cx="60" cy="18" r="5" fill="#F4F4F4" /></g>}
        {look.hat === 'headphones' && <g fill="none" stroke="#1F2937" strokeWidth="4"><path d="M36 54c0-16 10-26 24-26s24 10 24 26" /><rect x="30" y="50" width="9" height="16" rx="4" fill="#1F2937" /><rect x="81" y="50" width="9" height="16" rx="4" fill="#1F2937" /></g>}
        {look.hat === 'grad' && <g><path d="M30 32l30-12 30 12-30 12z" fill="#111827" /><rect x="48" y="36" width="24" height="8" fill="#111827" /><path d="M86 34v14" stroke="#EAB308" strokeWidth="2" /><circle cx="86" cy="49" r="2.5" fill="#EAB308" /></g>}
        {look.hat === 'party' && <g><path d="M48 32l12-28 12 28z" fill="#8B5CF6" /><circle cx="60" cy="4" r="4" fill="#FACC15" /><path d="M52 24l16-4M50 30l20-5" stroke="#FACC15" strokeWidth="2" /></g>}
        {/* dodatek */}
        {look.accessory === 'coffee' && <g transform="translate(84 92)"><rect width="16" height="18" rx="3" fill="#F4F4F4" /><path d="M16 5c6 0 6 9 0 9" stroke="#F4F4F4" strokeWidth="3" fill="none" /><rect y="3" width="16" height="4" fill="var(--accent)" /><path d="M5-4c-2-3 2-4 0-7M10-4c-2-3 2-4 0-7" stroke="#9CA3AF" strokeWidth="1.5" fill="none" /></g>}
        {look.accessory === 'laptop' && <g transform="translate(18 92)"><rect width="34" height="20" rx="2" fill="#374151" /><rect x="3" y="3" width="28" height="14" fill="#22D3EE" opacity=".6" /><text x="5" y="13" fontSize="6" fontFamily="monospace" fill="#0F172A">&lt;/&gt;</text><rect x="-4" y="20" width="42" height="4" rx="2" fill="#4B5563" /></g>}
        {look.accessory === 'duck' && <g transform="translate(82 94)"><ellipse cx="10" cy="12" rx="12" ry="8" fill="#FACC15" /><circle cx="18" cy="2" r="6" fill="#FACC15" /><path d="M23 2l6 2-6 2z" fill="#F97316" /><circle cx="19" cy="1" r="1.2" fill="#111" /></g>}
        {look.accessory === 'cat' && <g transform="translate(80 90)"><ellipse cx="12" cy="18" rx="12" ry="9" fill="#9CA3AF" /><circle cx="12" cy="6" r="8" fill="#9CA3AF" /><path d="M5 1l2-7 4 5zM19 1l-2-7-4 5z" fill="#9CA3AF" /><circle cx="9" cy="6" r="1.2" fill="#111" /><circle cx="15" cy="6" r="1.2" fill="#111" /></g>}
        {look.accessory === 'trophy' && <g transform="translate(86 90)"><path d="M2 0h18v8c0 6-4 10-9 10S2 14 2 8z" fill="#EAB308" /><rect x="8" y="18" width="6" height="5" fill="#CA8A04" /><rect x="4" y="23" width="14" height="4" rx="1" fill="#A16207" /></g>}
      </g>
    </svg>
  );
}
