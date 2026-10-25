import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Field, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, inputCls, day, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  head: () => ({ meta: [{ title: "បញ្ចុះតម្លៃ | SastraKH" }, { name: "description", content: "Manage SastraKH promo codes and timed sales." }, { property: "og:title", content: "SastraKH Promotions" }, { property: "og:description", content: "Promo codes and sales." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Promotions,
});

interface Promo { id: string; code: string; discount_type: string; discount_value: number; min_order_usd: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; used_count: number; active: boolean; created_at: string }
type FormState = { id: string | null; code: string; discount_type: "percent" | "fixed"; discount_value: string; min_order_usd: string; starts_at: string; ends_at: string; max_uses: string; active: boolean };
const blank: FormState = { id: null, code: "", discount_type: "percent", discount_value: "", min_order_usd: "0", starts_at: "", ends_at: "", max_uses: "", active: true };

const iso = (v: string) => (v ? new Date(v).toISOString() : null);
const win = (a: string | null, b: string | null) => (!a && !b ? "គ្រប់ពេល" : `${a ? day(a) : "…"} ដល់ ${b ? day(b) : "គ្មានកំណត់"}`);

function Promotions() {
  const [rows, setRows] = useState<Promo[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => void supabase.from("promo_codes").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as Promo[]));
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form) return;
    if (!form.code.trim() || !form.discount_value) { setError("សូមបញ្ចូលកូដ និងតម្លៃបញ្ចុះ"); return; }
    setBusy(true); setError("");
    const { error: e } = await supabase.rpc("admin_upsert_promo", {
      _id: form.id as never, _code: form.code, _discount_type: form.discount_type, _discount_value: Number(form.discount_value),
      _min_order_usd: Number(form.min_order_usd || 0), _starts_at: iso(form.starts_at) as never, _ends_at: iso(form.ends_at) as never,
      _max_uses: (form.max_uses ? Number(form.max_uses) : null) as never, _active: form.active,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    toast.success("បានរក្សាទុកកូដបញ្ចុះតម្លៃ");
    setForm(null);
    load();
  }

  async function remove(p: Promo) {
    if (!confirm(`លុបកូដ ${p.code}? · Delete promo code?`)) return;
    const { error: e } = await supabase.rpc("admin_delete_promo", { _id: p.id });
    if (e) { toast.error(e.message); return; }
    toast.success("បានលុបកូដ");
    setRows((r) => (r ?? []).filter((x) => x.id !== p.id));
  }

  return <>
    <PageHead title="បញ្ចុះតម្លៃ" subtitle="កូដបញ្ចុះតម្លៃ និងពេលវេលាលក់">
      <Button onClick={() => { setForm({ ...blank }); setError(""); }}><Plus className="size-4" />កូដថ្មី</Button>
    </PageHead>
    {form && <Card className="mt-5"><CardContent className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="កូដ · Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SALE10" className={inputCls} /></Field>
        <Field label="ប្រភេទ · Type">
          <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })} className={inputCls}>
            <option value="percent">ភាគរយ · %</option>
            <option value="fixed">ផ្ទាល់ · $</option>
          </select>
        </Field>
        <Field label={form.discount_type === "percent" ? "បញ្ចុះ (%)" : "បញ្ចុះ ($)"}>
          <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className={inputCls} />
        </Field>
        <Field label="ការទិញអប្បបរមា ($)"><Input type="number" min="0" step="0.01" value={form.min_order_usd} onChange={(e) => setForm({ ...form, min_order_usd: e.target.value })} className={inputCls} /></Field>
        <Field label="ចាប់ផ្តើម"><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} /></Field>
        <Field label="បញ្ចប់"><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputCls} /></Field>
        <Field label="ចំនួនប្រើប្រាសខ្ពស់បំផុត"><Input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className={inputCls} /></Field>
        <label className="flex items-end gap-2 pb-1 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="size-4" />ដំណើរការ</label>
      </div>
      {error && <p className="mt-3 rounded-panel bg-destructive-subtle p-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={() => void save()}>{busy ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}</Button><Button variant="outline" onClick={() => setForm(null)}>បោះបង់</Button></div>
    </CardContent></Card>}
    <Card className="mt-5"><CardContent className="p-0">
      {!rows ? <SkeletonRows n={4} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground">
        <th className="p-3">កូដ</th><th className="p-3">បញ្ចុះ</th><th className="p-3">អប្បបរមា</th><th className="p-3">ពេលវេលា</th><th className="p-3">ការប្រើ</th><th className="p-3">ស្ថានភាព</th><th className="p-3"></th></tr></thead>
        <tbody>{rows.map((p) => <tr key={p.id} className="border-t border-border">
          <td className="p-3 font-sans font-semibold">{p.code}</td>
          <td className="p-3 font-sans tabular-nums">{p.discount_type === "percent" ? `${Number(p.discount_value)}%` : `$${Number(p.discount_value).toFixed(2)}`}</td>
          <td className="p-3 font-sans tabular-nums">${Number(p.min_order_usd).toFixed(2)}</td>
          <td className="p-3 font-sans text-muted-foreground">{win(p.starts_at, p.ends_at)}</td>
          <td className="p-3 font-sans tabular-nums">{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
          <td className="p-3"><Badge variant={p.active ? "success" : "neutral"}>{p.active ? "ដំណើរការ" : "បានបិទ"}</Badge></td>
          <td className="p-3 text-right"><Button variant="ghost" size="icon" aria-label="កែកូដ" onClick={() => setForm({ id: p.id, code: p.code, discount_type: p.discount_type as "percent" | "fixed", discount_value: String(p.discount_value), min_order_usd: String(p.min_order_usd), starts_at: p.starts_at ? p.starts_at.slice(0, 16) : "", ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "", max_uses: p.max_uses ? String(p.max_uses) : "", active: p.active })}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" aria-label="លុបកូដ" onClick={() => void remove(p)}><Trash2 className="size-4 text-destructive" /></Button></td>
        </tr>)}</tbody></table>
        {!rows.length && <div className="flex flex-col items-center p-10 text-center"><Tag className="size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">មិនទាន់មានកូដបញ្ចុះតម្លៃ</p></div>}</div>}
    </CardContent></Card>
  </>;
}
