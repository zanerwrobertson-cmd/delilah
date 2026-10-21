/**
 * PracticeTab — 10-question practice set.
 *
 * MCQ: shows 4 options; on submit reveals correct/incorrect + explanation.
 * Short answer: textarea + "Grade" button; calls the learn edge function's
 * "grade" action and shows verdict + model answer.
 * Score summary at the end.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AiText } from "./AiText";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Loader2, GraduationCap, RefreshCw,
} from "lucide-react";
import type { Practice, PracticeQuestion, MCQQuestion } from "@/types/learn";

interface PracticeTabProps {
  practice: Practice | null;
  setId: string;
  loading: boolean;
  onGenerate: () => void;
}

type QuestionState =
  | { status: "unanswered" }
  | { status: "answered_mcq"; selectedIndex: number }
  | { status: "grading" }
  | { status: "graded_short"; verdict: "correct" | "partial" | "incorrect"; feedback: string }
  | { status: "answered_short"; text: string };

function isMcq(q: PracticeQuestion): q is MCQQuestion {
  return q.type === "mcq";
}

const verdictStyle = {
  correct:   "text-emerald-400",
  partial:   "text-orange-400",
  incorrect: "text-destructive",
};

const verdictLabel = {
  correct:   "Correct",
  partial:   "Partially correct",
  incorrect: "Incorrect",
};

export function PracticeTab({ practice, setId, loading, onGenerate }: PracticeTabProps) {
  const questions = practice?.questions ?? [];

  const [idx, setIdx]                 = useState(0);
  const [states, setStates]           = useState<QuestionState[]>([]);
  const [shortInputs, setShortInputs] = useState<Record<number, string>>({});
  const [done, setDone]               = useState(false);

  // Initialise states array when practice loads
  if (questions.length > 0 && states.length !== questions.length) {
    setStates(questions.map(() => ({ status: "unanswered" })));
    setIdx(0);
    setDone(false);
  }

  const currentQ   = questions[idx];
  const currentSt  = states[idx] ?? { status: "unanswered" };
  const shortInput = shortInputs[idx] ?? "";

  const updateState = (i: number, s: QuestionState) => {
    setStates((prev) => { const n = [...prev]; n[i] = s; return n; });
  };

  const handleSelectMcq = (selectedIndex: number) => {
    if (currentSt.status !== "unanswered") return;
    updateState(idx, { status: "answered_mcq", selectedIndex });
  };

  const handleGradeShort = async () => {
    if (!shortInput.trim() || !currentQ) return;
    updateState(idx, { status: "grading" });
    try {
      const { data, error } = await supabase.functions.invoke("learn", {
        body: {
          action: "grade",
          question: currentQ.question,
          modelAnswer: currentQ.answer,
          studentAnswer: shortInput.trim(),
        },
      });
      if (error) {
        const body = await (error as { context?: Response }).context?.json().catch(() => null);
        toast.error((body as { error?: string })?.error ?? (error as Error).message);
        updateState(idx, { status: "answered_short", text: shortInput });
        return;
      }
      updateState(idx, { status: "graded_short", verdict: data.verdict, feedback: data.feedback });
    } catch (e: unknown) {
      toast.error((e as Error).message);
      updateState(idx, { status: "answered_short", text: shortInput });
    }
  };

  const handleNext = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
    } else {
      setDone(true);
    }
  };

  const handleRestart = () => {
    setStates(questions.map(() => ({ status: "unanswered" })));
    setShortInputs({});
    setIdx(0);
    setDone(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Generating practice questions…</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <GraduationCap className="h-10 w-10 opacity-30" />
        <p className="text-sm">No practice questions yet.</p>
        <Button onClick={onGenerate}>Generate practice</Button>
      </div>
    );
  }

  // Score screen
  if (done) {
    const answered = states.filter((s) =>
      s.status === "answered_mcq" || s.status === "graded_short"
    );
    const correct = states.filter((s, i) => {
      if (s.status === "answered_mcq") {
        const q = questions[i];
        return isMcq(q) && s.selectedIndex === q.correctIndex;
      }
      if (s.status === "graded_short") return s.verdict === "correct";
      return false;
    });
    const partial = states.filter((s) => s.status === "graded_short" && s.verdict === "partial");

    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <div className="text-center space-y-2">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="font-display text-xl font-bold text-foreground">Practice complete</p>
          <p className="text-sm text-muted-foreground">
            {correct.length} correct · {partial.length} partial · {answered.length - correct.length - partial.length} incorrect
          </p>
        </div>

        <Progress value={(correct.length / questions.length) * 100} className="h-2" />

        <div className="space-y-3">
          {questions.map((q, i) => {
            const st = states[i];
            let icon = <span className="text-muted-foreground">—</span>;
            if (st.status === "answered_mcq") {
              const mcq = q as MCQQuestion;
              icon = st.selectedIndex === mcq.correctIndex
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : <XCircle className="h-4 w-4 text-destructive" />;
            }
            if (st.status === "graded_short") {
              icon = st.verdict === "correct"
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : st.verdict === "partial"
                ? <CheckCircle2 className="h-4 w-4 text-orange-400" />
                : <XCircle className="h-4 w-4 text-destructive" />;
            }
            return (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <span className="text-muted-foreground line-clamp-2">{q.question}</span>
              </div>
            );
          })}
        </div>

        <Button onClick={handleRestart} className="w-full gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const answered = currentSt.status !== "unanswered" && currentSt.status !== "answered_short";
  const canNext =
    currentSt.status === "answered_mcq" ||
    currentSt.status === "graded_short";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{idx + 1} / {questions.length}</span>
          <Badge variant="outline" className="text-xs">{currentQ.topic}</Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              currentQ.difficulty === "hard"
                ? "border-destructive/40 text-destructive"
                : currentQ.difficulty === "medium"
                ? "border-orange-500/40 text-orange-400"
                : "border-emerald-500/40 text-emerald-400"
            }`}
          >
            {currentQ.difficulty}
          </Badge>
        </div>
        <Progress value={((idx) / questions.length) * 100} className="h-1 w-24" />
      </div>

      {/* Question */}
      <Card className="p-6 space-y-5">
        <p className="font-medium text-foreground leading-relaxed">{currentQ.question}</p>

        {isMcq(currentQ) ? (
          /* MCQ */
          <div className="space-y-2">
            {(currentQ.options ?? []).map((opt, oi) => {
              const st = currentSt;
              let style = "border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer";
              if (st.status === "answered_mcq") {
                if (oi === currentQ.correctIndex) style = "border-emerald-500/60 bg-emerald-500/10 text-emerald-400";
                else if (oi === st.selectedIndex) style = "border-destructive/60 bg-destructive/10 text-destructive";
                else style = "border-border opacity-50";
              }
              return (
                <button
                  key={oi}
                  onClick={() => handleSelectMcq(oi)}
                  disabled={st.status === "answered_mcq"}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
                >
                  <span className="font-medium mr-2 text-muted-foreground">
                    {["A", "B", "C", "D"][oi]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          /* Short answer */
          <div className="space-y-3">
            <Textarea
              placeholder="Write your answer here…"
              value={shortInput}
              onChange={(e) => setShortInputs((p) => ({ ...p, [idx]: e.target.value }))}
              disabled={currentSt.status === "grading" || currentSt.status === "graded_short"}
              className="min-h-24 resize-y"
            />
            {currentSt.status !== "graded_short" && (
              <Button
                size="sm"
                onClick={handleGradeShort}
                disabled={!shortInput.trim() || currentSt.status === "grading"}
                className="gap-2"
              >
                {currentSt.status === "grading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Grade my answer
              </Button>
            )}
          </div>
        )}

        {/* Explanation */}
        {(currentSt.status === "answered_mcq" || currentSt.status === "graded_short") && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            {currentSt.status === "graded_short" && (
              <p className={`font-semibold text-sm ${verdictStyle[currentSt.verdict]}`}>
                {verdictLabel[currentSt.verdict]}
              </p>
            )}
            {currentSt.status === "graded_short" && (
              <AiText>{currentSt.feedback}</AiText>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {isMcq(currentQ) ? "Explanation" : "Model answer"}
              </p>
              <AiText>{isMcq(currentQ) ? currentQ.explanation : currentQ.answer}</AiText>
            </div>
          </div>
        )}
      </Card>

      {canNext && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {idx < questions.length - 1 ? "Next question" : "See results"}
          </Button>
        </div>
      )}
    </div>
  );
}
