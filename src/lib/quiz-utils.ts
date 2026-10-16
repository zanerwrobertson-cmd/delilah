import type { QuizQuestion } from "./quiz-types";

/**
 * Return a copy of the questions ordered easy -> medium -> hard.
 * Used by "exam-prep" mode so a quiz ramps up in difficulty.
 * (Copies the array first because .sort() would otherwise reorder the original.)
 */
export function sortByDifficulty(questions: QuizQuestion[]): QuizQuestion[] {
  const order = { easy: 0, medium: 1, hard: 2 };
  return [...questions].sort((a, b) => order[a.difficulty] - order[b.difficulty]);
}
