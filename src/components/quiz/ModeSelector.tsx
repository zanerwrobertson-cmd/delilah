import { Timer, Zap, GraduationCap, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizMode } from "@/lib/quiz-types";

const modes = [
  {
    id: "standard" as QuizMode,
    title: "Standard Mode",
    desc: "Normal paced quiz — no timer, no pressure.",
    icon: Zap,
  },
  {
    id: "time-crunch" as QuizMode,
    title: "Time Crunch Mode",
    desc: "30 seconds per question. Auto-submits when time runs out.",
    icon: Timer,
  },
  {
    id: "exam-prep" as QuizMode,
    title: "Exam Prep Mode",
    desc: "Questions progress from easy → medium → hard.",
    icon: GraduationCap,
  },
];

interface ModeSelectorProps {
  selected: QuizMode | null;
  onSelect: (mode: QuizMode) => void;
  onStart: () => void;
  onBack: () => void;
  course: string;
}

export function ModeSelector({ selected, onSelect, onStart, onBack, course }: ModeSelectorProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Choose your mode for <span className="text-primary">{course}</span>
        </h2>
      </div>

      <div className="grid gap-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex items-start gap-4 rounded-xl border p-5 text-left transition-all",
              selected === m.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <m.icon className={cn("mt-0.5 h-6 w-6 shrink-0", selected === m.id ? "text-primary" : "text-muted-foreground")} />
            <div>
              <span className="font-display font-semibold text-foreground">{m.title}</span>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Button className="w-full" disabled={!selected} onClick={onStart}>
        Start Quiz <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
