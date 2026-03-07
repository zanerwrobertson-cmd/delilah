export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export type QuizMode = "standard" | "time-crunch" | "exam-prep";

export interface QuizResult {
  score: number;
  total: number;
  timeTakenSeconds: number | null;
  wrongQuestions: QuizQuestion[];
  userAnswers: (number | null)[];
  weakAreas: string[];
  mode: QuizMode;
  course: string;
}
