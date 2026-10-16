import { GraduationCap } from "lucide-react";

/**
 * Exam Prep (/dashboard/exam-prep).
 * TODO: placeholder only, there's no exam-prep logic yet. For now, Quiz Me's
 * "exam-prep" mode (easy-to-hard questions) is the closest working feature.
 */
export default function ExamPrep() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Exam Prep</h1>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
        <GraduationCap className="mb-4 h-12 w-12 text-primary" />
        <h2 className="font-display text-xl font-semibold text-foreground">Prepare for your exams</h2>
        <p className="mt-2 max-w-md text-muted-foreground">Focused practice sessions tailored to your upcoming exams and deadlines.</p>
      </div>
    </div>
  );
}
