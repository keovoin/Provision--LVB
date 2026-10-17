export type Range = "daily" | "weekly" | "monthly";
export interface Row { status: string; total_usd: number; created_at: string }
export const SPAN: Record<Range, number> = { daily: 30, weekly: 12, monthly: 12 };
export function startOf(d: Date, r: Range) { const x = new Date(d); x.setHours(0, 0, 0, 0); if (r === "weekly") x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); if (r === "monthly") x.setDate(1); return x; }
export function step(d: Date, r: Range, n: number) { const x = new Date(d); if (r === "daily") x.setDate(x.getDate() + n); else if (r === "weekly") x.setDate(x.getDate() + 7 * n); else x.setMonth(x.getMonth() + n); return x; }
function label(d: Date, r: Range) { return r === "monthly" ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }

/** Bucket orders into daily/weekly/monthly periods ending at `now`. Cancelled orders are excluded from revenue. */
export function bucketOrders(rows: Row[], r: Range, now = new Date()) {
  const first = step(startOf(now, r), r, -(SPAN[r] - 1));
  const buckets = Array.from({ length: SPAN[r] }, (_, i) => { const s = step(first, r, i); return { key: s.getTime(), label: label(s, r), revenue: 0, orders: 0, cancelled: 0 }; });
  for (const o of rows) {
    const k = startOf(new Date(o.created_at), r).getTime();
    const b = buckets.find((x) => x.key === k); if (!b) continue;
    if (o.status === "cancelled") { b.cancelled++; continue; }
    b.orders++; b.revenue = Math.round((b.revenue + Number(o.total_usd)) * 100) / 100;
  }
  return { first, buckets };
}

