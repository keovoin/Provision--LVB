import { describe, expect, it } from "vitest";
import { activeTierMinimum, buildTiers, tierDiscountPercent } from "./tiers";

describe("product quantity pricing", () => {
  const tiers = [{ qty_min: 1, price_usd: 10 }, { qty_min: 12, price_usd: 9 }, { qty_min: 50, price_usd: 8 }];
  it("selects the clicked tier when quantity becomes its minimum", () => {
    for (const tier of tiers) expect(activeTierMinimum(tiers, tier.qty_min)).toBe(tier.qty_min);
    expect(activeTierMinimum(tiers, 49)).toBe(12);
    expect(activeTierMinimum(tiers, 51)).toBe(50);
  });
  it("shows savings against the single-unit price", () => {
    expect(tierDiscountPercent(10, 9)).toBe(10);
    expect(tierDiscountPercent(10, 8)).toBe(20);
    expect(tierDiscountPercent(10, 10)).toBe(0);
    expect(tierDiscountPercent(0, 8)).toBe(0);
    expect(tierDiscountPercent(10, 11)).toBe(0);
  });
  it("selects by quantity rather than matching equal prices", () => {
    expect(activeTierMinimum([{ qty_min: 1, price_usd: 10 }, { qty_min: 12, price_usd: 10 }], 12)).toBe(12);
  });
});

describe("buildTiers", () => {
  it("supports 3 or more tiers with derived ranges", () => {
    const r = buildTiers([{ qty_min: 12, price_usd: 9 }, { qty_min: 1, price_usd: 10 }, { qty_min: 50, price_usd: 8 }]);
    expect(r).toEqual({ tiers: [
      { qty_min: 1, price_usd: 10, qty_max: 11 },
      { qty_min: 12, price_usd: 9, qty_max: 49 },
      { qty_min: 50, price_usd: 8, qty_max: null },
    ] });
  });
  it("requires the first tier to start at 1", () => {
    expect("error" in buildTiers([{ qty_min: 5, price_usd: 3 }])).toBe(true);
  });
  it("rejects duplicate minimums", () => {
    expect("error" in buildTiers([{ qty_min: 1, price_usd: 3 }, { qty_min: 1, price_usd: 2 }])).toBe(true);
  });
});
