import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: "CLAUDE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, courseName } = await req.json();

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("syllabi")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert PDF to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `You are a syllabus parser. Extract all assignments, exams, quizzes, projects, and papers with their deadlines, plus weekly topics from this PDF syllabus for the course "${courseName}".

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "assignments": [
    { "assignment_name": "string", "deadline": "YYYY-MM-DDTHH:mm:ss" or null, "type": "assignment" | "exam" | "quiz" | "project" | "paper" }
  ],
  "topics": [
    { "week_number": 1, "topic_name": "string" }
  ]
}

Extract as much as possible. Use null for unknown deadlines. Return ONLY the JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);

      if (claudeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text || "";

    // Parse JSON from Claude response
    let parsed;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse syllabus data", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert assignments
    if (parsed.assignments?.length) {
      const assignments = parsed.assignments.map((a: any) => ({
        user_id: user.id,
        course_name: courseName,
        assignment_name: a.assignment_name,
        deadline: a.deadline || null,
        type: a.type || "assignment",
      }));
      const { error: aErr } = await supabase.from("assignments").insert(assignments);
      if (aErr) console.error("Insert assignments error:", aErr);
    }

    // Insert topics
    if (parsed.topics?.length) {
      const topics = parsed.topics.map((t: any) => ({
        user_id: user.id,
        course_name: courseName,
        week_number: t.week_number || null,
        topic_name: t.topic_name,
      }));
      const { error: tErr } = await supabase.from("topics").insert(topics);
      if (tErr) console.error("Insert topics error:", tErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        assignments_count: parsed.assignments?.length || 0,
        topics_count: parsed.topics?.length || 0,
        assignments: parsed.assignments || [],
        topics: parsed.topics || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
