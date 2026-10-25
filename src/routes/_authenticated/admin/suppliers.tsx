import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, inputCls, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  head: () => ({ meta: [{ title: "អ្នកផ្គត់ផ្គង់ | SastraKH Ops" }, { name: "description", content: "Manage suppliers for purchase orders." }, { property: "og:title", content: "SastraKH Suppliers" }, { property: "og:description", content: "Supplier management." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Suppliers,
});

interface Sup { id: string; name: string; phone: string | null; note: string | null; active: boolean }

function Suppliers() {
  const [rows, setRows] = useState<Sup[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState("");

  const load = () => void supabase.from("suppliers").select("*").order("name").then(({ data }) => setRows((data ?? []) as Sup[]));
  useEffect(load, []);

  async function add() {
    if (!name.trim()) return toast.error("សូមបញ្ចូលឈ្មោះ");
    const { error } = await supabase.from("suppliers").insert({ name: name.trim(), phone: phone.trim() || null, note: note.trim() || null });
    if (error) return toast.error(error.message);
    toast.success("បានបន្ថែម"); setName(""); setPhone(""); setNote(""); load();
  }
  async function toggle(s: Sup) {
    await supabase.from("suppliers").update({ active: !s.active }).eq("id", s.id); load();
  }
  async function remove(s: Sup) {
    if (!window.confirm(`លុប ${s.name}?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }

  return <>
    <PageHead title="អ្នកផ្គត់ផ្គង់" subtitle="គ្រប់គ្រងអ្នកផ្គត់ផ្គង់សម្រាប់ការទិញចូល / Suppliers for purchase orders" />
    <Card className="mt-5"><CardContent className="flex flex-wrap items-end gap-2 p-4">
      <label className="text-sm"><span className="mb-1 block font-medium">ឈ្មោះ</span><input aria-label="Name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block font-medium">ទូរស័ព្ទ</span><input aria-label="Phone" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="flex-1 text-sm"><span className="mb-1 block font-medium">កំណត់ចំណាំ</span><input aria-label="Note" className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <Button onClick={() => void add()}><Plus className="size-4" />បន្ថែម</Button>
    </CardContent></Card>
    <Card className="mt-4"><CardContent className="divide-y divide-border p-0">
      {rows.map((s) => <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
        <span className="flex-1 font-medium">{s.name}</span>
        <span className="font-sans text-xs text-muted-foreground">{s.phone}</span>
        <span className="hidden text-xs text-muted-foreground md:inline">{s.note}</span>
        <Badge variant={s.active ? "success" : "neutral"}>{s.active ? "សកម្ម" : "ផ្អាក"}</Badge>
        <Button size="sm" variant="outline" onClick={() => void toggle(s)}>{s.active ? "ផ្អាក" : "បើក"}</Button>
        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove(s)}><Trash2 className="size-4" /></Button>
      </div>)}
      {!rows.length && <p className="p-4 text-sm text-muted-foreground">មិនទាន់មានអ្នកផ្គត់ផ្គង់</p>}
    </CardContent></Card>
  </>;
}
