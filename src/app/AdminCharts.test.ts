import { describe, expect, it } from "vitest";
import { bucketOrders } from "./chart-buckets";
const now = new Date(2026, 9, 9, 12);
describe("bucketOrders", () => {
  it("daily keeps 30 buckets and excludes cancelled from revenue", () => {
    const { buckets } = bucketOrders([{ status: "paid", total_usd: 10, created_at: new Date(2026, 9, 9, 8).toISOString() }, { status: "cancelled", total_usd: 99, created_at: new Date(2026, 9, 9, 9).toISOString() }], "daily", now);
    expect(buckets).toHaveLength(30);
    expect(buckets[29]).toMatchObject({ revenue: 10, orders: 1, cancelled: 1 });
  });
  it("monthly groups the whole month", () => {
    const { buckets } = bucketOrders([{ status: "delivered", total_usd: 5, created_at: new Date(2026, 9, 1).toISOString() }, { status: "pending", total_usd: 7.5, created_at: new Date(2026, 9, 8).toISOString() }], "monthly", now);
    expect(buckets).toHaveLength(12);
    expect(buckets[11].revenue).toBe(12.5);
  });
});
