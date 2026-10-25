import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { METHOD_KM, PageHead, SkeletonRows, StatusBadge, Tabs, day, usd , toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/receivables")({
  head: () => ({ meta: [{ title: "ប្រាក់ត្រូវទទួល | SastraKH Ops" }, { name: "description", content: "Track unpaid and overdue SastraKH invoices." }, { property: "og:title", content: "SastraKH Receivables" }, { property: "og:description", content: "Unpaid and overdue invoices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReceivablesPage,
});

interface Pay { id: string; payment_no: string | null; method: string; status: string; amount_usd: number; created_at: string; credit_due_at: string | null; settled_at: string | null; orders: { order_no: string | null; status: string } | null; profiles: { business_name: string | null; name: string } | null }

function ReceivablesPage() {
  const [rows, setRows] = useState<Pay[] | null>(null);
  const [tab, setTab] = useState<"open" | "overdue" | "paid">("open");
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("payments").select("id,payment_no,method,status,amount_usd,created_at,credit_due_at,settled_at,orders(order_no,status),profiles(business_name,name)").in("method", ["net30", "cod"]).order("created_at", { ascending: false }).limit(300);
    if (error) toast.error(error.message); setRows((data ?? []) as unknown as Pay[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const now = Date.now();
  const open = (rows ?? []).filter((p) => p.status === "pending" && p.orders?.status !== "cancelled");
  const overdue = open.filter((p) => p.credit_due_at && new Date(p.credit_due_at).getTime() < now);
  const paid = (rows ?? []).filter((p) => p.status === "paid");
  const shown = tab === "open" ? open : tab === "overdue" ? overdue : paid;
  const sum = (l: Pay[]) => l.reduce((s, p) => s + Number(p.amount_usd), 0);

  async function markPaid(p: Pay) {
    const ref = window.prompt(`កត់ត្រាការបង់ ${usd(p.amount_usd)} — លេខយោង (ជម្រើស)`, "");
    if (ref === null) return;
    const { error } = await supabase.from("payments").update({ status: "paid", settled_at: new Date().toISOString(), bank_ref: ref.trim() || null, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("បានកត់ត្រាការបង់"); void load();
  }

  return <>
    <PageHead title="ប្រាក់ត្រូវទទួល" subtitle="ឥណទាន និងសាច់ប្រាក់ពេលដឹក" />
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {[["មិនទាន់បង់", sum(open), open.length], ["ហួសកាលកំណត់", sum(overdue), overdue.length], ["បានទទួល", sum(paid), paid.length]].map(([l, v, n]) =>
        <Card key={l as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-sans text-2xl font-bold tabular-nums">{usd(v as number)}</p><p className="text-xs text-muted-foreground">{n} វិក្កយបត្រ</p></CardContent></Card>)}
    </div>
    <div className="mt-4"><Tabs value={tab} onChange={setTab} items={[["open", "មិនទាន់បង់", open.length], ["overdue", "ហួសកំណត់", overdue.length], ["paid", "បានបង់", paid.length]]} /></div>
    <Card className="mt-4"><CardContent className="p-0">{!rows ? <SkeletonRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-3">វិក្កយបត្រ</th><th className="p-3">អតិថិជន</th><th className="p-3">វិធី</th><th className="p-3">ផុតកំណត់</th><th className="p-3 text-right">ចំនួន</th><th className="p-3">ស្ថានភាព</th><th className="p-3" /></tr></thead>
      <tbody>{shown.map((p) => { const late = p.status === "pending" && p.credit_due_at && new Date(p.credit_due_at).getTime() < now; return <tr key={p.id} className="border-t border-border">
        <td className="p-3 font-sans"><p className="font-semibold">{p.payment_no}</p><p className="text-xs text-muted-foreground">{p.orders?.order_no}</p></td>
        <td className="p-3">{p.profiles?.business_name || p.profiles?.name || "—"}</td>
        <td className="p-3">{METHOD_KM[p.method]}</td>
        <td className={`p-3 font-sans ${late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{p.credit_due_at ? day(p.credit_due_at) : "—"}{late && " · ហួស"}</td>
        <td className="p-3 text-right font-sans font-semibold tabular-nums">{usd(p.amount_usd)}</td>
        <td className="p-3"><StatusBadge status={p.status} /></td>
        <td className="p-3 text-right">{p.status === "pending" && <Button size="sm" onClick={() => markPaid(p)}>កត់ត្រាការបង់</Button>}</td>
      </tr>; })}</tbody></table>{!shown.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនមានវិក្កយបត្រ</p>}</div>}</CardContent></Card>
  </>;
}
