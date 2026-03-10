import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, CalendarDays, Lightbulb, BookOpen, SendHorizonal, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyTask {
  day: string;
  task: string;
  isWeakArea?: boolean;
}

interface WeekCard {
  week: number;
  topic: string;
  tasks: DailyTask[];
  tips: string[];
  hasWeakArea?: boolean;
}

interface CourseSetup {
  courseName: string;
  daysPerWeek: number;
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekTemplates = [
  {
    topic: "A Real Intertemporal Model with Investment (Ch. 11)",
    allTasks: [
      "Read Chapter 11, sections 11.1–11.3",
      "Solve end-of-chapter problems 1–5",
      "Review lecture notes on investment decisions",
      "Attend lecture & take active notes",
      "Summarize key equations and graphs",
      "Re-derive key proofs from scratch",
      "Do practice exam questions on Ch. 11",
    ],
    tips: ["Focus on the firm's investment decision and Tobin's q.", "Draw the competitive equilibrium diagram from memory."],
  },
  {
    topic: "Monetary Intertemporal Model (Ch. 12)", hasWeakArea: true,
    allTasks: [
      "Read Chapter 12, sections 12.1–12.4",
      "Compare real vs monetary models side by side",
      "Practice problem set on money neutrality",
      "Attend lecture & review banking model",
      "Create flashcards for monetary policy tools",
      "Review money demand derivations",
      "Summarize chapter in your own words",
    ],
    weakTaskIndices: [1, 2],
    tips: ["Understand the difference between money neutrality and superneutrality.", "Practice shifting curves when monetary policy changes."],
  },
  {
    topic: "Business Cycles (Ch. 13)",
    allTasks: [
      "Read Chapter 13, focus on RBC theory",
      "List key business cycle facts from the data",
      "Work through RBC model problem set",
      "Attend lecture on Keynesian vs RBC",
      "Quiz yourself on business cycle definitions",
      "Compare impulse response functions",
      "Write summary notes on Solow residuals",
    ],
    tips: ["Know the key comovements: output, consumption, investment, employment.", "Be ready to compare RBC and Keynesian explanations on an exam."],
  },
  {
    topic: "Inflation: Phillips Curves & Neo-Fisherism (Ch. 14)", hasWeakArea: true,
    allTasks: [
      "Read Chapter 14 on Phillips Curve history",
      "Solve problems on expectations-augmented Phillips Curve",
      "Review Neo-Fisherian arguments",
      "Attend lecture & compare inflation models",
      "Start midterm 1 review — Chapters 11–14",
      "Graph Phillips Curve shifts from memory",
      "Do timed practice problems on inflation",
    ],
    weakTaskIndices: [1],
    tips: ["Understand why the original Phillips Curve broke down in the 1970s.", "Neo-Fisherism is a likely exam question — know the core argument."],
  },
];

function generateWeeks(daysPerWeek: number): WeekCard[] {
  const days = ALL_DAYS.slice(0, daysPerWeek);
  return weekTemplates.map((tmpl, i) => ({
    week: i + 1,
    topic: tmpl.topic,
    hasWeakArea: tmpl.hasWeakArea,
    tasks: days.map((day, di) => ({
      day,
      task: tmpl.allTasks[di % tmpl.allTasks.length],
      isWeakArea: tmpl.weakTaskIndices?.includes(di),
    })),
    tips: tmpl.tips,
  }));
}

function SetupScreen({ courses, onBuild }: { courses: CourseSetup[]; onBuild: (c: CourseSetup[]) => void }) {
  const [configs, setConfigs] = useState<CourseSetup[]>(courses);

  const updateDays = (index: number, days: number) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, daysPerWeek: days } : c));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Study Plan Setup</h1>
        <p className="mt-1 text-muted-foreground">Configure how many days per week you want to study each course.</p>
      </div>

      <div className="space-y-4">
        {configs.map((course, i) => (
          <Card key={course.courseName} className="border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">{course.courseName}</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Days per week</span>
                <Badge variant="outline" className="border-primary/30 text-primary font-bold text-sm px-3">
                  {course.daysPerWeek} {course.daysPerWeek === 1 ? "day" : "days"}
                </Badge>
              </div>
              <Slider
                value={[course.daysPerWeek]}
                onValueChange={([v]) => updateDays(i, v)}
                min={1} max={7} step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground/60">
                <span>1</span><span>7</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {configs.length === 0 && (
        <Card className="border-border bg-card p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No courses found. Upload a syllabus first to get started.</p>
        </Card>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={configs.length === 0}
        onClick={() => onBuild(configs)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Build My Study Plan
      </Button>
    </div>
  );
}

function PlanView({ weeks, struggle, setStruggle, onSubmitStruggle }: {
  weeks: WeekCard[]; struggle: string; setStruggle: (s: string) => void; onSubmitStruggle: () => void;
}) {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
        <p className="mt-1 text-muted-foreground">Your personalized weekly breakdown from Delilah.</p>
      </div>

      <div className="space-y-6">
        {weeks.map((week) => (
          <Card key={week.week} className="overflow-hidden border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                {week.week}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground truncate">Week {week.week}</h2>
                <p className="text-sm text-muted-foreground truncate">{week.topic}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {week.hasWeakArea && (
                  <Badge variant="outline" className="border-destructive/30 text-destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Weak Area
                  </Badge>
                )}
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <CalendarDays className="mr-1 h-3 w-3" /> {week.tasks.length} tasks
                </Badge>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Daily Tasks
                </div>
                <div className="space-y-1.5">
                  {week.tasks.map((task, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${task.isWeakArea ? "bg-destructive/10 border border-destructive/20" : "hover:bg-secondary/40"}`}>
                      <span className={`mt-0.5 w-9 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-medium ${task.isWeakArea ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                        {task.day}
                      </span>
                      <span className="text-foreground/90">{task.task}</span>
                      {task.isWeakArea && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb className="h-4 w-4 text-yellow-500" /> Tips from Delilah
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                  {week.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">• {tip}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-foreground">Need extra help?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Tell Delilah what you're struggling with and she'll adjust your plan.</p>
        <div className="flex gap-3">
          <Input
            placeholder="Tell Delilah what you're struggling with..."
            value={struggle}
            onChange={(e) => setStruggle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitStruggle()}
            className="flex-1"
          />
          <Button onClick={onSubmitStruggle} disabled={!struggle.trim()}>
            <SendHorizonal className="h-4 w-4 mr-2" /> Submit
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function StudyPlan() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"setup" | "loading" | "plan">("setup");
  const [courses, setCourses] = useState<CourseSetup[]>([]);
  const [weeks, setWeeks] = useState<WeekCard[]>([]);
  const [struggle, setStruggle] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("topics")
        .select("course_name")
        .eq("user_id", user.id);
      const unique = [...new Set(data?.map(t => t.course_name) || [])];
      setCourses(unique.map(name => ({ courseName: name, daysPerWeek: 5 })));
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [user]);

  const handleBuild = (_configs: CourseSetup[]) => {
    setPhase("loading");
    setTimeout(() => setPhase("plan"), 2500);
  };

  const handleSubmitStruggle = () => {
    if (!struggle.trim()) return;
    setPhase("loading");
    setTimeout(() => { setPhase("plan"); setStruggle(""); }, 2000);
  };

  if (loadingCourses) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
        </div>
        <p className="font-display text-lg font-medium text-foreground">Delilah is building your study plan...</p>
        <p className="text-sm text-muted-foreground">Analyzing your topics and creating a personalized schedule</p>
      </div>
    );
  }

  if (phase === "setup") {
    return <SetupScreen courses={courses} onBuild={handleBuild} />;
  }

  return <PlanView weeks={weeks} struggle={struggle} setStruggle={setStruggle} onSubmitStruggle={handleSubmitStruggle} />;
}
