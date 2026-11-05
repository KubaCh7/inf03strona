export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Pytanie z przetasowanymi odpowiedziami; correct wskazuje nowy indeks. */
type QLike = { id: string; text: string; answers: string[]; correct: number; explanation: string | null; category: string; source?: string; image?: string | null; imageAnswers?: boolean; ocr?: boolean; sources?: string[] };
export type Shuffled = QLike & { order: number[] };
/** Kolejnosc odpowiedzi: losowa, chyba ze odpowiedzi sa na obrazku z arkusza (wtedy A-D musza sie zgadzac). */
export const answerOrder = (q: { imageAnswers?: boolean }) => (q.imageAnswers ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3]));
export function shuffleQuestion(q: QLike): Shuffled {
  const order = answerOrder(q);
  return { ...q, order, answers: order.map((i) => q.answers[i]), correct: order.indexOf(q.correct) };
}
