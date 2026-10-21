/**
 * learn — Supabase Edge Function
 *
 * AI tutor grounded in the student's uploaded course material.
 * The browser sends only { action, setId, ... }; this function loads the material
 * from the DB itself (so the large text never round-trips through the browser twice).
 *
 * Actions:
 *   guide       — generate/regenerate the structured study guide, save to study_sets.guide
 *   flashcards  — generate/regenerate flashcards, save to study_sets.flashcards
 *   practice    — generate/regenerate practice questions, save to study_sets.practice
 *   chat        — tutor conversation turn, saves both turns to study_messages
 *   grade       — grade a short-answer response (no material needed)
 *
 * Security: requires a valid user JWT in the Authorization header.
 * All DB reads/writes go through a user-scoped client so RLS applies.
 *
 * Prompt caching: material is placed in the system block with cache_control: ephemeral,
 * so repeated requests against the same set are cheap.
 */

import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
const CLAUDE_MODEL   = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-20250514";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_MATERIAL_CHARS = 550_000;

// ---------------------------------------------------------------------------
// Tool definitions (structured output via tool_choice: forced)
// ---------------------------------------------------------------------------

const TOOL_GUIDE = {
  name: "save_guide",
  description: "Save the complete study guide for the uploaded course material.",
  input_schema: {
    type: "object",
    properties: {
      overview: {
        type: "string",
        description: "Big-picture overview of the material (2-3 paragraphs).",
      },
      sections: {
        type: "array",
        description: "Key topics in the best learning order.",
        items: {
          type: "object",
          properties: {
            title:       { type: "string" },
            explanation: { type: "string", description: "Markdown explanation with intuitive examples." },
            key_points:  { type: "array", items: { type: "string" } },
            source:      { type: "string", description: "e.g. 'Page 12-15' or 'Slides 3-5'" },
          },
          required: ["title", "explanation", "key_points"],
        },
      },
      key_terms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term:       { type: "string" },
            definition: { type: "string" },
            example:    { type: "string" },
          },
          required: ["term", "definition"],
        },
      },
      formulas: {
        type: "array",
        description: "Mathematical or chemical formulas (omit if none).",
        items: {
          type: "object",
          properties: {
            name:    { type: "string" },
            latex:   { type: "string", description: "LaTeX representation." },
            meaning: { type: "string" },
          },
          required: ["name", "latex", "meaning"],
        },
      },
      common_mistakes: {
        type: "array",
        items: { type: "string" },
        description: "Mistakes students commonly make with this material.",
      },
      exam_focus: {
        type: "array",
        items: { type: "string" },
        description: "Concepts most likely to appear on an exam.",
      },
      connections: {
        type: "array",
        items: { type: "string" },
        description: "Interesting connections between topics in the material.",
      },
    },
    required: ["overview", "sections", "key_terms", "common_mistakes", "exam_focus"],
  },
};

const TOOL_FLASHCARDS = {
  name: "save_flashcards",
  description: "Save flashcards generated from the course material.",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            front: { type: "string", description: "Question or term on the front." },
            back:  { type: "string", description: "Answer or definition on the back." },
            topic: { type: "string", description: "Topic label for this card." },
          },
          required: ["front", "back", "topic"],
        },
      },
    },
    required: ["cards"],
  },
};

const TOOL_PRACTICE = {
  name: "save_practice",
  description: "Save a practice question set generated from the course material.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type:         { type: "string", enum: ["mcq", "short_answer"] },
            question:     { type: "string" },
            options:      { type: "array", items: { type: "string" }, description: "MCQ only: exactly 4 choices." },
            correctIndex: { type: "integer", description: "MCQ only: 0-3." },
            answer:       { type: "string", description: "Model answer." },
            explanation:  { type: "string", description: "Full explanation; for MCQ also explain why wrong options are wrong." },
            topic:        { type: "string" },
            difficulty:   { type: "string", enum: ["easy", "medium", "hard"] },
          },
          required: ["type", "question", "answer", "explanation", "topic", "difficulty"],
        },
      },
    },
    required: ["questions"],
  },
};

const TOOL_GRADE = {
  name: "grade_answer",
  description: "Grade a student's short-answer response against the model answer.",
  input_schema: {
    type: "object",
    properties: {
      verdict:  { type: "string", enum: ["correct", "partial", "incorrect"] },
      feedback: { type: "string", description: "Constructive feedback explaining the verdict." },
    },
    required: ["verdict", "feedback"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errRes(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okRes(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callClaude(body: Record<string, unknown>) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
      // Enable prompt caching for the system block.
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude ${res.status}: ${t}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!CLAUDE_API_KEY) return errRes("CLAUDE_API_KEY not configured");

  // Authenticate the caller.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errRes("Unauthorized", 401);

  // User-scoped client: RLS applies to all queries through this client.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authErr } = await db.auth.getUser();
  if (authErr || !user) return errRes("Unauthorized", 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errRes("Invalid JSON", 400); }

  const { action, setId, message, mode, focus, question, modelAnswer, studentAnswer } = body as {
    action: string;
    setId?: string;
    message?: string;
    mode?: string;
    focus?: string;
    question?: string;
    modelAnswer?: string;
    studentAnswer?: string;
  };

  if (!action) return errRes("Missing action", 400);

  // ---------------------------------------------------------------------------
  // grade — no material needed
  // ---------------------------------------------------------------------------
  if (action === "grade") {
    if (!question || !modelAnswer || !studentAnswer) {
      return errRes("grade requires question, modelAnswer, studentAnswer", 400);
    }
    try {
      const claudeRes = await callClaude({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        tools: [TOOL_GRADE],
        tool_choice: { type: "tool", name: "grade_answer" },
        messages: [{
          role: "user",
          content: `Grade this student answer.\n\nQuestion: ${question}\nModel answer: ${modelAnswer}\nStudent answer: ${studentAnswer}`,
        }],
      });
      const toolUse = claudeRes.content?.find((b: { type: string }) => b.type === "tool_use");
      if (!toolUse) return errRes("No grade result from AI");
      return okRes(toolUse.input);
    } catch (e: unknown) {
      return errRes((e as Error).message);
    }
  }

  // All remaining actions need setId.
  if (!setId) return errRes("Missing setId", 400);

  // ---------------------------------------------------------------------------
  // Load course material
  // ---------------------------------------------------------------------------
  const { data: materials, error: matErr } = await db
    .from("study_materials")
    .select("file_name, kind, content")
    .eq("set_id", setId)
    .order("created_at");

  if (matErr) return errRes(matErr.message);
  if (!materials?.length) return errRes("No materials found for this set", 404);

  // Wrap each file in <source> tags and truncate at the character budget.
  let totalChars = 0;
  const parts: string[] = [];
  for (const mat of materials) {
    const block = `<source name="${mat.file_name}" kind="${mat.kind}">\n${mat.content}\n</source>`;
    if (totalChars + block.length > MAX_MATERIAL_CHARS) {
      parts.push(`<source name="${mat.file_name}" kind="${mat.kind}">[Truncated: material limit reached. Consider splitting into multiple study sets.]</source>`);
      break;
    }
    parts.push(block);
    totalChars += block.length;
  }
  const materialContext = parts.join("\n\n");

  // Pull the student's learning style for personalisation.
  const { data: profile } = await db
    .from("profiles")
    .select("learning_style")
    .eq("user_id", user.id)
    .single();
  const learningStyle = profile?.learning_style ?? "standard";

  // A one-off focus from the request overrides the set's saved focus.
  const { data: setRow } = await db.from("study_sets").select("focus").eq("id", setId).single();
  const effectiveFocus = (focus || setRow?.focus || "").trim();
  const focusNote = effectiveFocus ? `\n\nThe student asked you to focus on: ${effectiveFocus}` : "";

  // ---------------------------------------------------------------------------
  // guide
  // ---------------------------------------------------------------------------
  if (action === "guide") {
    const systemText =
      `You are Delilah, an expert tutor. Produce a thorough, intuitive study guide from the course material below.\n` +
      `Student learning style: ${learningStyle}${focusNote}\n\n` +
      `Guidelines:\n` +
      `- Overview: big picture in 2-3 paragraphs\n` +
      `- Sections in the best learning order, with markdown explanations, intuitive real-world examples, bullet key points, and source/page citations\n` +
      `- Key terms: definitions + concrete examples\n` +
      `- Formulas: LaTeX only if the material contains them\n` +
      `- Common mistakes students make\n` +
      `- What is most likely on an exam\n` +
      `- Connections between topics\n` +
      `Keep the total guide under ~3000 words.\n\n` +
      `MATERIAL:\n${materialContext}`;

    try {
      const claudeRes = await callClaude({
        model: CLAUDE_MODEL,
        max_tokens: 7000,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        tools: [TOOL_GUIDE],
        tool_choice: { type: "tool", name: "save_guide" },
        messages: [{ role: "user", content: "Generate the study guide using the save_guide tool." }],
      });
      const toolUse = claudeRes.content?.find((b: { type: string }) => b.type === "tool_use");
      if (!toolUse) return errRes("No guide returned by AI");

      const guide = toolUse.input;
      const { error: saveErr } = await db
        .from("study_sets")
        .update({ guide, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (saveErr) return errRes(saveErr.message);

      return okRes({ guide });
    } catch (e: unknown) {
      return errRes((e as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // flashcards
  // ---------------------------------------------------------------------------
  if (action === "flashcards") {
    const systemText =
      `You are Delilah, an expert tutor. Generate 15-40 flashcards from the course material below.${focusNote}\n\n` +
      `Guidelines:\n` +
      `- Front: concise question or term\n` +
      `- Back: clear, complete answer or definition\n` +
      `- Cover all major concepts; vary difficulty\n` +
      `- Label each card with a topic from the material\n\n` +
      `MATERIAL:\n${materialContext}`;

    try {
      const claudeRes = await callClaude({
        model: CLAUDE_MODEL,
        max_tokens: 6000,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        tools: [TOOL_FLASHCARDS],
        tool_choice: { type: "tool", name: "save_flashcards" },
        messages: [{ role: "user", content: "Generate flashcards using the save_flashcards tool." }],
      });
      const toolUse = claudeRes.content?.find((b: { type: string }) => b.type === "tool_use");
      if (!toolUse) return errRes("No flashcards returned by AI");

      const flashcards = toolUse.input;
      const { error: saveErr } = await db
        .from("study_sets")
        .update({ flashcards, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (saveErr) return errRes(saveErr.message);

      return okRes({ flashcards });
    } catch (e: unknown) {
      return errRes((e as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // practice
  // ---------------------------------------------------------------------------
  if (action === "practice") {
    const systemText =
      `You are Delilah, an expert tutor. Create a 10-question practice set from the course material below.${focusNote}\n\n` +
      `Requirements:\n` +
      `- Exactly 6 multiple-choice questions (4 options each, correctIndex 0-3)\n` +
      `- Exactly 4 short-answer questions\n` +
      `- Each question has: full answer, detailed explanation (MCQ: explain why each wrong option is wrong too), topic, difficulty\n` +
      `- Order easy to hard overall\n` +
      `- Cover a range of topics from the material\n\n` +
      `MATERIAL:\n${materialContext}`;

    try {
      const claudeRes = await callClaude({
        model: CLAUDE_MODEL,
        max_tokens: 6000,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        tools: [TOOL_PRACTICE],
        tool_choice: { type: "tool", name: "save_practice" },
        messages: [{ role: "user", content: "Generate the practice questions using the save_practice tool." }],
      });
      const toolUse = claudeRes.content?.find((b: { type: string }) => b.type === "tool_use");
      if (!toolUse) return errRes("No practice questions returned by AI");

      const practice = toolUse.input;
      const { error: saveErr } = await db
        .from("study_sets")
        .update({ practice, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (saveErr) return errRes(saveErr.message);

      return okRes({ practice });
    } catch (e: unknown) {
      return errRes((e as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // chat
  // ---------------------------------------------------------------------------
  if (action === "chat") {
    if (!message) return errRes("chat requires message", 400);
    const chatMode = mode === "socratic" ? "socratic" : "explain";

    // Load the last 24 messages for context (descending, then reverse for chronological).
    const { data: history } = await db
      .from("study_messages")
      .select("role, content")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(24);

    const priorMessages = ((history ?? []) as { role: string; content: string }[])
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));
    priorMessages.push({ role: "user", content: message });

    const modeInstructions = chatMode === "socratic"
      ? "Use the Socratic method: guide the student with questions and hints rather than giving direct answers. Help them reason to the answer themselves."
      : "Explain concepts clearly and thoroughly. Use concrete examples from the material. Cite page or slide numbers when relevant.";

    const systemText =
      `You are Delilah, a knowledgeable and supportive tutor. You are grounded in the course material below.\n\n` +
      `Rules:\n` +
      `- ${modeInstructions}\n` +
      `- Cite sources (e.g. "Page 12", "Slide 3") whenever possible\n` +
      `- If the student asks about something not in the material, acknowledge it and answer from general knowledge\n` +
      `- End every response with a brief check-for-understanding question\n` +
      `- Keep responses focused and conversational${focusNote}\n\n` +
      `MATERIAL:\n${materialContext}`;

    try {
      const claudeRes = await callClaude({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        messages: priorMessages,
      });
      const assistantText = claudeRes.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

      // Save both turns to the DB.
      await db.from("study_messages").insert([
        { set_id: setId, user_id: user.id, role: "user",      content: message },
        { set_id: setId, user_id: user.id, role: "assistant", content: assistantText },
      ]);

      return okRes({ message: assistantText });
    } catch (e: unknown) {
      return errRes((e as Error).message);
    }
  }

  return errRes(`Unknown action: ${action}`, 400);
});
