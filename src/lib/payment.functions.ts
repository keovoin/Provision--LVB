import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const paymentIdInput = z.object({ paymentId: z.string().uuid() });
const providerPaymentSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "scanned", "paid", "expired", "failed"]),
  amount: z.union([z.string(), z.number()]),
  currency: z.literal("USD"),
  reference_id: z.string().nullable().optional(),
  qr_string: z.string().min(1).optional(),
  expires_at: z.string().datetime().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  checkout_url: z.string().url().optional(),
});

function getApiKey() {
  const value = process.env["PAYMENT_API_KEY"];
  if (!value) throw new Error("Payment service is not configured");
  return value;
}

async function readProviderResponse(response: Response) {
  const body = await response.text();
  if (!response.ok) {
    console.error(`[Payment] Request failed [${response.status}]: ${body}`);
    if (response.status === 402) throw new Error("Payment service limit reached");
    if (response.status === 429) throw new Error("Payment service is busy. Please try again shortly.");
    throw new Error("Payment could not be prepared");
  }
  return providerPaymentSchema.parse(JSON.parse(body));
}

export const createPaymentQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, payment_no, order_id, amount_usd, status, method, provider_payment_id, khqr_code, khqr_expiry, checkout_url")
      .eq("id", data.paymentId)
      .eq("customer_id", context.userId)
      .single();

    if (error || !payment || !["khqr", "link"].includes(payment.method) || payment.status !== "pending") {
      throw new Error("Payment is not available");
    }

    if (payment.provider_payment_id && payment.khqr_code && payment.khqr_expiry) {
      return {
        status: "pending" as const,
        qrString: payment.khqr_code,
        expiresAt: payment.khqr_expiry,
        checkoutUrl: payment.checkout_url,
      };
    }

    // Own QR (personal Bakong account) when switched on — for both KHQR and payment-link orders;
    // in own mode the payment page itself is the link. Otherwise the existing service.
    const { bakongConfig } = await import("./bakong.server");
    const own = bakongConfig();
    if (own) {
      const { buildKhqr } = await import("./khqr");
      const now = Date.now();
      const expiresAt = new Date(now + 15 * 60_000).toISOString();
      const { qr, md5 } = buildKhqr({
        accountId: own.accountId, merchantName: own.merchantName, amountUsd: Number(payment.amount_usd),
        billNumber: payment.payment_no ?? payment.id.slice(0, 8), createdAtMs: now, expiresAtMs: now + 15 * 60_000,
      });
      const { error: ownBindError } = await context.supabase.rpc("bind_external_payment", {
        _payment_id: payment.id, _provider_payment_id: `bakong:${md5}`, _qr_code: qr, _expires_at: expiresAt,
      });
      if (ownBindError) throw new Error("Payment could not be saved");
      return { status: "pending" as const, qrString: qr, expiresAt, checkoutUrl: null };
    }

    const apiKey = getApiKey();
    const response = await fetch("https://cutluy.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payment.id,
      },
      body: JSON.stringify({
        amount: Number(payment.amount_usd),
        reference_id: payment.order_id,
        metadata: { payment_id: payment.id, payment_no: payment.payment_no },
      }),
    });
    const external = await readProviderResponse(response);
    if (!external.qr_string || !external.expires_at || Number(external.amount) !== Number(payment.amount_usd)) {
      throw new Error("Payment response could not be verified");
    }

    const { error: bindError } = await context.supabase.rpc("bind_external_payment", {
      _payment_id: payment.id,
      _provider_payment_id: external.id,
      _qr_code: external.qr_string,
      _expires_at: external.expires_at,
    });
    if (bindError) throw new Error("Payment could not be saved");
    let checkoutUrl: string | null = null;
    if (payment.method === "link" && external.checkout_url) {
      checkoutUrl = external.checkout_url;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("payments").update({ checkout_url: checkoutUrl }).eq("id", payment.id);
    }

    return { status: external.status, qrString: external.qr_string, expiresAt: external.expires_at, checkoutUrl };
  });

export const refreshPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, amount_usd, order_id, status, provider_payment_id")
      .eq("id", data.paymentId)
      .eq("customer_id", context.userId)
      .single();

    if (error || !payment) throw new Error("Payment not found");
    if (payment.status !== "pending" || !payment.provider_payment_id) return { status: payment.status };

    if (payment.provider_payment_id.startsWith("bakong:")) {
      const { checkBakongByMd5 } = await import("./bakong.server");
      const token = process.env["BAKONG_TOKEN"];
      const accountId = process.env["BAKONG_ACCOUNT_ID"];
      if (!token || !accountId) return { status: "pending" };
      const txn = await checkBakongByMd5(token, payment.provider_payment_id.slice(7));
      if (!txn) return { status: "pending" };
      if (Number(txn.amount) !== Number(payment.amount_usd) || txn.currency !== "USD" || txn.toAccountId !== accountId) {
        throw new Error("Payment status could not be verified");
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: ownUpdateError } = await supabaseAdmin.rpc("apply_external_payment_status", {
        _provider_payment_id: payment.provider_payment_id, _provider_status: "paid", _bank_ref: txn.hash,
      });
      if (ownUpdateError) throw new Error("Payment status could not be saved");
      return { status: "paid" as const };
    }

    const response = await fetch(`https://cutluy.com/v1/payments/${encodeURIComponent(payment.provider_payment_id)}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });
    const external = await readProviderResponse(response);
    if (Number(external.amount) !== Number(payment.amount_usd) || external.reference_id !== payment.order_id) {
      throw new Error("Payment status could not be verified");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.rpc("apply_external_payment_status", {
      _provider_payment_id: external.id,
      _provider_status: external.status,
      _bank_ref: external.id,
    });
    if (updateError) throw new Error("Payment status could not be saved");
    return { status: external.status };
  });