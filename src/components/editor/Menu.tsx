import { useEffect, useState } from 'react';

export type MItem = { label: string; key?: string; run?: () => void; sub?: MItem[]; off?: boolean; check?: boolean } | '-';
export type Skin = { bar: string; pop: string; hover: string; item: string; sep: string; dim: string };

/** Pasek menu jak w programach graficznych: klik otwiera, najechanie przelacza, podmenu na najechanie. */
export function MenuBar({ menus, skin, lead }: { menus: [string, MItem[]][]; skin: Skin; lead?: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (!open) return; const c = () => setOpen(null); window.addEventListener('pointerdown', c); return () => window.removeEventListener('pointerdown', c); }, [open]);
  const run = (it: MItem) => { if (it === '-' || it.off || it.sub || !it.run) return; setOpen(null); it.run(); };
  return (
    <div className={`relative z-40 flex select-none items-center ${skin.bar}`} onPointerDown={(e) => e.stopPropagation()}>
      {lead}
      {menus.map(([m, items]) => (
        <div key={m} className="relative">
          <button className={`px-[9px] py-[3px] ${open === m ? skin.hover : ''}`} onClick={() => setOpen(open === m ? null : m)} onMouseEnter={() => open && setOpen(m)}>{m}</button>
          {open === m && <Pop items={items} skin={skin} run={run} />}
        </div>
      ))}
    </div>
  );
}
function Pop({ items, skin, run, sub }: { items: MItem[]; skin: Skin; run: (i: MItem) => void; sub?: boolean }) {
  return (
    <div className={`absolute z-50 min-w-[250px] py-1 shadow-[0_6px_20px_rgba(0,0,0,.6)] ${skin.pop} ${sub ? 'left-full top-[-5px]' : 'left-0 top-full'}`}>
      {items.map((it, i) => it === '-' ? <div key={i} className={`my-1 h-px ${skin.sep}`} /> : (
        <div key={i} className="group relative">
          <button disabled={it.off} onClick={() => run(it)} className={`flex w-full items-center gap-2 whitespace-nowrap py-[3px] pl-6 pr-4 text-left ${it.off ? skin.dim : skin.item}`}>
            {it.check !== undefined && <span className="absolute left-2">{it.check ? '✓' : ''}</span>}
            <span className="flex-1">{it.label}</span>
            {it.key && <span className="pl-6 text-[0.92em] opacity-60">{it.key}</span>}
            {it.sub && <span className="pl-4 opacity-70">▸</span>}
          </button>
          {it.sub && !it.off && <div className="hidden group-hover:block"><Pop items={it.sub} skin={skin} run={run} sub /></div>}
        </div>
      ))}
    </div>
  );
}
