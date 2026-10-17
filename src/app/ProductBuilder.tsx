import { useEffect, useState } from "react";
import { Film, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { buildTiers } from "@/app/tiers";
import { toast, uploadPhoto, uploadProductVideo, inputCls } from "@/app/admin-ui";

interface Category { id: string; name_km: string; name_en: string }


/** Full product builder: details, photo, price tiers — creates a live store product. */
export function ProductBuilder({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ sku: "", name_km: "", name_en: "", unit: "", unit_km: "", category_id: "", cost_usd: "", stock_qty: "" });
  const [tiers, setTiers] = useState([{ qty_min: "1", price_usd: "" }]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("categories").select("id,name_km,name_en").eq("active", true).order("sort_order");
      setCats((data ?? []) as Category[]);
    })();
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setTier = (i: number, k: "qty_min" | "price_usd", v: string) => setTiers((c) => c.map((t, j) => (j === i ? { ...t, [k]: v } : t)));

  async function create() {
    if (!form.sku.trim() || !form.name_km.trim() || !form.name_en.trim() || !form.unit.trim() || !form.unit_km.trim()) {
      return toast.error("សូមបំពេញ SKU ឈ្មោះ និងឯកតា");
    }
    const result = buildTiers(tiers.map((t) => ({ qty_min: Number(t.qty_min), price_usd: Number(t.price_usd) })));
    if ("error" in result) return toast.error(result.error);
    setBusy(true);
    try {
      const firstPhoto = mediaFiles.find((file) => file.type.startsWith("image/"));
      const photo_url = firstPhoto ? await uploadPhoto(`${form.sku.trim()}-`, firstPhoto, 1280) : null;
      const { data: product, error } = await supabase.from("products").insert({
        sku: form.sku.trim(), name_km: form.name_km.trim(), name_en: form.name_en.trim(),
        unit: form.unit.trim(), unit_km: form.unit_km.trim(),
        category_id: form.category_id || null,
        cost_usd: Number(form.cost_usd) || 0,
        stock_qty: Math.max(0, Math.floor(Number(form.stock_qty) || 0)),
        photo_url,
        description: [],
      }).select("id").single();
      if (error) throw error;
      const { error: tierError } = await supabase.from("product_prices").insert(result.tiers.map((t) => ({ ...t, product_id: product.id })));
      if (tierError) throw tierError;
      const remainingMedia = mediaFiles.filter((file) => file !== firstPhoto);
      if (remainingMedia.length) {
        const mediaRows = [];
        for (const [index, file] of remainingMedia.entries()) {
          const video = file.type.startsWith("video/");
          const storage_path = video ? await uploadProductVideo(`products/${product.id}/`, file) : await uploadPhoto(`products/${product.id}/`, file, 1280);
          mediaRows.push({ product_id: product.id, media_type: video ? "video" : "image", storage_path, sort_order: index + 1 });
        }
        const { error: mediaError } = await supabase.from("product_media").insert(mediaRows);
        if (mediaError) throw mediaError;
      }
      toast.success("បានបង្កើតទំនិញ — ឥឡូវមាននៅក្នុងហាង");
      onCreated();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return <div className="space-y-4 rounded-card border border-primary/30 bg-surface p-4">
    <div className="flex items-center justify-between">
      <p className="text-base font-semibold">បង្កើតទំនិញថ្មី <span className="font-sans text-sm font-normal text-muted-foreground">· New product</span></p>
      <Button size="icon" variant="ghost" aria-label="បិទ" onClick={onClose}><X className="size-4" /></Button>
    </div>

    <div className="flex items-start gap-4">
      <label className="grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-control border border-dashed border-border bg-muted" title="រូបភាព និងវីដេអូ">
        <span className="flex flex-col items-center gap-1 text-muted-foreground"><ImagePlus className="size-6" /><span className="text-center text-[10px]">{mediaFiles.length ? `${mediaFiles.length} files` : "រូប + វីដេអូ"}</span></span>
        <input type="file" accept="image/*,video/mp4,video/webm" multiple className="sr-only" onChange={(e) => { setMediaFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <Input placeholder="SKU (ឧ. COF-001)" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
        <select className={inputCls} value={form.category_id} onChange={(e) => set("category_id", e.target.value)} aria-label="ប្រភេទ">
          <option value="">ប្រភេទ…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name_km} · {c.name_en}</option>)}
        </select>
        <Input placeholder="ឈ្មោះ (ខ្មែរ)" value={form.name_km} onChange={(e) => set("name_km", e.target.value)} />
        <Input placeholder="Name (English)" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
        <Input placeholder="ឯកតា (ខ្មែរ ឧ. កេស)" value={form.unit_km} onChange={(e) => set("unit_km", e.target.value)} />
        <Input placeholder="Unit (English, e.g. case)" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
        <Input type="number" min={0} step="0.01" placeholder="តម្លៃដើម USD" value={form.cost_usd} onChange={(e) => set("cost_usd", e.target.value)} />
        <Input type="number" min={0} placeholder="ស្តុក" value={form.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} />
      </div>
    </div>
    {mediaFiles.length > 0 && <div className="flex flex-wrap gap-2">{mediaFiles.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-control border border-border px-2 py-1 font-sans text-xs">{file.type.startsWith("video/") ? <Film className="size-3.5" /> : <ImagePlus className="size-3.5" />}<span className="max-w-40 truncate">{file.name}</span><Button type="button" size="icon" variant="ghost" className="size-6" aria-label="Remove media" onClick={() => setMediaFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="size-3" /></Button></span>)}</div>}

    <div className="space-y-2">
      <p className="text-sm font-semibold">កម្រិតតម្លៃ <span className="font-sans font-normal text-muted-foreground">· Price tiers</span></p>
      {tiers.map((t, i) => {
        const next = tiers.map((x) => Number(x.qty_min)).filter((n) => n > Number(t.qty_min)).sort((a, b) => a - b)[0];
        return <div key={i} className="grid max-w-xl grid-cols-[1fr_1fr_1fr_40px] items-center gap-2">
          <Input type="number" min={1} value={t.qty_min} onChange={(e) => setTier(i, "qty_min", e.target.value)} aria-label="ចាប់ពី" />
          <span className="font-sans text-sm text-muted-foreground">ដល់ {next ? next - 1 : "∞"}</span>
          <Input type="number" min={0} step="0.01" placeholder="តម្លៃ USD" value={t.price_usd} onChange={(e) => setTier(i, "price_usd", e.target.value)} aria-label="តម្លៃ" />
          <Button size="icon" variant="ghost" aria-label="លុបកម្រិត" disabled={tiers.length <= 1} onClick={() => setTiers((c) => c.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
        </div>;
      })}
      <Button size="sm" variant="outline" onClick={() => setTiers((c) => [...c, { qty_min: String(Math.max(...c.map((x) => Number(x.qty_min) || 0)) + 10), price_usd: "" }])}><Plus className="size-4" />បន្ថែមកម្រិត</Button>
    </div>

    <div className="flex gap-2">
      <Button disabled={busy} onClick={() => void create()}>{busy ? "កំពុងបង្កើត…" : "បង្កើតទំនិញ"}</Button>
      <Button variant="ghost" onClick={onClose}>បោះបង់</Button>
    </div>
  </div>;
}
