/**
 * claude-proxy — Supabase Edge Function
 *
 * A thin pass-through to the Claude API. The browser sends a finished prompt,
 * this function adds the secret API key and forwards it to Anthropic, then
 * returns Claude's plain-text reply.
 *
 * Why it exists: the CLAUDE_API_KEY must never be shipped to the browser.
 * Edge functions run on Supabase's servers, so the key stays secret there.
 *
 * Used by: src/pages/UploadSyllabus.tsx (to pull assignments and topics out of a syllabus).
 *
 * Request:  POST { prompt: string }
 * Response: 200 { text: string } | 4xx/5xx { error: string }
 *
 * Note: this accepts any prompt, so anyone holding the public anon key can spend
 * Claude credits through it. Tighten it (require a logged-in user, cap prompt size)
 * before opening the app to the public.
 */

// Loads variables from a local .env file when running with `supabase functions serve`.
import "https://deno.land/std@0.168.0/dotenv/load.ts";

// CORS headers let the browser (a different origin than supabase.co) call this function.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Browsers send an OPTIONS "preflight" request before the real POST; just approve it.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Set with: npx supabase secrets set CLAUDE_API_KEY=...
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The caller builds the whole prompt; this function doesn't change it.
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Anthropic's Messages API with a single user message.
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

    // Pass Claude's error (rate limit, bad key, etc.) back with the same status code.
    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Claude API error", details: errText }),
        { status: claudeResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Claude returns a list of content blocks; the reply text is in the first one.
    const data = await claudeResponse.json();
    const text = data.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Bad JSON in the request body, network failure reaching Anthropic, etc.
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
