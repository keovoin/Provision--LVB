import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, Banknote, BookmarkPlus, Link2, MapPin, Minus, PackageCheck, Plus, QrCode, ShoppingCart, Wallet } from "lucide-react";
import { Button, Card, CardContent, Field, Input } from "@/design-system/provisionkh";
import { useStore } from "@/app/store-context";
import { usePrefs, type TKey } from "@/app/prefs";
import { clearBanner, recentBanner, signPhotos } from "@/app/catalog";
import type { LatLng } from "@/app/MapPicker";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentQr } from "@/lib/payment.functions";
import { notifyTelegramOrder } from "@/lib/telegram.functions";

const MapPicker = lazy(() => import("@/app/MapPicker").then((m) => ({ default: m.MapPicker })));
type Method = "cod" | "khqr" | "link" | "net30";
interface Address { id: string; label: string; address: string; lat: number | null; lng: number | null }

export const Route = createFileRoute("/_authenticated/store/cart")({ head: () => ({ meta: [{ title: "កន្ត្រក និងទូទាត់ | ProvisionKH" }, { name: "description", content: "Review wholesale items and securely place your ProvisionKH order." }, { property: "og:title", content: "ProvisionKH Checkout" }, { property: "og:description", content: "Secure wholesale checkout." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: CartPage });

const methods: { id: Method; key: TKey; icon: typeof QrCode }[] = [
  { id: "cod", key: "cod", icon: Banknote }, { id: "khqr", key: "qr", icon: QrCode }, { id: "link", key: "link", icon: Link2 }, { id: "net30", key: "net30", icon: Wallet },
];

function CartPage() {
  const { cart, changeQuantity, total, clearCart } = useStore();
  const { t, pick } = usePrefs();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method | null>(null);
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [saved, setSaved] = useState<Address[]>([]);
  const [rate, setRate] = useState(4100);
  const [fee, setFee] = useState<{ fee: number; free: number | null }>({ fee: 0, free: null });
  useEffect(() => { void supabase.rpc("get_storefront_info").then(({ data }) => { const d = data as { exchange_rate?: number; delivery_fee_usd?: number; free_delivery_min_usd?: number | null } | null; if (d?.exchange_rate) setRate(Number(d.exchange_rate)); setFee({ fee: Number(d?.delivery_fee_usd ?? 0), free: d?.free_delivery_min_usd == null ? null : Number(d.free_delivery_min_usd) }); }); }, []);
  const [saveIt, setSaveIt] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [guest, setGuest] = useState(false);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setGuest(!data.session)); }, []);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [credit, setCredit] = useState<number | null>(null);
  const [terms, setTerms] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    void signPhotos(cart.map((i) => i.photoPath).filter((p): p is string => !!p)).then(setPhotos);
  }, [cart.length]);
  useEffect(() => {
    void supabase.from("customer_addresses").select("id,label,address,lat,lng").order("created_at", { ascending: false }).then(({ data }) => {
      const rows = (data ?? []) as Address[]; setSaved(rows);
      if (rows[0]) pickAddress(rows[0]);
    });
    void supabase.from("profiles").select("credit_limit_usd,credit_terms_days").single().then(({ data }) => { setCredit(data?.credit_limit_usd ?? null); setTerms(data?.credit_terms_days ?? null); });
  }, []);
  function pickAddress(a: Address) { setAddress(a.address); if (a.lat != null && a.lng != null) setPoint({ lat: a.lat, lng: a.lng }); setSaveIt(false); }

  async function applyPromo() {
    setPromoError(""); setPromoDiscount(null);
    if (!promoCode.trim()) return;
    const { data, error: e } = await supabase.rpc("validate_promo", { _code: promoCode.trim(), _subtotal: total });
    if (e) { setPromoError(e.message); return; }
    setPromoDiscount(Number(data));
  }

  async function checkout() {
    if (!method) { setError(t("selectPayFirst")); return; }
    const { data: minOrder } = await supabase.rpc("get_min_order");
    if (Number(minOrder ?? 0) > total) { setError(`ការបញ្ជាទិញអប្បបរមា / Minimum order: $${Number(minOrder).toFixed(2)}`); return; }
    setBusy(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("place_order", { _payment_method: method, _delivery_address: address, _note: note, _items: cart.map((i) => ({ product_id: i.productId, qty: i.quantity })), _exchange_rate: rate, _promo_code: promoDiscount != null && promoDiscount > 0 ? promoCode.trim().toUpperCase() : null as never });
    if (rpcError) { setBusy(false); setError(rpcError.message); return; }
    const result = data as { order_id?: string; payment_id?: string };
    if (result.order_id) {
      if (point) await supabase.rpc("set_order_location", { _order_id: result.order_id, _lat: point.lat, _lng: point.lng });
      const banner = recentBanner();
      if (banner) { await supabase.rpc("attribute_order_banner", { _order_id: result.order_id, _banner_id: banner }); clearBanner(); }
    }
    if (saveIt && address.trim()) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await supabase.from("customer_addresses").insert({ customer_id: u.user.id, address: address.trim(), lat: point?.lat ?? null, lng: point?.lng ?? null });
    }
    if ((method === "khqr" || method === "link") && result.payment_id) {
      try { const r = await createPaymentQr({ data: { paymentId: result.payment_id } }); if (method === "link" && r.checkoutUrl) window.open(r.checkoutUrl, "_blank", "noopener"); }
      catch { setError("ការបញ្ជាទិញបានបង្កើតរួច។ សូមបើកទំព័រការបញ្ជាទិញដើម្បីបន្តទូទាត់។"); }
    }
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    if (initData && result.order_id) void notifyTelegramOrder({ data: { orderId: result.order_id, initData } }).catch(() => {});
    setBusy(false); clearCart();
    await navigate({ to: "/store/orders", search: result.order_id ? { newOrder: result.order_id } : undefined as never });
  }

  if (!cart.length) return <div className="py-20 text-center"><ShoppingCart className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-4 text-xl font-bold">{t("cartEmpty")}</h1><Button className="mt-6" asChild><Link to="/store">{t("shop")}</Link></Button></div>;
  return <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
    <section>
      <Link to="/store" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{t("continueShopping")}</Link>
      <h1 className="text-2xl font-bold">{t("cart")}</h1>
      <div className="mt-4 space-y-3">{cart.map((i) => { const price = i.quantity >= i.caseMinimum ? i.casePrice : i.retailPrice; const src = photos[i.photoPath ?? ""]; return <div key={i.productId} className="flex items-center gap-3 rounded-panel border border-border bg-surface p-2.5 ">
        <Link to="/store/product/$id" params={{ id: i.productId }} className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-control bg-muted">{src ? <img src={src} alt="" width={80} height={80} loading="lazy" className="size-full object-cover" /> : <PackageCheck className="size-6 text-primary" />}</Link>
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{pick(i.nameKm, i.nameEn)}</p><p className="mt-1 font-sans text-sm font-bold text-primary">${price.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ {i.unitKm}</span></p></div>
        <div className="flex items-center rounded-control bg-muted"><Button variant="ghost" size="icon" onClick={() => changeQuantity(i.productId, i.quantity - 1)} aria-label="Decrease quantity"><Minus className="size-4" /></Button><span className="w-7 text-center font-sans text-sm font-semibold">{i.quantity}</span><Button variant="ghost" size="icon" onClick={() => changeQuantity(i.productId, i.quantity + 1)} aria-label="Increase quantity"><Plus className="size-4" /></Button></div>
      </div>; })}</div>
    </section>
    <Card className="h-fit"><CardContent className="space-y-4 p-5">
      <h2 className="font-bold">{t("delivery")}</h2>
      {saved.length > 0 && <div><p className="mb-2 text-sm font-semibold">{t("savedAddresses")}</p><div className="space-y-2">{saved.map((a) => <Button variant="outline" key={a.id} type="button" onClick={() => pickAddress(a)} className={`flex w-full items-start gap-2 rounded-control border p-2 text-left text-sm ${address === a.address ? "border-primary bg-secondary" : "border-border"}`}><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span className="line-clamp-2">{a.address}</span></Button>)}</div></div>}
      <Suspense fallback={<div className="h-56 animate-pulse rounded-control bg-muted" />}><MapPicker value={point} onChange={(v) => { setPoint(v); setSaveIt(true); }} /></Suspense>
      <Field label={t("address")}><Input value={address} onChange={(e) => { setAddress(e.target.value); setSaveIt(true); }} required placeholder="ផ្ទះ ផ្លូវ សង្កាត់…" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} className="size-4 accent-[var(--color-primary)]" /><BookmarkPlus className="size-4 text-primary" />{t("saveAddress")}</label>
      <Field label={t("note")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div><p className="mb-2 text-sm font-semibold">{t("payMethod")}</p><div className="grid grid-cols-2 gap-2">{methods.filter((m) => m.id !== "net30" || (terms != null && (credit ?? 0) > 0)).map(({ id, key, icon: Icon }) => <Button variant="outline" key={id} type="button" aria-pressed={method === id} onClick={() => { setMethod(id); setError(""); }} className={`flex h-auto min-h-20 flex-col items-center justify-center gap-1 rounded-panel border p-2 text-xs font-semibold transition-colors ${method === id ? "border-primary bg-primary text-primary-foreground " : "border-border bg-muted/50"}`}><Icon className="size-5" />{id === "net30" && terms != null ? `ឥណទាន ${terms} ថ្ងៃ · Net ${terms}` : t(key)}</Button>)}</div></div>
      <div><p className="mb-2 text-sm font-semibold">កូដបញ្ចុះតម្លៃ · Promo code</p><div className="flex gap-2"><Input value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoDiscount(null); setPromoError(""); }} placeholder="លេកូដ" aria-label="Promo code" /><Button variant="outline" type="button" onClick={() => void applyPromo()}>អនុវត្ត</Button></div>
        {promoError && <p className="mt-2 text-sm text-destructive">{promoError}</p>}
        {promoDiscount != null && promoDiscount > 0 && <p className="mt-2 text-sm font-medium text-success">បានអនុវត្តកូដ · បញ្ចុះ ${promoDiscount.toFixed(2)}</p>}</div>
      {(() => { const sub = total - (promoDiscount ?? 0); const deliv = fee.fee > 0 && !(fee.free != null && sub >= fee.free) ? fee.fee : 0; const grand = sub + deliv; return <div className="rounded-panel bg-muted/60 p-4 space-y-1">
        {promoDiscount != null && promoDiscount > 0 && <><div className="flex items-center justify-between text-sm text-muted-foreground"><span>មុនបញ្ចុះ</span><span className="font-sans tabular-nums">${total.toFixed(2)}</span></div><div className="flex items-center justify-between text-sm"><span>បញ្ចុះតម្លៃ</span><span className="font-sans font-semibold tabular-nums text-success">-${promoDiscount.toFixed(2)}</span></div></>}
        {fee.fee > 0 && <div className="flex items-center justify-between text-sm"><span>ថ្លៃដឹកជញ្ជូន · Delivery</span><span className="font-sans tabular-nums">{deliv > 0 ? `$${deliv.toFixed(2)}` : "ឥតគិតថ្លៃ · Free"}</span></div>}
        {fee.fee > 0 && fee.free != null && deliv > 0 && <p className="text-xs text-muted-foreground">ទិញបន្ថែម ${(fee.free - sub).toFixed(2)} ដើម្បីដឹកឥតគិតថ្លៃ · Add more for free delivery</p>}
        <div className="flex items-center justify-between border-t border-border pt-2"><span className="text-sm">{t("total")}</span><strong className="font-sans text-2xl font-bold">${grand.toFixed(2)}</strong></div><p className="text-right text-xs text-muted-foreground">≈ ៛{Math.round(grand * rate).toLocaleString()}</p></div>; })()}
      {error && <p className="rounded-panel bg-destructive-subtle p-3 text-sm text-destructive">{error}</p>}
      {guest ? <Button className="h-12 w-full rounded-control text-base" onClick={() => void navigate({ to: "/auth", search: { redirect: "/store/cart" } as never })}>{t("placeOrder")} · ចូលគណនីដើម្បីបន្ត</Button> : <Button className="h-12 w-full rounded-control text-base" disabled={busy || !address.trim()} onClick={() => void checkout()}>{busy ? t("placing") : t("placeOrder")}</Button>}
    </CardContent></Card>
  </div>;
}
