import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Sparkles, Trash2, Type } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateProductDescription } from "@/lib/ai.functions";
import { Button } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos } from "@/app/catalog";
import { toast, uploadPhoto } from "@/app/admin-ui";
import { parseBlocks, type DescBlock } from "@/app/description";

const area = "w-full rounded-control border border-input bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DescriptionEditor({ productId, sku }: { productId: string; sku: string }) {
  const [blocks, setBlocks] = useState<DescBlock[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ name: "", category: "", details: "" });
  const [aiBusy, setAiBusy] = useState(false);
  const gen = useServerFn(generateProductDescription);

  useEffect(() => { void (async () => {
    const { data } = await supabase.from("products").select("description,name_km,name_en,categories(name_km,name_en)").eq("id", productId).single();
    const c = (data as { categories?: { name_km: string; name_en: string } | null } | null)?.categories;
    setAi((a) => ({ ...a, name: [data?.name_en, data?.name_km].filter(Boolean).join(" / "), category: c ? `${c.name_en} / ${c.name_km}` : "" }));
    const b = parseBlocks(data?.description); setBlocks(b);
    setUrls(await signPhotos(b.flatMap((x) => (x.type === "image" ? [x.path] : []))));
  })(); }, [productId]);

  if (!blocks) return <div className="h-20 animate-pulse rounded-control bg-muted" />;
  const set = (i: number, b: DescBlock) => setBlocks(blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: number) => { const n = [...blocks]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setBlocks(n); };

  async function addImage(f: File) {
    setBusy(true);
    try {
      const path = await uploadPhoto(`desc/${sku}-`, f, 1080);
      setUrls({ ...urls, ...(await signPhotos([path])) });
      setBlocks((c) => [...(c ?? []), { type: "image", path }]);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function generate() {
    if (!ai.name.trim()) return toast.error("សូមបញ្ចូលឈ្មោះទំនិញ");
    setAiBusy(true);
    try {
      const r = await gen({ data: ai });
      setBlocks((c) => [{ type: "text", km: r.km, en: r.en }, ...(c ?? [])]);
      toast.success("បានបង្កើតការពិពណ៌នា — ពិនិត្យ ហើយចុចរក្សាទុក");
    } catch (e) { toast.error((e as Error).message); } finally { setAiBusy(false); }
  }
  async function save() {
    setBusy(true);
    const clean = blocks!.filter((b) => b.type === "image" || b.km.trim() || b.en.trim());
    const { error } = await supabase.from("products").update({ description: clean, updated_at: new Date().toISOString() }).eq("id", productId);
    setBusy(false);
    if (error) toast.error(error.message); else { setBlocks(clean); toast.success("បានរក្សាទុកការពិពណ៌នា"); }
  }

  return <div className="max-w-2xl space-y-3 border-t border-border pt-3">
    <p className="text-sm font-semibold">ការពិពណ៌នាទំនិញ <span className="font-sans font-normal text-muted-foreground">· Description</span></p>
    <div className="space-y-2 rounded-control border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />បង្កើតដោយ AI <span className="font-sans font-normal text-muted-foreground">· AI-powered writer</span></p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={area} placeholder="ឈ្មោះទំនិញ · Product name" value={ai.name} onChange={(e) => setAi({ ...ai, name: e.target.value })} />
        <input className={area} placeholder="ប្រភេទ · Category" value={ai.category} onChange={(e) => setAi({ ...ai, category: e.target.value })} />
      </div>
      <textarea rows={2} className={area} placeholder="ព័ត៌មានសំខាន់ៗ (ទំហំ ម៉ាក ប្រភព…) · Key details" value={ai.details} onChange={(e) => setAi({ ...ai, details: e.target.value })} />
      <Button size="sm" disabled={aiBusy} onClick={() => void generate()}><Sparkles className="size-4" />{aiBusy ? "កំពុងសរសេរ…" : "សរសេរការពិពណ៌នា KH/EN"}</Button>
    </div>
    {blocks.length === 0 && <p className="text-sm text-muted-foreground">មិនទាន់មានការពិពណ៌នា។ បន្ថែមអត្ថបទ ឬរូបភាព។</p>}
    {blocks.map((b, i) => <div key={i} className="flex gap-2 rounded-control border border-border bg-surface p-2">
      <div className="min-w-0 flex-1 space-y-2">
        {b.type === "text"
          ? <><textarea rows={3} className={area} placeholder="អត្ថបទ (ខ្មែរ)" value={b.km} onChange={(e) => set(i, { ...b, km: e.target.value })} />
              <textarea rows={2} className={`${area} font-sans`} placeholder="Text (English)" value={b.en} onChange={(e) => set(i, { ...b, en: e.target.value })} /></>
          : urls[b.path] ? <img src={urls[b.path]} alt="" className="max-h-56 rounded-control object-contain" /> : <div className="h-24 animate-pulse rounded-control bg-muted" />}
      </div>
      <div className="flex flex-col gap-1">
        <Button size="icon" variant="ghost" aria-label="ឡើងលើ" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="ចុះក្រោម" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="លុប" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
      </div>
    </div>)}
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setBlocks([...blocks, { type: "text", km: "", en: "" }])}><Type className="size-4" />បន្ថែមអត្ថបទ</Button>
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-control border border-input px-3 text-sm font-medium hover:bg-muted">
        <ImagePlus className="size-4" />បន្ថែមរូបភាព
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void addImage(f); e.target.value = ""; }} />
      </label>
      <Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? "កំពុងរក្សាទុក…" : "រក្សាទុកការពិពណ៌នា"}</Button>
    </div>
  </div>;
}
