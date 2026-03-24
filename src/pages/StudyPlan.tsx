import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CalendarDays, Lightbulb, BookOpen, SendHorizonal, CheckCircle2, AlertTriangle, Sparkles, Trash2 } from "lucide-react";
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
  weakAreasAddressed?: string[];
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

interface AssignmentRow {
  assignment_name: string;
  course_name: string;
  type: string;
  deadline: string | null;
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function generatePlanWithAI(
  courseName: string,
  topics: TopicRow[],
  assignments: AssignmentRow[],
  weakAreas: TopicRow[],
  learningStyle: string | null,
  daysPerWeek: number
): Promise<WeekCard[]> {
  const days = ALL_DAYS.slice(0, daysPerWeek);
  const courseAssignments = assignments.filter(a => a.course_name === courseName);
  const courseWeakAreas = weakAreas.filter(w => w.course_name === courseName);

  try {
    const { data, error } = await supabase.functions.invoke("generate-study-plan", {
      body: {
        courseName,
        topics,
        assignments: courseAssignments,
        weakAreas: courseWeakAreas,
        learningStyle,
        daysPerWeek,
        studyDays: days,
      },
    });

    if (error) throw error;

    const weeks = data?.weeks;
    if (!weeks || !Array.isArray(weeks)) throw new Error("Invalid response format");

    return weeks.map((w: any, i: number) => ({
      week: w.week_number || i + 1,
      topic: w.focus_topic || `Week ${i + 1}`,
      hasWeakArea: (w.weak_areas_addressed?.length || 0) > 0,
      weakAreasAddressed: w.weak_areas_addressed || [],
      tasks: days.map((day, di) => ({
        day,
        task: w.daily_tasks?.[di] || `Study ${courseName}`,
        isWeakArea: w.weak_task_indices?.includes(di) || false,
      })),
      tips: w.tips || [],
    }));
  } catch (err) {
    console.error("AI plan generation failed, using fallback:", err);
    toast.error("AI generation failed — using a basic plan instead.");

    // Fallback from real topic data
    const topicsByWeek = new Map<number, TopicRow[]>();
    let weekCounter = 1;
    topics.forEach((t) => {
      const wk = t.week_number ?? weekCounter++;
      const list = topicsByWeek.get(wk) || [];
      list.push(t);
      topicsByWeek.set(wk, list);
    });

    return [...topicsByWeek.entries()].sort((a, b) => a[0] - b[0]).map(([wk, tps]) => {
      const hasWeak = tps.some((t) => t.is_weak_area);
      return {
        week: wk,
        topic: tps.map((t) => t.topic_name).join(" & "),
        hasWeakArea: hasWeak,
        tasks: days.map((day, di) => {
          const tp = tps[di % tps.length];
          const taskTypes = [
            `Read and review: ${tp.topic_name}`,
            `Practice problems on ${tp.topic_name}`,
            `Summarize key concepts: ${tp.topic_name}`,
            `Review lecture notes on ${tp.topic_name}`,
            `Create flashcards for ${tp.topic_name}`,
            `Do practice questions: ${tp.topic_name}`,
            `Self-test on ${tp.topic_name}`,
          ];
          return { day, task: taskTypes[di % taskTypes.length], isWeakArea: hasWeak && tp.is_weak_area };
        }),
        tips: [
          `Focus on understanding core concepts of ${tps[0].topic_name}.`,
          hasWeak ? "Spend extra time on weak areas." : "Review notes regularly.",
        ],
      };
    });
  }
}

async function saveToStudySessions(
  userId: string,
  coursePlans: CoursePlan[]
) {
  const rows = coursePlans.flatMap(plan =>
    plan.weeks.map(week => ({
      user_id: userId,
      course_name: plan.courseName,
      topic_name: week.topic,
      weak_areas: week.weakAreasAddressed || [],
    }))
  );

  if (rows.length === 0) return;

  const { error } = await supabase.from("study_sessions").insert(rows);
  if (error) {
    console.error("Failed to save study sessions:", error);
  }
}

// ── UI Components ──

function SetupScreen({ courses, onBuild, onDelete }: { courses: CourseSetup[]; onBuild: (c: CourseSetup[]) => void; onDelete: (courseName: string) => void }) {
  const [configs, setConfigs] = useState<CourseSetup[]>(courses);

  useEffect(() => {
    setConfigs(courses);
  }, [courses]);

  const updateDays = (index: number, days: number) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, daysPerWeek: days } : c));
  };

  const handleDelete = (courseName: string) => {
    setConfigs(prev => prev.filter(c => c.courseName !== courseName));
    onDelete(courseName);
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
              <h2 className="font-display text-lg font-semibold text-foreground flex-1">{course.courseName}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(course.courseName)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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

      <Button size="lg" className="w-full" disabled={configs.length === 0} onClick={() => onBuild(configs)}>
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

// ── Main Component ──

export default function StudyPlan() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"setup" | "loading" | "plan">("setup");
  const [courses, setCourses] = useState<CourseSetup[]>([]);
  const [allTopics, setAllTopics] = useState<TopicRow[]>([]);
  const [allAssignments, setAllAssignments] = useState<AssignmentRow[]>([]);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [coursePlans, setCoursePlans] = useState<CoursePlan[]>([]);
  const [struggle, setStruggle] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const [topicsRes, assignmentsRes, profileRes] = await Promise.all([
        supabase.from("topics").select("course_name, topic_name, week_number, is_weak_area").eq("user_id", user.id),
        supabase.from("assignments").select("assignment_name, course_name, type, deadline").eq("user_id", user.id),
        supabase.from("profiles").select("learning_style").eq("user_id", user.id).single(),
      ]);

      const topics = (topicsRes.data || []) as TopicRow[];
      setAllTopics(topics);
      setAllAssignments((assignmentsRes.data || []) as AssignmentRow[]);
      setLearningStyle(profileRes.data?.learning_style || null);

      const unique = [...new Set(topics.map(t => t.course_name))];
      setCourses(unique.map(name => ({ courseName: name, daysPerWeek: 5 })));
      setLoadingCourses(false);
    };

    fetchAll();
  }, [user]);

  const handleBuild = async (configs: CourseSetup[]) => {
    if (!user) return;
    setPhase("loading");

    try {
      const weakAreas = allTopics.filter(t => t.is_weak_area);

      const plans = await Promise.all(
        configs.map(async (c) => {
          const courseTopics = allTopics.filter(t => t.course_name === c.courseName);
          const weeks = await generatePlanWithAI(
            c.courseName, courseTopics, allAssignments, weakAreas, learningStyle, c.daysPerWeek
          );
          return { courseName: c.courseName, weeks };
        })
      );

      setCoursePlans(plans);

      // Save to study_sessions
      await saveToStudySessions(user.id, plans);

      setPhase("plan");
    } catch (err) {
      console.error("Failed to build plans:", err);
      toast.error("Failed to generate study plan. Please try again.");
      setPhase("setup");
    }
  };

  const handleSubmitStruggle = async () => {
    if (!struggle.trim() || !user) return;
    setPhase("loading");

    try {
      // Determine which course tab is active; default to first
      const targetCourse = coursePlans[0]?.courseName;
      if (!targetCourse) { setPhase("plan"); return; }

      // Save struggle as a new weak-area topic
      const { error: insertErr } = await supabase.from("topics").insert({
        user_id: user.id,
        course_name: targetCourse,
        topic_name: struggle.trim(),
        is_weak_area: true,
      });
      if (insertErr) console.error("Failed to save struggle topic:", insertErr);

      // Re-fetch topics so the new weak area is included
      const { data: freshTopics } = await supabase
        .from("topics")
        .select("course_name, topic_name, week_number, is_weak_area")
        .eq("user_id", user.id);
      const topics = (freshTopics || []) as TopicRow[];
      setAllTopics(topics);

      // Regenerate plans for all courses
      const weakAreas = topics.filter(t => t.is_weak_area);
      const plans = await Promise.all(
        coursePlans.map(async (cp) => {
          const courseTopics = topics.filter(t => t.course_name === cp.courseName);
          const config = courses.find(c => c.courseName === cp.courseName);
          const weeks = await generatePlanWithAI(
            cp.courseName, courseTopics, allAssignments, weakAreas, learningStyle, config?.daysPerWeek ?? 5
          );
          return { courseName: cp.courseName, weeks };
        })
      );

      setCoursePlans(plans);
      await saveToStudySessions(user.id, plans);
      toast.success("Delilah updated your plan with the new focus area!");
      setStruggle("");
      setPhase("plan");
    } catch (err) {
      console.error("Failed to update plan:", err);
      toast.error("Failed to update your plan. Please try again.");
      setPhase("plan");
    }
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
        <p className="font-display text-lg font-medium text-foreground">
          {coursePlans.length > 0 ? "Delilah is updating your plan..." : "Delilah is building your study plan..."}
        </p>
        <p className="text-sm text-muted-foreground">Analyzing your topics, assignments, and weak areas</p>
      </div>
    );
  }

  if (phase === "setup") {
    return <SetupScreen courses={courses} onBuild={handleBuild} />;
  }

  return <PlanView coursePlans={coursePlans} struggle={struggle} setStruggle={setStruggle} onSubmitStruggle={handleSubmitStruggle} />;
}
