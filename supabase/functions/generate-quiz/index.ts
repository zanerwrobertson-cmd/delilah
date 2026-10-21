/**
 * generate-quiz — Supabase Edge Function
 *
 * Builds a quiz-writing prompt from the student's course info and asks Claude
 * for 10 multiple-choice questions, returned as structured JSON.
 *
 * Used by: src/pages/QuizMe.tsx
 *
 * Request:  POST { courseName, topics?, weakAreas?, learningStyle?, mode? }
 *           mode is "exam-prep" | "time-crunch" | anything else (normal)
 * Response: 200 { questions: QuizQuestion[] } | 5xx { error }
 *           Each question: { question, options[4], correctIndex, hint, difficulty, topic }
 *
 * The secret CLAUDE_API_KEY lives only on the server (see claude-proxy for why).
 */

// Loads variables from a local .env file when running with `supabase functions serve`.
import "https://deno.land/std@0.168.0/dotenv/load.ts";

// CORS headers let the browser call this function from another origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Approve the browser's CORS preflight request.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")?.trim();
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { courseName, topics, weakAreas, learningStyle, mode } = await req.json();

    // Turn the inputs into readable text for the prompt, with fallbacks when they're empty.
    const topicList = (topics || []).map((t: string) => t).join(", ") || "general course material";
    const weakList = (weakAreas || []).join(", ") || "none identified";
    const style = learningStyle || "standard";
    // Each quiz mode adds one extra instruction for Claude.
    const modeInstructions = mode === "exam-prep"
      ? "Order questions from easy to hard difficulty, progressively increasing."
      : mode === "time-crunch"
      ? "Keep questions concise and answerable within 30 seconds."
      : "";

    // The prompt spells out the exact JSON shape so the reply can be parsed by code.
    const prompt =`Generate exactly 10 quiz questions for a student studying "${courseName}".

Course topics covered: ${topicList}

Focus extra questions on these weak areas: ${weakList}

Adapt question style to this learning style: ${style}

${modeInstructions}

Return ONLY a valid JSON array with exactly 10 objects. Each object must have:
- "question": string (the question text)
- "options": array of exactly 4 strings (multiple choice answers)
- "correctIndex": number (0-3, index of the correct answer in the options array)
- "hint": string (a helpful hint that doesn't give away the answer)
- "difficulty": string ("easy", "medium", or "hard")
- "topic": string (the topic this question covers)

Make sure questions are specific to the actual course content, not generic study tips.
Vary the difficulty: include 3 easy, 4 medium, and 3 hard questions.
Do NOT wrap in markdown code blocks. Return raw JSON only.`;

    // Send the prompt to Claude using the server-side API key.
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Claude API error", details: errText }),
        { status: claudeResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await claudeResponse.json();
    const text = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    // Parse the JSON array from Claude's response.
    // The regex grabs everything from the first "[" to the last "]", in case Claude
    // adds a sentence or code fences around the JSON despite being told not to.
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse quiz questions from AI response", raw: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questions = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
