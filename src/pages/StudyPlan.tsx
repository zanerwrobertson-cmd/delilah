import { CalendarDays } from "lucide-react";

export default function StudyPlan() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
        <CalendarDays className="mb-4 h-12 w-12 text-primary" />
        <h2 className="font-display text-xl font-semibold text-foreground">No study plan yet</h2>
        <p className="mt-2 max-w-md text-muted-foreground">Create a personalized study plan and Delilah will help you stay on track.</p>
      </div>
    </div>
  );
}
