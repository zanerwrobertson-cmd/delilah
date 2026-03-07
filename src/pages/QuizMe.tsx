import { HelpCircle } from "lucide-react";

export default function QuizMe() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Quiz Me</h1>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-16 text-center">
        <HelpCircle className="mb-4 h-12 w-12 text-primary" />
        <h2 className="font-display text-xl font-semibold text-foreground">Ready to test yourself?</h2>
        <p className="mt-2 max-w-md text-muted-foreground">AI-generated quizzes will help you identify and strengthen weak areas.</p>
      </div>
    </div>
  );
}
