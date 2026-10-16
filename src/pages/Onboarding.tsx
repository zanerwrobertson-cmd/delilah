import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Eye, Ear, BookMarked, MousePointerClick, Plus, Trash2, ArrowRight, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Onboarding (/onboarding): a 3-step wizard shown once after sign-up.
 *   Step 1: pick a learning style
 *   Step 2: subjects the student struggles with
 *   Step 3: current grades (optional, can be skipped)
 * Answers are saved to the user's profiles row, along with onboarding_completed = true,
 * which stops ProtectedRoute from sending them here again. The AI features read
 * these answers later to personalise quizzes and study plans.
 */

// The four learning-style cards in step 1. `id` is what gets saved to the database.
const learningStyles = [
  { id: "visual", label: "Visual", desc: "Diagrams, charts, videos", icon: Eye },
  { id: "auditory", label: "Auditory", desc: "Lectures, discussions, podcasts", icon: Ear },
  { id: "reading", label: "Reading", desc: "Textbooks, notes, articles", icon: BookMarked },
  { id: "interactive", label: "Interactive", desc: "Practice, experiments, projects", icon: MousePointerClick },
];

// One row of the grades table in step 3.
interface GradeRow {
  course: string;
  grade: string;
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Which wizard step is showing (1-3).
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  // Step 2
  const [subjects, setSubjects] = useState("");
  // Step 3
  const [grades, setGrades] = useState<GradeRow[]>([{ course: "", grade: "" }]);

  // Helpers for adding, removing and editing rows in the grades table.
  const addGradeRow = () => setGrades([...grades, { course: "", grade: "" }]);
  const removeGradeRow = (i: number) => setGrades(grades.filter((_, idx) => idx !== i));
  const updateGrade = (i: number, field: keyof GradeRow, value: string) => {
    const updated = [...grades];
    updated[i][field] = value;
    setGrades(updated);
  };

  // Save all answers to the profile. Called by "Finish" (skipGrades=false)
  // or "Skip this step" (skipGrades=true, which saves an empty grades list).
  const handleComplete = async (skipGrades = false) => {
    if (!user) return;
    setSaving(true);

    // Drop half-filled rows; only keep rows with both a course and a grade.
    const validGrades = skipGrades
      ? []
      : grades
          .filter((g) => g.course.trim() && g.grade.trim())
          .map((g) => ({ course: g.course, grade: g.grade } as Record<string, string>));

    // Update (not insert): the profile row already exists, created by the
    // handle_new_user trigger at sign-up. RLS only allows updating your own row.
    const { error } = await supabase
      .from("profiles")
      .update({
        learning_style: learningStyle,
        struggle_subjects: subjects.trim(),
        grades: validGrades as unknown as import("@/integrations/supabase/types").Json,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save. Please try again.");
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress bar: one pill per step, filled up to the current step */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all",
                s <= step ? "w-12 bg-primary" : "w-8 bg-secondary"
              )}
            />
          ))}
        </div>

        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>

        {/* Step 1: learning style. Continue stays disabled until one is picked. */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-center font-display text-2xl font-bold text-foreground">
              What's your learning style?
            </h1>
            <div className="grid grid-cols-2 gap-4">
              {learningStyles.map((ls) => (
                <button
                  key={ls.id}
                  onClick={() => setLearningStyle(ls.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-all",
                    learningStyle === ls.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <ls.icon className={cn("h-8 w-8", learningStyle === ls.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-display font-semibold text-foreground">{ls.label}</span>
                  <span className="text-xs">{ls.desc}</span>
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!learningStyle}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: struggle subjects, free text (may be left blank) */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-center font-display text-2xl font-bold text-foreground">
              Which subjects do you struggle with?
            </h1>
            <Input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="e.g. Calculus, Essay Writing, Chemistry..."
              maxLength={500}
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: grades table (optional). The delete button hides when only one row is left. */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-center font-display text-2xl font-bold text-foreground">
              Import your grades
              <span className="block text-sm font-normal text-muted-foreground mt-1">(optional)</span>
            </h1>
            <div className="space-y-3">
              {grades.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Course name"
                    value={row.course}
                    onChange={(e) => updateGrade(i, "course", e.target.value)}
                    maxLength={100}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Grade"
                    value={row.grade}
                    onChange={(e) => updateGrade(i, "grade", e.target.value)}
                    maxLength={10}
                    className="w-24"
                  />
                  {grades.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeGradeRow(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addGradeRow}>
                <Plus className="mr-1 h-4 w-4" /> Add another course
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => handleComplete(false)} disabled={saving}>
                {saving ? "Saving…" : "Finish"}
              </Button>
            </div>
            <button
              onClick={() => handleComplete(true)}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" /> Skip this step
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
