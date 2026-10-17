import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { CheckCircle2, Clock3, MapPin, Package, QrCode, Truck } from "lucide-react";
import { renderSVG } from "uqr";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { paymentOptions, storeScope } from "@/app/store-queries";
import { createPaymentQr, refreshPaymentStatus } from "@/lib/payment.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/store/payment/$paymentId")({
  head: () => ({ meta: [
    { title: "ការបញ្ជាក់ការទូទាត់ | ProvisionKH" },
    { name: "description", content: "Confirm your KHQR payment and see your ProvisionKH order details and next steps." },
    { property: "og:title", content: "ProvisionKH Payment Confirmation" },
    { property: "og:description", content: "Confirm your payment and track your wholesale order." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: async ({ context, params }) => {
    const userId = await storeScope();
    await context.queryClient.ensureQueryData(paymentOptions(userId, params.paymentId));
    return { userId };
  },
  errorComponent: ({ error }) => <p role="alert">{error instanceof Error ? error.message : "Unable to load this page"}</p>,
  notFoundComponent: () => <p>Payment not found</p>,
  component: PaymentConfirmPage,
});

function PaymentQr({ value }: { value: string }) {
  const svg = useMemo(() => renderSVG(value, { ecc: "H", border: 4 }), [value]);
  return <div className="mx-auto size-52 overflow-hidden rounded-control bg-surface p-2 [&_svg]:size-full" aria-label="KHQR payment code" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function PaymentConfirmPage() {
  const { paymentId } = Route.useParams();
  const { userId } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const { data: payment, refetch } = useSuspenseQuery(paymentOptions(userId, paymentId));
  const order = payment.orders;
  const current = useRef(payment);

  useEffect(() => { current.current = payment; }, [payment]);

  // While pending, ask the payment service for the latest status every 4s (visible tab only).
  useEffect(() => {
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || document.visibilityState !== "visible") return;
      const p = current.current;
      if (p.status !== "pending" || !p.provider_payment_id) return;
      busy = true;
      try {
        const r = await refreshPaymentStatus({ data: { paymentId: p.id } });
        if (r.status !== "pending" && r.status !== "scanned") {
          await queryClient.invalidateQueries({ queryKey: paymentOptions(userId, paymentId).queryKey });
          await queryClient.invalidateQueries({ queryKey: ["store", userId, "orders"] });
        }
      } finally { busy = false; }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [queryClient, userId, paymentId]);

  async function prepare() {
    try { await createPaymentQr({ data: { paymentId } }); await refetch(); }
    catch (e) { toast.error("មិនអាចបង្កើត KHQR បានទេ · " + (e as Error).message); }
  }

  const paid = payment.status === "paid";
  const methodLabel = ({ cod: "ទូទាត់ពេលទទួល", khqr: "KHQR", link: "តំណទូទាត់", net30: "ឥណទាន" } as Record<string, string>)[payment.method] ?? payment.method;

  return <div className="mx-auto max-w-lg space-y-4">
    <div className="text-center">
      {paid
        ? <><CheckCircle2 className="mx-auto size-12 text-success" /><h1 className="mt-3 text-2xl font-bold">បានទទួលការទូទាត់រួច!</h1><p className="mt-1 text-sm text-muted-foreground">Payment received — thank you.</p></>
        : <><Clock3 className="mx-auto size-12 text-warning" /><h1 className="mt-3 text-2xl font-bold">កំពុងរង់ចាំការទូទាត់</h1><p className="mt-1 text-sm text-muted-foreground">Waiting for your payment.</p></>}
    </div>

    <Card><CardContent className="p-4 text-center">
      <p className="text-sm text-muted-foreground">ការបញ្ជាទិញ <span className="font-sans font-semibold text-foreground">{order?.order_no}</span> · ការទូទាត់ <span className="font-sans font-semibold text-foreground">{payment.payment_no}</span></p>
      <p className="mt-2 font-sans text-3xl font-bold">${Number(payment.amount_usd).toFixed(2)}</p>
      <p className="text-sm text-muted-foreground">≈ ៛{Number(payment.amount_khr).toLocaleString()} · {methodLabel}</p>
      <div className="mt-3"><Badge variant={paid ? "success" : "warning"}>{paid ? "បានទូទាត់" : "មិនទាន់ទូទាត់"}</Badge></div>

      {!paid && (payment.method === "khqr" || payment.method === "link") && <div className="mt-4 rounded-panel bg-muted p-4">
        <QrCode className="mx-auto size-5 text-primary" />
        <p className="mt-2 text-sm font-semibold">ស្កេន KHQR ដោយកម្មវិធីធនាគាររបស់អ្នក</p>
        <p className="text-xs text-muted-foreground">Scan with any Cambodian banking app.</p>
        {payment.khqr_code
          ? <><PaymentQr value={payment.khqr_code} /><p className="mt-3 text-xs text-muted-foreground">ស្ថានភាពនឹងធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិពេលទូទាត់រួច · Status updates automatically once paid.</p></>
          : <Button className="mt-3" onClick={() => void prepare()}>បង្ហាញ KHQR</Button>}
      </div>}
    </CardContent></Card>

    {order && <Card><CardContent className="p-4">
      <h2 className="flex items-center gap-2 font-bold"><Package className="size-4 text-primary" />ទំនិញក្នុងការបញ្ជាទិញ</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {order.order_items.map((i, k) => <li key={k} className="flex justify-between gap-2"><span>{i.products?.name_km} × <span className="font-sans">{i.qty}</span> {i.products?.unit_km}</span><span className="font-sans tabular-nums">${Number(i.line_total_usd).toFixed(2)}</span></li>)}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="text-muted-foreground">សរុប</span><strong className="font-sans text-lg">${order.total_usd.toFixed(2)}</strong></div>
      <p className="mt-3 flex gap-1.5 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{order.delivery_address}</p>
      {order.note && <p className="mt-1 text-xs text-muted-foreground">{order.note}</p>}
    </CardContent></Card>}

    <Card><CardContent className="p-4">
      <h2 className="flex items-center gap-2 font-bold"><Truck className="size-4 text-primary" />ជំហានបន្ទាប់ · Next steps</h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
        {paid
          ? <><li>យើងកំពុងរៀបចំទំនិញរបស់អ្នក។</li><li>ទំនិញនឹងដឹកជញ្ជូនទៅអាសយដ្ឋានខាងលើ។</li><li>តាមដានស្ថានភាពបាននៅទំព័រការបញ្ជាទិញ។</li></>
          : <><li>ស្កេន KHQR ខាងលើ និងបញ្ជាក់ការទូទាត់ក្នុងកម្មវិធីធនាគារ។</li><li>ទំព័រនេះនឹងប្តូរជា «បានទូទាត់» ដោយស្វ័យប្រវត្តិ។</li><li>បន្ទាប់មក យើងរៀបចំ និងដឹកជញ្ជូនទំនិញទៅអ្នក។</li></>}
      </ol>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" asChild><Link to="/receipt/$orderId" params={{ orderId: order?.id ?? "" }}>{payment.status === "paid" ? "បង្កាន់ដៃ" : "វិក្កយបត្រ"}</Link></Button>
        <Button variant="outline" className="flex-1" asChild><Link to="/store/orders">មើលការបញ្ជាទិញ</Link></Button>
        <Button className="flex-1" asChild><Link to="/store">បន្តទិញទំនិញ</Link></Button>
      </div>
    </CardContent></Card>
  </div>;
}
