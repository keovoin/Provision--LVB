import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardContent, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, StatusBadge, Tabs, day, inputCls, usd , toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "អតិថិជន | ProvisionKH Ops" }, { name: "description", content: "Manage ProvisionKH wholesale customers and credit." }, { property: "og:title", content: "ProvisionKH Customers" }, { property: "og:description", content: "Wholesale customer operations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CustomersPage,
});

interface Customer { id: string; name: string; phone: string; business_name: string | null; business_address: string | null; telegram: string | null; credit_limit_usd: number | null; credit_terms_days: number | null; created_at: string }
interface CreditReq { id: string; customer_id: string; amount_usd: number; note: string | null; status: string; created_at: string }

function CustomersPage() {
  const [tab, setTab] = useState<"list" | "credit">("list");
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [reqs, setReqs] = useState<CreditReq[]>([]);
  const [q, setQ] = useState("");
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      supabase.from("profiles").select("id,name,phone,business_name,business_address,telegram,credit_limit_usd,credit_terms_days,created_at").order("created_at", { ascending: false }),
      supabase.from("credit_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    setRows((c.data ?? []) as Customer[]); setReqs((r.data ?? []) as CreditReq[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const byId = Object.fromEntries((rows ?? []).map((c) => [c.id, c]));

  async function saveLimit(c: Customer) {
    const raw = limits[c.id]; const v = raw === "" ? null : Number(raw);
    if (v !== null && (!Number.isFinite(v) || v < 0)) return toast.error("ចំនួនមិនត្រឹមត្រូវ");
    const rawT = terms[c.id]; const tv = rawT === "" || rawT === undefined ? (rawT === "" ? null : c.credit_terms_days) : Number(rawT);
    if (tv !== null && (!Number.isInteger(tv) || tv < 1 || tv > 365)) return toast.error("រយៈពេលឥណទាន ១–៣៦៥ ថ្ងៃ / Terms 1–365 days");
    if (tv !== null && v === null && limits[c.id] !== undefined) return toast.error("កំណត់ចំនួនឥណទានជាមុនសិន / Set a credit limit first");
    if (!window.confirm(`កំណត់ឥណទាន ${c.business_name || c.name} = ${v === null ? "គ្មាន" : usd(v)}${tv != null ? ` · Net ${tv} ថ្ងៃ` : ""}?`)) return;
    const { error } = await supabase.from("profiles").update({ credit_limit_usd: v, credit_terms_days: tv }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("បានរក្សាទុក"); setLimits((s) => { const n = { ...s }; delete n[c.id]; return n; }); setTerms((s) => { const n = { ...s }; delete n[c.id]; return n; }); void load();
  }
  async function decide(r: CreditReq, approve: boolean) {
    const c = byId[r.customer_id];
    if (!window.confirm(`${approve ? "អនុម័ត" : "បដិសេធ"} ${usd(r.amount_usd)} សម្រាប់ ${c?.business_name || c?.name}?`)) return;
    if (approve) { const { error } = await supabase.from("profiles").update({ credit_limit_usd: r.amount_usd }).eq("id", r.customer_id); if (error) return toast.error(error.message); }
    const { error } = await supabase.from("credit_requests").update({ status: approve ? "approved" : "rejected" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("រួចរាល់"); void load();
  }

  const pending = reqs.filter((r) => r.status === "pending").length;
  const shown = (rows ?? []).filter((c) => `${c.name} ${c.business_name ?? ""} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title="អតិថិជន" subtitle="គណនីអាជីវកម្ម និងឥណទាន" />
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Tabs value={tab} onChange={setTab} items={[["list", "អតិថិជន", rows?.length], ["credit", "សំណើឥណទាន", pending]]} />
      {tab === "list" && <div className="w-full max-w-xs"><SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="ឈ្មោះ ឬទូរស័ព្ទ…" /></div>}
    </div>
    <Card className="mt-4"><CardContent className="p-0">{!rows ? <SkeletonRows /> : tab === "list" ?
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-3">អាជីវកម្ម</th><th className="p-3">ទូរស័ព្ទ / Telegram</th><th className="p-3">ទីតាំង</th><th className="p-3">ចូលរួម</th><th className="p-3">ឥណទាន (USD) · រយៈពេល (ថ្ងៃ)</th></tr></thead>
        <tbody>{shown.map((c) => <tr key={c.id} className="border-t border-border">
          <td className="p-3"><p className="font-medium">{c.business_name || "—"}</p><p className="text-xs text-muted-foreground">{c.name}</p></td>
          <td className="p-3 font-sans text-xs">{c.phone || "—"}<br />{c.telegram}</td>
          <td className="max-w-[220px] truncate p-3 text-xs text-muted-foreground">{c.business_address || "—"}</td>
          <td className="p-3 font-sans text-xs text-muted-foreground">{day(c.created_at)}</td>
          <td className="p-3"><div className="flex items-center gap-2"><input aria-label="Credit limit" inputMode="decimal" className={`${inputCls} w-24 font-sans`} value={limits[c.id] ?? (c.credit_limit_usd ?? "").toString()} onChange={(e) => setLimits((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="0" /><input aria-label="Credit terms (days)" inputMode="numeric" className={`${inputCls} w-16 font-sans`} value={terms[c.id] ?? (c.credit_terms_days ?? "").toString()} onChange={(e) => setTerms((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="ថ្ងៃ" title="Net terms in days, e.g. 7, 14, 30" />{(limits[c.id] !== undefined || terms[c.id] !== undefined) && <Button size="sm" onClick={() => saveLimit(c)}>រក្សាទុក</Button>}</div>{c.credit_terms_days != null && <p className="mt-1 text-xs text-muted-foreground">Net {c.credit_terms_days} ថ្ងៃ</p>}</td>
        </tr>)}</tbody></table>{!shown.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនមានអតិថិជន</p>}</div>
      : <div className="divide-y divide-border">{reqs.map((r) => { const c = byId[r.customer_id]; return <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-0 flex-1"><p className="font-medium">{c?.business_name || c?.name || "—"} · <span className="font-sans">{usd(r.amount_usd)}</span></p><p className="text-xs text-muted-foreground">{day(r.created_at)} · ឥណទានបច្ចុប្បន្ន {c?.credit_limit_usd != null ? usd(c.credit_limit_usd) : "គ្មាន"}{r.note ? ` · ${r.note}` : ""}</p></div>
          <StatusBadge status={r.status} />
          {r.status === "pending" && <><Button size="sm" onClick={() => decide(r, true)}>អនុម័ត</Button><Button size="sm" variant="outline" onClick={() => decide(r, false)}>បដិសេធ</Button></>}
        </div>; })}{!reqs.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនមានសំណើ</p>}</div>}
    </CardContent></Card>
  </>;
}
