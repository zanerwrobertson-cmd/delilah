import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, HelpCircle, GraduationCap, TrendingUp } from "lucide-react";

/**
 * Dashboard home (/dashboard): greeting plus a row of stat cards.
 */

// TODO: these values are placeholders and always show zero. To make them real,
// query quiz_results / study_sessions for the logged-in user and count them.
const stats = [
  { label: "Study Hours", value: "0h", icon: CalendarDays },
  { label: "Quizzes Taken", value: "0", icon: HelpCircle },
  { label: "Exams Prepped", value: "0", icon: GraduationCap },
  { label: "Streak", value: "0 days", icon: TrendingUp },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Greets the user by the display name they gave at sign-up, if any */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here's your study overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Your study insights will appear here as you start learning.</p>
      </div>
    </div>
  );
}
