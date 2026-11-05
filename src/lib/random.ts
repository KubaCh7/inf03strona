export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Pytanie z przetasowanymi odpowiedziami; correct wskazuje nowy indeks. */
export type Shuffled = { id: string; text: string; answers: string[]; correct: number; explanation: string | null; category: string };
export function shuffleQuestion(q: { id: string; text: string; answers: string[]; correct: number; explanation: string | null; category: string }): Shuffled {
  const order = shuffle([0, 1, 2, 3]);
  return { ...q, answers: order.map((i) => q.answers[i]), correct: order.indexOf(q.correct) };
}
