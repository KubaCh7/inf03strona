import { useMemo, useState } from 'react';
import { Check, Coins, Lock, Sparkles } from 'lucide-react';
import { SHOP, FREE_ITEMS, type ShopItem, type Slot } from '../data/shop';
import { useStore } from '../lib/store';
import { APP_STYLES, EDITOR_THEMES } from '../lib/themes';
import Avatar, { LOOK_OPTIONS, type AvatarLook } from '../components/Avatar';
import { PageHeader } from '../components/ui';
import { celebrate } from '../lib/effects';

const TABS: { k: string; label: string; slots: Slot[] }[] = [
  { k: 'avatar', label: 'Ludzik', slots: ['skin', 'hair', 'hairColor', 'top', 'topColor', 'hat', 'glasses', 'accessory', 'bg'] },
  { k: 'editor', label: 'Motywy edytora (VS Code)', slots: ['editorTheme'] },
  { k: 'style', label: 'Style strony', slots: ['appStyle'] },
  { k: 'extra', label: 'Ramki, tytuły, efekty', slots: ['frame', 'title', 'effect'] },
];
const SLOT_LABEL: Record<string, string> = { skin: 'Karnacja', hair: 'Fryzura', hairColor: 'Kolor włosów', top: 'Ubranie', topColor: 'Kolor ubrania', hat: 'Nakrycie głowy', glasses: 'Okulary', accessory: 'Dodatek', bg: 'Tło', editorTheme: 'Motyw edytora', appStyle: 'Styl strony', frame: 'Ramka awatara', title: 'Tytuł pod nickiem', effect: 'Efekt przy dobrej odpowiedzi' };
const AVATAR_SLOTS = new Set(['skin', 'hair', 'hairColor', 'top', 'topColor', 'hat', 'glasses', 'accessory', 'bg']);

function ThemePreview({ id }: { id: string }) {
  const t = EDITOR_THEMES.find((x) => x.id === id);
  if (!t?.p) return <div className="mono h-20 rounded-lg border border-line bg-surface-2 p-2 text-[10px] text-muted">jak motyw strony</div>;
  const p = t.p;
  return (
    <pre className="mono h-20 overflow-hidden rounded-lg p-2 text-[10.5px] leading-[1.45]" style={{ background: p.bg, color: p.fg }}>
      <span style={{ color: p.comment }}>{'// wynik'}</span>{'\n'}
      <span style={{ color: p.keyword }}>function</span> <span style={{ color: p.func }}>oblicz</span>(<span style={{ color: p.variable }}>a</span>) {'{'}{'\n'}
      {'  '}<span style={{ color: p.keyword }}>return</span> <span style={{ color: p.string }}>"zł"</span> + <span style={{ color: p.number }}>42</span>;{'\n'}
      {'}'} <span style={{ color: p.tag }}>&lt;div</span> <span style={{ color: p.attr }}>class</span>=<span style={{ color: p.string }}>"x"</span><span style={{ color: p.tag }}>&gt;</span>
    </pre>
  );
}

export default function Shop() {
  const { coins, coinsEarned, owned, equipped, buy, equip } = useStore();
  const [tab, setTab] = useState('avatar');
  const [tryOn, setTryOn] = useState<Partial<AvatarLook>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const has = (i: ShopItem) => i.price === 0 || owned.includes(i.id) || FREE_ITEMS.includes(i.id);
  const look = { ...equipped.look, ...tryOn };
  const current = (i: ShopItem) => (AVATAR_SLOTS.has(i.slot) ? equipped.look[i.slot as keyof AvatarLook] === i.value : (equipped as Record<string, unknown>)[i.slot] === i.value || (i.slot === 'title' && equipped.title === i.value));
  const items = useMemo(() => SHOP.filter((i) => TABS.find((t) => t.k === tab)!.slots.includes(i.slot)), [tab]);
  const bySlot = useMemo(() => { const m = new Map<Slot, ShopItem[]>(); for (const i of items) m.set(i.slot, [...(m.get(i.slot) ?? []), i]); return m; }, [items]);

  function use(i: ShopItem) {
    if (AVATAR_SLOTS.has(i.slot)) { equip({ look: { [i.slot]: i.value } as Partial<AvatarLook> as AvatarLook }); setTryOn((t) => { const n = { ...t }; delete n[i.slot as keyof AvatarLook]; return n; }); }
    else equip({ [i.slot]: i.value } as never);
    if (i.slot === 'effect' && i.value !== 'none') setTimeout(() => celebrate(i.value), 50);
  }
  function purchase(i: ShopItem) {
    if (!buy(i.id, i.price)) { setMsg(`Brakuje ${i.price - coins} monet. Zdobywasz je za dobre odpowiedzi i zadania.`); return; }
    setMsg(`Kupione: ${i.name}!`);
    use(i);
  }

  return (
    <div>
      <PageHeader eyebrow="Za monety z nauki · nic tu nie blokuje nauki" title="Sklep" right={
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FACC15] text-[#713F12]"><Coins size={22} /></span>
          <div><p className="display text-3xl font-extrabold tabular">{coins}</p><p className="text-xs text-muted">monet INF · zdobyte łącznie {coinsEarned}</p></div>
        </div>
      }>
        Monety dostajesz za naukę: dobra odpowiedź w teorii daje +1, zaliczone zadanie +5, kwerenda +4, zdany arkusz +25. Wydajesz je tylko na wygląd: motywy, ludzika, ramki i efekty.
      </PageHeader>
      {msg && <p className="pop mb-4 rounded-xl bg-surface-2 p-3 text-sm font-bold">{msg}</p>}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t.k} className="chip" aria-pressed={tab === t.k} onClick={() => setTab(t.k)}>{t.label}</button>)}
      </div>

      <div className={`grid gap-6 ${tab === 'avatar' ? 'lg:grid-cols-[260px_1fr]' : ''}`}>
        {tab === 'avatar' && (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="card p-5 text-center">
              <Avatar look={look} size={180} className="mx-auto" ring={equipped.frame !== 'none' ? equipped.frame : undefined} />
              <input className="input mt-4 text-center font-bold" value={equipped.nick} maxLength={20} onChange={(e) => equip({ nick: e.target.value })} aria-label="Twój nick" />
              {equipped.title && <p className="mt-1 text-sm text-accent">{equipped.title}</p>}
              {Object.keys(tryOn).length > 0 && <p className="mt-3 text-xs text-muted">Podgląd przymierzanych rzeczy. <button className="underline" onClick={() => setTryOn({})}>Zdejmij</button></p>}
            </div>
          </aside>
        )}
        <div className="space-y-6">
          {Array.from(bySlot.entries()).map(([slot, list]) => (
            <section key={slot}>
              <p className="eyebrow mb-2">{SLOT_LABEL[slot]}</p>
              <div className={`grid gap-2 ${slot === 'editorTheme' ? 'sm:grid-cols-2 xl:grid-cols-3' : slot === 'appStyle' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'}`}>
                {list.map((i) => {
                  const own = has(i);
                  const on = current(i);
                  return (
                    <div key={i.id} className={`card flex flex-col gap-2 p-3 ${on ? 'ring-2 ring-accent' : ''}`}
                      onMouseEnter={() => AVATAR_SLOTS.has(i.slot) && setTryOn((x) => ({ ...x, [i.slot]: i.value }))}>
                      {slot === 'editorTheme' && <ThemePreview id={i.value} />}
                      {slot === 'appStyle' && (() => { const st = APP_STYLES.find((x) => x.id === i.value)!; return <div className="flex h-12 overflow-hidden rounded-lg border border-line">{st.swatch.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>; })()}
                      {(slot === 'hairColor' || slot === 'topColor' || slot === 'skin') && <span className="h-8 rounded-lg border border-line" style={{ background: slot === 'hairColor' ? LOOK_OPTIONS.HAIRC[i.value] : slot === 'skin' ? LOOK_OPTIONS.SKIN[i.value] : LOOK_OPTIONS.TOPC[i.value] }} />}
                      {AVATAR_SLOTS.has(slot) && !['hairColor', 'topColor', 'skin'].includes(slot) && <Avatar look={{ ...equipped.look, [slot]: i.value }} size={64} className="mx-auto" />}
                      {slot === 'frame' && <Avatar look={equipped.look} size={56} className="mx-auto my-1" ring={i.value !== 'none' ? i.value : undefined} />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{i.name}</p>
                        {i.desc && <p className="truncate text-xs text-muted">{i.desc}</p>}
                      </div>
                      {on ? <span className="btn btn-ghost mt-auto py-1.5 text-xs text-success"><Check size={14} />Używasz</span>
                        : own ? <button className="btn btn-dark mt-auto py-1.5 text-xs" onClick={() => use(i)}>Użyj</button>
                        : <button className={`btn mt-auto py-1.5 text-xs ${coins >= i.price ? 'btn-primary' : 'btn-ghost opacity-70'}`} onClick={() => purchase(i)}>{coins >= i.price ? <Coins size={14} /> : <Lock size={13} />}{i.price}</button>}
                      {slot === 'effect' && i.value !== 'none' && <button className="text-xs text-info underline" onClick={() => celebrate(i.value)}><Sparkles size={11} className="mr-1 inline" />podgląd</button>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
