import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarDays, Lightbulb, BookOpen, SendHorizonal, CheckCircle2 } from "lucide-react";

interface DailyTask {
  day: string;
  task: string;
  done?: boolean;
}

interface WeekCard {
  week: number;
  topic: string;
  tasks: DailyTask[];
  tips: string[];
}

const mockWeeks: WeekCard[] = [
  {
    week: 1,
    topic: "A Real Intertemporal Model with Investment (Ch. 11)",
    tasks: [
      { day: "Mon", task: "Read Chapter 11, sections 11.1–11.3" },
      { day: "Tue", task: "Solve end-of-chapter problems 1–5" },
      { day: "Wed", task: "Review lecture notes on investment decisions" },
      { day: "Thu", task: "Attend lecture & take active notes" },
      { day: "Fri", task: "Summarize key equations and graphs" },
    ],
    tips: [
      "Focus on the firm's investment decision and Tobin's q.",
      "Draw the competitive equilibrium diagram from memory.",
    ],
  },
  {
    week: 2,
    topic: "Monetary Intertemporal Model (Ch. 12)",
    tasks: [
      { day: "Mon", task: "Read Chapter 12, sections 12.1–12.4" },
      { day: "Tue", task: "Compare real vs monetary models side by side" },
      { day: "Wed", task: "Practice problem set on money neutrality" },
      { day: "Thu", task: "Attend lecture & review banking model" },
      { day: "Fri", task: "Create flashcards for monetary policy tools" },
    ],
    tips: [
      "Understand the difference between money neutrality and superneutrality.",
      "Practice shifting curves when monetary policy changes.",
    ],
  },
  {
    week: 3,
    topic: "Business Cycles (Ch. 13)",
    tasks: [
      { day: "Mon", task: "Read Chapter 13, focus on RBC theory" },
      { day: "Tue", task: "List key business cycle facts from the data" },
      { day: "Wed", task: "Work through RBC model problem set" },
      { day: "Thu", task: "Attend lecture on Keynesian vs RBC" },
      { day: "Fri", task: "Quiz yourself on business cycle definitions" },
    ],
    tips: [
      "Know the key comovements: output, consumption, investment, employment.",
      "Be ready to compare RBC and Keynesian explanations on an exam.",
    ],
  },
  {
    week: 4,
    topic: "Inflation: Phillips Curves & Neo-Fisherism (Ch. 14)",
    tasks: [
      { day: "Mon", task: "Read Chapter 14 on Phillips Curve history" },
      { day: "Tue", task: "Solve problems on expectations-augmented Phillips Curve" },
      { day: "Wed", task: "Review Neo-Fisherian arguments" },
      { day: "Thu", task: "Attend lecture & compare inflation models" },
      { day: "Fri", task: "Start midterm 1 review — Chapters 11–14" },
    ],
    tips: [
      "Understand why the original Phillips Curve broke down in the 1970s.",
      "Neo-Fisherism is a likely exam question — know the core argument.",
    ],
  },
];

export default function StudyPlan() {
  const [loading, setLoading] = useState(false);
  const [struggle, setStruggle] = useState("");
  const [weeks] = useState<WeekCard[]>(mockWeeks);

  const handleSubmitStruggle = () => {
    if (!struggle.trim()) return;
    setLoading(true);
    // Simulate AI processing
    setTimeout(() => {
      setLoading(false);
      setStruggle("");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
        </div>
        <p className="font-display text-lg font-medium text-foreground">
          Delilah is building your study plan...
        </p>
        <p className="text-sm text-muted-foreground">
          Analyzing your topics and creating a personalized schedule
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
        <p className="mt-1 text-muted-foreground">
          Your personalized weekly breakdown from Delilah.
        </p>
      </div>

      {/* Weekly Cards */}
      <div className="space-y-6">
        {weeks.map((week) => (
          <Card key={week.week} className="overflow-hidden border-border bg-card">
            {/* Week Header */}
            <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                {week.week}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground truncate">
                  Week {week.week}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{week.topic}</p>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary shrink-0">
                <CalendarDays className="mr-1 h-3 w-3" />
                5 tasks
              </Badge>
            </div>

            <div className="p-6 space-y-5">
              {/* Daily Tasks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Daily Tasks
                </div>
                <div className="space-y-1.5">
                  {week.tasks.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                    >
                      <span className="mt-0.5 w-9 shrink-0 rounded bg-secondary px-1.5 py-0.5 text-center text-xs font-medium text-muted-foreground">
                        {task.day}
                      </span>
                      <span className="text-foreground/90">{task.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Tips from Delilah
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                  {week.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      • {tip}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Struggle Input */}
      <Card className="border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-foreground">
            Need extra help?
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tell Delilah what you're struggling with and she'll adjust your plan.
        </p>
        <div className="flex gap-3">
          <Input
            placeholder="Tell Delilah what you're struggling with..."
            value={struggle}
            onChange={(e) => setStruggle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitStruggle()}
            className="flex-1"
          />
          <Button onClick={handleSubmitStruggle} disabled={!struggle.trim()}>
            <SendHorizonal className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      </Card>
    </div>
  );
}
