import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Badge, Button, Card, CardContent, Field, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos } from "@/app/catalog";
import { PageHead, SkeletonRows, toast, uploadPhoto, usd } from "@/app/admin-ui";

interface Stat { banner_id: string; title: string; clicks: number; unique_users: number; orders: number; completed: number; revenue: number }
interface Banner { id: string; title_km: string; title_en: string; subtitle_km: string | null; subtitle_en: string | null; image_path: string | null; link_type: string; link_id: string; active: boolean; sort_order: number }
interface Option { id: string; label: string }
export const Route = createFileRoute("/_authenticated/admin/banners")({ head: () => ({ meta: [{ title: "បដាផ្សព្វផ្សាយ | SastraKH" }, { name: "description", content: "Manage home banners and see click-to-order performance." }, { property: "og:title", content: "SastraKH Banners" }, { property: "og:description", content: "Banner funnel analytics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: BannersPage });

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

function BannersPage() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [cats, setCats] = useState<Option[]>([]);
  const [prods, setProds] = useState<Option[]>([]);
  const [form, setForm] = useState({ title_km: "", title_en: "", link_type: "category", link_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Banner | null>(null);
  const load = useCallback(async () => {
    const [b, s] = await Promise.all([supabase.from("banners").select("id,title_km,title_en,subtitle_km,subtitle_en,image_path,link_type,link_id,active,sort_order").order("sort_order"), supabase.rpc("banner_stats")]);
    if (b.error) toast.error(b.error.message);
    const rows = (b.data ?? []) as Banner[];
    setStats(Object.fromEntries(((s.data ?? []) as Stat[]).map((x) => [x.banner_id, x])));
    setThumbs(await signPhotos(rows.map((r) => r.image_path).filter((x): x is string => !!x)));
    setBanners(rows);
  }, []);
  useEffect(() => { void load();
    void supabase.from("categories").select("id,name_km").then(({ data }) => setCats((data ?? []).map((c) => ({ id: c.id, label: c.name_km }))));
    void supabase.from("products").select("id,name_km").order("name_km").then(({ data }) => setProds((data ?? []).map((c) => ({ id: c.id, label: c.name_km }))));
  }, [load]);
  const linkName = (b: Banner) => b.link_type === "wholesale" ? "ទំព័រលក់ដុំ" : (b.link_type === "category" ? cats : prods).find((o) => o.id === b.link_id)?.label ?? "—";

  async function create() {
    if (!form.title_km || !form.link_id) return toast.error("សូមបំពេញចំណងជើង និងជ្រើសកន្លែងភ្ជាប់");
    if (!file) return toast.error("សូមជ្រើសរូបភាព");
    setBusy(true);
    try {
      const image_path = await uploadPhoto("banners/", file, 1280);
      const { error } = await supabase.from("banners").insert({ ...form, title_en: form.title_en || form.title_km, image_path, sort_order: (banners?.length ?? 0) + 1, active: true });
      if (error) throw error;
      toast.success("បានបន្ថែមបដា"); setForm({ title_km: "", title_en: "", link_type: "category", link_id: "" }); setFile(null); await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function toggle(b: Banner) {
    const { error } = await supabase.from("banners").update({ active: !b.active }).eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success(b.active ? "បានបិទ" : "បានបើក"); void load(); }
  }
  async function replaceImage(b: Banner, f: File) {
    try { const image_path = await uploadPhoto("banners/", f, 1280); const { error } = await supabase.from("banners").update({ image_path }).eq("id", b.id); if (error) throw error; toast.success("បានប្តូររូបភាព"); void load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function saveEdit() {
    if (!edit) return;
    if (!edit.title_km.trim() || !edit.link_id) return toast.error("សូមបំពេញចំណងជើង និងជ្រើសកន្លែងភ្ជាប់");
    const { error } = await supabase.from("banners").update({ title_km: edit.title_km.trim(), title_en: edit.title_en.trim() || edit.title_km.trim(), subtitle_km: edit.subtitle_km?.trim() || null, subtitle_en: edit.subtitle_en?.trim() || null, link_type: edit.link_type, link_id: edit.link_id, sort_order: edit.sort_order }).eq("id", edit.id);
    if (error) toast.error(error.message); else { toast.success("បានរក្សាទុក"); setEdit(null); void load(); }
  }
  async function remove(b: Banner) {
    if (!confirm(`លុបបដា “${b.title_km}”?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("បានលុប"); setEdit(null); void load(); }
  }
  const options = form.link_type === "category" ? cats : prods;
  const select = "h-10 w-full rounded-control border border-input bg-surface px-3 text-sm";

  return <div className="space-y-5">
    <PageHead title="បដាផ្សព្វផ្សាយ" subtitle="បដានៅទំព័រដើម · ចុច អ្នកប្រើ និងការបញ្ជាទិញពីបដានីមួយៗ" />
    <Card><CardContent className="p-0">{!banners ? <SkeletonRows n={3} /> : <div className="divide-y divide-border">{banners.map((b) => { const s = stats[b.id]; return <div key={b.id} className="flex flex-wrap items-center gap-4 p-4">
      <label className="relative block h-16 w-32 shrink-0 cursor-pointer overflow-hidden rounded-control border border-border bg-muted" title="ប្តូររូបភាព">
        {b.image_path && thumbs[b.image_path] ? <img src={thumbs[b.image_path]} alt="" className="size-full object-cover" /> : <ImageIcon className="m-auto mt-5 size-6 text-muted-foreground" />}
        <input type="file" accept="image/*" className="sr-only" aria-label="Replace banner image" onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceImage(b, f); }} />
      </label>
      <div className="min-w-[160px] flex-1"><p className="font-medium">{b.title_km}</p><p className="text-xs text-muted-foreground">{b.link_type === "category" ? "ប្រភេទ" : b.link_type === "wholesale" ? "ភ្ជាប់" : "ទំនិញ"}: {linkName(b)}</p></div>
      <div className="grid grid-cols-5 gap-4 text-center font-sans text-xs">{([["ចុច", s?.clicks ?? 0], ["អ្នកប្រើ", s?.unique_users ?? 0], ["បញ្ជាទិញ", s?.orders ?? 0], ["បញ្ចប់", s?.completed ?? 0], ["អត្រា", pct(s?.completed ?? 0, s?.unique_users ?? 0)]] as const).map(([l, v]) => <div key={l}><p className="font-khmer text-muted-foreground">{l}</p><p className="text-sm font-semibold tabular-nums">{v}</p></div>)}</div>
      <span className="w-20 text-right font-sans text-sm font-semibold tabular-nums">{usd(s?.revenue ?? 0)}</span>
      <Badge variant={b.active ? "success" : "neutral"}>{b.active ? "កំពុងបង្ហាញ" : "បានបិទ"}</Badge>
      <Button size="sm" variant="outline" onClick={() => void toggle(b)}>{b.active ? "បិទ" : "បើក"}</Button>
      <Button size="sm" variant={edit?.id === b.id ? "secondary" : "outline"} onClick={() => setEdit(edit?.id === b.id ? null : { ...b })}>កែ</Button>
      {edit?.id === b.id && <div className="grid w-full gap-3 rounded-control border border-border bg-muted/40 p-4 md:grid-cols-2">
        <Field label="ចំណងជើង (ខ្មែរ)"><Input value={edit.title_km} onChange={(e) => setEdit({ ...edit, title_km: e.target.value })} /></Field>
        <Field label="Title (English)"><Input value={edit.title_en} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} /></Field>
        <Field label="ចំណងជើងរង (ខ្មែរ)"><Input value={edit.subtitle_km ?? ""} onChange={(e) => setEdit({ ...edit, subtitle_km: e.target.value })} /></Field>
        <Field label="Subtitle (English)"><Input value={edit.subtitle_en ?? ""} onChange={(e) => setEdit({ ...edit, subtitle_en: e.target.value })} /></Field>
        <Field label="ភ្ជាប់ទៅ"><select className={select} value={edit.link_type} onChange={(e) => setEdit({ ...edit, link_type: e.target.value, link_id: e.target.value === "wholesale" ? "00000000-0000-0000-0000-000000000000" : "" })}><option value="category">ប្រភេទទំនិញ</option><option value="product">ទំនិញ</option><option value="wholesale">ទំព័រលក់ដុំ</option></select></Field>
        {edit.link_type !== "wholesale" && <Field label="ជ្រើសរើស"><select className={select} value={edit.link_id} onChange={(e) => setEdit({ ...edit, link_id: e.target.value })}><option value="">—</option>{(edit.link_type === "category" ? cats : prods).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>}
        <Field label="លំដាប់បង្ហាញ"><Input type="number" inputMode="numeric" value={String(edit.sort_order)} onChange={(e) => setEdit({ ...edit, sort_order: Math.floor(Number(e.target.value) || 0) })} /></Field>
        <p className="self-end text-xs text-muted-foreground">ប្តូររូបភាព៖ ចុចលើរូបភាពខាងលើ</p>
        <div className="flex flex-wrap gap-2 md:col-span-2"><Button size="sm" onClick={() => void saveEdit()}>រក្សាទុក</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>បោះបង់</Button><Button size="sm" variant="destructive" className="ml-auto" onClick={() => void remove(b)}>លុបបដា</Button></div>
      </div>}
    </div>; })}{!banners.length && <p className="p-10 text-center text-sm text-muted-foreground">មិនទាន់មានបដា</p>}</div>}</CardContent></Card>
    <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2"><h2 className="font-bold md:col-span-2">បន្ថែមបដា</h2>
      <Field label="ចំណងជើង (ខ្មែរ)"><Input value={form.title_km} onChange={(e) => setForm({ ...form, title_km: e.target.value })} /></Field>
      <Field label="Title (English)"><Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Field>
      <Field label="ភ្ជាប់ទៅ"><select className={select} value={form.link_type} onChange={(e) => setForm({ ...form, link_type: e.target.value, link_id: e.target.value === "wholesale" ? "00000000-0000-0000-0000-000000000000" : "" })}><option value="category">ប្រភេទទំនិញ</option><option value="product">ទំនិញ</option><option value="wholesale">ទំព័រលក់ដុំ</option></select></Field>
      {form.link_type !== "wholesale" && <Field label="ជ្រើសរើស"><select className={select} value={form.link_id} onChange={(e) => setForm({ ...form, link_id: e.target.value })}><option value="">—</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>}
      <Field label="រូបភាព (ទំហំល្អ 2:1 · បង្រួមស្វ័យប្រវត្តិ)"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" /></Field>
      <div className="flex items-end"><Button disabled={busy} onClick={() => void create()}>{busy ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}</Button></div>
    </CardContent></Card>
  </div>;
}
