import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { FileText, Heart, Headphones, Languages, LogOut, Moon, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardContent, Field, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/app/prefs";
import type { LatLng } from "@/app/MapPicker";

const MapPicker = lazy(() => import("@/app/MapPicker").then((m) => ({ default: m.MapPicker })));
// Support chat link comes from the Telegram link in admin settings; falls back to the store bot.
const DEFAULT_SUPPORT_URL = "https://t.me/ECOM2KH_BOT";

interface Profile { name: string; business_name: string | null; phone: string; telegram: string | null; business_address: string | null; business_lat: number | null; business_lng: number | null; credit_limit_usd: number | null }
interface CreditRequest { id: string; amount_usd: number; status: string; created_at: string }
export const Route = createFileRoute("/_authenticated/store/profile")({ head: () => ({ meta: [{ title: "គណនី | SastraKH" }, { name: "description", content: "Manage your SastraKH wholesale customer profile." }, { property: "og:title", content: "SastraKH Profile" }, { property: "og:description", content: "Manage your customer profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ProfilePage });

function ProfilePage() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const [uid, setUid] = useState("");
  const [p, setP] = useState<Profile | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [msg, setMsg] = useState("");
  const [amount, setAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [requests, setRequests] = useState<CreditRequest[]>([]);

  const loadRequests = () => supabase.from("credit_requests").select("id,amount_usd,status,created_at").order("created_at", { ascending: false }).then(({ data }) => setRequests(data ?? []));
  const [supportUrl, setSupportUrl] = useState(DEFAULT_SUPPORT_URL);
  useEffect(() => { void supabase.rpc("get_storefront_info").then(({ data }) => { const u = (data as { telegram_url?: string } | null)?.telegram_url; if (u?.startsWith("https://")) setSupportUrl(u); }); }, []);
  useEffect(() => { void (async () => {
    const { data: u } = await supabase.auth.getSession(); if (!u.session) return; setUid(u.session.user.id);
    const { data } = await supabase.from("profiles").select("name,business_name,phone,telegram,business_address,business_lat,business_lng,credit_limit_usd").eq("id", u.session.user.id).single();
    if (data) { setP(data); if (data.business_lat != null && data.business_lng != null) setPoint({ lat: data.business_lat, lng: data.business_lng }); }
  })(); void loadRequests(); }, []);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP((c) => c && { ...c, [k]: e.target.value });
  async function save() {
    if (!p) return;
    const { error } = await supabase.from("profiles").update({ name: p.name.trim(), business_name: p.business_name?.trim() || null, phone: p.phone.trim(), telegram: p.telegram?.trim() || null, business_address: p.business_address?.trim() || null, business_lat: point?.lat ?? null, business_lng: point?.lng ?? null }).eq("id", uid);
    setMsg(error ? error.message : t("saved")); setTimeout(() => setMsg(""), 2500);
  }
  async function requestCredit() {
    const value = Number(amount); if (!(value > 0)) return;
    await supabase.from("credit_requests").insert({ customer_id: uid, amount_usd: value, note: creditNote.trim() || null });
    setAmount(""); setCreditNote(""); await loadRequests();
  }
  const displayName = p?.business_name || p?.name || "Customer";
  const row = "flex min-h-12 w-full items-center gap-3 rounded-control px-1 text-sm";

  return <div className="mx-auto max-w-xl space-y-5">
    <div className="flex items-center gap-4"><Avatar alt={displayName} fallback={displayName.slice(0, 2).toUpperCase()} size="lg" /><div><h1 className="text-xl font-bold">{displayName}</h1><p className="font-sans text-sm text-muted-foreground">{p?.phone}</p></div></div>

    <Card><CardContent className="space-y-4 p-5"><h2 className="font-bold">{t("profile")}</h2>
      {p ? <>
        <Field label={t("name")}><Input value={p.name} onChange={set("name")} /></Field>
        <Field label={t("businessName")}><Input value={p.business_name ?? ""} onChange={set("business_name")} /></Field>
        <Field label={t("phone")}><Input type="tel" inputMode="tel" value={p.phone} onChange={set("phone")} placeholder="012 345 678" /></Field>
        <Field label={t("telegram")}><Input value={p.telegram ?? ""} onChange={set("telegram")} placeholder="@username" /></Field>
        <Field label={t("businessLocation")}><Input value={p.business_address ?? ""} onChange={set("business_address")} placeholder="ផ្ទះ ផ្លូវ សង្កាត់…" /></Field>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-control bg-muted" />}><MapPicker value={point} onChange={setPoint} /></Suspense>
        <div className="flex items-center gap-3"><Button onClick={() => void save()}>{t("save")}</Button>{msg && <span className="text-sm text-success">{msg}</span>}</div>
      </> : <div className="h-40 animate-pulse rounded-control bg-muted" />}
    </CardContent></Card>

    <Card><CardContent className="space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Wallet className="size-5 text-primary" />{t("creditLimit")}</h2><strong className="font-sans">${(p?.credit_limit_usd ?? 0).toFixed(2)}</strong></div>
      <Field label={t("amount")}><Input type="number" inputMode="decimal" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label={t("note")}><Input value={creditNote} onChange={(e) => setCreditNote(e.target.value)} /></Field>
      <Button variant="outline" disabled={!(Number(amount) > 0)} onClick={() => void requestCredit()}>{t("requestCredit")}</Button>
      {requests.map((r) => <div key={r.id} className="flex justify-between border-t border-border pt-3 text-sm"><span className="font-sans">${Number(r.amount_usd).toFixed(2)} · {new Date(r.created_at).toLocaleDateString()}</span><Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : "warning"}>{r.status === "pending" ? t("pending") : r.status}</Badge></div>)}
    </CardContent></Card>

    <Card><CardContent className="divide-y divide-border p-4"><h2 className="pb-2 font-bold">{t("settings")}</h2>
      <button type="button" className={row} onClick={() => setLang(lang === "km" ? "en" : "km")}><Languages className="size-5 text-primary" /><span className="flex-1 text-left">{t("language")}</span><span className="font-semibold">{lang === "km" ? "ខ្មែរ" : "English"}</span></button>
      <button type="button" className={row} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Moon className="size-5 text-primary" /><span className="flex-1 text-left">{t("darkMode")}</span><span className="font-semibold">{theme === "dark" ? "ON" : "OFF"}</span></button>
      <a href={supportUrl} target="_blank" rel="noopener noreferrer" className={row}><Headphones className="size-5 text-primary" /><span className="flex-1">{t("support")}</span></a>
      <Link to="/store/favorites" className={row}><Heart className="size-5" /><span>{lang === "km" ? "ទំនិញដែលចូលចិត្ត" : "Favourites"}</span></Link>
      <Button asChild variant="ghost" className="h-auto min-h-12 w-full justify-start"><Link to="/store/requests"><FileText className="size-5"/><span>{lang === "km" ? "សំណើតម្លៃ និងតាមតម្រូវការ" : "Quotes & custom requests"}</span></Link></Button>
      <button type="button" className={`${row} text-destructive`} onClick={async () => { await supabase.auth.signOut(); window.location.assign("/auth"); }}><LogOut className="size-5" /><span>{t("signOut")}</span></button>
    </CardContent></Card>
  </div>;
}
