export interface ReportOrder {
  id: string; order_no: string | null; status: string; payment_method: string; total_usd: number; discount_usd: number; delivery_fee_usd: number; created_at: string;
  profiles: { name: string; business_name: string | null } | null;
  order_items: { qty: number; line_total_usd: number; products: { sku: string; name_km: string; name_en: string } | null }[];
}

/** Sales totals; cancelled orders are excluded from every figure. */
export function summarize(orders: ReportOrder[]) {
  const live = orders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + Number(o.total_usd), 0);
  const paid = live.filter((o) => ["paid", "picking", "out_for_delivery", "delivered"].includes(o.status)).reduce((s, o) => s + Number(o.total_usd), 0);
  const byDay = new Map<string, number>();
  const byMethod = new Map<string, number>();
  const byProduct = new Map<string, { name: string; sku: string; qty: number; total: number }>();
  for (const o of live) {
    const d = o.created_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + Number(o.total_usd));
    byMethod.set(o.payment_method, (byMethod.get(o.payment_method) ?? 0) + Number(o.total_usd));
    for (const i of o.order_items) {
      const key = i.products?.sku ?? "?";
      const cur = byProduct.get(key) ?? { name: i.products?.name_km ?? "-", sku: key, qty: 0, total: 0 };
      cur.qty += i.qty; cur.total += Number(i.line_total_usd);
      byProduct.set(key, cur);
    }
  }
  return {
    revenue, paid, count: live.length, cancelled: orders.length - live.length,
    average: live.length ? revenue / live.length : 0,
    discounts: live.reduce((s, o) => s + Number(o.discount_usd), 0),
    deliveryFees: live.reduce((s, o) => s + Number(o.delivery_fee_usd), 0),
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
    byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    topProducts: [...byProduct.values()].sort((a, b) => b.total - a.total),
  };
}
