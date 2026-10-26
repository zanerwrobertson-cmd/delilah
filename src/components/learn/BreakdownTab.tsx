/**
 * BreakdownTab — shows the AI-generated study guide.
 *
 * Sections: overview card, accordion sections (lesson, key points, worked
 * example, check-yourself questions, "Explain simpler" / "Quiz me on this"), key terms grid, formula cards, common mistakes,
 * exam focus, topic connections. "Regenerate" with optional focus input.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AiText } from "./AiText";
import {
  BookOpen, Zap, AlertTriangle, GraduationCap,
  Link2, RefreshCw, Loader2, FlaskConical,
} from "lucide-react";
import type { Guide } from "@/types/learn";

interface BreakdownTabProps {
  guide: Guide | null;
  loading: boolean;
  onRegenerate: (focus?: string) => void;
  onTutorPrompt: (msg: string) => void;
}

export function BreakdownTab({ guide, loading, onRegenerate, onTutorPrompt }: BreakdownTabProps) {
  const [focusInput, setFocusInput] = useState("");
  const [showFocus, setShowFocus] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Delilah is writing an in-depth breakdown. This takes a minute or two…</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">No breakdown yet.</p>
        <Button onClick={() => onRegenerate()}>Generate breakdown</Button>
      </div>
    );
  }

  // The AI can omit fields (or a reply can be cut short), so default every list.
  const sections    = guide.sections ?? [];
  const keyTerms    = guide.key_terms ?? [];
  const formulas    = guide.formulas ?? [];
  const mistakes    = guide.common_mistakes ?? [];
  const examFocus   = guide.exam_focus ?? [];
  const connections = guide.connections ?? [];

  return (
    <div className="space-y-6">
      {/* Regenerate controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!showFocus ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onRegenerate()} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowFocus(true)} className="text-muted-foreground">
              Focus on specific topic…
            </Button>
          </>
        ) : (
          <>
            <Input
              placeholder="e.g. only chapter 3, just the formulas…"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              className="h-8 w-64 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRegenerate(focusInput); setShowFocus(false); setFocusInput(""); }
                if (e.key === "Escape") { setShowFocus(false); setFocusInput(""); }
              }}
            />
            <Button
              size="sm"
              onClick={() => { onRegenerate(focusInput); setShowFocus(false); setFocusInput(""); }}
              disabled={!focusInput.trim()}
            >
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowFocus(false); setFocusInput(""); }}>
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Overview */}
      <Card className="p-6 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-foreground">Big Picture</h2>
        </div>
        <AiText>{guide.overview}</AiText>
      </Card>

      {/* Sections */}
      {sections.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display font-bold text-foreground">Sections</h2>
          <Accordion type="multiple" className="space-y-2">
            {sections.map((section, i) => (
              <AccordionItem
                key={i}
                value={`section-${i}`}
                className="rounded-lg border border-border bg-card px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-start gap-3 text-left">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{section.title}</p>
                      {section.source && (
                        <p className="text-xs text-muted-foreground">{section.source}</p>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <AiText>{section.explanation}</AiText>

                  {(section.key_points ?? []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(section.key_points ?? []).map((pt, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.worked_example && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Worked example</p>
                      <AiText>{section.worked_example}</AiText>
                    </div>
                  )}

                  {(section.check_questions ?? []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check yourself</p>
                      {(section.check_questions ?? []).map((cq, j) => (
                        <details key={j} className="group rounded-lg border border-border bg-muted/30 px-4 py-3">
                          <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                            {cq.question}
                            <span className="ml-2 text-xs font-normal text-primary group-open:hidden">Show answer</span>
                          </summary>
                          <div className="mt-2 border-t border-border pt-2">
                            <AiText>{cq.answer}</AiText>
                          </div>
                        </details>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => onTutorPrompt(`Explain "${section.title}" in simpler terms with a different example.`)}
                    >
                      <Zap className="h-3 w-3" />
                      Explain simpler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => onTutorPrompt(`Quiz me on "${section.title}".`)}
                    >
                      <GraduationCap className="h-3 w-3" />
                      Quiz me on this
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Key terms */}
      {keyTerms.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-foreground">Key Terms</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {keyTerms.map((term, i) => (
              <Card key={i} className="p-4 space-y-1">
                <p className="font-semibold text-foreground text-sm">{term.term}</p>
                <p className="text-sm text-muted-foreground">{term.definition}</p>
                {term.example && (
                  <p className="text-xs text-primary/80 italic">e.g. {term.example}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Formulas */}
      {formulas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Formulas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {formulas.map((f, i) => (
              <Card key={i} className="p-4 space-y-2">
                <p className="font-semibold text-foreground text-sm">{f.name}</p>
                <AiText>{`$$${f.latex}$$`}</AiText>
                <p className="text-xs text-muted-foreground">{f.meaning}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Common mistakes */}
      {mistakes.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h2 className="font-display font-bold text-foreground">Common Mistakes</h2>
          </div>
          <ul className="space-y-2">
            {mistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                {m}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Exam focus */}
      {examFocus.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Likely on the Exam</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {examFocus.map((item, i) => (
              <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-emerald-400" />
            <h2 className="font-display font-bold text-foreground">Connections</h2>
          </div>
          <ul className="space-y-2">
            {connections.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                {c}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
