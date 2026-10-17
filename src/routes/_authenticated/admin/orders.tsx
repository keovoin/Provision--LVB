import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button, Card, CardContent, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { METHOD_KM, PageHead, SkeletonRows, StatusBadge, Tabs, day, usd , toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "ការបញ្ជាទិញ | ProvisionKH Ops" }, { name: "description", content: "Manage ProvisionKH wholesale orders." }, { property: "og:title", content: "ProvisionKH Orders" }, { property: "og:description", content: "Wholesale order operations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrdersPage,
});

interface Order { id: string; order_no: string | null; status: string; payment_method: string; total_usd: number; created_at: string; delivery_address: string; note: string | null; delivery_lat: number | null; delivery_lng: number | null; profiles: { business_name: string | null; name: string; phone: string } | null; order_items: { qty: number; unit_price_usd: number; line_total_usd: number; products: { id: string; name_km: string; unit_km: string; stock_qty: number } | null }[]; payments: { id: string; payment_no: string | null; status: string; method: string; amount_usd: number; amount_khr: number; bank_ref: string | null; settled_at: string | null; credit_due_at: string | null }[] }

const NEXT: Record<string, [string, string] | undefined> = {
  pending: ["picking", "ចាប់ផ្តើមរៀបចំ"], paid: ["picking", "ចាប់ផ្តើមរៀបចំ"],
  picking: ["out_for_delivery", "ចេញដឹក"], out_for_delivery: ["delivered", "បានដឹកដល់"],
};
type Tab = "all" | "pending" | "paid" | "picking" | "out_for_delivery" | "delivered" | "cancelled";

function OrdersPage() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("orders").select("id,order_no,status,payment_method,total_usd,created_at,delivery_address,note,delivery_lat,delivery_lng,profiles(business_name,name,phone),order_items(qty,unit_price_usd,line_total_usd,products(id,name_km,unit_km,stock_qty)),payments(id,payment_no,status,method,amount_usd,amount_khr,bank_ref,settled_at,credit_due_at)").order("created_at", { ascending: false }).limit(200);
    if (error) toast.error(error.message); else setRows(data as unknown as Order[]);
  }, []);
  useEffect(() => { void load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const counts = useMemo(() => { const c: Record<string, number> = {}; for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1; return c; }, [rows]);
  const shown = (rows ?? []).filter((r) => (tab === "all" || r.status === tab) && `${r.order_no} ${r.profiles?.business_name ?? ""} ${r.profiles?.name ?? ""} ${r.profiles?.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  async function setStatus(o: Order, status: string) {
    if (status === "cancelled" && !window.confirm(`បោះបង់ ${o.order_no}?`)) return;
    const { error } = await supabase.from("orders").update({ status: status as Order["status"] as never, updated_at: new Date().toISOString() }).eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(`${o.order_no} → ${status}`); void load();
  }

  async function confirmPay(o: Order, p: Order["payments"][number]) {
    const short = o.order_items.filter((i) => i.products && i.qty > i.products.stock_qty);
    if (short.length > 0) {
      const list = short.map((i) => `• ${i.products!.name_km}: ត្រូវការ ${i.qty} ប៉ុន្តែនៅសល់តែ ${i.products!.stock_qty}`).join("\n");
      if (!window.confirm(`⚠️ ស្តុកមិនគ្រប់សម្រាប់ការបញ្ជាទិញនេះ:\n${list}\n\nតើអ្នកនៅតែចង់បញ្ជាក់ការទទួលប្រាក់ទេ?`)) return;
    }
    const ref = window.prompt(`បញ្ជាក់ការទទួលប្រាក់ ${usd(p.amount_usd)} សម្រាប់ ${o.order_no}?\nលេខយោងធនាគារ (ស្រេចចិត្ត):`, "");
    if (ref === null) return;
    const { error } = await supabase.rpc("confirm_payment", { _payment_id: p.id, _bank_ref: ref });
    if (error) return toast.error(error.message);
    toast.success(`${o.order_no} បានបង់ប្រាក់`); void load();
  }

  return <>
    <PageHead title="ការបញ្ជាទិញ" subtitle="តាមដាន និងរៀបចំការបញ្ជាទិញ · អាប់ដេតរៀងរាល់ ១៥ វិនាទី" />
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Tabs value={tab} onChange={setTab} items={[["all", "ទាំងអស់", rows?.length], ["pending", "រង់ចាំ", counts.pending ?? 0], ["paid", "បានបង់", counts.paid ?? 0], ["picking", "រៀបចំ", counts.picking ?? 0], ["out_for_delivery", "កំពុងដឹក", counts.out_for_delivery ?? 0], ["delivered", "ដឹកដល់", counts.delivered ?? 0], ["cancelled", "បោះបង់", counts.cancelled ?? 0]]} />
      <div className="w-full max-w-xs"><SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="លេខ ឈ្មោះ ឬទូរស័ព្ទ…" /></div>
    </div>
    <Card className="mt-4"><CardContent className="p-0">
      {!rows ? <SkeletonRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-3">លេខ</th><th className="p-3">អតិថិជន</th><th className="p-3">ថ្ងៃ</th><th className="p-3">ការទូទាត់</th><th className="p-3 text-right">សរុប</th><th className="p-3">ស្ថានភាព</th><th className="p-3 text-right">សកម្មភាព</th></tr></thead>
        <tbody>{shown.map((o) => { const next = NEXT[o.status]; return <Fragment key={o.id}>
          <tr className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setOpen(open === o.id ? null : o.id)}>
            <td className="p-3 font-sans font-semibold">{o.order_no}</td>
            <td className="p-3"><p className="font-medium">{o.profiles?.business_name || o.profiles?.name || "—"}</p><p className="font-sans text-xs text-muted-foreground">{o.profiles?.phone}</p></td>
            <td className="p-3 font-sans text-muted-foreground">{day(o.created_at)}</td>
            <td className="p-3">{METHOD_KM[o.payment_method]}{o.payments[0] && <span className="ml-2"><StatusBadge status={o.payments[0].status} /></span>}</td>
            <td className="p-3 text-right font-sans font-semibold tabular-nums">{usd(o.total_usd)}</td>
            <td className="p-3"><StatusBadge status={o.status} /></td>
            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}><span className="inline-flex gap-2"><Button size="sm" variant="outline" asChild><Link to="/receipt/$orderId" params={{ orderId: o.id }} target="_blank">{o.payments[0]?.status === "paid" ? "បោះពុម្ពបង្កាន់ដៃ" : "វិក្កយបត្រ"}</Link></Button>{next && <Button size="sm" onClick={() => setStatus(o, next[0])}>{next[1]}</Button>}</span></td>
          </tr>
          {open === o.id && <tr className="bg-muted/30"><td colSpan={7} className="p-4">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <table className="w-full text-sm"><tbody>{o.order_items.map((i, k) => <tr key={k} className="border-b border-border"><td className="py-1.5">{i.products?.name_km}</td><td className="py-1.5 font-sans tabular-nums">{i.qty} {i.products?.unit_km}</td><td className="py-1.5 font-sans tabular-nums">{usd(i.unit_price_usd)}</td><td className="py-1.5 text-right font-sans font-semibold tabular-nums">{usd(i.line_total_usd)}</td></tr>)}</tbody></table>
              <div className="space-y-2 text-sm"><p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{o.delivery_address}</p>
                {o.delivery_lat != null && <a className="font-semibold text-primary" target="_blank" rel="noopener noreferrer" href={`https://maps.google.com/?q=${o.delivery_lat},${o.delivery_lng}`}>បើកផែនទី</a>}
                {o.note && <p className="text-muted-foreground">កំណត់ចំណាំ: {o.note}</p>}
                {o.payments.map((p) => <div key={p.id} className="rounded-control border border-border bg-surface p-3">
                  <p className="flex items-center justify-between font-semibold"><span>ការទូទាត់ <span className="font-sans">{p.payment_no}</span></span><StatusBadge status={p.status} /></p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-2 text-xs"><dt className="text-muted-foreground">វិធី</dt><dd>{METHOD_KM[p.method] ?? p.method}</dd>
                    <dt className="text-muted-foreground">ចំនួន</dt><dd className="font-sans tabular-nums">{usd(p.amount_usd)} · ៛{Number(p.amount_khr).toLocaleString()}</dd>
                    {p.bank_ref && <><dt className="text-muted-foreground">លេខយោង</dt><dd className="font-sans">{p.bank_ref}</dd></>}
                    {p.settled_at && <><dt className="text-muted-foreground">ទទួលនៅ</dt><dd className="font-sans">{day(p.settled_at)}</dd></>}
                    {p.credit_due_at && <><dt className="text-muted-foreground">ផុតកំណត់</dt><dd className="font-sans">{day(p.credit_due_at)}</dd></>}</dl>
                  {p.status !== "paid" && o.status !== "cancelled" && <Button size="sm" className="mt-2 w-full" onClick={() => void confirmPay(o, p)}>បញ្ជាក់បានទទួលប្រាក់</Button>}
                </div>)}
                {!["delivered", "cancelled"].includes(o.status) && <Button size="sm" variant="outline" onClick={() => setStatus(o, "cancelled")}>បោះបង់ការបញ្ជាទិញ</Button>}
              </div>
            </div>
          </td></tr>}
        </Fragment>; })}</tbody>
      </table>{!shown.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនមានការបញ្ជាទិញ</p>}</div>}
    </CardContent></Card>
  </>;
}
