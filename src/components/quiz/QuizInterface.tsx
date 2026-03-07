import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, ArrowRight, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizMode, QuizResult } from "@/lib/quiz-types";

interface QuizInterfaceProps {
  questions: QuizQuestion[];
  mode: QuizMode;
  course: string;
  onComplete: (result: QuizResult) => void;
}

const SECONDS_PER_QUESTION = 30;

export function QuizInterface({ questions, mode, course, onComplete }: QuizInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);

  // Timer state for time-crunch
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const finishQuiz = useCallback(() => {
    const finalAnswers = [...userAnswers];
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

    const wrongQuestions: QuizQuestion[] = [];
    let score = 0;
    finalAnswers.forEach((ans, i) => {
      if (ans === questions[i].correctIndex) {
        score++;
      } else {
        wrongQuestions.push(questions[i]);
      }
    });

    const weakTopics = [...new Set(wrongQuestions.map((wq) => wq.topic))];

    onComplete({
      score,
      total: questions.length,
      timeTakenSeconds: mode === "time-crunch" ? elapsed : null,
      wrongQuestions,
      userAnswers: finalAnswers,
      weakAreas: weakTopics,
      mode,
      course,
    });
  }, [userAnswers, questions, mode, course, onComplete]);

  // Timer for time-crunch mode
  useEffect(() => {
    if (mode !== "time-crunch") return;
    setTimeLeft(SECONDS_PER_QUESTION);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit current answer and move on
          handleNext(true);
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, mode]);

  const handleSelectAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    const updated = [...userAnswers];
    updated[currentIndex] = index;
    setUserAnswers(updated);
  };

  const handleNext = useCallback((autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (autoSubmit && !answered) {
      // Mark as unanswered
      const updated = [...userAnswers];
      updated[currentIndex] = null;
      setUserAnswers(updated);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setAnswered(false);
    } else {
      // Use timeout to let state update
      setTimeout(() => finishQuiz(), 0);
    }
  }, [currentIndex, questions.length, answered, userAnswers, finishQuiz]);

  const isCorrect = selectedAnswer === q.correctIndex;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {mode === "exam-prep" && (
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            q.difficulty === "easy" && "bg-green-500/15 text-green-400",
            q.difficulty === "medium" && "bg-yellow-500/15 text-yellow-400",
            q.difficulty === "hard" && "bg-red-500/15 text-red-400",
          )}>
            {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
          </span>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      {/* Timer */}
      {mode === "time-crunch" && (
        <div className={cn(
          "flex items-center justify-center gap-2 rounded-lg border p-3 font-display text-xl font-bold transition-colors",
          timeLeft <= 10 ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border bg-card text-foreground"
        )}>
          <Timer className="h-5 w-5" />
          {timeLeft}s
        </div>
      )}

      {/* Question */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold text-foreground">{q.question}</h2>

        <div className="mt-6 grid gap-3">
          {q.options.map((opt, i) => {
            let optionStyle = "border-border bg-background hover:border-primary/50";
            if (answered) {
              if (i === q.correctIndex) {
                optionStyle = "border-green-500 bg-green-500/10";
              } else if (i === selectedAnswer && !isCorrect) {
                optionStyle = "border-destructive bg-destructive/10";
              } else {
                optionStyle = "border-border bg-background opacity-50";
              }
            } else if (i === selectedAnswer) {
              optionStyle = "border-primary bg-primary/10";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelectAnswer(i)}
                disabled={answered}
                className={cn(
                  "rounded-lg border p-4 text-left text-sm font-medium transition-all",
                  optionStyle,
                  !answered && "cursor-pointer"
                )}
              >
                <span className="mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                <span className="text-foreground">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {!showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Lightbulb className="h-4 w-4" /> Show hint
          </button>
        )}
        {showHint && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <Lightbulb className="mr-1.5 inline h-4 w-4 text-primary" />
            {q.hint}
          </div>
        )}
      </div>

      {/* Next / Finish */}
      {answered && (
        <Button className="w-full" onClick={() => handleNext()}>
          {isLastQuestion ? "See Results" : "Next Question"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
