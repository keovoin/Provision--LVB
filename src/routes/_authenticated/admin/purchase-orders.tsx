import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, inputCls, toast, usd } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/purchase-orders")({
  head: () => ({ meta: [{ title: "ទិញចូល | SastraKH Ops" }, { name: "description", content: "Purchase orders from suppliers; receiving adds stock." }, { property: "og:title", content: "SastraKH Purchase Orders" }, { property: "og:description", content: "Supplier purchase orders and receiving." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PurchaseOrders,
});

interface Sup { id: string; name: string }
interface Prod { id: string; sku: string; name_km: string; unit_km: string }
interface PO { id: string; po_no: string; status: string; note: string | null; created_at: string; suppliers: { name: string } | null; purchase_order_items: { id: string; qty: number; cost_usd: number; products: { name_km: string; unit_km: string } | null }[] }

function PurchaseOrders() {
  const [pos, setPos] = useState<PO[]>([]);
  const [sups, setSups] = useState<Sup[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<{ product_id: string; qty: string; cost: string }[]>([{ product_id: "", qty: "1", cost: "" }]);
  const [busy, setBusy] = useState(false);

  const load = () => void supabase.from("purchase_orders").select("id,po_no,status,note,created_at,suppliers(name),purchase_order_items(id,qty,cost_usd,products(name_km,unit_km))").order("created_at", { ascending: false }).limit(50).then(({ data }) => setPos((data ?? []) as unknown as PO[]));
  useEffect(() => {
    load();
    void supabase.from("suppliers").select("id,name").eq("active", true).order("name").then(({ data }) => setSups((data ?? []) as Sup[]));
    void supabase.from("products").select("id,sku,name_km,unit_km").eq("active", true).order("name_km").then(({ data }) => setProds((data ?? []) as Prod[]));
  }, []);

  async function create() {
    const items = lines.filter((l) => l.product_id && Number(l.qty) > 0);
    if (!items.length) return toast.error("សូមបន្ថែមទំនិញ");
    setBusy(true);
    const { data: po, error } = await supabase.from("purchase_orders").insert({ supplier_id: supplier || null, note: note.trim() || null }).select("id").single();
    if (error || !po) { setBusy(false); return toast.error(error?.message ?? "error"); }
    const { error: iErr } = await supabase.from("purchase_order_items").insert(items.map((l) => ({ po_id: po.id, product_id: l.product_id, qty: Number(l.qty), cost_usd: Number(l.cost) || 0 })));
    setBusy(false);
    if (iErr) return toast.error(iErr.message);
    toast.success("បានបង្កើត PO"); setLines([{ product_id: "", qty: "1", cost: "" }]); setNote(""); load();
  }

  async function receive(po: PO) {
    if (!window.confirm(`ទទួលស្តុកសម្រាប់ ${po.po_no}? ស្តុកនឹងកើនឡើង។`)) return;
    const { error } = await supabase.rpc("receive_purchase_order", { _po_id: po.id });
    if (error) return toast.error(error.message);
    toast.success(`បានទទួល ${po.po_no} — ស្តុកបានកើន`); load();
  }
  async function cancel(po: PO) {
    if (!window.confirm(`បោះបង់ ${po.po_no}?`)) return;
    await supabase.from("purchase_orders").update({ status: "cancelled" }).eq("id", po.id); load();
  }

  const statusKm: Record<string, string> = { draft: "រង់ចាំ", received: "បានទទួល", cancelled: "បោះបង់" };

  return <>
    <PageHead title="ទិញចូល (Purchase Orders)" subtitle="កត់ការទិញពីអ្នកផ្គត់ផ្គង់ — ពេលទទួល ស្តុកកើនដោយស្វ័យប្រវត្តិ" />
    <Card className="mt-5"><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Supplier" className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
          <option value="">— អ្នកផ្គត់ផ្គង់ —</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input aria-label="Note" className={`${inputCls} min-w-48 flex-1`} placeholder="កំណត់ចំណាំ" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {lines.map((l, i) => <div key={i} className="flex flex-wrap items-center gap-2">
        <select aria-label="Product" className={`${inputCls} min-w-[220px] flex-1`} value={l.product_id} onChange={(e) => setLines(lines.map((x, k) => k === i ? { ...x, product_id: e.target.value } : x))}>
          <option value="">— ជ្រើសទំនិញ —</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.name_km} ({p.sku})</option>)}
        </select>
        <input aria-label="Quantity" inputMode="numeric" placeholder="ចំនួន" className={`${inputCls} w-24 font-sans`} value={l.qty} onChange={(e) => setLines(lines.map((x, k) => k === i ? { ...x, qty: e.target.value } : x))} />
        <input aria-label="Cost" inputMode="decimal" placeholder="តម្លៃដើម $" className={`${inputCls} w-28 font-sans`} value={l.cost} onChange={(e) => setLines(lines.map((x, k) => k === i ? { ...x, cost: e.target.value } : x))} />
        <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.length > 1 ? lines.filter((_, k) => k !== i) : lines)}><Trash2 className="size-4" /></Button>
      </div>)}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", qty: "1", cost: "" }])}><Plus className="size-4" />បន្ថែមទំនិញ</Button>
        <Button disabled={busy} onClick={() => void create()}>បង្កើត PO</Button>
      </div>
    </CardContent></Card>
    <div className="mt-5 space-y-3">
      {pos.map((po) => <Card key={po.id}><CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-sans font-semibold">{po.po_no}</span>
          <Badge variant={po.status === "received" ? "success" : po.status === "cancelled" ? "destructive" : "neutral"}>{statusKm[po.status]}</Badge>
          <span className="text-sm text-muted-foreground">{po.suppliers?.name ?? "—"}</span>
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground">{new Date(po.created_at).toLocaleDateString("km-KH")}</span>
          {po.status === "draft" && <>
            <Button size="sm" onClick={() => void receive(po)}><Check className="size-4" />ទទួលស្តុក</Button>
            <Button size="sm" variant="outline" onClick={() => void cancel(po)}>បោះបង់</Button>
          </>}
        </div>
        <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          {po.purchase_order_items.map((i) => <li key={i.id}>• {i.products?.name_km} × <span className="font-sans">{i.qty}</span> {i.products?.unit_km}{Number(i.cost_usd) > 0 && <span className="font-sans"> @ {usd(Number(i.cost_usd))}</span>}</li>)}
        </ul>
      </CardContent></Card>)}
      {!pos.length && <p className="text-sm text-muted-foreground">មិនទាន់មាន PO</p>}
    </div>
  </>;
}
