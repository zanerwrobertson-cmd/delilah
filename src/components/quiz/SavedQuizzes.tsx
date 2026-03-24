import { Button } from "@/components/ui/button";
import { PlayCircle, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SavedQuiz {
  id: string;
  course: string;
  mode: string;
  current_index: number;
  questions: any[];
  user_answers: any[];
  updated_at: string;
}

interface SavedQuizzesProps {
  quizzes: SavedQuiz[];
  onResume: (quiz: SavedQuiz) => void;
  onDelete: (id: string) => void;
}

export function SavedQuizzes({ quizzes, onResume, onDelete }: SavedQuizzesProps) {
  if (quizzes.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground">Saved Quizzes</h2>
      <div className="grid gap-3">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div className="space-y-1">
              <p className="font-medium text-foreground">{quiz.course}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="capitalize">{quiz.mode.replace("-", " ")}</span>
                <span>•</span>
                <span>{quiz.current_index + 1}/{quiz.questions.length} answered</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(quiz.updated_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(quiz.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => onResume(quiz)}>
                <PlayCircle className="h-4 w-4 mr-1.5" /> Resume
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
