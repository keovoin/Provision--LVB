import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, PackageSearch, Printer, Trash2 } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, inputCls, toast, usd } from "@/app/admin-ui";
import { ScanCamera } from "@/app/ScanCamera";

export const Route = createFileRoute("/_authenticated/admin/pos")({
  head: () => ({ meta: [{ title: "លក់ផ្ទាល់ POS | SastraKH Ops" }, { name: "description", content: "Walk-in counter sales with barcode scanning and receipt." }, { property: "og:title", content: "SastraKH POS" }, { property: "og:description", content: "Warehouse counter sales." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Pos,
});

interface Prod { id: string; sku: string; name_km: string; unit_km: string; stock_qty: number; product_prices: { qty_min: number; qty_max: number | null; price_usd: number }[] }
interface CartLine { p: Prod; qty: number }

function unitPrice(p: Prod, qty: number) {
  const t = [...p.product_prices].sort((a, b) => b.qty_min - a.qty_min).find((x) => qty >= x.qty_min && (x.qty_max == null || qty <= x.qty_max));
  return t ? Number(t.price_usd) : 0;
}

function Pos() {
  const [code, setCode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<"cash" | "khqr">("cash");
  const [note, setNote] = useState("");
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sale_no: string; total: number; lines: CartLine[]; method: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const total = cart.reduce((s, l) => s + unitPrice(l.p, l.qty) * l.qty, 0);

  async function addByCode(text: string) {
    const t = text.trim();
    if (!t) return;
    const { data } = await supabase.from("products").select("id,sku,name_km,unit_km,stock_qty,product_prices(qty_min,qty_max,price_usd)").eq("active", true).or(`sku.ilike.${t},name_km.ilike.%${t}%,name_en.ilike.%${t}%`).limit(1);
    if (!data?.length) return toast.error("រកមិនឃើញទំនិញ / Not found");
    const p = data[0] as Prod;
    setCart((c) => {
      const i = c.findIndex((l) => l.p.id === p.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { p, qty: 1 }];
    });
    setCode(""); inputRef.current?.focus();
  }

  async function checkout() {
    if (!cart.length) return toast.error("កន្ត្រកទទេ");
    if (!window.confirm(`បញ្ជាក់ការលក់ ${usd(total)} (${method === "cash" ? "សាច់ប្រាក់" : "KHQR"})?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("pos_checkout", { _payment_method: method, _items: cart.map((l) => ({ product_id: l.p.id, qty: l.qty })), _note: note || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    const r = data as { sale_no: string; total_usd: number };
    setDone({ sale_no: r.sale_no, total: Number(r.total_usd), lines: cart, method });
    setCart([]); setNote("");
    toast.success(`បានលក់ ${r.sale_no}`);
  }

  return <>
    <PageHead title="លក់ផ្ទាល់ (POS)" subtitle="លក់នៅឃ្លាំង — ស្កេនទំនិញ ទទួលប្រាក់ភ្លាម បោះពុម្ពបង្កាន់ដៃ" />
    {cam && <ScanCamera onScan={(t) => { setCam(false); void addByCode(t); }} onClose={() => setCam(false)} />}
    {done && <Card className="mt-5 border-success/40"><CardContent className="space-y-3 p-4">
      <p className="font-semibold">បានលក់រួច {done.sale_no} — {usd(done.total)} ({done.method === "cash" ? "សាច់ប្រាក់" : "KHQR"})</p>
      <div id="receipt" className="rounded-control border border-border bg-white p-4 font-sans text-sm text-black print:border-0">
        <p className="text-center text-base font-bold">SastraKH</p>
        <p className="text-center text-xs">បង្កាន់ដៃលក់ / Sale receipt</p>
        <p className="mt-2 text-xs">{done.sale_no} · {new Date().toLocaleString("km-KH")}</p>
        <hr className="my-2" />
        {done.lines.map((l) => <p key={l.p.id} className="flex justify-between"><span>{l.p.name_km} × {l.qty}</span><span>{usd(unitPrice(l.p, l.qty) * l.qty)}</span></p>)}
        <hr className="my-2" />
        <p className="flex justify-between font-bold"><span>សរុប Total</span><span>{usd(done.total)}</span></p>
        <p className="mt-1 text-xs">{done.method === "cash" ? "សាច់ប្រាក់ Cash" : "KHQR"}</p>
        <p className="mt-3 text-center text-xs">អរគុណ! Thank you!</p>
      </div>
      <div className="flex gap-2 print:hidden">
        <Button onClick={() => window.print()}><Printer className="size-4" />បោះពុម្ព</Button>
        <Button variant="outline" onClick={() => { setDone(null); inputRef.current?.focus(); }}>លក់ថ្មី</Button>
      </div>
    </CardContent></Card>}
    <Card className="mt-5 print:hidden"><CardContent className="space-y-3 p-4">
      <div className="flex gap-2">
        <input ref={inputRef} aria-label="SKU or product name" className={`${inputCls} h-12 flex-1 text-base`} placeholder="ស្កេន / វាយ SKU ឬឈ្មោះទំនិញ…" value={code}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addByCode(code); }} />
        <Button size="lg" variant="outline" onClick={() => setCam(true)}><Camera className="size-4" />កាមេរ៉ា</Button>
        <Button size="lg" onClick={() => void addByCode(code)}><PackageSearch className="size-4" />បន្ថែម</Button>
      </div>
      {cart.map((l, i) => <div key={l.p.id} className="flex flex-wrap items-center gap-2 rounded-control border border-border p-2">
        <span className="min-w-40 flex-1 text-sm font-medium">{l.p.name_km} <span className="text-xs text-muted-foreground">(ស្តុក {l.p.stock_qty})</span></span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setCart(cart.map((x, k) => k === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>−</Button>
          <input aria-label="Quantity" inputMode="numeric" className={`${inputCls} h-9 w-16 text-center font-sans`} value={l.qty} onChange={(e) => setCart(cart.map((x, k) => k === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x))} />
          <Button size="sm" variant="outline" onClick={() => setCart(cart.map((x, k) => k === i ? { ...x, qty: x.qty + 1 } : x))}>+</Button>
        </div>
        <span className="w-28 text-right font-sans text-sm tabular-nums">{usd(unitPrice(l.p, l.qty) * l.qty)}</span>
        <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setCart(cart.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button>
      </div>)}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <div className="flex gap-1.5">
          <Button variant={method === "cash" ? "primary" : "outline"} onClick={() => setMethod("cash")}>សាច់ប្រាក់</Button>
          <Button variant={method === "khqr" ? "primary" : "outline"} onClick={() => setMethod("khqr")}>KHQR</Button>
        </div>
        <input aria-label="Note" className={`${inputCls} min-w-32 flex-1`} placeholder="កំណត់ចំណាំ" value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-sm">សរុប <strong className="font-sans text-2xl tabular-nums">{usd(total)}</strong></p>
        <Button size="lg" disabled={busy || !cart.length} onClick={() => void checkout()}>ទទួលប្រាក់</Button>
      </div>
    </CardContent></Card>
  </>;
}
