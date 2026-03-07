import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { BookOpen, Brain, Zap, Target } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Plans", desc: "Personalized study schedules that adapt to your pace." },
  { icon: Zap, title: "Smart Quizzes", desc: "Test yourself with AI-generated questions on any topic." },
  { icon: Target, title: "Exam Prep", desc: "Targeted practice sessions for upcoming exams." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">Delilah</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-24 pb-20 text-center md:pt-36">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          AI-powered learning
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-foreground md:text-7xl animate-fade-in">
          Your AI study companion.{" "}
          <span className="gradient-text">Built around how you learn.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: "0.15s" }}>
          Delilah creates personalized study plans, quizzes you on weak spots, and preps you for exams — all powered by AI that understands your learning style.
        </p>
        <Button size="lg" className="mt-10 px-8 text-base animate-fade-in animate-pulse-glow" style={{ animationDelay: "0.3s" }} asChild>
          <Link to="/signup">Get Started Free</Link>
        </Button>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-32 md:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-card p-6 animate-fade-in"
            style={{ animationDelay: `${0.4 + i * 0.1}s` }}
          >
            <f.icon className="mb-4 h-8 w-8 text-primary" />
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
