import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, inputCls , toast } from "@/app/admin-ui";

function DeliveryFeeCard() {
  const [fee, setFee] = useState("");
  const [free, setFree] = useState("");
  useEffect(() => { void supabase.from("app_settings").select("delivery_fee_usd,free_delivery_min_usd").eq("id", true).maybeSingle().then(({ data }) => { setFee(String(data?.delivery_fee_usd ?? 0)); setFree(data?.free_delivery_min_usd == null ? "" : String(data.free_delivery_min_usd)); }); }, []);
  async function save() {
    const f = Number(fee); const m = free.trim() === "" ? null : Number(free);
    if (!Number.isFinite(f) || f < 0 || f > 100) return toast.error("ថ្លៃដឹកត្រូវនៅចន្លោះ $0–$100");
    if (m != null && (!Number.isFinite(m) || m < 0)) return toast.error("ចំនួនមិនត្រឹមត្រូវ");
    const { error } = await supabase.from("app_settings").update({ delivery_fee_usd: f, free_delivery_min_usd: m, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) toast.error(error.message); else toast.success("បានរក្សាទុក · Saved");
  }
  return <Card className="mt-5 max-w-md"><CardContent className="space-y-3 p-5">
    <h2 className="text-lg font-bold">ថ្លៃដឹកជញ្ជូន · Delivery fee</h2>
    <label className="block text-sm font-medium">ថ្លៃដឹកក្នុងមួយការបញ្ជាទិញ (USD) · Fee per order<input inputMode="decimal" className={`${inputCls} mt-1 h-10 w-full font-sans`} value={fee} onChange={(e) => setFee(e.target.value)} /></label>
    <label className="block text-sm font-medium">ដឹកឥតគិតថ្លៃ ពេលទិញចាប់ពី (USD) · Free delivery from<input inputMode="decimal" placeholder="ទុកទទេ = គ្មាន · blank = never" className={`${inputCls} mt-1 h-10 w-full font-sans`} value={free} onChange={(e) => setFree(e.target.value)} /></label>
    <p className="text-xs text-muted-foreground">0 = ដឹកឥតគិតថ្លៃជានិច្ច។ អនុវត្តចំពោះការបញ្ជាទិញរបស់អតិថិជន (មិនមែនការបញ្ជាទិញដែលបុគ្គលិកបង្កើត)។ · 0 = always free. Applies to customer checkout, not staff-created orders.</p>
    <Button onClick={() => void save()}>រក្សាទុក · Save</Button>
  </CardContent></Card>;
}

function AlertsCard() {
  const [a, setA] = useState({ telegram_bot_token: "", telegram_chat_id: "", enabled: false, notify_new_order: true, notify_paid: true, notify_low_stock: true });
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => { void supabase.from("alert_settings").select("*").eq("id", true).maybeSingle().then(({ data }) => { if (data) { setHasToken(Boolean(data.telegram_bot_token)); setA({ telegram_bot_token: "", telegram_chat_id: data.telegram_chat_id ?? "", enabled: data.enabled, notify_new_order: data.notify_new_order, notify_paid: data.notify_paid, notify_low_stock: data.notify_low_stock }); } }); }, []);
  async function save() {
    const token = a.telegram_bot_token.trim();
    if (token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) return toast.error("Bot token មិនត្រឹមត្រូវ · Invalid bot token (looks like 123456:ABC…)");
    if (a.telegram_chat_id && !/^-?\d+$|^@\w{4,}$/.test(a.telegram_chat_id.trim())) return toast.error("Chat ID មិនត្រឹមត្រូវ · Invalid chat ID");
    const { telegram_bot_token: _t, ...rest } = a;
    const { error } = await supabase.from("alert_settings").upsert({ id: true, ...rest, telegram_chat_id: a.telegram_chat_id.trim() || null, ...(token ? { telegram_bot_token: token } : {}), updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    if (token) setHasToken(true);
    setA((c) => ({ ...c, telegram_bot_token: "" }));
    toast.success("បានរក្សាទុក · Saved");
  }
  async function test() { const { error } = await supabase.rpc("test_alert"); if (error) toast.error(error.message); else toast.success("បានផ្ញើសារសាកល្បង · Test sent — check Telegram"); }
  const box = (k: "enabled" | "notify_new_order" | "notify_paid" | "notify_low_stock", label: string) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={a[k]} onChange={(e) => setA((c) => ({ ...c, [k]: e.target.checked }))} />{label}</label>;
  return <Card className="mt-5 max-w-xl"><CardContent className="space-y-3 p-5">
    <h2 className="text-lg font-bold">ការជូនដំណឹង Telegram · Telegram alerts</h2>
    <p className="text-sm text-muted-foreground">ផ្ញើសារទៅអ្នក ពេលមានការបញ្ជាទិញថ្មី ការទូទាត់ ឬស្តុកទាប។ · Sends you a message on new orders, payments and low stock.</p>
    <label className="block text-sm font-medium">Bot token<input type="password" autoComplete="off" placeholder={hasToken ? "•••••• បានរក្សាទុក · saved (type to replace)" : "123456789:ABC…"} className={`${inputCls} mt-1 h-10 w-full font-sans`} value={a.telegram_bot_token} onChange={(e) => setA((c) => ({ ...c, telegram_bot_token: e.target.value }))} /></label>
    <label className="block text-sm font-medium">Chat ID<input placeholder="-1001234567890" className={`${inputCls} mt-1 h-10 w-full font-sans`} value={a.telegram_chat_id} onChange={(e) => setA((c) => ({ ...c, telegram_chat_id: e.target.value }))} /></label>
    <div className="space-y-2">{box("enabled", "បើកការជូនដំណឹង · Alerts on")}{box("notify_new_order", "ការបញ្ជាទិញថ្មី · New orders")}{box("notify_paid", "បានទូទាត់ · Payments")}{box("notify_low_stock", "ស្តុកទាប · Low stock")}</div>
    <div className="flex gap-2"><Button onClick={() => void save()}>រក្សាទុក · Save</Button><Button variant="outline" onClick={() => void test()} disabled={!hasToken || !a.enabled}>សាកល្បង · Send test</Button></div>
  </CardContent></Card>;
}

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "ការកំណត់ | SastraKH Ops" }, { name: "description", content: "SastraKH store settings." }, { property: "og:title", content: "SastraKH Settings" }, { property: "og:description", content: "Exchange rate and store settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [rate, setRate] = useState("");
  const [content, setContent] = useState({ company_profile: "", delivery_information: "", returns_refunds_policy: "", privacy_policy: "", terms_conditions: "", facebook_url: "", telegram_url: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { void supabase.from("app_settings").select("exchange_rate,company_profile,delivery_information,returns_refunds_policy,privacy_policy,terms_conditions,facebook_url,telegram_url").maybeSingle().then(({ data }) => { setRate(String(data?.exchange_rate ?? "")); if (data) setContent({ company_profile: data.company_profile, delivery_information: data.delivery_information, returns_refunds_policy: data.returns_refunds_policy, privacy_policy: data.privacy_policy, terms_conditions: data.terms_conditions, facebook_url: data.facebook_url, telegram_url: data.telegram_url }); }); }, []);
  const setField = (key: keyof typeof content, value: string) => setContent((current) => ({ ...current, [key]: value }));
  async function save() {
    const v = Number(rate);
    if (!Number.isFinite(v) || v < 1000 || v > 10000) return toast.error("អត្រាត្រូវនៅចន្លោះ 1000–10000");
    if (!window.confirm(`កំណត់អត្រា 1 USD = ${v} KHR?`)) return;
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ exchange_rate: v, updated_at: new Date().toISOString() }).eq("id", true);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("បានរក្សាទុក");
  }
  async function saveStorefront() {
    for (const value of [content.facebook_url, content.telegram_url].filter(Boolean)) {
      try { const url = new URL(value); if (url.protocol !== "https:") throw new Error(); } catch { return toast.error("តំណ Facebook និង Telegram ត្រូវចាប់ផ្តើមដោយ https://"); }
    }
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ ...content, updated_at: new Date().toISOString() }).eq("id", true);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("បានរក្សាទុកព័ត៌មានទំព័រដើម");
  }
  return <>
    <PageHead title="ការកំណត់" subtitle="ព័ត៌មានហាង និងអត្រាប្តូរប្រាក់" />
    <Card className="mt-5 max-w-md"><CardContent className="space-y-3 p-5">
      <label className="block text-sm font-medium" htmlFor="rate">អត្រាប្តូរប្រាក់ (KHR ក្នុង 1 USD)</label>
      <input id="rate" inputMode="numeric" className={`${inputCls} h-10 w-full font-sans`} value={rate} onChange={(e) => setRate(e.target.value)} />
      <p className="text-xs text-muted-foreground">មានតែម្ចាស់ហាងប៉ុណ្ណោះអាចផ្លាស់ប្តូរ។</p>
      <Button onClick={save} disabled={busy}>រក្សាទុក</Button>
    </CardContent></Card>
    <Card className="mt-5"><CardContent className="space-y-5 p-5">
      <div><h2 className="text-lg font-bold">ព័ត៌មាននៅបាតទំព័រដើម</h2><p className="text-sm text-muted-foreground">អតិថិជននឹងឃើញព័ត៌មានទាំងនេះនៅខាងក្រោមទំនិញ។</p></div>
      {([
        ["company_profile", "ប្រវត្តិក្រុមហ៊ុន · Company Profile"],
        ["delivery_information", "ព័ត៌មានដឹកជញ្ជូន · Delivery Information"],
        ["returns_refunds_policy", "គោលការណ៍ប្តូរ និងសងប្រាក់ · Returns & Refunds Policy"],
        ["privacy_policy", "គោលការណ៍ឯកជនភាព · Privacy Policy"],
        ["terms_conditions", "លក្ខខណ្ឌប្រើប្រាស់ · Terms & Conditions"],
      ] as const).map(([key, label]) => <label key={key} className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span><textarea rows={4} className="w-full rounded-control border border-input bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={content[key]} onChange={(event) => setField(key, event.target.value)} /></label>)}
      <div className="grid gap-4 md:grid-cols-2"><label><span className="mb-1.5 block text-sm font-semibold">Facebook link</span><Input type="url" placeholder="https://facebook.com/..." value={content.facebook_url} onChange={(event) => setField("facebook_url", event.target.value)} /></label><label><span className="mb-1.5 block text-sm font-semibold">Telegram link</span><Input type="url" placeholder="https://t.me/..." value={content.telegram_url} onChange={(event) => setField("telegram_url", event.target.value)} /></label></div>
      <Button onClick={() => void saveStorefront()} disabled={busy}>រក្សាទុកព័ត៌មានទំព័រដើម</Button>
    </CardContent></Card>
    <DeliveryFeeCard />
    <AlertsCard />
  </>;
}
