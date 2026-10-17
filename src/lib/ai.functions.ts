import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(200).default(""),
  details: z.string().trim().max(3000).default(""),
});

export const generateProductDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [owner, staff] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
    ]);
    if (!owner.data && !staff.data) throw new Error("Only staff can generate descriptions");

    const { generateTextViaGateway } = await import("./ai-gateway.server");
    const system =
      "You write product descriptions for ProvisionKH, a Cambodian wholesale grocery store selling to shops and restaurants. " +
      "Write natural, correct Khmer (not a literal translation) and clear English. Be factual: only use the details given, never invent sizes, origins, or claims. " +
      "Each description is 2-4 short sentences, friendly and practical for business buyers. No markdown, no emojis, no headings. " +
      "Return only JSON: {\"km\": \"...\", \"en\": \"...\"}";
    const prompt = `Product name: ${data.name}\nCategory: ${data.category || "-"}\nKey details: ${data.details || "-"}\n\nReturn the JSON now.`;
    const raw = await generateTextViaGateway(system, prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned no description. Please try again.");
    const parsed = z.object({ km: z.string(), en: z.string() }).safeParse(JSON.parse(match[0]));
    if (!parsed.success) throw new Error("AI returned an unexpected format. Please try again.");
    return parsed.data;
  });
