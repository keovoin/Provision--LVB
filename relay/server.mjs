// ProvisionKH Bakong relay — runs on a server inside Cambodia.
// Forwards "has this KHQR been paid?" checks to Bakong, which only accepts Cambodian networks.
// No dependencies: needs Node.js 18+.  Start: RELAY_SECRET=... PORT=8787 node server.mjs
import http from "node:http";
import crypto from "node:crypto";

const SECRET = process.env.RELAY_SECRET || "";
const PORT = Number(process.env.PORT || 8787);
const BAKONG = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";
if (SECRET.length < 16) { console.error("RELAY_SECRET must be set (16+ characters)"); process.exit(1); }

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/check") return send(res, 404, { error: "not found" });
  if (!safeEqual(String(req.headers["x-relay-secret"] || ""), SECRET)) return send(res, 401, { error: "unauthorized" });

  const token = String(req.headers["x-bakong-token"] || "");
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 2000) return send(res, 413, { error: "too large" }); }
  let md5;
  try { md5 = JSON.parse(raw).md5; } catch { return send(res, 400, { error: "bad json" }); }
  if (!token || typeof md5 !== "string" || !/^[a-f0-9]{32}$/i.test(md5)) return send(res, 400, { error: "bad input" });

  try {
    const r = await fetch(BAKONG, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ md5 }),
      signal: AbortSignal.timeout(10_000),
    });
    send(res, r.status, await r.text());
  } catch (e) {
    console.error("Bakong unreachable:", e?.message);
    send(res, 502, { error: "bakong unreachable" });
  }
}).listen(PORT, () => console.log(`Bakong relay listening on :${PORT}`));
