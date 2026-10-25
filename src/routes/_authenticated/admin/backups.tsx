import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DatabaseBackup, Download } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, SkeletonRows, toast } from "@/app/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/backups")({
  head: () => ({ meta: [{ title: "ច្បាប់ចម្លងទិន្នន័យ | SastraKH Ops" }, { name: "description", content: "Daily SastraKH database backup copies." }, { property: "og:title", content: "SastraKH Backups" }, { property: "og:description", content: "Download database backup copies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BackupsPage,
});

interface Backup { id: string; created_at: string; size_bytes: number }

function BackupsPage() {
  const [list, setList] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => void supabase.from("db_backups").select("id,created_at,size_bytes").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as Backup[]));
  useEffect(load, []);

  async function runNow() {
    setBusy("new");
    const { error } = await supabase.rpc("create_db_backup");
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("បានបង្កើតច្បាប់ចម្លង · Backup created"); load(); }
  }
  async function download(b: Backup) {
    setBusy(b.id);
    const { data, error } = await supabase.from("db_backups").select("data").eq("id", b.id).single();
    setBusy(null);
    if (error || !data) return toast.error(error?.message ?? "Not found");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data.data, null, 1)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `provisionkh-backup-${b.created_at.slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <PageHead title="ច្បាប់ចម្លងទិន្នន័យ · Backups" subtitle="ធ្វើដោយស្វ័យប្រវត្តិរៀងរាល់ថ្ងៃ ម៉ោង ៣ ព្រឹក · រក្សាទុក ១៤ ថ្ងៃចុងក្រោយ · Automatic daily at 3am, last 14 kept">
      <Button onClick={() => void runNow()} disabled={busy === "new"}><DatabaseBackup className="size-4" />{busy === "new" ? "…" : "ធ្វើឥឡូវ · Back up now"}</Button>
    </PageHead>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">ច្បាប់ចម្លងមានទំនិញ អតិថិជន ការបញ្ជាទិញ ការទូទាត់ និងការកំណត់។ មិនរួមបញ្ចូលរូបភាព ពាក្យសម្ងាត់ ឬកូនសោ Telegram ទេ។ ទាញយកទុកក្នុងកុំព្យូទ័ររបស់អ្នកម្តងម្កាល។ · Includes products, customers, orders, payments and settings — not photos, passwords or the Telegram token. Download a copy to your own computer now and then.</p>
    <Card className="mt-4"><CardContent className="p-0">
      {!list ? <SkeletonRows n={4} /> : list.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">មិនទាន់មាន · None yet</p> :
        <ul className="divide-y divide-border">{list.map((b) => <li key={b.id} className="flex items-center justify-between gap-3 p-3">
          <div><p className="font-sans font-semibold">{new Date(b.created_at).toLocaleString("en-GB", { timeZone: "Asia/Phnom_Penh" })}</p><p className="font-sans text-xs text-muted-foreground">{(b.size_bytes / 1024).toFixed(0)} KB</p></div>
          <Button variant="outline" size="sm" onClick={() => void download(b)} disabled={busy === b.id}><Download className="size-4" />{busy === b.id ? "…" : "ទាញយក · Download"}</Button>
        </li>)}</ul>}
    </CardContent></Card>
  </>;
}
