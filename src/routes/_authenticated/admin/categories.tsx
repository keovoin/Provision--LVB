import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "ក្រុមទំនិញ | ProvisionKH Ops" }, { name: "description", content: "Manage ProvisionKH product categories." }, { property: "og:title", content: "ProvisionKH Categories" }, { property: "og:description", content: "Product category management." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CategoriesPage,
});

interface Category { id: string; slug: string; name_en: string; name_km: string; icon: string; sort_order: number; active: boolean }
const EMPTY: Omit<Category, "id"> = { slug: "", name_en: "", name_km: "", icon: "", sort_order: 0, active: true };

function CategoriesPage() {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_km,icon,sort_order,active").order("sort_order").order("name_en");
    if (error) toast.error(error.message);
    setCats((data ?? []) as Category[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const list = (cats ?? []).filter((c) => `${c.name_en} ${c.name_km} ${c.slug}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title="ក្រុមទំនិញ" subtitle="បង្កើត និងកែសម្រួលក្រុមទំនិញដែលបង្ហាញក្នុងហាង" />
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div className="max-w-xs flex-1"><SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="ស្វែងរកក្រុមទំនិញ…" /></div>
      <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="size-4" />បង្កើតក្រុមថ្មី</Button>
    </div>
    {showForm && <CategoryForm initial={editing} onDone={() => { setShowForm(false); setEditing(null); void load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />}
    <Card className="mt-4"><CardContent className="p-0">{!cats ? <SkeletonRows /> : <div className="divide-y divide-border">{list.map((c) => <div key={c.id} className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[180px] flex-1">
        <p className="font-medium">{c.icon && <span className="mr-1.5">{c.icon}</span>}{c.name_km} <span className="font-sans text-xs text-muted-foreground">{c.name_en}</span></p>
        <p className="font-sans text-xs text-muted-foreground">{c.slug} · លំដាប់ {c.sort_order}</p>
      </div>
      <Badge variant={c.active ? "success" : "neutral"}>{c.active ? "សកម្ម" : "បិទ"}</Badge>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => { setEditing(c); setShowForm(true); }}><Pencil className="size-3.5" />កែ</Button>
        <Button size="sm" variant="outline" onClick={() => void remove(c)}><Trash2 className="size-3.5" />លុប</Button>
      </div>
    </div>)}{!list.length && <p className="p-6 text-center text-sm text-muted-foreground">មិនមានក្រុមទំនិញ</p>}</div>}</CardContent></Card>
  </>;

  async function remove(c: Category) {
    if (!window.confirm(`លុបក្រុម "${c.name_km}"? អាចលុបបានតែពេលគ្មានទំនិញក្នុងក្រុមនេះ។`)) return;
    const { error } = await supabase.rpc("admin_delete_category", { _id: c.id });
    if (error) return toast.error(error.message.includes("has products") ? "ក្រុមនេះមានទំនិញ — ផ្លាស់ទីទំនិញចេញជាមុនសិន" : error.message);
    toast.success("បានលុប"); void load();
  }
}

function CategoryForm({ initial, onDone, onCancel }: { initial: Category | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState<Omit<Category, "id">>(initial ? { slug: initial.slug, name_en: initial.name_en, name_km: initial.name_km, icon: initial.icon, sort_order: initial.sort_order, active: initial.active } : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const cls = "h-10 w-full rounded-control border border-border bg-background px-3 text-sm";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.slug.trim() || !f.name_en.trim() || !f.name_km.trim()) return toast.error("បំពេញ slug និងឈ្មោះទាំងពីរភាសា");
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_category", { _id: (initial?.id ?? null) as string, _slug: f.slug.trim(), _name_en: f.name_en.trim(), _name_km: f.name_km.trim(), _icon: f.icon.trim(), _sort_order: f.sort_order, _active: f.active });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("បានរក្សាទុក"); onDone();
  }
  return <Card className="mt-4"><CardContent className="p-4"><form onSubmit={submit} className="space-y-3">
    <p className="font-semibold">{initial ? "កែក្រុមទំនិញ" : "ក្រុមទំនិញថ្មី"}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input className={cls} required placeholder="slug (ឧ. rice-noodles)" value={f.slug} onChange={(e) => set("slug", e.target.value)} />
      <input className={cls} required placeholder="ឈ្មោះខ្មែរ" value={f.name_km} onChange={(e) => set("name_km", e.target.value)} />
      <input className={cls} required placeholder="English name" value={f.name_en} onChange={(e) => set("name_en", e.target.value)} />
      <input className={cls} placeholder="រូប (emoji ឧ. 🍚)" value={f.icon} onChange={(e) => set("icon", e.target.value)} />
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">លំដាប់<input type="number" className={`${cls} w-24`} value={f.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} /></label>
      <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-sm"><input type="checkbox" className="accent-primary" checked={f.active} onChange={(e) => set("active", e.target.checked)} />សកម្ម</label>
    </div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>{busy ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}</Button><Button type="button" size="sm" variant="ghost" onClick={onCancel}>បោះបង់</Button></div>
  </form></CardContent></Card>;
}
