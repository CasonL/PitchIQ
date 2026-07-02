import type { Context, Config } from "@netlify/edge-functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const model = requestBody.model || "gpt-4o-mini";
  const messages = requestBody.messages;

  if (!messages) {
    return new Response(JSON.stringify({ error: "messages is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Provider prefix (e.g. "google/...", "anthropic/...") → OpenRouter
  // Plain model name (e.g. "gpt-4o-mini") → direct OpenAI
  const isOpenRouterModel = typeof model === "string" && model.includes("/");

  let apiUrl: string;
  let apiKey: string | undefined;
  let extraHeaders: Record<string, string> = {};

  if (isOpenRouterModel) {
    apiKey = Netlify.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    extraHeaders = { "HTTP-Referer": "https://pitchiq.ca", "X-Title": "PitchIQ" };
  } else {
    apiKey = Netlify.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    apiUrl = "https://api.openai.com/v1/chat/completions";
  }

  // Respect the caller's requested mode:
  // - stream: true  → real SSE passthrough (used by LLMStreamClient for low-latency TTS)
  // - stream: false/undefined → plain JSON passthrough (used by evaluators, generators, etc.)
  const wantsStream = requestBody.stream === true;

  const payload = {
    model,
    messages,
    temperature: requestBody.temperature ?? 0.75,
    max_tokens: requestBody.max_tokens || 800,
    stream: wantsStream
  };

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify(payload)
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Upstream request failed", message: error.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!upstream.ok) {
    const errBody = await upstream.text();
    return new Response(errBody, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (wantsStream) {
    // True streaming passthrough — no buffering, first token reaches the
    // client as soon as the upstream model produces it.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
      }
    });
  }

  // Non-streaming: return the raw JSON response untouched so callers can
  // read data.choices[0].message.content directly.
  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config: Config = {
  path: "/api/openai/chat"
};
