import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CalendarDays, Lightbulb, BookOpen, SendHorizonal, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

interface CoursePlan {
  courseName: string;
  weeks: WeekCard[];
}

interface TopicRow {
  topic_name: string;
  week_number: number | null;
  is_weak_area: boolean;
  course_name: string;
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function generatePlanWithAI(
  courseName: string,
  topics: TopicRow[],
  daysPerWeek: number
): Promise<WeekCard[]> {
  const days = ALL_DAYS.slice(0, daysPerWeek);

  // Group topics by week
  const topicsByWeek = new Map<number, TopicRow[]>();
  const unassigned: TopicRow[] = [];

  topics.forEach((t) => {
    if (t.week_number != null) {
      const list = topicsByWeek.get(t.week_number) || [];
      list.push(t);
      topicsByWeek.set(t.week_number, list);
    } else {
      unassigned.push(t);
    }
  });

  // If no week numbers, chunk topics evenly
  if (topicsByWeek.size === 0 && unassigned.length > 0) {
    const chunkSize = Math.max(1, Math.ceil(unassigned.length / Math.max(unassigned.length, 4)));
    let weekNum = 1;
    for (let i = 0; i < unassigned.length; i += chunkSize) {
      topicsByWeek.set(weekNum, unassigned.slice(i, i + chunkSize));
      weekNum++;
    }
  } else if (unassigned.length > 0) {
    // Add unassigned to last week
    const maxWeek = Math.max(...topicsByWeek.keys());
    const list = topicsByWeek.get(maxWeek) || [];
    list.push(...unassigned);
    topicsByWeek.set(maxWeek, list);
  }

  const sortedWeeks = [...topicsByWeek.entries()].sort((a, b) => a[0] - b[0]);

  const topicSummary = sortedWeeks.map(([wk, tps]) => {
    const topicNames = tps.map((t) => `${t.topic_name}${t.is_weak_area ? " [WEAK AREA]" : ""}`).join(", ");
    return `Week ${wk}: ${topicNames}`;
  }).join("\n");

  const prompt = `You are a study plan assistant. Given the following course topics organized by week, generate a detailed study plan.

Course: ${courseName}
Study days per week: ${daysPerWeek} (${days.join(", ")})

Topics by week:
${topicSummary}

For EACH week, generate:
1. A focus topic title (combine the week's topics into a clear title)
2. Exactly ${daysPerWeek} daily tasks, one for each day (${days.join(", ")}). Tasks should be specific, actionable study activities related to that week's topics.
3. If any topic is marked [WEAK AREA], make the tasks for that week more intensive with extra review/practice, and mark which day indices (0-based) are weak area tasks.
4. 2 specific study tips relevant to the week's topics.

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
[
  {
    "week": 1,
    "topic": "Topic Title",
    "hasWeakArea": false,
    "weakTaskIndices": [],
    "tasks": ["task for day 1", "task for day 2", ...],
    "tips": ["tip 1", "tip 2"]
  }
]`;

  try {
    const { data, error } = await supabase.functions.invoke("claude-proxy", {
      body: { prompt },
    });

    if (error) throw error;

    const text = data?.text || "";
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((w: any, i: number) => ({
      week: w.week || i + 1,
      topic: w.topic || `Week ${i + 1}`,
      hasWeakArea: w.hasWeakArea || false,
      tasks: days.map((day, di) => ({
        day,
        task: w.tasks?.[di] || `Study ${courseName}`,
        isWeakArea: w.weakTaskIndices?.includes(di) || false,
      })),
      tips: w.tips || [],
    }));
  } catch (err) {
    console.error("AI plan generation failed, using fallback:", err);
    // Fallback: generate basic plan from real topic data
    return sortedWeeks.map(([wk, tps], i) => {
      const hasWeak = tps.some((t) => t.is_weak_area);
      const topicTitle = tps.map((t) => t.topic_name).join(" & ");
      return {
        week: wk,
        topic: topicTitle,
        hasWeakArea: hasWeak,
        tasks: days.map((day, di) => {
          const taskTypes = [
            `Read and review: ${tps[di % tps.length].topic_name}`,
            `Practice problems on ${tps[di % tps.length].topic_name}`,
            `Summarize key concepts: ${tps[di % tps.length].topic_name}`,
            `Review lecture notes on ${tps[di % tps.length].topic_name}`,
            `Create flashcards for ${tps[di % tps.length].topic_name}`,
            `Do practice questions: ${tps[di % tps.length].topic_name}`,
            `Self-test on ${tps[di % tps.length].topic_name}`,
          ];
          return {
            day,
            task: taskTypes[di % taskTypes.length],
            isWeakArea: hasWeak && tps[di % tps.length].is_weak_area,
          };
        }),
        tips: [
          `Focus on understanding core concepts of ${tps[0].topic_name}.`,
          hasWeak ? "Spend extra time on weak areas — try teaching the material to someone else." : "Review your notes regularly to reinforce retention.",
        ],
      };
    });
  }
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

function CoursePlanView({ plan }: { plan: CoursePlan }) {
  return (
    <div className="space-y-6">
      {plan.weeks.map((week) => (
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
  );
}

function PlanView({ coursePlans, struggle, setStruggle, onSubmitStruggle }: {
  coursePlans: CoursePlan[]; struggle: string; setStruggle: (s: string) => void; onSubmitStruggle: () => void;
}) {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
        <p className="mt-1 text-muted-foreground">Your personalized weekly breakdown from Delilah.</p>
      </div>

      {coursePlans.length === 1 ? (
        <CoursePlanView plan={coursePlans[0]} />
      ) : (
        <Tabs defaultValue={coursePlans[0]?.courseName} className="w-full">
          <TabsList className="w-full flex">
            {coursePlans.map((cp) => (
              <TabsTrigger key={cp.courseName} value={cp.courseName} className="flex-1 truncate">
                {cp.courseName}
              </TabsTrigger>
            ))}
          </TabsList>
          {coursePlans.map((cp) => (
            <TabsContent key={cp.courseName} value={cp.courseName}>
              <CoursePlanView plan={cp} />
            </TabsContent>
          ))}
        </Tabs>
      )}

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
  const [allTopics, setAllTopics] = useState<TopicRow[]>([]);
  const [coursePlans, setCoursePlans] = useState<CoursePlan[]>([]);
  const [struggle, setStruggle] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("topics")
        .select("course_name, topic_name, week_number, is_weak_area")
        .eq("user_id", user.id);

      const topics = (data || []) as TopicRow[];
      setAllTopics(topics);

      const unique = [...new Set(topics.map(t => t.course_name))];
      setCourses(unique.map(name => ({ courseName: name, daysPerWeek: 5 })));
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [user]);

  const handleBuild = async (configs: CourseSetup[]) => {
    setPhase("loading");
    try {
      const plans = await Promise.all(
        configs.map(async (c) => {
          const courseTopics = allTopics.filter(t => t.course_name === c.courseName);
          const weeks = await generatePlanWithAI(c.courseName, courseTopics, c.daysPerWeek);
          return { courseName: c.courseName, weeks };
        })
      );
      setCoursePlans(plans);
      setPhase("plan");
    } catch (err) {
      console.error("Failed to build plans:", err);
      toast.error("Failed to generate study plan. Please try again.");
      setPhase("setup");
    }
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

  return <PlanView coursePlans={coursePlans} struggle={struggle} setStruggle={setStruggle} onSubmitStruggle={handleSubmitStruggle} />;
}
