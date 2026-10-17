import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellRing, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/app/admin-ui";

interface Row { id: string; order_no: string | null; status: string; total_usd: number; created_at: string; profiles: { business_name: string | null; name: string } | null }

/** Staff-only live list of open orders shown on the store home page. Polls while the tab is visible. */
export function OrderTracker({ userId }: { userId: string }) {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { void supabase.rpc("can_access", { _user_id: userId, _section: "orders" }).then(({ data }) => setAllowed(Boolean(data))); }, [userId]);
  useEffect(() => {
    if (!allowed) return;
    const load = () => { if (document.visibilityState !== "visible") return; void supabase.from("orders").select("id,order_no,status,total_usd,created_at,profiles(business_name,name)").in("status", ["pending", "paid", "picking", "out_for_delivery"]).order("created_at", { ascending: false }).limit(5).then(({ data }) => setRows((data ?? []) as unknown as Row[])); };
    load(); const t = window.setInterval(load, 20000); return () => window.clearInterval(t);
  }, [allowed]);
  const [mine, setMine] = useState<Row[] | null>(null);
  useEffect(() => { if (allowed) return; void supabase.from("orders").select("id,order_no,status,total_usd,created_at,profiles(business_name,name)").eq("customer_id", userId).order("created_at", { ascending: false }).limit(3).then(({ data }) => setMine((data ?? []) as unknown as Row[])); }, [allowed, userId]);
  if (!allowed) return mine && mine.length > 0 ? <Card className="mt-4"><CardContent className="p-3">
    <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-primary" />តាមដានការបញ្ជាទិញរបស់ខ្ញុំ</p>
      <Link to="/store/orders" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary">មើលទាំងអស់<ChevronRight className="size-4" /></Link></div>
    <ul className="divide-y divide-border">{mine.map((r) => <li key={r.id}><Link to="/store/order/$orderId" params={{ orderId: r.id }} className="flex min-h-12 items-center justify-between gap-2 py-2">
      <span className="font-sans text-sm font-semibold">{r.order_no}</span>
      <span className="flex items-center gap-2"><span className="font-sans text-sm font-semibold tabular-nums">${Number(r.total_usd).toFixed(2)}</span><StatusBadge status={r.status} /></span>
    </Link></li>)}</ul>
  </CardContent></Card> : null;
  const fresh = rows.filter((r) => r.status === "pending" || r.status === "paid").length;
  return <Card className="mt-4"><CardContent className="p-3">
    <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-primary" />ការបញ្ជាទិញថ្មី <span className="font-sans">({fresh})</span></p>
      <Link to="/admin/orders" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary">មើលទាំងអស់<ChevronRight className="size-4" /></Link></div>
    {rows.length === 0 ? <p className="py-2 text-sm text-muted-foreground">មិនមានការបញ្ជាទិញកំពុងរង់ចាំ</p> : <ul className="divide-y divide-border">{rows.map((r) => <li key={r.id}><Link to="/admin/orders" className="flex min-h-12 items-center justify-between gap-2 py-2">
      <span className="min-w-0"><span className="block font-sans text-sm font-semibold">{r.order_no}</span><span className="block truncate text-xs text-muted-foreground">{r.profiles?.business_name || r.profiles?.name}</span></span>
      <span className="flex shrink-0 items-center gap-2"><span className="font-sans text-sm font-semibold tabular-nums">${Number(r.total_usd).toFixed(2)}</span><StatusBadge status={r.status} /></span>
    </Link></li>)}</ul>}
  </CardContent></Card>;
}
