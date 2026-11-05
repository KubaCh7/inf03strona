import type { ReactNode } from 'react';
import type { Sheet } from '../lib/types';

export function DifficultyBar({ score, size = 'md', showLabel = true }: { score: number; size?: 'sm' | 'md'; showLabel?: boolean }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const tone = score <= 3 ? 'bg-success' : score <= 6 ? 'bg-js' : score <= 8 ? 'bg-accent' : 'bg-danger';
  return (
    <div className="flex items-center gap-2" aria-label={`Trudność ${score} na 10`}>
      <div className="flex flex-1 gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`${h} flex-1 rounded-[2px] ${i < score ? tone : 'bg-line'}`} />
        ))}
      </div>
      {showLabel && <span className="mono tabular text-sm font-semibold">{score}<span className="text-muted">/10</span></span>}
    </div>
  );
}

const LANG_STYLE: Record<string, string> = {
  JS: 'text-js border-js/40 bg-js/10',
  PHP: 'text-php border-php/40 bg-php/10',
  'JS+PHP': 'text-accent border-accent/40 bg-accent/10',
};
export function LangBadge({ lang }: { lang: Sheet['language'] }) {
  return <span className={`mono rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${LANG_STYLE[lang]}`}>{lang}</span>;
}

export const GROUP_COLOR: Record<string, string> = { HTML: 'text-html', CSS: 'text-css', JS: 'text-js', PHP: 'text-php', SQL: 'text-sql', Grafika: 'text-info' };

export function Tag({ group, label }: { group: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">
      <span className={`mono text-[10px] font-semibold ${GROUP_COLOR[group] ?? ''}`}>{group}</span>
      <span className="text-muted">{label.replace(/\s*\(.*\)/, '')}</span>
    </span>
  );
}

export function PageHeader({ eyebrow, title, children, right }: { eyebrow: string; title: ReactNode; children?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold md:text-[42px] md:leading-[1.05]">{title}</h1>
        {children && <p className="mt-2 max-w-2xl text-muted">{children}</p>}
      </div>
      {right}
    </header>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="display mt-1 text-2xl font-bold tabular">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Loading({ label = 'Ładowanie…' }: { label?: string }) {
  return <div className="flex items-center gap-3 p-8 text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />{label}</div>;
}

/** Render prostego markdownu: `kod` -> inline code */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return <>{parts.map((p, i) => (p.startsWith('`') && p.endsWith('`') ? <code key={i} className="inline-code">{p.slice(1, -1)}</code> : <span key={i}>{p}</span>))}</>;
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden><rect width="64" height="64" rx="16" fill="var(--accent)" /><text x="32" y="41" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="24" fill="var(--bg)" letterSpacing="-1">P03</text></svg>
      <span className="display text-lg font-extrabold leading-none">Pracownia<span className="text-accent">.</span>03</span>
    </span>
  );
}
