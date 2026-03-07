import { HelpCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface CourseSelectorProps {
  courses: string[];
  loading: boolean;
  selected: string | null;
  onSelect: (course: string) => void;
}

export function CourseSelector({ courses, loading, selected, onSelect }: CourseSelectorProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold text-foreground">No courses found</h2>
        <p className="mt-2 text-sm text-muted-foreground">Add your courses in Settings first to start quizzing.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate("/dashboard/settings")}>
          Go to Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">Select a course</h2>
      </div>
      <Select onValueChange={onSelect} value={selected ?? undefined}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a course…" />
        </SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
