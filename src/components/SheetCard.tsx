import { Link } from 'react-router';
import { ArrowRight, Check } from 'lucide-react';
import type { Sheet } from '../lib/types';
import { SESSION_LABEL } from '../lib/data';
import { useStore } from '../lib/store';
import { DifficultyBar, LangBadge, Tag } from './ui';

const BAND: Record<string, string> = { JS: 'var(--c-js)', PHP: 'var(--c-php)', 'JS+PHP': 'var(--accent)' };

/** Szkic ukladu strony (oryginalna miniatura zamiast zrzutu ekranu). */
function Wireframe({ sheet }: { sheet: Sheet }) {
  const c = BAND[sheet.language];
  const n = (parseInt(sheet.variant, 10) + sheet.year) % 3; // wariant ukladu
  const cols = n === 0 ? ['30%', '70%'] : n === 1 ? ['25%', '50%', '25%'] : ['60%', '40%'];
  const hasForm = sheet.tags.some((t) => t.label.includes('formularz'));
  const hasTable = sheet.tags.some((t) => t.group === 'SQL');
  return (
    <div className="relative h-32 overflow-hidden rounded-t-[13px] border-b border-line" style={{ background: `color-mix(in oklab, ${c} 12%, var(--surface))` }}>
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-danger/60" /><span className="h-2 w-2 rounded-full bg-js/60" /><span className="h-2 w-2 rounded-full bg-success/60" />
        <span className="mono ml-1.5 truncate text-[10px] text-muted">{sheet.code}</span>
      </div>
      <div className="mx-3 rounded-md bg-surface/90 p-1.5 shadow-sm">
        <div className="mb-1.5 flex h-4 items-center justify-center rounded-sm text-[8px] font-bold text-white" style={{ background: c }}>{sheet.title.slice(0, 28)}</div>
        <div className="flex gap-1">
          {cols.map((w, i) => (
            <div key={i} className="space-y-1 rounded-sm bg-surface-2 p-1" style={{ width: w }}>
              <div className="h-1 w-3/4 rounded bg-line" /><div className="h-1 w-1/2 rounded bg-line" />
              {i === cols.length - 1 && hasTable && <div className="grid grid-cols-3 gap-[2px]">{Array.from({ length: 6 }, (_, k) => <div key={k} className="h-1.5 rounded-[1px] bg-line" />)}</div>}
              {i === 0 && hasForm && <div className="space-y-[2px]"><div className="h-1.5 rounded-[1px] border border-line bg-surface" /><div className="h-1.5 w-1/2 rounded-[1px]" style={{ background: c }} /></div>}
              {!(i === 0 && hasForm) && !(i === cols.length - 1 && hasTable) && <div className="h-4 rounded-[1px] bg-line/70" />}
            </div>
          ))}
        </div>
        <div className="mt-1 h-1.5 rounded-sm" style={{ background: `color-mix(in oklab, ${c} 40%, var(--line))` }} />
      </div>
    </div>
  );
}

export default function SheetCard({ sheet }: { sheet: Sheet }) {
  const st = useStore((s) => s.sheets[sheet.code]);
  const tags = sheet.tags.filter((t) => t.group !== 'Grafika');
  return (
    <article className="card card-hover flex flex-col">
      <Link to={`/arkusze/${encodeURIComponent(sheet.code)}`} className="block" tabIndex={-1} aria-hidden><Wireframe sheet={sheet} /></Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="mono text-[11px] text-muted">{sheet.qualification} · {SESSION_LABEL[sheet.session]} {sheet.year} · nr {sheet.variant}</p>
        <h3 className="mt-1 text-lg font-bold leading-tight">
          <Link to={`/arkusze/${encodeURIComponent(sheet.code)}`} className="hover:text-accent">{sheet.title}</Link>
        </h3>
        <div className="mt-3 flex items-center gap-2"><LangBadge lang={sheet.language} /><div className="flex-1"><DifficultyBar score={sheet.difficulty.score} size="sm" /></div></div>
        <p className="mt-1 text-xs text-muted">{sheet.difficulty.label}{sheet.sameAs.length ? ` · powtórzony w ${sheet.sameAs.length} innym` : ''}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => <Tag key={t.group + t.label} {...t} />)}
          {tags.length > 3 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">+{tags.length - 3}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className={`inline-flex items-center gap-1.5 text-xs ${st?.status === 'done' ? 'text-success font-bold' : st?.status === 'doing' ? 'text-js' : 'text-muted'}`}>
            {st?.status === 'done' ? <><Check size={14} />Ukończony{st.score !== undefined ? ` · ${st.score}%` : ''}</> : st?.status === 'doing' ? 'W trakcie' : 'Nie rozpoczęty'}
          </span>
          <Link to={`/arkusze/${encodeURIComponent(sheet.code)}`} className="btn btn-dark px-3 py-1.5 text-sm">Otwórz <ArrowRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
