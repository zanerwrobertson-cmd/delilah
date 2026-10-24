// Shared TypeScript types for the Learn feature.
// These mirror the JSON shapes stored in study_sets.guide / .flashcards / .practice
// and returned by the learn edge function.

export interface GuideSection {
  title: string;
  explanation: string;
  key_points: string[];
  source?: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
  example?: string;
}

export interface Formula {
  name: string;
  latex: string;
  meaning: string;
}

export interface Guide {
  overview: string;
  sections: GuideSection[];
  key_terms: KeyTerm[];
  formulas?: Formula[];
  common_mistakes: string[];
  exam_focus: string[];
  connections?: string[];
}

export interface Flashcard {
  front: string;
  back: string;
  topic: string;
}

export interface Flashcards {
  cards: Flashcard[];
}

export interface MCQQuestion {
  type: "mcq";
  question: string;
  options: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ShortAnswerQuestion {
  type: "short_answer";
  question: string;
  answer: string;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export type PracticeQuestion = MCQQuestion | ShortAnswerQuestion;

export interface Practice {
  questions: PracticeQuestion[];
}

export interface StudyMaterialRow {
  id: string;
  file_name: string;
  kind: string;
  char_count: number;
  created_at: string;
}

export interface StudySetRow {
  id: string;
  title: string;
  course_name: string | null;
  focus: string | null;
  guide: Guide | null;
  flashcards: Flashcards | null;
  practice: Practice | null;
  created_at: string;
  updated_at: string;
}

export interface StudyMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ExtractedMaterial {
  file_name: string;
  kind: "pdf" | "docx" | "pptx" | "text" | "paste" | "epub" | "html" | "xlsx" | "odf";
  content: string;
  char_count: number;
}
