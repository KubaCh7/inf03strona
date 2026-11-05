import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });
export { Rating };

type Stored = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };
export const toStored = (c: Card): Stored => ({ ...c, due: new Date(c.due).toISOString(), last_review: c.last_review ? new Date(c.last_review).toISOString() : undefined });
export const fromStored = (s: Stored): Card => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined }) as Card;

export function review(stored: unknown | undefined, rating: Rating, now = new Date()) {
  const card = stored ? fromStored(stored as Stored) : createEmptyCard(now);
  const res = scheduler.next(card, now, rating as Parameters<typeof scheduler.next>[2]);
  return toStored(res.card);
}
export function isDue(stored: unknown | undefined, now = new Date()) {
  if (!stored) return false;
  return new Date((stored as Stored).due).getTime() <= now.getTime();
}
export function preview(stored: unknown | undefined, now = new Date()) {
  const card = stored ? fromStored(stored as Stored) : createEmptyCard(now);
  const out: Record<number, Date> = {};
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) out[r] = scheduler.next(card, now, r as Parameters<typeof scheduler.next>[2]).card.due as Date;
  return out;
}
export function humanDelta(d: Date, now = new Date()) {
  const m = Math.round((d.getTime() - now.getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const days = Math.round(h / 24);
  return days < 30 ? `${days} d` : `${Math.round(days / 30)} mies.`;
}
