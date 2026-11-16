import { useEffect } from 'react';
import { Coins, Gift as GiftIcon, Megaphone, Sparkles, Zap } from 'lucide-react';
import type { Gift } from '../lib/gifts';
import { SHOP } from '../data/shop';
import { celebrate } from '../lib/effects';

/** Okienko z prezentami / ogloszeniami od admina. */
export default function GiftModal({ gifts, onClose }: { gifts: Gift[]; onClose: () => void }) {
  const anyGift = gifts.some((g) => g.coins || g.xp || g.item);
  useEffect(() => { if (anyGift) { celebrate('confetti'); const t = setTimeout(() => celebrate('stars'), 500); return () => clearTimeout(t); } }, [anyGift]);
  const coins = gifts.reduce((a, g) => a + g.coins, 0);
  const xp = gifts.reduce((a, g) => a + g.xp, 0);
  const items = gifts.map((g) => g.item).filter(Boolean).map((id) => SHOP.find((s) => s.id === id)?.name ?? id);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" aria-label="Zamknij" onClick={onClose} />
      <div className="pop relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--gold-2)]/50 bg-surface p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gold-chip">{anyGift ? <GiftIcon size={30} /> : <Megaphone size={28} />}</div>
        <p className="eyebrow mt-4">{anyGift ? 'Prezent od admina' : 'Wiadomość od admina'}</p>
        <h2 className="display mt-1 text-2xl font-extrabold">{anyGift ? (gifts.some((g) => g.personal) ? 'Coś specjalnie dla Ciebie!' : 'Prezent dla wszystkich!') : 'Ogłoszenie'}</h2>
        {anyGift && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {coins !== 0 && <span className="mono inline-flex items-center gap-1 rounded-full bg-js/15 px-3 py-1 text-sm font-bold text-[#B45309] dark:text-[#FACC15]"><Coins size={15} />{coins > 0 ? '+' : ''}{coins} monet</span>}
            {xp !== 0 && <span className="mono inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success"><Zap size={15} />{xp > 0 ? '+' : ''}{xp} XP</span>}
            {items.map((n, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent"><Sparkles size={15} />{n}</span>)}
          </div>
        )}
        <div className="mt-4 space-y-2 text-left">
          {gifts.filter((g) => g.message).map((g) => (
            <p key={g.id} className="rounded-xl bg-surface-2 p-3 text-sm"><span className="mono mb-1 block text-[11px] text-muted">{g.created_by} · {new Date(g.created_at).toLocaleString('pl-PL')}</span>{g.message}</p>
          ))}
        </div>
        <button className="btn btn-gold mt-5 w-full" onClick={onClose}>{anyGift ? 'Odbieram!' : 'OK'}</button>
      </div>
    </div>
  );
}
