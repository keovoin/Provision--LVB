import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createStaffAccount, resetStaffPassword } from "@/lib/staff.functions";
import { Badge, Button, Card, CardContent, SearchInput } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({ meta: [{ title: "បុគ្គលិក | SastraKH Ops" }, { name: "description", content: "Manage SastraKH staff roles and access." }, { property: "og:title", content: "SastraKH Staff" }, { property: "og:description", content: "Staff roles and permissions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StaffPage,
});

const SECTIONS: [string, string][] = [["orders", "ការបញ្ជាទិញ"], ["customers", "អតិថិជន"], ["products", "ទំនិញ និងបដា"], ["categories", "ក្រុមទំនិញ"], ["drops", "ដឹកជញ្ជូនប្រចាំ"], ["receivables", "ប្រាក់ត្រូវទទួល"], ["reports", "របាយការណ៍លក់"], ["stock", "ស្តុក"], ["pos", "លក់ផ្ទាល់ (POS)"], ["requests", "សំណើតម្លៃ និងតាមតម្រូវការ"]];
interface Person { id: string; name: string; phone: string; business_name: string | null }

function StaffPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [perms, setPerms] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const [p, r, s] = await Promise.all([
      supabase.from("profiles").select("id,name,phone,business_name").order("name"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("staff_permissions").select("user_id,section"),
    ]);
    const rm: Record<string, string[]> = {}; for (const x of r.data ?? []) (rm[x.user_id] ??= []).push(x.role);
    const pm: Record<string, string[]> = {}; for (const x of s.data ?? []) (pm[x.user_id] ??= []).push(x.section);
    setIsOwner(!!u.user && (rm[u.user.id] ?? []).includes("owner"));
    setPeople((p.data ?? []) as Person[]); setRoles(rm); setPerms(pm); setDraft({});
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(p: Person, staff: boolean) {
    const sections = draft[p.id] ?? perms[p.id] ?? [];
    if (!window.confirm(staff ? `ផ្តល់សិទ្ធិបុគ្គលិកដល់ ${p.name}?` : `ដកសិទ្ធិបុគ្គលិកពី ${p.name}?`)) return;
    const { error } = await supabase.rpc("set_staff_access", { _user_id: p.id, _staff: staff, _sections: staff ? sections : [] });
    if (error) return toast.error(error.message);
    toast.success("បានរក្សាទុក"); void load();
  }
  const toggle = (id: string, s: string) => setDraft((d) => { const cur = d[id] ?? perms[id] ?? []; return { ...d, [id]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] }; });
  const resetPw = useServerFn(resetStaffPassword);
  async function reset(p: Person) {
    const pw = window.prompt(`ពាក្យសម្ងាត់ថ្មីសម្រាប់ ${p.name} (យ៉ាងតិច ៨ តួ) / New password (min 8):`);
    if (!pw) return;
    if (pw.length < 8) return toast.error("ពាក្យសម្ងាត់យ៉ាងតិច ៨ តួ / Password min 8 characters");
    try {
      await resetPw({ data: { userId: p.id, password: pw } });
      toast.success("បានប្តូរពាក្យសម្ងាត់ — បុគ្គលិកត្រូវប្តូរនៅពេលចូលលើកក្រោយ / Password reset; staff must change it at next sign-in");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  }

  const list = (people ?? []).filter((p) => `${p.name} ${p.phone} ${p.business_name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number((roles[b.id] ?? []).some((r) => r !== "customer")) - Number((roles[a.id] ?? []).some((r) => r !== "customer")));
  return <>
    <PageHead title="បុគ្គលិក" subtitle="តួនាទី និងផ្នែកដែលបុគ្គលិកអាចចូលប្រើ" />
    {!isOwner && people && <p className="mt-4 rounded-control border border-border bg-surface p-3 text-sm text-muted-foreground">មានតែម្ចាស់ហាងប៉ុណ្ណោះអាចផ្លាស់ប្តូរសិទ្ធិ។</p>}
    {isOwner && <NewStaff onDone={load} />}
    <div className="mt-5 max-w-xs"><SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="ស្វែងរកឈ្មោះ ឬទូរស័ព្ទ…" /></div>
    <Card className="mt-4"><CardContent className="p-0">{!people ? <SkeletonRows /> : <div className="divide-y divide-border">{list.map((p) => {
      const r = roles[p.id] ?? []; const owner = r.includes("owner"); const staff = r.includes("staff"); const sel = draft[p.id] ?? perms[p.id] ?? []; const dirty = draft[p.id] !== undefined;
      return <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-[180px] flex-1"><p className="font-medium">{p.name || "—"}</p><p className="font-sans text-xs text-muted-foreground">{p.phone}{p.business_name ? ` · ${p.business_name}` : ""}</p></div>
        <Badge variant={owner ? "success" : staff ? "warning" : "neutral"}>{owner ? "ម្ចាស់" : staff ? "បុគ្គលិក" : "អតិថិជន"}</Badge>
        {!owner && isOwner && <div className="flex flex-wrap gap-1.5">{SECTIONS.map(([k, l]) => <label key={k} className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border px-2 text-xs ${sel.includes(k) ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground"}`}><input type="checkbox" className="accent-primary" checked={sel.includes(k)} onChange={() => toggle(p.id, k)} />{l}</label>)}</div>}
        {!owner && isOwner && <div className="flex gap-2">{(dirty || !staff) && <Button size="sm" onClick={() => save(p, true)} disabled={!sel.length}>{staff ? "រក្សាទុក" : "ធ្វើជាបុគ្គលិក"}</Button>}{staff && <Button size="sm" variant="outline" onClick={() => reset(p)}>ប្តូរពាក្យសម្ងាត់</Button>}{staff && <Button size="sm" variant="outline" onClick={() => save(p, false)}>ដកសិទ្ធិ</Button>}</div>}
      </div>; })}</div>}</CardContent></Card>
  </>;
}

function NewStaff({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createStaffAccount);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [sec, setSec] = useState<string[]>(["orders", "products"]); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("ពាក្យសម្ងាត់យ៉ាងតិច ៨ តួ / Password min 8 characters");
    if (!window.confirm(`បង្កើតគណនីបុគ្គលិក ${email}?`)) return;
    setBusy(true);
    try {
      await create({ data: { name, email, password: pw, sections: sec as ("orders")[] } });
      toast.success("បានបង្កើតគណនីបុគ្គលិក"); setName(""); setEmail(""); setPw(""); onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setBusy(false); }
  }
  const cls = "h-10 w-full rounded-control border border-border bg-background px-3 text-sm";
  return <Card className="mt-5"><CardContent className="p-4"><form onSubmit={submit} className="space-y-3">
    <p className="font-semibold">បង្កើតគណនីបុគ្គលិកថ្មី <span className="text-xs font-normal text-muted-foreground">New staff account</span></p>
    <div className="grid gap-3 sm:grid-cols-3">
      <input className={cls} required placeholder="ឈ្មោះ / Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={cls} required type="email" placeholder="អ៊ីមែល / Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={cls} required type="text" autoComplete="new-password" placeholder="ពាក្យសម្ងាត់បណ្តោះអាសន្ន / Temp password" value={pw} onChange={(e) => setPw(e.target.value)} />
    </div>
    <div className="flex flex-wrap gap-1.5">{SECTIONS.map(([k, l]) => <label key={k} className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border px-2 text-xs ${sec.includes(k) ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground"}`}><input type="checkbox" className="accent-primary" checked={sec.includes(k)} onChange={() => setSec((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k])} />{l}</label>)}</div>
    <Button type="submit" size="sm" disabled={busy || !sec.length}>{busy ? "កំពុងបង្កើត…" : "បង្កើតគណនី"}</Button>
  </form></CardContent></Card>;
}
