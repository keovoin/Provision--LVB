import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, CreditCard, DollarSign, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { AdminCharts } from "@/app/AdminCharts";
import { PageHead, SkeletonRows, StatusBadge, day, usd } from "@/app/admin-ui";

interface Order { id: string; order_no: string | null; status: string; total_usd: number; created_at: string; profiles: { business_name: string | null; name: string } | null }
export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "ប្រតិបត្តិការ | ProvisionKH" }, { name: "description", content: "ProvisionKH wholesale operations dashboard." }, { property: "og:title", content: "ProvisionKH Operations" }, { property: "og:description", content: "Wholesale operations dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [month, setMonth] = useState<Order[] | null>(null);
  const [low, setLow] = useState(0);
  const [credit, setCredit] = useState(0);
  useEffect(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const load = () => void Promise.all([
      supabase.from("orders").select("id,order_no,status,total_usd,created_at,profiles(business_name,name)").gte("created_at", start.toISOString()).order("created_at", { ascending: false }),
      supabase.from("products").select("stock_qty,reorder_threshold").eq("active", true),
      supabase.from("credit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]).then(([o, p, c]) => { setMonth((o.data ?? []) as unknown as Order[]); setLow((p.data ?? []).filter((x) => x.stock_qty <= x.reorder_threshold).length); setCredit(c.count ?? 0); });
    load(); const t = setInterval(load, 20000); return () => clearInterval(t);
  }, []);
  const live = (month ?? []).filter((o) => o.status !== "cancelled");
  const today = new Date().toDateString();
  const todays = live.filter((o) => new Date(o.created_at).toDateString() === today);
  const sum = (l: Order[]) => l.reduce((s, o) => s + Number(o.total_usd), 0);
  const toFulfil = live.filter((o) => ["pending", "paid", "picking"].includes(o.status)).length;
  const stats: [string, string, typeof DollarSign, string?][] = [
    ["លក់ថ្ងៃនេះ", `${usd(sum(todays))} · ${todays.length}`, DollarSign],
    ["លក់ខែនេះ", `${usd(sum(live))} · ${live.length}`, ShoppingBag],
    ["ត្រូវរៀបចំ", String(toFulfil), Clock3, "/admin/orders"],
    ["ស្តុកទាប", String(low), AlertTriangle, "/admin/products"],
    ["សំណើឥណទាន", String(credit), CreditCard, "/admin/customers"],
  ];
  return <>
    <PageHead title="ទិដ្ឋភាពទូទៅ" subtitle="សង្ខេបខែនេះ · អាប់ដេតរៀងរាល់ ២០ វិនាទី" />
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map(([l, v, Icon, to]) => {
      const body = <Card className="h-full"><CardContent className="p-4"><div className="flex items-center justify-between text-xs text-muted-foreground">{l}<Icon className="size-4 text-primary" /></div><p className="mt-2 font-sans text-xl font-bold tabular-nums">{month ? v : "…"}</p></CardContent></Card>;
      return to ? <Link key={l} to={to}>{body}</Link> : <div key={l}>{body}</div>;
    })}</div>
    <AdminCharts />
    <Card className="mt-5"><CardContent className="p-0">
      <div className="flex items-center justify-between border-b border-border p-4"><strong>ការបញ្ជាទិញថ្មីៗ</strong><Link to="/admin/orders" className="text-sm font-semibold text-primary">មើលទាំងអស់</Link></div>
      {!month ? <SkeletonRows n={5} /> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><tbody>{month.slice(0, 10).map((o) => <tr key={o.id} className="border-t border-border first:border-0">
        <td className="p-3 font-sans font-semibold">{o.order_no}</td><td className="p-3">{o.profiles?.business_name || o.profiles?.name || "—"}</td><td className="p-3 font-sans text-muted-foreground">{day(o.created_at)}</td><td className="p-3 text-right font-sans font-semibold tabular-nums">{usd(o.total_usd)}</td><td className="p-3"><StatusBadge status={o.status} /></td></tr>)}</tbody></table>
        {!month.length && <p className="p-8 text-center text-sm text-muted-foreground">មិនទាន់មានការបញ្ជាទិញខែនេះ</p>}</div>}
    </CardContent></Card>
  </>;
}
