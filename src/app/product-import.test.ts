import { describe, expect, it } from "vitest";
import { parseProductRows, parseTiers } from "./product-import";

const cats = [{ id: "c1", slug: "drinks", name_en: "Drinks", name_km: "ភេសជ្ជៈ" }];
const header = ["SKU", "Name KH", "Name EN", "Category", "Price tiers", "Stock"];

describe("bulk product import", () => {
  it("turns tier text into ordered ranges", () => {
    expect(parseTiers("10:2.2; 1:2.5; 50:2")).toEqual([
      { qty_min: 1, qty_max: 9, price_usd: 2.5 },
      { qty_min: 10, qty_max: 49, price_usd: 2.2 },
      { qty_min: 50, qty_max: null, price_usd: 2 },
    ]);
  });
  it("requires the first tier to start at 1", () => {
    expect(parseTiers("5:2")).toBe("first tier must start at quantity 1");
  });
  it("matches categories by Khmer or English name", () => {
    const r = parseProductRows([header, ["A1", "ក", "A", "ភេសជ្ជៈ", "1:1", "5"]], cats);
    expect(r.items[0].category_id).toBe("c1");
  });
  it("lists unknown categories to create", () => {
    const r = parseProductRows([header, ["A1", "ក", "A", "Snacks", "1:1", ""]], cats);
    expect(r.newCategories).toEqual(["Snacks"]);
  });
  it("rejects duplicate SKUs in one file", () => {
    const r = parseProductRows([header, ["A1", "ក", "A", "", "1:1", ""], ["a1", "ខ", "B", "", "1:1", ""]], cats);
    expect(r.items).toHaveLength(1);
    expect(r.errors[0]).toContain("duplicate SKU");
  });
  it("explains when Excel turned price tiers into a time", () => {
    const r = parseProductRows([header, ["A1", "ក", "A", "", new Date(0), ""]], cats);
    expect(r.errors[0]).toContain("set the Price tiers column to Text");
  });
});
