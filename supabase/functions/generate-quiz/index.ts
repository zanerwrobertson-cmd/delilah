import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { courseName, topics, weakAreas, learningStyle, mode } = await req.json();

    const topicList = (topics || []).map((t: string) => t).join(", ") || "general course material";
    const weakList = (weakAreas || []).join(", ") || "none identified";
    const style = learningStyle || "standard";
    const modeInstructions = mode === "exam-prep"
      ? "Order questions from easy to hard difficulty, progressively increasing."
      : mode === "time-crunch"
      ? "Keep questions concise and answerable within 30 seconds."
      : "";

    const prompt = `Generate exactly 10 quiz questions for a student studying "${courseName}".

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

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
    const text = data.content?.[0]?.text || "";

    // Parse the JSON array from Claude's response
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
