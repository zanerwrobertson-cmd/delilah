import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sortByDifficulty } from "@/lib/quiz-utils";
import type { QuizQuestion, QuizMode, QuizResult } from "@/lib/quiz-types";
import { CourseSelector } from "@/components/quiz/CourseSelector";
import { ModeSelector } from "@/components/quiz/ModeSelector";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { QuizResults } from "@/components/quiz/QuizResults";
import { SavedQuizzes } from "@/components/quiz/SavedQuizzes";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Quiz Me (/dashboard/quiz).
 *
 * This page is a small state machine. `phase` decides which screen shows:
 *   select-course -> select-mode -> loading -> quiz -> results
 *
 * - Courses come from the user's topics (added by uploading a syllabus).
 * - Questions come from Claude via the generate-quiz edge function.
 * - "Save & Exit" stores an unfinished quiz in quiz_progress so it can be resumed later.
 * - A finished quiz is recorded in quiz_results.
 *
 * The screens themselves live in src/components/quiz/*. This file holds the
 * state and the database/AI calls.
 */
type Phase = "select-course" | "select-mode" | "loading" | "quiz" | "results";

// A row from the quiz_progress table (an unfinished quiz).
interface SavedQuiz {
  id: string;
  course: string;
  mode: string;
  current_index: number;
  questions: any[];
  user_answers: any[];
  updated_at: string;
}

export default function QuizMe() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode | null>(null);
  const [phase, setPhase] = useState<Phase>("select-course");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Resume support: where to restart a saved quiz, and which quiz_progress row it came
  // from (so it gets updated, not duplicated, and deleted once finished).
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [resumeIndex, setResumeIndex] = useState(0);
  const [resumeAnswers, setResumeAnswers] = useState<(number | null)[] | undefined>();
  const [activeProgressId, setActiveProgressId] = useState<string | null>(null);

  // On load: fetch the course list (distinct course names in topics) and any saved quizzes.
  useEffect(() => {
    if (!user) return;

    supabase
      .from("topics")
      .select("course_name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map((t) => t.course_name))];
        setCourses(unique);
        setLoadingCourses(false);
      });

    fetchSavedQuizzes();
  }, [user]);

  // Unfinished quizzes, most recently touched first.
  const fetchSavedQuizzes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("quiz_progress")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setSavedQuizzes((data as SavedQuiz[]) || []);
  };

  // "Start Quiz": gather the course's topics, weak areas and the user's learning style,
  // then ask Claude for 10 questions tailored to them.
  const startQuiz = useCallback(async () => {
    if (!selectedCourse || !selectedMode || !user) return;
    setPhase("loading");
    setResumeIndex(0);
    setResumeAnswers(undefined);
    setActiveProgressId(null);

    try {
      const [topicsRes, profileRes] = await Promise.all([
        supabase
          .from("topics")
          .select("topic_name, is_weak_area")
          .eq("user_id", user.id)
          .eq("course_name", selectedCourse),
        supabase
          .from("profiles")
          .select("learning_style")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const topics = (topicsRes.data || []).map((t) => t.topic_name);
      const weakAreas = (topicsRes.data || [])
        .filter((t) => t.is_weak_area)
        .map((t) => t.topic_name);
      const learningStyle = profileRes.data?.learning_style || "standard";

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { courseName: selectedCourse, topics, weakAreas, learningStyle, mode: selectedMode },
      });

      if (error) throw error;
      if (!data?.questions || !Array.isArray(data.questions)) throw new Error("Invalid response from AI");

      // Normalise Claude's output: give each question an id, and fill defaults for
      // any field it left out so the quiz screen never crashes on missing data.
      let qs: QuizQuestion[] = data.questions.map((q: any, i: number) => ({
        id: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        hint: q.hint || "Think carefully about the key concepts.",
        topic: q.topic || selectedCourse,
        difficulty: q.difficulty || "medium",
      }));

      // The prompt already asks for easy -> hard; sorting guarantees it.
      if (selectedMode === "exam-prep") qs = sortByDifficulty(qs);

      setQuestions(qs);
      setPhase("quiz");
    } catch (err: any) {
      console.error("Failed to generate quiz:", err);
      toast.error("Failed to generate quiz. Please try again.");
      setPhase("select-mode");
    }
  }, [selectedCourse, selectedMode, user]);

  // "Save & Exit" mid-quiz: store the questions, answers so far, and position.
  const handleQuizExit = async (currentIndex: number, userAnswers: (number | null)[]) => {
    if (!user || !selectedCourse || !selectedMode) return;

    try {
      // A resumed quiz already has a row, so update it. A new quiz gets a new row.
      if (activeProgressId) {
        await supabase.from("quiz_progress").update({
          current_index: currentIndex,
          user_answers: userAnswers as any,
          updated_at: new Date().toISOString(),
        }).eq("id", activeProgressId);
      } else {
        await supabase.from("quiz_progress").insert({
          user_id: user.id,
          course: selectedCourse,
          mode: selectedMode,
          questions: questions as any,
          user_answers: userAnswers as any,
          current_index: currentIndex,
        });
      }

      toast.success("Quiz progress saved!");
      setActiveProgressId(null);
      await fetchSavedQuizzes();
      setPhase("select-course");
      setSelectedCourse(null);
      setSelectedMode(null);
    } catch {
      toast.error("Failed to save progress.");
    }
  };

  // Load a saved quiz back in and jump straight to the question screen.
  const handleResume = (quiz: SavedQuiz) => {
    setQuestions(quiz.questions as QuizQuestion[]);
    setSelectedCourse(quiz.course);
    setSelectedMode(quiz.mode as QuizMode);
    setResumeIndex(quiz.current_index);
    setResumeAnswers(quiz.user_answers as (number | null)[]);
    setActiveProgressId(quiz.id);
    setPhase("quiz");
  };

  const handleDeleteSaved = async (id: string) => {
    await supabase.from("quiz_progress").delete().eq("id", id);
    toast.success("Saved quiz deleted.");
    await fetchSavedQuizzes();
  };

  // Quiz finished: show results right away, then record the score in quiz_results.
  const handleQuizComplete = async (quizResult: QuizResult) => {
    setResult(quizResult);
    setPhase("results");

    if (user) {
      await supabase.from("quiz_results").insert({
        user_id: user.id,
        course: quizResult.course,
        score: quizResult.score,
        total: quizResult.total,
        mode: quizResult.mode,
        weak_areas: quizResult.weakAreas,
        time_taken_seconds: quizResult.timeTakenSeconds,
      });

      // Clean up saved progress if it was a resumed quiz
      if (activeProgressId) {
        await supabase.from("quiz_progress").delete().eq("id", activeProgressId);
        setActiveProgressId(null);
        await fetchSavedQuizzes();
      }
    }
  };

  // "Retry": same course, pick a mode again (generates fresh questions).
  const handleRetry = () => {
    setPhase("select-mode");
    setSelectedMode(null);
    setResult(null);
    setResumeIndex(0);
    setResumeAnswers(undefined);
    setActiveProgressId(null);
  };

  const handleBackToCourses = () => {
    setPhase("select-course");
    setSelectedCourse(null);
    setSelectedMode(null);
    setResult(null);
  };

  // ── Render the screen for the current phase ──
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
        </div>
        <p className="text-lg font-medium text-foreground">Delilah is preparing your quiz…</p>
        <p className="text-sm text-muted-foreground">Crafting questions tailored to your course</p>
      </div>
    );
  }

  if (phase === "quiz" && questions.length > 0 && selectedMode && selectedCourse) {
    return (
      <QuizInterface
        questions={questions}
        mode={selectedMode}
        course={selectedCourse}
        onComplete={handleQuizComplete}
        onExit={handleQuizExit}
        initialIndex={resumeIndex}
        initialAnswers={resumeAnswers}
      />
    );
  }

  if (phase === "results" && result) {
    return (
      <QuizResults
        result={result}
        questions={questions}
        onRetry={handleRetry}
        onBack={handleBackToCourses}
      />
    );
  }

  // Phases select-course and select-mode share this page frame.
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground">Quiz Me</h1>

      {savedQuizzes.length > 0 && phase === "select-course" && (
        <SavedQuizzes
          quizzes={savedQuizzes}
          onResume={handleResume}
          onDelete={handleDeleteSaved}
        />
      )}

      {phase === "select-course" && (
        <CourseSelector
          courses={courses}
          loading={loadingCourses}
          selected={selectedCourse}
          onSelect={(c) => {
            setSelectedCourse(c);
            setPhase("select-mode");
          }}
        />
      )}

      {phase === "select-mode" && selectedCourse && (
        <ModeSelector
          selected={selectedMode}
          onSelect={setSelectedMode}
          onStart={startQuiz}
          onBack={() => setPhase("select-course")}
          course={selectedCourse}
        />
      )}
    </div>
  );
}
