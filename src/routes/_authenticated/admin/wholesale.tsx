import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardContent, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, inputCls, toast, usd } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/wholesale")({
  head: () => ({ meta: [{ title: "លក់ដុំ | SastraKH Ops" }, { name: "description", content: "Set bulk pricing and minimum order totals." }, { property: "og:title", content: "SastraKH Wholesale Pricing" }, { property: "og:description", content: "Bulk pricing and minimum order settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WholesalePage,
});

interface Tier { id: string; qty_min: number; qty_max: number | null; price_usd: number }
interface Row { id: string; sku: string; name_km: string; unit_km: string; product_prices: Tier[] }

function WholesalePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [min, setMin] = useState("");
  const [q, setQ] = useState("");
  const [ship, setShip] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const [p, m] = await Promise.all([
      supabase.from("products").select("id,sku,name_km,unit_km,product_prices(id,qty_min,qty_max,price_usd)").eq("active", true).order("name_km"),
      supabase.rpc("get_wholesale_info"),
    ]);
    if (p.error) toast.error(p.error.message); else setRows(p.data as unknown as Row[]);
    const info = (m.data ?? {}) as { min_order_usd?: number; shipping_info_km?: string }; setMin(String(info.min_order_usd ?? 0)); setShip(info.shipping_info_km ?? ""); setEdits({});
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveMin() {
    const n = Number(min);
    if (!Number.isFinite(n) || n < 0) return toast.error("ចំនួនមិនត្រឹមត្រូវ");
    const { error } = await supabase.rpc("set_min_order", { _amount: n });
    if (error) return toast.error(error.message);
    const s2 = await supabase.rpc("set_shipping_info", { _text: ship });
    if (s2.error) return toast.error(s2.error.message);
    toast.success(`ការបញ្ជាទិញអប្បបរមា ${usd(n)}`);
  }

  async function saveRow(r: Row) {
    const changed = r.product_prices.filter((t) => edits[t.id] !== undefined);
    for (const t of changed) {
      const v = Number(edits[t.id]);
      if (!Number.isFinite(v) || v <= 0) return toast.error("តម្លៃត្រូវតែធំជាង 0");
    }
    for (const t of changed) {
      const { error } = await supabase.from("product_prices").update({ price_usd: Number(edits[t.id]) }).eq("id", t.id);
      if (error) return toast.error(error.message);
    }
    toast.success(`បានរក្សាទុកតម្លៃ ${r.name_km}`); void load();
  }

  const shown = (rows ?? []).filter((r) => `${r.sku} ${r.name_km}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title="តម្លៃលក់ដុំ" subtitle="កំណត់តម្លៃតាមបរិមាណ និងការបញ្ជាទិញអប្បបរមា · Bulk pricing & minimum order" />
    <Card className="mt-5"><CardContent className="flex flex-wrap items-end gap-3 p-4">
      <label className="text-sm"><span className="mb-1 block font-medium">ការបញ្ជាទិញអប្បបរមា (USD)</span>
        <input aria-label="Minimum order total" className={`${inputCls} w-36 font-sans`} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} /></label>
      <label className="min-w-[280px] flex-1 text-sm"><span className="mb-1 block font-medium">ព័ត៌មានដឹកជញ្ជូន (បង្ហាញលើទំព័រលក់ដុំ)</span>
        <textarea aria-label="Shipping details" rows={3} className={`${inputCls} h-auto w-full py-2`} value={ship} onChange={(e) => setShip(e.target.value)} placeholder="ឧ. ដឹកឥតគិតថ្លៃក្នុងភ្នំពេញ សម្រាប់ការបញ្ជាទិញលើស $100 · ដឹកក្នុង ២៤ ម៉ោង" /></label>
      <Button onClick={() => void saveMin()}>រក្សាទុក</Button>
      <p className="text-xs text-muted-foreground">0 = គ្មានអប្បបរមា។ អតិថិជនមិនអាចបញ្ជាទិញក្រោមចំនួននេះបានទេ។</p>
    </CardContent></Card>
    <div className="mt-4 max-w-xs"><SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="ស្វែងរកទំនិញ…" /></div>
    <Card className="mt-3"><CardContent className="p-0">
      {!rows ? <SkeletonRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-3">ទំនិញ</th><th className="p-3">កម្រិតតម្លៃ (ចំនួន → $/ឯកតា)</th><th className="p-3 text-right" /></tr></thead>
        <tbody>{shown.map((r) => { const tiers = [...r.product_prices].sort((a, b) => a.qty_min - b.qty_min); const dirty = tiers.some((t) => edits[t.id] !== undefined); return <tr key={r.id} className="border-t border-border align-top">
          <td className="p-3"><p className="font-medium">{r.name_km}</p><p className="font-sans text-xs text-muted-foreground">{r.sku}</p></td>
          <td className="p-3"><div className="flex flex-wrap gap-2">{tiers.map((t) => <label key={t.id} className="flex items-center gap-1 rounded-control border border-border px-2 py-1">
            <span className="font-sans text-xs tabular-nums text-muted-foreground">{t.qty_min}{t.qty_max ? `–${t.qty_max}` : "+"} {r.unit_km}</span>
            <input aria-label={`Price from ${t.qty_min}`} className={`${inputCls} h-7 w-20 font-sans`} inputMode="decimal" value={edits[t.id] ?? String(t.price_usd)} onChange={(e) => setEdits({ ...edits, [t.id]: e.target.value })} />
          </label>)}</div></td>
          <td className="p-3 text-right"><Button size="sm" disabled={!dirty} onClick={() => void saveRow(r)}>រក្សាទុក</Button></td>
        </tr>; })}</tbody>
      </table><p className="p-3 text-xs text-muted-foreground">បន្ថែម ឬលុបកម្រិតតម្លៃ នៅទំព័រ ទំនិញ។ ដើម្បីបង្ហាញទំព័រនេះដល់អតិថិជន បង្កើតបដាភ្ជាប់ទៅ "ទំព័រលក់ដុំ"។</p></div>}
    </CardContent></Card>
  </>;
}
