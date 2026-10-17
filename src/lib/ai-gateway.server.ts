import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

/** Streams a Responses call through Lovable AI Gateway and returns the final text. */
export async function generateTextViaGateway(system: string, prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    prompt,
    maxRetries: 0,
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure) {
    const status = (failure as { statusCode?: number }).statusCode;
    if (status === 402) throw new Error("AI credits are used up. Add credits in workspace settings.");
    if (status === 429) throw new Error("AI is busy. Please try again in a minute.");
    throw new Error((failure as Error).message || "AI request failed");
  }
  return text;
}
