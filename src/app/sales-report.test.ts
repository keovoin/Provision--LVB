import { describe, expect, it } from "vitest";
import { summarize, type ReportOrder } from "./sales-report";

const o = (status: string, total: number, extra: Partial<ReportOrder> = {}): ReportOrder => ({
  id: status + total, order_no: "PK", status, payment_method: "cod", total_usd: total, discount_usd: 0, delivery_fee_usd: 0,
  created_at: "2026-10-10T03:00:00Z", profiles: null, order_items: [], ...extra,
});

describe("sales report", () => {
  it("excludes cancelled orders from revenue", () => {
    const r = summarize([o("delivered", 100), o("cancelled", 50), o("pending", 20)]);
    expect(r.revenue).toBe(120);
    expect(r.count).toBe(2);
    expect(r.cancelled).toBe(1);
  });
  it("counts only paid-or-later orders as collected", () => {
    expect(summarize([o("paid", 30), o("pending", 20)]).paid).toBe(30);
  });
  it("adds up delivery fees", () => {
    expect(summarize([o("paid", 31.5, { delivery_fee_usd: 1.5 }), o("paid", 10, { delivery_fee_usd: 1.5 })]).deliveryFees).toBe(3);
  });
});
