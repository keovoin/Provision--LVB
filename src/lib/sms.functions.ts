import { createServerFn } from "@tanstack/react-start";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const OTP_EMAIL_DOMAIN = "phone.provisionkh.app";

type Session = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: { id: string; email?: string };
};

function normalizePhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00855")) return normalizePhone(digits.slice(5));
  if (digits.startsWith("855")) {
    const local = digits.slice(3);
    return local.length >= 8 && local.length <= 9 ? "855" + local : null;
  }
  if (digits.startsWith("0")) {
    const local = digits.slice(1);
    return local.length >= 8 && local.length <= 9 ? "855" + local : null;
  }
  return digits.length >= 8 && digits.length <= 9 ? "855" + digits : null;
}

function toEmail(phone: string) {
  return `${phone}@${OTP_EMAIL_DOMAIN}`;
}

function randomDigits(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

function randomSecret(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function hmacHex(value: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendSms(to: string, content: string) {
  const privateKey = process.env.PLASGATE_PRIVATE_KEY;
  const secret = process.env.PLASGATE_SECRET;
  // Approved sender name on the SMS account (not sensitive). Change here when a new name is approved.
  const sender = "PlasGateUAT";
  if (!privateKey || !secret) return { ok: false as const, message: "Text messaging is not set up yet." };

  let response: Response;
  try {
    response = await fetch(
      `https://cloudapi.plasgate.com/rest/send?private_key=${encodeURIComponent(privateKey)}`,
      {
        method: "POST",
        headers: { "X-Secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ sender, to, content }),
      },
    );
  } catch {
    return { ok: false as const, message: "Could not reach the text messaging service." };
  }

  if (response.ok) return { ok: true as const };
  const detail = await response.text().catch(() => "");
  console.error(`Text message send failed [${response.status}]: ${detail}`);
  if (response.status === 400 && /sender/i.test(detail))
    return { ok: false as const, message: "The approved sender name is not set up yet." };
  if (response.status === 402 || /balance/i.test(detail))
    return { ok: false as const, message: "The text messaging account has no credit left." };
  if (response.status >= 500)
    return { ok: false as const, message: "The text messaging service could not deliver to this number. Please use email sign-in for now." };
  return { ok: false as const, message: "The code could not be sent right now. Please try again." };
}

async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Sign-in is not configured.");

  const client = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("Sign-in failed. Please try again.");
  return data.session as unknown as Session;
}

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => {
    const phone = normalizePhone(input?.phone ?? "");
    if (!phone) throw new Error("Enter a valid Cambodian phone number.");
    return { phone };
  })
  .handler(async ({ data }) => {
    const pepper = process.env.OTP_PEPPER;
    if (!pepper) throw new Error("Sign-in is not configured.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - SEND_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_verifications")
      .select("*", { count: "exact", head: true })
      .eq("phone", data.phone)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_SENDS_PER_WINDOW)
      throw new Error("Too many codes requested. Please wait a few minutes.");

    const code = randomDigits(6);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const codeHash = await hmacHex(`${data.phone}:${code}`, pepper);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("phone_verifications")
      .insert({ phone: data.phone, code_hash: codeHash, expires_at: expiresAt })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error("Could not start sign-in. Please try again.");

    const sent = await sendSms(data.phone, `SastraKH verification code: ${code}. Valid for 5 minutes.`);
    if (!sent.ok) {
      // A code that never reached the phone must not count toward the resend limit.
      await supabaseAdmin.from("phone_verifications").delete().eq("id", inserted.id);
      throw new Error(sent.message);
    }

    return { sent: true as const, phone: data.phone, expiresAt };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string }) => {
    const phone = normalizePhone(input?.phone ?? "");
    const code = String(input?.code ?? "").replace(/\D/g, "");
    if (!phone) throw new Error("Enter a valid Cambodian phone number.");
    if (code.length !== 6) throw new Error("Enter the 6-digit code.");
    return { phone, code };
  })
  .handler(async ({ data }) => {
    const pepper = process.env.OTP_PEPPER;
    if (!pepper) throw new Error("Sign-in is not configured.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("phone_verifications")
      .select("*")
      .eq("phone", data.phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("No active code. Please request a new one.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Code expired. Please request a new one.");
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts. Please request a new code.");

    const codeHash = await hmacHex(`${data.phone}:${data.code}`, pepper);
    if (!sameHash(codeHash, row.code_hash)) {
      await supabaseAdmin.from("phone_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("That code is not correct.");
    }

    await supabaseAdmin.from("phone_verifications").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = toEmail(data.phone);
    const password = randomSecret(28);
    const { data: account } = await supabaseAdmin
      .from("phone_accounts")
      .select("user_id")
      .eq("phone", data.phone)
      .maybeSingle();

    if (!account) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { sign_in_method: "phone" },
      });
      if (created.error || !created.data.user) throw new Error("Could not create your account.");
      const { error: linkError } = await supabaseAdmin
        .from("phone_accounts")
        .insert({ phone: data.phone, user_id: created.data.user.id });
      if (linkError) throw new Error("Could not save your phone number.");
    } else {
      const updated = await supabaseAdmin.auth.admin.updateUserById(account.user_id, { password });
      if (updated.error) throw new Error("Could not refresh your sign-in.");
    }

    const session = await signInWithPassword(email, password);
    return { session };
  });
