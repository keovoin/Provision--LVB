import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Camera, PackageSearch } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, inputCls, toast } from "@/app/admin-ui";
import { ScanCamera } from "@/app/ScanCamera";

export const Route = createFileRoute("/_authenticated/admin/stock")({
  head: () => ({ meta: [{ title: "ស្កេនស្តុក | ProvisionKH Ops" }, { name: "description", content: "Scan or type product SKU to record stock in and out." }, { property: "og:title", content: "ProvisionKH Stock Scan" }, { property: "og:description", content: "Warehouse stock in/out scanning." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StockScan,
});

interface Prod { id: string; sku: string; name_km: string; name_en: string; unit_km: string; stock_qty: number; photo_url: string | null }
interface Move { id: string; kind: string; qty: number; note: string | null; created_at: string; products: { name_km: string; sku: string } | null; profiles: { name: string } | null }

function StockScan() {
  const [code, setCode] = useState("");
  const [prod, setProd] = useState<Prod | null>(null);
  const [kind, setKind] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [moves, setMoves] = useState<Move[]>([]);
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMoves = () => void supabase.from("stock_movements").select("id,kind,qty,note,created_at,products(name_km,sku),profiles(name)").order("created_at", { ascending: false }).limit(30).then(({ data }) => setMoves((data ?? []) as unknown as Move[]));
  useEffect(() => { loadMoves(); inputRef.current?.focus(); }, []);

  async function find(text: string) {
    const t = text.trim();
    if (!t) return;
    const { data } = await supabase.from("products").select("id,sku,name_km,name_en,unit_km,stock_qty,photo_url").eq("active", true).or(`sku.ilike.${t},name_km.ilike.%${t}%,name_en.ilike.%${t}%`).limit(1);
    if (!data?.length) { toast.error("រកមិនឃើញទំនិញ / Product not found"); setProd(null); return; }
    setProd(data[0] as Prod);
  }

  async function submit() {
    const q = Number(qty) || 0;
    if (!prod) return toast.error("សូមស្កេនទំនិញជាមុន");
    if (q <= 0) return toast.error("ចំនួនមិនត្រឹមត្រូវ");
    setBusy(true);
    const { error } = await supabase.rpc("record_stock_movement", { _product_id: prod.id, _kind: kind, _qty: q, _note: note || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${kind === "in" ? "បញ្ចូល" : "ដកចេញ"} ${q} ${prod.unit_km} — ${prod.name_km}`);
    setProd({ ...prod, stock_qty: prod.stock_qty + (kind === "in" ? q : -q) });
    setCode(""); setQty("1"); setNote("");
    loadMoves();
    inputRef.current?.focus();
  }

  return <>
    <PageHead title="ស្កេនស្តុក" subtitle="ស្កេន ឬវាយ SKU ដើម្បីកត់ស្តុកចូល/ចេញ — Scan or type SKU to record stock in/out" />
    {cam && <ScanCamera onScan={(t) => { setCam(false); setCode(t); void find(t); }} onClose={() => setCam(false)} />}
    <Card className="mt-5"><CardContent className="space-y-4 p-4">
      <div className="flex gap-2">
        <input ref={inputRef} aria-label="SKU or product name" className={`${inputCls} h-12 flex-1 text-base`} placeholder="ស្កេន / វាយ SKU ឬឈ្មោះទំនិញ…" value={code}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void find(code); }} />
        <Button size="lg" variant="outline" onClick={() => setCam(true)}><Camera className="size-4" />កាមេរ៉ា</Button>
        <Button size="lg" onClick={() => void find(code)}><PackageSearch className="size-4" />ស្វែងរក</Button>
      </div>
      {prod && <div className="flex flex-wrap items-center gap-4 rounded-control border border-border p-3">
        {prod.photo_url && <img src={prod.photo_url} alt="" className="size-14 rounded-control object-cover" />}
        <div className="min-w-40 flex-1">
          <p className="font-semibold">{prod.name_km}</p>
          <p className="text-xs text-muted-foreground">{prod.sku} · {prod.name_en}</p>
          <p className="mt-1 text-sm">ស្តុកបច្ចុប្បន្ន: <strong className="font-sans tabular-nums">{prod.stock_qty}</strong> {prod.unit_km}</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant={kind === "in" ? "primary" : "outline"} onClick={() => setKind("in")}><ArrowDownToLine className="size-4" />ចូល</Button>
          <Button variant={kind === "out" ? "destructive" : "outline"} onClick={() => setKind("out")}><ArrowUpFromLine className="size-4" />ចេញ</Button>
        </div>
        <input aria-label="Quantity" inputMode="numeric" className={`${inputCls} h-12 w-24 text-center font-sans text-lg`} value={qty} onChange={(e) => setQty(e.target.value)} />
        <input aria-label="Note" className={`${inputCls} h-12 min-w-40 flex-1`} placeholder="កំណត់ចំណាំ (ឧ. ដឹកមកពីអ្នកផ្គត់ផ្គង់)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="lg" disabled={busy} onClick={() => void submit()}>កត់ត្រា</Button>
      </div>}
    </CardContent></Card>
    <h2 className="mt-6 text-sm font-semibold">ការផ្លាស់ប្តូរថ្មីៗ / Recent movements</h2>
    <Card className="mt-2"><CardContent className="divide-y divide-border p-0">
      {moves.map((m) => <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <Badge variant={m.kind === "in" ? "success" : "destructive"}>{m.kind === "in" ? "ចូល" : "ចេញ"}</Badge>
        <span className="font-sans font-semibold tabular-nums">{m.qty}</span>
        <span className="flex-1 truncate">{m.products?.name_km} <span className="text-xs text-muted-foreground">{m.products?.sku}</span></span>
        {m.note && <span className="hidden text-xs text-muted-foreground md:inline">{m.note}</span>}
        <span className="text-xs text-muted-foreground">{m.profiles?.name} · {new Date(m.created_at).toLocaleString("km-KH", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>)}
      {!moves.length && <p className="p-4 text-sm text-muted-foreground">មិនទាន់មានការផ្លាស់ប្តូរ</p>}
    </CardContent></Card>
  </>;
}
