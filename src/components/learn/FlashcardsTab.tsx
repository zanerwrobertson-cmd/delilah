/**
 * FlashcardsTab — spaced-repetition-style card drill.
 *
 * Space — flip card
 * 1     — Again (send to back of deck, mark as missed)
 * 2     — Got it (retire card)
 *
 * Progress bar shows retired / total. Shuffle button. End screen with
 * "Drill the ones I missed" option.
 */
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shuffle, RotateCcw, CheckCircle2, Brain } from "lucide-react";
import type { Flashcards } from "@/types/learn";

interface FlashcardsTabProps {
  flashcards: Flashcards | null;
  loading: boolean;
  onGenerate: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardsTab({ flashcards, loading, onGenerate }: FlashcardsTabProps) {
  const cards = flashcards?.cards ?? [];

  // deck = ordered list of card indices still to show
  const [deck, setDeck]       = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [retired, setRetired] = useState<Set<number>>(new Set());
  const [missed, setMissed]   = useState<Set<number>>(new Set());
  const [done, setDone]       = useState(false);

  // Initialise / reset when cards change
  useEffect(() => {
    const c = flashcards?.cards ?? [];
    if (c.length) {
      setDeck(c.map((_, i) => i));
      setRetired(new Set());
      setMissed(new Set());
      setFlipped(false);
      setDone(false);
    }
  }, [flashcards]);

  const current = deck[0] ?? -1;

  const handleAgain = useCallback(() => {
    if (current === -1) return;
    setMissed((m) => new Set(m).add(current));
    setDeck((d) => [...d.slice(1), d[0]]); // send to back
    setFlipped(false);
  }, [current]);

  const handleGotIt = useCallback(() => {
    if (current === -1) return;
    setRetired((r) => new Set(r).add(current));
    const next = deck.slice(1);
    setDeck(next);
    setFlipped(false);
    if (next.length === 0) setDone(true);
  }, [current, deck]);

  const handleShuffle = () => {
    setDeck((d) => shuffle(d));
    setFlipped(false);
  };

  const handleReset = () => {
    setDeck(cards.map((_, i) => i));
    setRetired(new Set());
    setMissed(new Set());
    setFlipped(false);
    setDone(false);
  };

  const handleDrillMissed = () => {
    setDeck(shuffle([...missed]));
    setRetired(new Set());
    setMissed(new Set());
    setFlipped(false);
    setDone(false);
  };

  // Keyboard shortcuts — only active on this tab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "1") handleAgain();
      if (e.key === "2") handleGotIt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAgain, handleGotIt]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Generating flashcards…</p>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
        <Brain className="h-10 w-10 opacity-30" />
        <p className="text-sm">No flashcards yet.</p>
        <Button onClick={onGenerate}>Generate flashcards</Button>
      </div>
    );
  }

  // End screen
  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-20">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <div className="text-center">
          <p className="font-display text-xl font-bold text-foreground">Deck complete!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {missed.size > 0
              ? `You marked ${missed.size} card${missed.size !== 1 ? "s" : ""} for review.`
              : "You nailed every card."}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {missed.size > 0 && (
            <Button onClick={handleDrillMissed} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Drill the ones I missed ({missed.size})
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        </div>
      </div>
    );
  }

  const card = cards[current];
  // The deck is filled by an effect, so the render right after cards arrive has no current card yet.
  if (!card) return null;
  const retiredCount = retired.size;
  const progressPct = cards.length > 0 ? (retiredCount / cards.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{retiredCount} / {cards.length} done</span>
          <span>{deck.length} remaining</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Topic + position */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{card.topic}</Badge>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShuffle} title="Shuffle">
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Flip card */}
      <div
        className="relative h-52 w-full cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="absolute inset-0 transition-transform duration-500"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card p-6 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-lg font-medium text-foreground leading-snug">{card.front}</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-primary/30 bg-primary/5 p-6 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-base text-muted-foreground leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {flipped ? "How did you do?" : "Space to flip"}
      </p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleAgain}
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <span className="rounded bg-muted px-1 text-xs font-mono">1</span>
          Again
        </Button>
        <Button
          onClick={handleGotIt}
          className="gap-2"
        >
          <span className="rounded bg-primary/20 px-1 text-xs font-mono">2</span>
          Got it
        </Button>
      </div>
    </div>
  );
}
