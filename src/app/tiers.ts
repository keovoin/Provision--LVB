export interface TierInput { qty_min: number; price_usd: number }
export interface Tier extends TierInput { qty_max: number | null }

/** Select by quantity boundaries, even when neighboring tiers share a price. */
export function activeTierMinimum(tiers: TierInput[], quantity: number): number | undefined {
  return [...tiers].sort((a, b) => b.qty_min - a.qty_min).find((tier) => quantity >= tier.qty_min)?.qty_min;
}

export function tierDiscountPercent(basePrice: number, tierPrice: number): number {
  return basePrice > 0 ? Math.max(0, (basePrice - tierPrice) / basePrice * 100) : 0;
}

/** Sort tiers, derive each range's end from the next tier, and validate. Returns an error message or the tiers. */
export function buildTiers(input: TierInput[]): { tiers: Tier[] } | { error: string } {
  if (input.length < 1) return { error: "ត្រូវមានយ៉ាងហោចណាស់ ១ កម្រិត" };
  const sorted = [...input].sort((a, b) => a.qty_min - b.qty_min);
  if (sorted.some((t) => !Number.isInteger(t.qty_min) || t.qty_min < 1)) return { error: "ចំនួនអប្បបរមាត្រូវជាលេខគត់ ≥ 1" };
  if (sorted[0].qty_min !== 1) return { error: "កម្រិតដំបូងត្រូវចាប់ពី 1" };
  if (new Set(sorted.map((t) => t.qty_min)).size !== sorted.length) return { error: "ចំនួនអប្បបរមាមិនអាចស្ទួនគ្នា" };
  if (sorted.some((t) => !(t.price_usd > 0))) return { error: "តម្លៃត្រូវធំជាង 0" };
  return { tiers: sorted.map((t, i) => ({ ...t, qty_max: sorted[i + 1] ? sorted[i + 1].qty_min - 1 : null })) };
}
