import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateQuestions, sortByDifficulty } from "@/lib/quiz-generator";
import type { QuizQuestion, QuizMode, QuizResult } from "@/lib/quiz-types";
import { CourseSelector } from "@/components/quiz/CourseSelector";
import { ModeSelector } from "@/components/quiz/ModeSelector";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { QuizResults } from "@/components/quiz/QuizResults";

type Phase = "select-course" | "select-mode" | "quiz" | "results";

export default function QuizMe() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizMode | null>(null);
  const [phase, setPhase] = useState<Phase>("select-course");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Fetch user courses from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("grades")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const grades = data?.grades as Array<{ course: string; grade: string }> | null;
        if (grades && grades.length > 0) {
          setCourses(grades.map((g) => g.course).filter(Boolean));
        }
        setLoadingCourses(false);
      });
  }, [user]);

  const startQuiz = useCallback(() => {
    if (!selectedCourse || !selectedMode) return;
    let qs = generateQuestions(selectedCourse, 10);
    if (selectedMode === "exam-prep") {
      qs = sortByDifficulty(qs);
    }
    setQuestions(qs);
    setPhase("quiz");
  }, [selectedCourse, selectedMode]);

  const handleQuizComplete = async (quizResult: QuizResult) => {
    setResult(quizResult);
    setPhase("results");

    // Save to Supabase
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
    }
  };

  const handleRetry = () => {
    setPhase("select-mode");
    setSelectedMode(null);
    setResult(null);
  };

  const handleBackToCourses = () => {
    setPhase("select-course");
    setSelectedCourse(null);
    setSelectedMode(null);
    setResult(null);
  };

  if (phase === "quiz" && questions.length > 0 && selectedMode && selectedCourse) {
    return (
      <QuizInterface
        questions={questions}
        mode={selectedMode}
        course={selectedCourse}
        onComplete={handleQuizComplete}
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

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground">Quiz Me</h1>

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
