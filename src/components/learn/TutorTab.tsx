/**
 * TutorTab — conversational AI tutor grounded in the study material.
 *
 * Explain mode: clear explanations with source citations.
 * Socratic mode: guides with questions/hints instead of giving answers.
 * Quick-prompt chips, clear-chat, and keyboard shortcut (Enter to send).
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiText } from "./AiText";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import type { StudyMessage } from "@/types/learn";

interface TutorTabProps {
  setId: string;
  messages: StudyMessage[];
  onMessagesUpdate: (messages: StudyMessage[]) => void;
  initialMessage?: string;
  onInitialMessageConsumed: () => void;
}

const QUICK_PROMPTS = [
  "Summarize the key points",
  "What's most likely on the exam?",
  "Give me a worked example",
  "Quiz me on the material",
];

export function TutorTab({
  setId,
  messages,
  onMessagesUpdate,
  initialMessage,
  onInitialMessageConsumed,
}: TutorTabProps) {
  const [input, setInput]   = useState("");
  const [mode, setMode]     = useState<"explain" | "socratic">("explain");
  const [sending, setSending] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Auto-send when a pre-filled message arrives from BreakdownTab
  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage);
      onInitialMessageConsumed();
    }
  }, [initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Optimistic UI: add user message immediately
    const optimistic: StudyMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    onMessagesUpdate([...messages, optimistic]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("learn", {
        body: { action: "chat", setId, message: trimmed, mode },
      });
      if (error) {
        const body = await (error as { context?: Response }).context?.json().catch(() => null);
        toast.error((body as { error?: string })?.error ?? (error as Error).message);
        // Remove optimistic message on failure
        onMessagesUpdate(messages);
        return;
      }
      const assistant: StudyMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        created_at: new Date().toISOString(),
      };
      onMessagesUpdate([...messages, optimistic, assistant]);
    } catch (e: unknown) {
      toast.error((e as Error).message);
      onMessagesUpdate(messages);
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    const { error } = await supabase
      .from("study_messages")
      .delete()
      .eq("set_id", setId);
    if (error) { toast.error(error.message); return; }
    onMessagesUpdate([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4" style={{ minHeight: "60vh" }}>
      {/* Mode toggle + clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {(["explain", "socratic"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </Button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-1">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm text-center">
              Ask anything about your material. Delilah will explain, quiz you, or walk through examples.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <AiText>{msg.content}</AiText>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Delilah is thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={sending}
            className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="min-h-12 max-h-40 resize-none flex-1"
          rows={2}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
