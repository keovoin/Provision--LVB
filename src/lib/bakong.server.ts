// Own-QR mode: personal Bakong account + Bakong Open API payment check.
export function bakongConfig() {
  const mode = process.env["PAYMENT_QR_SOURCE"];
  const token = process.env["BAKONG_TOKEN"];
  const accountId = process.env["BAKONG_ACCOUNT_ID"];
  if (mode !== "bakong" || !token || !accountId) return null;
  return { token, accountId, merchantName: process.env["BAKONG_MERCHANT_NAME"] || "ProvisionKH" };
}

export type BakongTxn = { amount: number; currency: string; hash: string; toAccountId: string };

/** Returns the transaction when paid, null when not found yet. Throws on service errors. */
// Bakong only answers Cambodian networks, so when a relay inside Cambodia is configured, go through it.
export async function checkBakongByMd5(token: string, md5: string): Promise<BakongTxn | null> {
  const relayUrl = process.env["BAKONG_RELAY_URL"];
  const relaySecret = process.env["BAKONG_RELAY_SECRET"];
  const res = relayUrl && relaySecret
    ? await fetch(`${relayUrl.replace(/\/+$/, "")}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-relay-secret": relaySecret, "x-bakong-token": token },
        body: JSON.stringify({ md5 }),
      })
    : await fetch("https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ md5 }),
      });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[Bakong] check failed [${res.status}]: ${text.slice(0, 300)}`);
    throw new Error("Payment check unavailable");
  }
  const body = JSON.parse(text) as { responseCode: number; data?: BakongTxn | null };
  return body.responseCode === 0 && body.data ? body.data : null;
}
