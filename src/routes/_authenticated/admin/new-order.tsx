import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { METHOD_KM, PageHead, inputCls, toast, usd } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/new-order")({
  head: () => ({ meta: [{ title: "បង្កើតការបញ្ជាទិញលក់ដុំ | SastraKH Ops" }, { name: "description", content: "Create a bulk order for a customer and send it to them." }, { property: "og:title", content: "SastraKH Bulk Order Form" }, { property: "og:description", content: "Staff-created wholesale orders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewOrder,
});

interface Customer { id: string; name: string; business_name: string | null; phone: string; telegram: string | null; business_address: string | null }
interface Prod { id: string; name_km: string; unit_km: string; stock_qty: number; product_prices: { qty_min: number; qty_max: number | null; price_usd: number }[] }

function unitPrice(p: Prod | undefined, qty: number) {
  if (!p) return 0;
  const t = [...p.product_prices].sort((a, b) => b.qty_min - a.qty_min).find((x) => qty >= x.qty_min && (x.qty_max == null || qty <= x.qty_max));
  return t ? Number(t.price_usd) : 0;
}

function NewOrder() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cod");
  const [lines, setLines] = useState<{ product_id: string; qty: string }[]>([{ product_id: "", qty: "1" }]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ order_no: string; text: string; tg: string | null } | null>(null);

  useEffect(() => {
    void supabase.from("profiles").select("id,name,business_name,phone,telegram,business_address").eq("active", true).order("business_name").then(({ data }) => setCustomers((data ?? []) as Customer[]));
    void supabase.from("products").select("id,name_km,unit_km,stock_qty,product_prices(qty_min,qty_max,price_usd)").eq("active", true).order("name_km").then(({ data }) => setProds((data ?? []) as Prod[]));
  }, []);
  const c = customers.find((x) => x.id === customer);
  const rows = lines.map((l) => { const p = prods.find((x) => x.id === l.product_id); const q = Number(l.qty) || 0; const u = unitPrice(p, q); return { ...l, p, q, u, total: u * q }; });
  const total = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

  async function submit() {
    const items = rows.filter((r) => r.p && r.q > 0).map((r) => ({ product_id: r.product_id, qty: r.q }));
    if (!customer) return toast.error("សូមជ្រើសអតិថិជន");
    if (!items.length) return toast.error("សូមបន្ថែមទំនិញ");
    if (!address.trim()) return toast.error("សូមបញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន");
    if (!window.confirm(`បង្កើតការបញ្ជាទិញ ${usd(total)} សម្រាប់ ${c?.business_name || c?.name}?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("staff_create_order", { _customer: customer, _payment_method: method as never, _delivery_address: address, _note: note, _items: items });
    setBusy(false);
    if (error) return toast.error(error.message);
    const r = data as { order_no: string; total_usd: number };
    const text = [`SastraKH — ការបញ្ជាទិញ ${r.order_no}`, ...rows.filter((x) => x.p && x.q > 0).map((x) => `• ${x.p!.name_km} × ${x.q} ${x.p!.unit_km} = ${usd(x.total)}`), `សរុប: ${usd(r.total_usd)}`, `ការទូទាត់: ${METHOD_KM[method]}`, `សូមបើកកម្មវិធី → ការបញ្ជាទិញ ដើម្បីមើល និងបង់ប្រាក់។`].join("\n");
    setSent({ order_no: r.order_no, text, tg: c?.telegram?.replace(/^@|https?:\/\/t\.me\//g, "") || null });
    toast.success(`បានបង្កើត ${r.order_no} — អតិថិជនឃើញនៅក្នុងកម្មវិធី`);
    setLines([{ product_id: "", qty: "1" }]); setNote("");
  }

  return <>
    <PageHead title="បង្កើតការបញ្ជាទិញលក់ដុំ" subtitle="បញ្ចូលការបញ្ជាទិញជំនួសអតិថិជន ហើយផ្ញើទៅពួកគេ" />
    {sent && <Card className="mt-5 border-success/40"><CardContent className="space-y-3 p-4">
      <p className="font-semibold">បានផ្ញើ {sent.order_no} ទៅអតិថិជន — វាលេចឡើងក្នុង "ការបញ្ជាទិញ" របស់ពួកគេ។</p>
      <pre className="whitespace-pre-wrap rounded-control bg-muted p-3 text-xs">{sent.text}</pre>
      <div className="flex flex-wrap gap-2">
        <Button asChild><a target="_blank" rel="noopener noreferrer" href={sent.tg ? `https://t.me/${sent.tg}` : `https://t.me/share/url?url=${encodeURIComponent("https://ecom-kh.lovable.app/store/orders")}&text=${encodeURIComponent(sent.text)}`}><Send className="size-4" />ផ្ញើតាម Telegram</a></Button>
        <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(sent.text); toast.success("បានចម្លង"); }}>ចម្លងសារ</Button>
      </div>
    </CardContent></Card>}
    <Card className="mt-5"><CardContent className="grid gap-4 p-4 md:grid-cols-2">
      <label className="text-sm"><span className="mb-1 block font-medium">អតិថិជន</span>
        <select aria-label="Customer" className={`${inputCls} w-full`} value={customer} onChange={(e) => { setCustomer(e.target.value); const x = customers.find((y) => y.id === e.target.value); if (x?.business_address) setAddress(x.business_address); }}>
          <option value="">—</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.business_name || x.name} · {x.phone}</option>)}
        </select></label>
      <label className="text-sm"><span className="mb-1 block font-medium">វិធីទូទាត់</span>
        <select aria-label="Payment method" className={`${inputCls} w-full`} value={method} onChange={(e) => setMethod(e.target.value)}>{Object.entries(METHOD_KM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium">អាសយដ្ឋានដឹកជញ្ជូន</span><input aria-label="Delivery address" className={`${inputCls} w-full`} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
      <label className="text-sm md:col-span-2"><span className="mb-1 block font-medium">កំណត់ចំណាំ</span><input aria-label="Note" className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    </CardContent></Card>
    <Card className="mt-4"><CardContent className="space-y-2 p-4">
      {rows.map((r, i) => <div key={i} className="flex flex-wrap items-center gap-2">
        <select aria-label="Product" className={`${inputCls} min-w-[220px] flex-1`} value={r.product_id} onChange={(e) => setLines(lines.map((l, k) => k === i ? { ...l, product_id: e.target.value } : l))}>
          <option value="">— ជ្រើសទំនិញ —</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.name_km} (ស្តុក {p.stock_qty})</option>)}
        </select>
        <input aria-label="Quantity" inputMode="numeric" className={`${inputCls} w-20 font-sans`} value={r.qty} onChange={(e) => setLines(lines.map((l, k) => k === i ? { ...l, qty: e.target.value } : l))} />
        <span className="w-40 text-right font-sans text-sm tabular-nums">{r.p ? `${usd(r.u)} × ${r.q} = ${usd(r.total)}` : "—"}</span>
        <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.length > 1 ? lines.filter((_, k) => k !== i) : lines)}><Trash2 className="size-4" /></Button>
      </div>)}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", qty: "1" }])}><Plus className="size-4" />បន្ថែមទំនិញ</Button>
        <p className="text-sm">សរុប <strong className="font-sans text-xl">{usd(total)}</strong></p>
      </div>
      <Button className="w-full" size="lg" disabled={busy} onClick={() => void submit()}><Send className="size-4" />បង្កើត និងផ្ញើទៅអតិថិជន</Button>
    </CardContent></Card>
  </>;
}
