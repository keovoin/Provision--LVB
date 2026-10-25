import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, inputCls, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/drops")({
  head: () => ({ meta: [{ title: "ដឹកជញ្ជូនប្រចាំ | SastraKH Ops" }, { name: "description", content: "Schedule recurring SastraKH deliveries." }, { property: "og:title", content: "SastraKH Recurring Deliveries" }, { property: "og:description", content: "Recurring delivery schedules." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DropsPage,
});

const DAYS: [string, string][] = [["mon", "ច"], ["tue", "អ"], ["wed", "ពុ"], ["thu", "ព្រ"], ["fri", "សុ"], ["sat", "ស"], ["sun", "អា"]];
const TODAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
interface Drop { id: string; name: string; customer_id: string; delivery_time: string; days: string[]; active: boolean; drop_items: { id: string; qty: number; product_id: string }[] }
interface Opt { id: string; label: string }
interface Line { product_id: string; qty: string }

function DropsPage() {
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [form, setForm] = useState<{ name: string; customer_id: string; time: string; days: string[]; lines: Line[] } | null>(null);
  const load = useCallback(async () => {
    const [d, c, p] = await Promise.all([
      supabase.from("drops").select("id,name,customer_id,delivery_time,days,active,drop_items(id,qty,product_id)").order("delivery_time"),
      supabase.from("profiles").select("id,name,business_name").order("name"),
      supabase.from("products").select("id,name_km,unit_km").eq("active", true).order("name_km"),
    ]);
    if (d.error) toast.error(d.error.message);
    setDrops((d.data ?? []) as Drop[]);
    setCustomers((c.data ?? []).map((x) => ({ id: x.id, label: x.business_name || x.name })));
    setProducts((p.data ?? []).map((x) => ({ id: x.id, label: `${x.name_km} (${x.unit_km})` })));
  }, []);
  useEffect(() => { void load(); }, [load]);
  const cName = (id: string) => customers.find((c) => c.id === id)?.label ?? "—";
  const pName = (id: string) => products.find((c) => c.id === id)?.label ?? "—";

  async function create() {
    if (!form) return;
    const lines = form.lines.filter((l) => l.product_id && Number(l.qty) > 0);
    if (!form.name.trim() || !form.customer_id || !form.days.length || !lines.length) return toast.error("សូមបំពេញឈ្មោះ អតិថិជន ថ្ងៃ និងទំនិញយ៉ាងហោចណាស់មួយ");
    const { data, error } = await supabase.from("drops").insert({ name: form.name.trim(), customer_id: form.customer_id, delivery_time: form.time, days: form.days, active: true }).select("id").single();
    if (error) return toast.error(error.message);
    const r = await supabase.from("drop_items").insert(lines.map((l) => ({ drop_id: data.id, product_id: l.product_id, qty: Math.round(Number(l.qty)) })));
    if (r.error) return toast.error(r.error.message);
    toast.success("បានបង្កើតកាលវិភាគ"); setForm(null); void load();
  }
  async function toggle(d: Drop) {
    const { error } = await supabase.from("drops").update({ active: !d.active }).eq("id", d.id);
    if (error) toast.error(error.message); else void load();
  }
  async function remove(d: Drop) {
    if (!window.confirm(`លុប ${d.name}?`)) return;
    await supabase.from("drop_items").delete().eq("drop_id", d.id);
    const { error } = await supabase.from("drops").delete().eq("id", d.id);
    if (error) toast.error(error.message); else { toast.success("បានលុប"); void load(); }
  }

  const todays = (drops ?? []).filter((d) => d.active && d.days.includes(TODAY));
  return <>
    <PageHead title="ដឹកជញ្ជូនប្រចាំ" subtitle={`កាលវិភាគដឹកជញ្ជូនប្រចាំសប្តាហ៍ · ថ្ងៃនេះ ${todays.length} ជើង`}>
      {!form && <Button onClick={() => setForm({ name: "", customer_id: "", time: "08:00", days: [], lines: [{ product_id: "", qty: "1" }] })}><Plus className="size-4" />បង្កើតថ្មី</Button>}
    </PageHead>
    {form && <Card className="mt-5"><CardContent className="space-y-3 p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <input aria-label="Name" className={inputCls} placeholder="ឈ្មោះ (ឧ. ហាងកាហ្វេ — ព្រឹក)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select aria-label="Customer" className={inputCls} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">ជ្រើសអតិថិជន</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <input aria-label="Time" type="time" className={`${inputCls} font-sans`} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-1.5">{DAYS.map(([k, l]) => { const on = form.days.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => setForm({ ...form, days: on ? form.days.filter((x) => x !== k) : [...form.days, k] })} className={`size-10 rounded-control border text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}</button>; })}</div>
      {form.lines.map((l, i) => <div key={i} className="flex gap-2">
        <select aria-label="Product" className={`${inputCls} flex-1`} value={l.product_id} onChange={(e) => setForm({ ...form, lines: form.lines.map((x, j) => j === i ? { ...x, product_id: e.target.value } : x) })}><option value="">ជ្រើសទំនិញ</option>{products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        <input aria-label="Quantity" inputMode="numeric" className={`${inputCls} w-20 font-sans`} value={l.qty} onChange={(e) => setForm({ ...form, lines: form.lines.map((x, j) => j === i ? { ...x, qty: e.target.value } : x) })} />
        <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
      </div>)}
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, { product_id: "", qty: "1" }] })}><Plus className="size-4" />បន្ថែមទំនិញ</Button><div className="flex-1" /><Button size="sm" variant="ghost" onClick={() => setForm(null)}>បោះបង់</Button><Button size="sm" onClick={create}>រក្សាទុក</Button></div>
    </CardContent></Card>}
    <Card className="mt-4"><CardContent className="p-0">{!drops ? <SkeletonRows /> : <div className="divide-y divide-border">{drops.map((d) => <div key={d.id} className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[200px] flex-1"><p className="font-medium">{d.name} <span className="font-sans text-sm text-muted-foreground">{d.delivery_time.slice(0, 5)}</span></p><p className="text-xs text-muted-foreground">{cName(d.customer_id)} · {d.drop_items.map((i) => `${pName(i.product_id)} ×${i.qty}`).join(", ")}</p></div>
      <div className="flex gap-1">{DAYS.map(([k, l]) => <span key={k} className={`grid size-7 place-items-center rounded-control text-[11px] ${d.days.includes(k) ? "bg-secondary font-semibold text-primary" : "text-muted-foreground"}`}>{l}</span>)}</div>
      {d.days.includes(TODAY) && d.active && <Badge variant="warning">ថ្ងៃនេះ</Badge>}
      <Button size="sm" variant="outline" onClick={() => toggle(d)}>{d.active ? "ផ្អាក" : "បើកវិញ"}</Button>
      <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => remove(d)}><Trash2 className="size-4" /></Button>
    </div>)}{!drops.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនទាន់មានកាលវិភាគ</p>}</div>}</CardContent></Card>
  </>;
}
