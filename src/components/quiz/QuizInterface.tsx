import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, ArrowRight, Timer, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizMode, QuizResult } from "@/lib/quiz-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Quiz step 3: the question screen.
 *
 * Shows one question at a time. Picking an answer locks it in and shows right/wrong
 * colours; then "Next" moves on. After the last question, it scores the quiz and
 * hands a QuizResult to the parent through onComplete.
 *
 * time-crunch mode adds a 30-second countdown that auto-advances when it hits zero.
 * initialIndex/initialAnswers let a saved quiz resume where it left off.
 */
interface QuizInterfaceProps {
  questions: QuizQuestion[];
  mode: QuizMode;
  course: string;
  onComplete: (result: QuizResult) => void;
  onExit: (currentIndex: number, userAnswers: (number | null)[]) => void;
  initialIndex?: number;
  initialAnswers?: (number | null)[];
}

const SECONDS_PER_QUESTION = 30;

export function QuizInterface({ questions, mode, course, onComplete, onExit, initialIndex = 0, initialAnswers }: QuizInterfaceProps) {
  // Position in the quiz, the current pick, and every answer so far (null = no answer).
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(initialAnswers?.[initialIndex] ?? null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(initialAnswers || new Array(questions.length).fill(null));
  const [showHint, setShowHint] = useState(false);
  // True once the current question has an answer; locks the options and shows the Next button.
  const [answered, setAnswered] = useState(initialAnswers?.[initialIndex] != null);

  // Timer state for time-crunch. Refs (not state) hold values that change
  // without needing a re-render: the start time and the interval's id.
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Score the quiz: count correct answers, collect the wrong ones, and list the
  // topics of wrong answers as weak areas. Time taken is only reported in time-crunch.
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

  // Timer for time-crunch mode: restarts at 30s on every new question and ticks
  // once a second. At zero, it auto-advances.
  // Known issue: the timer keeps running after an answer is picked, and handleNext here
  // is the copy from when the question loaded. If time runs out after answering, that
  // stale copy records the answer as null, so it counts as wrong. Fix: stop the timer
  // in handleSelectAnswer.
  useEffect(() => {
    if (mode !== "time-crunch") return;
    setTimeLeft(SECONDS_PER_QUESTION);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleNext(true);
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, mode]);

  // Lock in an answer. One try per question: later clicks are ignored.
  const handleSelectAnswer = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    const updated = [...userAnswers];
    updated[currentIndex] = index;
    setUserAnswers(updated);
  };

  // Go to the next question, or finish after the last one.
  // autoSubmit = true when the timer ran out (records "no answer").
  const handleNext = useCallback((autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (autoSubmit && !answered) {
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
      // Defer one tick so the last setUserAnswers lands before scoring.
      setTimeout(() => finishQuiz(), 0);
    }
  }, [currentIndex, questions.length, answered, userAnswers, finishQuiz]);

  const isCorrect = selectedAnswer === q.correctIndex;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header: question counter, difficulty badge (exam-prep only), Exit button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-3">
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
          {/* Exit asks for confirmation, then saves progress via onExit */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4 mr-1.5" /> Exit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit Quiz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress will be saved. You can resume this quiz later or delete it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Going</AlertDialogCancel>
                <AlertDialogAction onClick={() => onExit(currentIndex, userAnswers)}>
                  Save & Exit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Timer (time-crunch only); turns red in the last 10 seconds */}
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
            // Colour each option. After answering: correct = green, your wrong pick = red,
            // the rest fade out.
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
                {/* 65 is the character code for "A", so options are labelled A, B, C, D */}
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

      {/* Next / Finish: only appears after the question is answered */}
      {answered && (
        <Button className="w-full" onClick={() => handleNext()}>
          {isLastQuestion ? "See Results" : "Next Question"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
