import { useEffect, useState } from "react";
import { GripVertical, ImagePlus, Play, Trash2, Upload } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos } from "@/app/catalog";
import { toast, uploadPhoto, uploadProductVideo } from "@/app/admin-ui";

interface ProductMedia { id: string; media_type: "image" | "video"; storage_path: string; sort_order: number }

export function ProductMediaManager({ productId }: { productId: string }) {
  const [items, setItems] = useState<ProductMedia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("product_media").select("id,media_type,storage_path,sort_order").eq("product_id", productId).order("sort_order");
    if (error) return toast.error(error.message);
    const next = (data ?? []) as ProductMedia[];
    setItems(next);
    setUrls(await signPhotos(next.map((item) => item.storage_path)));
  }
  useEffect(() => { void load(); }, [productId]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded: { product_id: string; media_type: string; storage_path: string; sort_order: number }[] = [];
      for (const [index, file] of Array.from(files).entries()) {
        const video = file.type.startsWith("video/");
        const storage_path = video
          ? await uploadProductVideo(`products/${productId}/`, file)
          : await uploadPhoto(`products/${productId}/`, file, 1280);
        uploaded.push({ product_id: productId, media_type: video ? "video" : "image", storage_path, sort_order: items.length + index });
      }
      const { error } = await supabase.from("product_media").insert(uploaded);
      if (error) throw error;
      toast.success("បានបន្ថែមមេឌៀ · Media added");
      await load();
    } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }

  async function remove(item: ProductMedia) {
    const { error } = await supabase.from("product_media").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("product-photos").remove([item.storage_path]);
    await load();
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (!items[other]) return;
    const a = items[index]; const b = items[other];
    await Promise.all([
      supabase.from("product_media").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("product_media").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  }

  return <div className="space-y-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-sm font-semibold">រូបភាព និងវីដេអូ</p><p className="font-sans text-xs text-muted-foreground">Images are compressed · Video: 30s, 720p, under 8MB</p></div>
      <Button asChild size="sm" variant="outline" disabled={busy}><label className="cursor-pointer"><Upload className="size-4" />{busy ? "កំពុងផ្ទុក…" : "បន្ថែម"}<input className="sr-only" type="file" multiple accept="image/*,video/mp4,video/webm" onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} /></label></Button>
    </div>
    {items.length === 0 ? <label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-border text-sm text-muted-foreground"><ImagePlus className="size-5" />បន្ថែមរូបភាពច្រើន ឬវីដេអូខ្លី<input className="sr-only" type="file" multiple accept="image/*,video/mp4,video/webm" onChange={(event) => void addFiles(event.target.files)} /></label>
      : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map((item, index) => <div key={item.id} className="relative aspect-square overflow-hidden rounded-control border border-border bg-muted">
        {item.media_type === "video" ? <video src={urls[item.storage_path]} muted preload="metadata" className="size-full object-cover" /> : <img src={urls[item.storage_path]} alt="" loading="lazy" className="size-full object-cover" />}
        {item.media_type === "video" && <span className="absolute left-1 top-1 rounded-control bg-surface/90 p-1"><Play className="size-3" /></span>}
        <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-control bg-surface/90 p-1">
          <GripVertical className="size-3 text-muted-foreground" />
          <div className="flex"><Button size="icon" variant="ghost" className="size-7" aria-label="Move earlier" disabled={index === 0} onClick={() => void move(index, -1)}>←</Button><Button size="icon" variant="ghost" className="size-7" aria-label="Move later" disabled={index === items.length - 1} onClick={() => void move(index, 1)}>→</Button><Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Delete media" onClick={() => void remove(item)}><Trash2 className="size-3.5" /></Button></div>
        </div>
      </div>)}</div>}
  </div>;
}