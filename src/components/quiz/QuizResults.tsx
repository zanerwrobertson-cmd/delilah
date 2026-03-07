import { Button } from "@/components/ui/button";
import { Trophy, XCircle, BookOpen, RotateCcw, ArrowLeft, Clock } from "lucide-react";
import type { QuizQuestion, QuizResult } from "@/lib/quiz-types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuizResultsProps {
  result: QuizResult;
  questions: QuizQuestion[];
  onRetry: () => void;
  onBack: () => void;
}

export function QuizResults({ result, questions, onRetry, onBack }: QuizResultsProps) {
  const navigate = useNavigate();
  const percentage = Math.round((result.score / result.total) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Score */}
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Trophy className={cn(
          "mx-auto mb-4 h-12 w-12",
          percentage >= 80 ? "text-green-400" : percentage >= 50 ? "text-yellow-400" : "text-destructive"
        )} />
        <h1 className="font-display text-4xl font-bold text-foreground">
          {result.score} / {result.total}
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">{percentage}% correct</p>

        {result.timeTakenSeconds != null && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Completed in {Math.floor(result.timeTakenSeconds / 60)}m {result.timeTakenSeconds % 60}s
          </div>
        )}
      </div>

      {/* Weak areas */}
      {result.weakAreas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Weak areas detected
          </h2>
          <div className="flex flex-wrap gap-2">
            {result.weakAreas.map((area) => (
              <span key={area} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {area}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Study these topics to improve your score next time.
          </p>
        </div>
      )}

      {/* Wrong answers */}
      {result.wrongQuestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Questions you missed
          </h2>
          {result.wrongQuestions.map((wq, i) => {
            const originalIndex = questions.findIndex((q) => q.id === wq.id);
            const userAnswer = result.userAnswers[originalIndex];
            return (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{wq.question}</p>
                <p className="text-xs text-destructive">
                  Your answer: {userAnswer !== null ? wq.options[userAnswer] : "No answer"}
                </p>
                <p className="text-xs text-green-400">
                  Correct: {wq.options[wq.correctIndex]}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          <RotateCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
