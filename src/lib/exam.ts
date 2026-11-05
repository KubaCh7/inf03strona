import type { Question } from './types';
import { shuffle } from './random';
import type { TheoryState } from '../components/TheoryTest';

export const THEORY_COUNT = 40;
export const THEORY_MS = 60 * 60_000;
export const PRACTICE_MS = 150 * 60_000;
export const THEORY_PASS = 0.5;
export const PRACTICE_PASS = 0.75;

export function newTheory(questions: Question[], count = THEORY_COUNT, durationMs = THEORY_MS): TheoryState {
  const picked = shuffle(questions).slice(0, Math.min(count, questions.length));
  return {
    questionIds: picked.map((q) => q.id),
    order: picked.map(() => shuffle([0, 1, 2, 3])),
    answers: picked.map(() => null),
    startedAt: Date.now(),
    durationMs,
  };
}
