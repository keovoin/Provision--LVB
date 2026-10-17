import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { METHOD_KM, PageHead, SkeletonRows, inputCls, toast, usd } from "@/app/admin-ui";
import { summarize, type ReportOrder } from "@/app/sales-report";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "របាយការណ៍លក់ | ProvisionKH Ops" }, { name: "description", content: "ProvisionKH sales report and Excel export." }, { property: "og:title", content: "ProvisionKH Sales Report" }, { property: "og:description", content: "Sales dashboard and Excel export." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReportsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function ReportsPage() {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [orders, setOrders] = useState<ReportOrder[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrders(null);
    const end = new Date(to); end.setDate(end.getDate() + 1);
    void supabase.from("orders").select("id,order_no,status,payment_method,total_usd,discount_usd,delivery_fee_usd,created_at,profiles(name,business_name),order_items(qty,line_total_usd,products(sku,name_km,name_en))")
      .gte("created_at", new Date(from).toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false }).limit(5000)
      .then(({ data, error }) => { if (error) toast.error(error.message); setOrders((data ?? []) as unknown as ReportOrder[]); });
  }, [from, to]);

  const r = useMemo(() => summarize(orders ?? []), [orders]);
  const max = Math.max(1, ...r.byDay.map(([, v]) => v));

  async function exportExcel() {
    if (!orders) return;
    setBusy(true);
    try {
      const { default: writeExcelFile } = await import("write-excel-file/browser");
      const head = (cols: string[]) => cols.map((value) => ({ value, fontWeight: "bold" as const }));
      const orderRows = [head(["Order", "Date", "Customer", "Status", "Payment", "Discount USD", "Delivery USD", "Total USD"]),
        ...orders.map((o) => [{ value: o.order_no ?? "" }, { value: o.created_at.slice(0, 16).replace("T", " ") }, { value: o.profiles?.business_name || o.profiles?.name || "" }, { value: o.status }, { value: o.payment_method }, { value: Number(o.discount_usd), type: Number }, { value: Number(o.delivery_fee_usd), type: Number }, { value: Number(o.total_usd), type: Number }])];
      const itemRows = [head(["Order", "Status", "SKU", "Product", "Qty", "Line total USD"]),
        ...orders.flatMap((o) => o.order_items.map((i) => [{ value: o.order_no ?? "" }, { value: o.status }, { value: i.products?.sku ?? "" }, { value: i.products?.name_en ?? "" }, { value: i.qty, type: Number }, { value: Number(i.line_total_usd), type: Number }]))];
      const summaryRows = [head(["Metric", "Value"]), ...([["From", from], ["To", to], ["Orders (excl. cancelled)", r.count], ["Cancelled", r.cancelled], ["Revenue USD", r.revenue], ["Collected USD", r.paid], ["Average order USD", r.average], ["Discounts USD", r.discounts], ["Delivery fees USD", r.deliveryFees]] as [string, string | number][]).map(([k, v]) => [{ value: k }, typeof v === "number" ? { value: Math.round(v * 100) / 100, type: Number } : { value: v }])];
      await writeExcelFile([
        { data: summaryRows, sheet: "Summary", columns: [{ width: 26 }, { width: 16 }] },
        { data: orderRows, sheet: "Orders", stickyRowsCount: 1, columns: [{ width: 12 }, { width: 18 }, { width: 28 }, { width: 14 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }] },
        { data: itemRows, sheet: "Items", stickyRowsCount: 1, columns: [{ width: 12 }, { width: 14 }, { width: 14 }, { width: 32 }, { width: 8 }, { width: 14 }] },
      ] as never).toFile(`provisionkh-sales-${from}-to-${to}.xlsx`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const stats: [string, string][] = [["ចំណូល · Revenue", usd(r.revenue)], ["បានទទួល · Collected", usd(r.paid)], ["ការបញ្ជាទិញ · Orders", String(r.count)], ["មធ្យម · Avg order", usd(r.average)], ["បញ្ចុះ · Discounts", usd(r.discounts)], ["ថ្លៃដឹក · Delivery", usd(r.deliveryFees)]];

  return <>
    <PageHead title="របាយការណ៍លក់ · Sales report" subtitle="មិនរាប់ការបញ្ជាទិញដែលបានលុបចោល · Cancelled orders excluded">
      <Button onClick={() => void exportExcel()} disabled={!orders || busy}><Download className="size-4" />{busy ? "…" : "Excel"}</Button>
    </PageHead>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">ពី · From<input type="date" className={`${inputCls} ml-2 font-sans`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="text-sm">ដល់ · To<input type="date" className={`${inputCls} ml-2 font-sans`} value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{stats.map(([l, v]) => <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-sans text-lg font-bold tabular-nums">{orders ? v : "…"}</p></CardContent></Card>)}</div>
    {!orders ? <Card className="mt-4"><CardContent className="p-0"><SkeletonRows n={5} /></CardContent></Card> : <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card><CardContent className="p-4"><strong>ចំណូលប្រចាំថ្ងៃ · Daily revenue</strong>
        {r.byDay.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">គ្មានទិន្នន័យ · No sales</p> : <div className="mt-3 space-y-1.5">{r.byDay.map(([d, v]) => <div key={d} className="flex items-center gap-2 text-xs"><span className="w-20 shrink-0 font-sans text-muted-foreground">{d.slice(5)}</span><div className="h-4 flex-1 rounded-sm bg-muted"><div className="h-4 rounded-sm bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div><span className="w-20 text-right font-sans tabular-nums">{usd(v)}</span></div>)}</div>}
      </CardContent></Card>
      <Card><CardContent className="p-4"><strong>តាមវិធីទូទាត់ · By payment</strong>
        <ul className="mt-3 space-y-1 text-sm">{r.byMethod.map(([m, v]) => <li key={m} className="flex justify-between"><span>{METHOD_KM[m] ?? m}</span><span className="font-sans tabular-nums">{usd(v)}</span></li>)}</ul>
        <strong className="mt-5 block">ទំនិញលក់ដាច់ · Top products</strong>
        <table className="mt-2 w-full text-sm"><tbody>{r.topProducts.slice(0, 10).map((p) => <tr key={p.sku} className="border-t border-border"><td className="py-1.5">{p.name} <span className="font-sans text-xs text-muted-foreground">{p.sku}</span></td><td className="py-1.5 text-right font-sans tabular-nums">{p.qty}</td><td className="py-1.5 text-right font-sans tabular-nums">{usd(p.total)}</td></tr>)}</tbody></table>
      </CardContent></Card>
    </div>}
  </>;
}
