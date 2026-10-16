/**
 * generate-study-plan — Supabase Edge Function
 *
 * Turns a course's topics, assignments and weak areas into a week-by-week study
 * plan. Claude acts as "Delilah, a personalized AI study coach" and returns JSON.
 *
 * Used by: src/pages/StudyPlan.tsx
 *
 * Request:  POST { courseName, topics[], assignments?, weakAreas?, learningStyle?,
 *                  daysPerWeek, studyDays[] }   (topics/assignments are rows from the database)
 * Response: 200 { weeks: [{ week_number, focus_topic, daily_tasks[], weak_areas_addressed[],
 *                           weak_task_indices[], tips[] }] } | 4xx/5xx { error }
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
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { courseName, topics, assignments, weakAreas, learningStyle, daysPerWeek, studyDays } = await req.json();

    if (!courseName || !topics) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: courseName, topics" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format each list as bullet lines for the prompt.
    // Weak topics are tagged [WEAK AREA] so Claude gives them extra time.
    const topicList = topics.map((t: any) =>
      `- ${t.topic_name} (Week ${t.week_number ?? "unassigned"})${t.is_weak_area ? " [WEAK AREA]" : ""}`
    ).join("\n");

    const assignmentList = assignments?.length > 0
      ? assignments.map((a: any) =>
          `- ${a.assignment_name} (${a.type}, deadline: ${a.deadline || "no deadline"})`
        ).join("\n")
      : "No assignments found.";

    const weakAreaList = weakAreas?.length > 0
      ? weakAreas.map((w: any) => `- ${w.topic_name}`).join("\n")
      : "No weak areas flagged.";

    // The prompt gives Claude the student's context, the planning rules, and the exact
    // JSON format to reply in. weak_task_indices marks which daily tasks target weak areas.
    const prompt =`You are Delilah, a personalized AI study coach. Create a personalized weekly study plan for the following course.

COURSE: ${courseName}
STUDY SCHEDULE: ${daysPerWeek} days per week (${studyDays.join(", ")})
STUDENT'S LEARNING STYLE: ${learningStyle || "Not specified"}

COURSE TOPICS:
${topicList}

ASSIGNMENTS & DEADLINES:
${assignmentList}

WEAK AREAS (prioritize these):
${weakAreaList}

INSTRUCTIONS:
- Create a personalized weekly study plan that covers all topics
- Prioritize weak areas by scheduling extra review and practice for them
- Account for upcoming deadlines — schedule assignment prep before due dates
- Adapt tasks to the student's learning style when specified
- Generate exactly ${daysPerWeek} daily tasks per week, one for each study day
- Each task should be specific and actionable (e.g., "Solve problems 1-5 on derivatives" not "Study math")
- Mark which tasks address weak areas

Respond ONLY with valid JSON (no markdown, no backticks, no explanation) in this exact format:
[
  {
    "week_number": 1,
    "focus_topic": "Clear topic title for this week",
    "daily_tasks": ["Specific task for ${studyDays[0]}", "Specific task for ${studyDays[1] || studyDays[0]}", ...],
    "weak_areas_addressed": ["topic name if this week covers a weak area"],
    "weak_task_indices": [0],
    "tips": ["Specific study tip 1", "Specific study tip 2"]
  }
]`;

    // Plans are long (many weeks x many tasks), hence the higher max_tokens than the quiz.
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errText }),
        { status: claudeResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await claudeResponse.json();
    const text = data.content?.[0]?.text || "";

    // Extract the JSON array from the response (first "[" to last "]"),
    // ignoring any extra text Claude might add around it.
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response:", text);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weeks = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ weeks }),
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
