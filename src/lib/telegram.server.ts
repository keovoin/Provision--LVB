// Server-only Telegram helpers (bot calls go through the connector gateway).
export const APP_URL = "https://ecom-kh.lovable.app";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const BOT_ID = "8905569607";
// Telegram's published Ed25519 key for third-party Mini App data validation.
const TG_PUBLIC_KEY = "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d";

export async function tg(method: string, body: Record<string, unknown>) {
  const lovable = process.env.LOVABLE_API_KEY;
  const key = process.env.TELEGRAM_API_KEY;
  if (!lovable || !key) throw new Error("Telegram is not configured");
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Telegram ${method} failed [${res.status}]: ${text}`);
  return JSON.parse(text);
}

export async function webhookSecret() {
  const key = process.env.TELEGRAM_API_KEY ?? "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`telegram-webhook:${key}`));
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const hex = (h: string) => new Uint8Array(h.match(/../g)!.map((b) => parseInt(b, 16)));
const b64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

/** Verifies Mini App initData with Telegram's signature; returns the Telegram user id. */
export async function verifyInitData(initData: string): Promise<number> {
  const params = new URLSearchParams(initData);
  const signature = params.get("signature");
  if (!signature) throw new Error("Missing Telegram signature");
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 86400) throw new Error("Telegram session expired");
  const pairs = [...params.entries()].filter(([k]) => k !== "hash" && k !== "signature").sort(([a], [b]) => a.localeCompare(b));
  const check = `${BOT_ID}:WebAppData\n` + pairs.map(([k, v]) => `${k}=${v}`).join("\n");
  const pub = await crypto.subtle.importKey("raw", hex(TG_PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("Ed25519", pub, b64url(signature), new TextEncoder().encode(check));
  if (!ok) throw new Error("Invalid Telegram data");
  const user = JSON.parse(params.get("user") ?? "{}");
  if (typeof user.id !== "number") throw new Error("No Telegram user");
  return user.id;
}

export const menuKeyboard = {
  inline_keyboard: [
    [{ text: "🛒 ហាង · Shop", web_app: { url: `${APP_URL}/store` } }],
    [{ text: "📦 ការបញ្ជាទិញរបស់ខ្ញុំ · My orders", web_app: { url: `${APP_URL}/store/orders` } }],
    [{ text: "🛠 ផ្ទាំងគ្រប់គ្រង · Admin", web_app: { url: `${APP_URL}/admin` } }],
  ],
};
