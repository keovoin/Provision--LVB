import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { buildTiers, type TierInput } from "@/app/tiers";
import { signPhotos } from "@/app/catalog";
import { toast, uploadPhoto } from "@/app/admin-ui";
import { ImageIcon, Upload } from "lucide-react";
import { DescriptionEditor } from "@/app/DescriptionEditor";
import { ProductBuilder } from "@/app/ProductBuilder";
import { ProductMediaManager } from "@/app/ProductMediaManager";

interface Row { id: string; sku: string; name_km: string; name_en: string; unit_km: string; stock_qty: number; reorder_threshold: number; photo_url: string | null; product_prices: { qty_min: number; price_usd: number }[] }
export const Route = createFileRoute("/_authenticated/admin/products")({ head: () => ({ meta: [{ title: "ទំនិញ | ProvisionKH Ops" }, { name: "description", content: "Manage ProvisionKH wholesale inventory and discount tiers." }, { property: "og:title", content: "ProvisionKH Products" }, { property: "og:description", content: "Wholesale inventory and pricing tiers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ProductsPage });

function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("products").select("id,sku,name_km,name_en,unit_km,stock_qty,reorder_threshold,photo_url,product_prices(qty_min,price_usd)").order("name_km");
    const list = (data ?? []) as Row[];
    setThumbs(await signPhotos(list.map((r) => r.photo_url).filter((x): x is string => !!x))); setRows(list);
  };
  async function setPhoto(r: Row, f: File) {
    setUploading(r.id);
    try {
      const photo_url = await uploadPhoto(`${r.sku}-`, f, 640);
      const { error } = await supabase.from("products").update({ photo_url, updated_at: new Date().toISOString() }).eq("id", r.id);
      if (error) throw error;
      toast.success("បានប្តូររូបភាព"); await load();
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(null); }
  }
  useEffect(() => { void load(); }, []);
  const shown = useMemo(() => rows.filter((r) => `${r.sku} ${r.name_km} ${r.name_en}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">ទំនិញ និងកម្រិតបញ្ចុះតម្លៃ</h1><p className="text-sm text-muted-foreground">កំណត់តម្លៃតាមបរិមាណ (៣ កម្រិត ឬច្រើនជាងនេះ)</p></div>
    <div className="flex items-center gap-2">
      <div className="flex-1"><SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ស្វែងរក SKU ឬឈ្មោះ…" /></div>
      <Button variant="outline" asChild><Link to="/admin/bulk-upload"><Upload className="size-4" />នាំចូល Excel</Link></Button>
      <Button onClick={() => setBuilding((b) => !b)}><Plus className="size-4" />ទំនិញថ្មី</Button>
    </div>
    {(() => { const low = rows.filter((r) => r.stock_qty <= r.reorder_threshold); return low.length > 0 && <div role="alert" className="rounded-panel border border-warning bg-warning-subtle p-4">
      <p className="font-semibold text-warning">⚠️ ស្តុកទាប · Low stock ({low.length})</p>
      <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{low.map((r) => <li key={r.id} className="flex justify-between gap-2"><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => { setQuery(r.sku); setOpen(r.id); }}>{r.name_km} <span className="font-sans text-muted-foreground">{r.sku}</span></button><span className="font-sans font-semibold tabular-nums">{r.stock_qty} / {r.reorder_threshold}</span></li>)}</ul>
    </div>; })()}
    {building && <ProductBuilder onClose={() => setBuilding(false)} onCreated={() => { setBuilding(false); void load(); }} />}
    <Card><CardContent className="divide-y divide-border p-0">{shown.map((r) => {
      const tiers = [...r.product_prices].sort((a, b) => a.qty_min - b.qty_min);
      return <div key={r.id}>
        <div className="flex items-center gap-3 pl-4">
        <label className="group relative grid size-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-control border border-border bg-muted" title="ប្តូររូបភាព">
          {r.photo_url && thumbs[r.photo_url] ? <img src={thumbs[r.photo_url]} alt="" loading="lazy" className="size-full object-cover" /> : <ImageIcon className="size-5 text-muted-foreground" />}
          <span className={`absolute inset-0 grid place-items-center bg-foreground/50 text-background ${uploading === r.id ? "" : "opacity-0 group-hover:opacity-100"}`}><Upload className="size-4" /></span>
          <input type="file" accept="image/*" className="sr-only" aria-label={`Upload photo for ${r.name_en}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void setPhoto(r, f); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex min-w-0 flex-1 items-center gap-4 py-3 pr-4 text-left hover:bg-muted/50">
          <span className="w-24 font-sans text-xs text-muted-foreground">{r.sku}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{r.name_km}</strong><span className="block truncate font-sans text-xs text-muted-foreground">{r.name_en}</span></span>
          <span className={`font-sans text-sm ${r.stock_qty <= r.reorder_threshold ? "font-semibold text-warning" : ""}`}>ស្តុក {r.stock_qty}</span>
          <Badge variant="neutral">{tiers.length} កម្រិត</Badge>
          <span className="hidden w-48 text-right font-sans text-xs text-muted-foreground md:block">{tiers.map((t) => `${t.qty_min}+ $${t.price_usd}`).join(" · ")}</span>
        </button>
        </div>
        {open === r.id && <TierEditor product={r} onSaved={() => void load()} />}
      </div>;
    })}</CardContent></Card>
  </div>;
}

function TierEditor({ product, onSaved }: { product: Row; onSaved: () => void }) {
  const [tiers, setTiers] = useState<{ qty_min: string; price_usd: string }[]>(() => {
    const t = [...product.product_prices].sort((a, b) => a.qty_min - b.qty_min).map((x) => ({ qty_min: String(x.qty_min), price_usd: String(x.price_usd) }));
    return t.length ? t : [{ qty_min: "1", price_usd: "" }];
  });
  const [stock, setStock] = useState(String(product.stock_qty));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const update = (i: number, k: "qty_min" | "price_usd", v: string) => setTiers((c) => c.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  async function save() {
    const result = buildTiers(tiers.map((t): TierInput => ({ qty_min: Number(t.qty_min), price_usd: Number(t.price_usd) })));
    if ("error" in result) { setMsg({ ok: false, text: result.error }); return; }
    setBusy(true);
    const del = await supabase.from("product_prices").delete().eq("product_id", product.id);
    const ins = del.error ? del : await supabase.from("product_prices").insert(result.tiers.map((t) => ({ ...t, product_id: product.id })));
    const st = await supabase.from("products").update({ stock_qty: Math.max(0, Math.floor(Number(stock) || 0)) }).eq("id", product.id);
    setBusy(false);
    const err = ins.error ?? st.error;
    setMsg(err ? { ok: false, text: err.message } : { ok: true, text: "បានរក្សាទុក" });
    if (!err) onSaved();
  }

  return <div className="space-y-3 bg-muted/40 px-4 py-4">
    <div className="grid max-w-xl grid-cols-[1fr_1fr_1fr_40px] gap-2 text-xs font-semibold text-muted-foreground"><span>ចាប់ពី (ចំនួន)</span><span>ដល់</span><span>តម្លៃ / {product.unit_km} (USD)</span><span /></div>
    {tiers.map((t, i) => {
      const next = [...tiers].map((x) => Number(x.qty_min)).filter((n) => n > Number(t.qty_min)).sort((a, b) => a - b)[0];
      return <div key={i} className="grid max-w-xl grid-cols-[1fr_1fr_1fr_40px] items-center gap-2">
        <Input type="number" min={1} inputMode="numeric" value={t.qty_min} onChange={(e) => update(i, "qty_min", e.target.value)} aria-label="ចាប់ពី" />
        <span className="font-sans text-sm text-muted-foreground">{next ? next - 1 : "∞"}</span>
        <Input type="number" min={0} step="0.01" inputMode="decimal" value={t.price_usd} onChange={(e) => update(i, "price_usd", e.target.value)} aria-label="តម្លៃ" />
        <Button size="icon" variant="ghost" aria-label="លុបកម្រិត" disabled={tiers.length <= 1} onClick={() => setTiers((c) => c.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
      </div>;
    })}
    <Button size="sm" variant="outline" onClick={() => setTiers((c) => [...c, { qty_min: String(Math.max(...c.map((x) => Number(x.qty_min) || 0)) + 10), price_usd: "" }])}><Plus className="size-4" />បន្ថែមកម្រិត</Button>
    <div className="flex max-w-xl items-center gap-3 border-t border-border pt-3">
      <label className="text-sm font-semibold">ស្តុក</label><Input className="w-28" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
      <Button disabled={busy} onClick={() => void save()}>{busy ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}</Button>
      {msg && <span className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</span>}
    </div>
    <DescriptionEditor productId={product.id} sku={product.sku} />
    <ProductMediaManager productId={product.id} />
  </div>;
}
