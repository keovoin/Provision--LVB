import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Banknote, Link2, MapPin, QrCode, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, usd } from "@/app/admin-ui";
import type { LatLng } from "@/app/MapPicker";

const MapPicker = lazy(() => import("@/app/MapPicker").then((m) => ({ default: m.MapPicker })));
type Method = "cod" | "khqr" | "link" | "net30";
const METHODS: [Method, string, string, typeof Banknote][] = [["cod", "សាច់ប្រាក់ពេលដឹក", "Cash on delivery", Banknote], ["khqr", "KHQR", "Scan to pay", QrCode], ["link", "តំណបង់ប្រាក់", "Payment link", Link2], ["net30", "ឥណទាន", "Net credit", Wallet]];

export const Route = createFileRoute("/_authenticated/store/order/$orderId")({
  head: () => ({ meta: [{ title: "កែការបញ្ជាទិញ | SastraKH" }, { name: "description", content: "Review and edit your order's delivery address and payment method." }, { property: "og:title", content: "Edit order | SastraKH" }, { property: "og:description", content: "Change delivery address and payment before confirming." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrderEdit,
});

interface Order { id: string; order_no: string | null; status: string; payment_method: Method; total_usd: number; promo_code: string | null; discount_usd: number; delivery_address: string; delivery_lat: number | null; delivery_lng: number | null; order_items: { qty: number; line_total_usd: number; products: { name_km: string; unit_km: string } | null }[]; payments: { id: string; status: string }[] }
interface Saved { id: string; label: string; address: string; lat: number | null; lng: number | null }

function OrderEdit() {
  const { orderId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [o, setO] = useState<Order | null | undefined>(undefined);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [credit, setCredit] = useState<number | null>(null);
  const [terms, setTerms] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [method, setMethod] = useState<Method>("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.from("orders").select("id,order_no,status,payment_method,total_usd,promo_code,discount_usd,delivery_address,delivery_lat,delivery_lng,order_items(qty,line_total_usd,products(name_km,unit_km)),payments(id,status)").eq("id", orderId).maybeSingle().then(({ data }) => {
      const raw = data as unknown as (Omit<Order, "payments"> & { payments: Order["payments"] | Order["payments"][number] | null }) | null; const d = raw ? { ...raw, payments: Array.isArray(raw.payments) ? raw.payments : raw.payments ? [raw.payments] : [] } as Order : null; setO(d);
      if (d) { setAddress(d.delivery_address); setMethod(d.payment_method); if (d.delivery_lat != null && d.delivery_lng != null) setPoint({ lat: d.delivery_lat, lng: d.delivery_lng }); }
    });
    void supabase.from("customer_addresses").select("id,label,address,lat,lng").order("created_at", { ascending: false }).then(({ data }) => setSaved((data ?? []) as Saved[]));
    void supabase.from("profiles").select("credit_limit_usd,credit_terms_days").single().then(({ data }) => { setCredit(data?.credit_limit_usd ?? null); setTerms(data?.credit_terms_days ?? null); });
  }, [orderId]);

  if (o === undefined) return <div className="h-60 animate-pulse rounded-panel bg-muted" />;
  if (!o) return <p className="py-20 text-center">រកមិនឃើញការបញ្ជាទិញ · Order not found</p>;
  const editable = o.status === "pending" && !o.payments.some((p) => p.status === "paid");
  const payment = o.payments[0];

  async function confirm() {
    if (!address.trim()) return setError("សូមបញ្ចូលអាសយដ្ឋាន · Address required");
    setBusy(true); setError("");
    const { error: e } = await supabase.rpc("buyer_update_order", { _order_id: o!.id, _delivery_address: address, _lat: point?.lat ?? null as never, _lng: point?.lng ?? null as never, _payment_method: method });
    setBusy(false);
    if (e) return setError(e.message.includes("Credit") ? "លើសដែនកំណត់ឥណទាន · Credit limit exceeded" : e.message);
    await qc.invalidateQueries();
    toast.success("បានរក្សាទុក · Order updated");
    if ((method === "khqr" || method === "link") && payment) void nav({ to: "/store/payment/$paymentId", params: { paymentId: payment.id } });
    else void nav({ to: "/store/orders" });
  }

  return <div className="space-y-4 pb-6">
    <div><p className="text-sm font-semibold text-primary">ពិនិត្យការបញ្ជាទិញ</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold"><span className="font-sans">{o.order_no}</span><StatusBadge status={o.status} /></h1></div>
    <Card><CardContent className="p-4"><ul className="space-y-1 text-sm">{o.order_items.map((i, k) => <li key={k} className="flex justify-between gap-2"><span>{i.products?.name_km} × <span className="font-sans">{i.qty}</span></span><span className="font-sans tabular-nums">{usd(i.line_total_usd)}</span></li>)}</ul>
      {o.discount_usd > 0 && <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span>បញ្ចុះតម្លៃ{o.promo_code ? <> <span className="font-sans">({o.promo_code})</span></> : null}</span><span className="font-sans font-semibold tabular-nums text-success">-{usd(o.discount_usd)}</span></p>}
      <p className={`flex justify-between border-t border-border pt-3 font-bold ${o.discount_usd > 0 ? "mt-1" : "mt-3"}`}><span>សរុប</span><span className="font-sans tabular-nums">{usd(o.total_usd)}</span></p></CardContent></Card>
    {!editable && <p className="rounded-control bg-muted p-3 text-sm">ការបញ្ជាទិញនេះមិនអាចកែបានទៀតទេ · This order can no longer be edited.</p>}
    <Card><CardContent className="space-y-3 p-4">
      <p className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-primary" />អាសយដ្ឋានដឹកជញ្ជូន</p>
      {saved.length > 0 && <div className="flex flex-wrap gap-2">{saved.map((s) => <Button key={s.id} size="sm" variant="outline" disabled={!editable} onClick={() => { setAddress(s.address); if (s.lat != null && s.lng != null) setPoint({ lat: s.lat, lng: s.lng }); }}>{s.label}</Button>)}</div>}
      <textarea aria-label="Delivery address" disabled={!editable} value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full rounded-control border border-input bg-surface p-3 text-sm outline-hidden focus:border-primary disabled:opacity-60" />
      {editable && <Suspense fallback={<div className="h-56 animate-pulse rounded-control bg-muted" />}><MapPicker value={point} onChange={setPoint} /></Suspense>}
    </CardContent></Card>
    <Card><CardContent className="p-4"><p className="mb-2 font-semibold">វិធីទូទាត់ · Payment method</p>
      <div className="grid grid-cols-2 gap-2">{METHODS.filter(([id]) => id !== "net30" || (terms != null && (credit ?? 0) > 0) || o.payment_method === "net30").map(([id, km, en, Icon]) => <Button key={id} type="button" variant="outline" disabled={!editable} aria-pressed={method === id} onClick={() => setMethod(id)} className={`flex h-auto min-h-20 flex-col gap-1 rounded-panel p-2 text-xs ${method === id ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover" : ""}`}><Icon className="size-5" />{id === "net30" && terms != null ? `ឥណទាន ${terms} ថ្ងៃ` : km}<span className="font-normal opacity-80">{id === "net30" && terms != null ? `Net ${terms} credit` : en}</span></Button>)}</div>
    </CardContent></Card>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {editable ? <Button size="lg" className="w-full" disabled={busy} onClick={() => void confirm()}>{busy ? "កំពុងរក្សាទុក…" : "បញ្ជាក់ការបញ្ជាទិញ · Confirm"}</Button> : <Button size="lg" variant="outline" className="w-full" asChild><Link to="/store/orders">ត្រឡប់ទៅការបញ្ជាទិញ</Link></Button>}
  </div>;
}
