import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sortByDifficulty } from "@/lib/quiz-generator";
import type { QuizQuestion, QuizMode, QuizResult } from "@/lib/quiz-types";
import { CourseSelector } from "@/components/quiz/CourseSelector";
import { ModeSelector } from "@/components/quiz/ModeSelector";
import { QuizInterface } from "@/components/quiz/QuizInterface";
import { QuizResults } from "@/components/quiz/QuizResults";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Phase = "select-course" | "select-mode" | "loading" | "quiz" | "results";

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

  const startQuiz = useCallback(async () => {
    if (!selectedCourse || !selectedMode || !user) return;
    setPhase("loading");

    try {
      // Fetch course topics, weak areas, and learning style in parallel
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

      console.log("Generating quiz with:", { selectedCourse, topics, weakAreas, learningStyle, mode: selectedMode });

      // Call Claude via edge function
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          courseName: selectedCourse,
          topics,
          weakAreas,
          learningStyle,
          mode: selectedMode,
        },
      });

      if (error) throw error;

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid response from AI");
      }

      // Map Claude's response to QuizQuestion format
      let qs: QuizQuestion[] = data.questions.map((q: any, i: number) => ({
        id: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        hint: q.hint || "Think carefully about the key concepts.",
        topic: q.topic || selectedCourse,
        difficulty: q.difficulty || "medium",
      }));

      if (selectedMode === "exam-prep") {
        qs = sortByDifficulty(qs);
      }

      console.log("Quiz questions generated:", qs.length);
      setQuestions(qs);
      setPhase("quiz");
    } catch (err: any) {
      console.error("Failed to generate quiz:", err);
      toast.error("Failed to generate quiz. Please try again.");
      setPhase("select-mode");
    }
  }, [selectedCourse, selectedMode, user]);

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
