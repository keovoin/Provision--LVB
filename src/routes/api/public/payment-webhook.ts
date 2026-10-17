import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const webhookSchema = z.object({
  type: z.enum(["payment.completed", "payment.scanned", "payment.expired", "payment.failed"]),
  data: z.object({
    payment: z.object({
      id: z.string().min(1),
      status: z.enum(["pending", "scanned", "paid", "expired", "failed"]),
    }),
  }),
});

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifySignature(body: string, header: string, secret: string) {
  const fields = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const timestamp = fields.t;
  const signature = fields.v1;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
  return constantTimeEqual(expected, signature.toLowerCase());
}

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_SECRET"];
        const signature = request.headers.get("x-cutluy-signature");
        if (!secret || !signature) {
          console.warn(`[Payment] Webhook rejected: secret=${Boolean(secret)} headers=${[...request.headers.keys()].join(",")}`);
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.text();
        if (!(await verifySignature(body, signature, secret))) {
          const format = signature.replace(/[0-9a-f]{16,}/gi, "<hex>").slice(0, 80);
          console.warn(`[Payment] Webhook signature mismatch: format=${format}`);
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: z.infer<typeof webhookSchema>;
        try {
          payload = webhookSchema.parse(JSON.parse(body));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const status = payload.type === "payment.completed" ? "paid" : payload.data.payment.status;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("apply_external_payment_status", {
          _provider_payment_id: payload.data.payment.id,
          _provider_status: status,
          _bank_ref: payload.data.payment.id,
        });
        if (error) {
          console.error(`[Payment] Webhook update failed: ${error.message}`);
          return new Response("Update failed", { status: 500 });
        }
        return Response.json({ received: true });
      },
    },
  },
});