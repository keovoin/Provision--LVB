import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { METHOD_KM, usd } from "@/app/admin-ui";
import logo from "@/assets/logos/provisionkh-mark-square.png";

export const Route = createFileRoute("/_authenticated/receipt/$orderId")({
  head: () => ({ meta: [{ title: "វិក្កយបត្រ · Invoice | SastraKH" }, { name: "description", content: "Printable SastraKH invoice and payment receipt." }, { property: "og:title", content: "SastraKH Invoice" }, { property: "og:description", content: "Printable invoice and receipt." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Receipt,
});

interface Pay { payment_no: string | null; status: string; method: string; amount_usd: number; amount_khr: number; bank_ref: string | null; settled_at: string | null; credit_due_at: string | null }
interface Order { id: string; order_no: string | null; status: string; payment_method: string; total_usd: number; promo_code: string | null; discount_usd: number; created_at: string; delivery_address: string; note: string | null; profiles: { name: string; business_name: string | null; phone: string } | null; order_items: { qty: number; unit_price_usd: number; line_total_usd: number; products: { name_km: string; name_en: string; unit_km: string } | null }[]; payments: Pay | Pay[] | null }

const dt = (s: string) => new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function Receipt() {
  const { orderId } = Route.useParams();
  const [o, setO] = useState<Order | null | undefined>(undefined);
  useEffect(() => {
    void supabase.from("orders").select("id,order_no,status,payment_method,total_usd,promo_code,discount_usd,created_at,delivery_address,note,profiles(name,business_name,phone),order_items(qty,unit_price_usd,line_total_usd,products(name_km,name_en,unit_km)),payments(payment_no,status,method,amount_usd,amount_khr,bank_ref,settled_at,credit_due_at)").eq("id", orderId).maybeSingle().then(({ data }) => setO(data as unknown as Order | null));
  }, [orderId]);
  if (o === undefined) return <div className="m-6 h-96 animate-pulse rounded-panel bg-muted" />;
  if (!o) return <p className="p-10 text-center">រកមិនឃើញការបញ្ជាទិញ · Order not found</p>;
  const p = Array.isArray(o.payments) ? o.payments[0] : o.payments;
  const paid = p?.status === "paid";
  const cancelled = o.status === "cancelled";

  return <div className="min-h-screen bg-muted/40 py-6 print:bg-white print:py-0">
    <div className="mx-auto mb-4 flex max-w-2xl justify-between gap-2 px-4 print:hidden">
      <Button variant="outline" onClick={() => history.back()}>ត្រឡប់ · Back</Button>
      <Button onClick={() => window.print()}><Printer className="size-4" />{paid ? "បោះពុម្ពម្តងទៀត · Print" : "បោះពុម្ព · Print"}</Button>
    </div>
    <article className="mx-auto max-w-2xl bg-surface p-8 text-sm text-foreground shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3"><img src={logo} alt="SastraKH" className="size-12 rounded-control" /><div><p className="text-lg font-bold">SastraKH</p><p className="text-xs text-muted-foreground">ទំនិញលក់ដុំ · Wholesale supply</p></div></div>
        <div className="text-right"><p className="text-xl font-bold">{paid ? "បង្កាន់ដៃ" : "វិក្កយបត្រ"}</p><p className="text-xs uppercase tracking-wide text-muted-foreground">{paid ? "Payment receipt" : "Invoice"}</p>
          <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cancelled ? "bg-destructive-subtle text-destructive" : paid ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>{cancelled ? "បោះបង់ · Cancelled" : paid ? "បានបង់ · Paid" : "មិនទាន់បង់ · Unpaid"}</p></div>
      </header>
      <section className="grid grid-cols-2 gap-4 py-5">
        <div><p className="text-xs text-muted-foreground">អតិថិជន · Bill to</p><p className="font-semibold">{o.profiles?.business_name || o.profiles?.name}</p>{o.profiles?.business_name && <p>{o.profiles.name}</p>}<p className="font-sans">{o.profiles?.phone}</p><p className="mt-1 text-muted-foreground">{o.delivery_address}</p></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-right"><dt className="text-muted-foreground">លេខបញ្ជាទិញ</dt><dd className="font-sans font-semibold">{o.order_no}</dd>
          <dt className="text-muted-foreground">កាលបរិច្ឆេទ</dt><dd className="font-sans">{dt(o.created_at)}</dd>
          {p?.payment_no && <><dt className="text-muted-foreground">លេខទូទាត់</dt><dd className="font-sans">{p.payment_no}</dd></>}
          <dt className="text-muted-foreground">វិធីទូទាត់</dt><dd>{METHOD_KM[o.payment_method] ?? o.payment_method}</dd>
          {p?.credit_due_at && !paid && <><dt className="text-muted-foreground">ផុតកំណត់</dt><dd className="font-sans">{dt(p.credit_due_at)}</dd></>}</dl>
      </section>
      <table className="w-full text-left"><thead className="border-y border-border text-xs text-muted-foreground"><tr><th className="py-2">ទំនិញ · Item</th><th className="py-2 text-right">ចំនួន</th><th className="py-2 text-right">តម្លៃ</th><th className="py-2 text-right">សរុប</th></tr></thead>
        <tbody>{o.order_items.map((i, k) => <tr key={k} className="border-b border-border"><td className="py-2"><p>{i.products?.name_km}</p><p className="text-xs text-muted-foreground">{i.products?.name_en}</p></td><td className="py-2 text-right font-sans tabular-nums">{i.qty} {i.products?.unit_km}</td><td className="py-2 text-right font-sans tabular-nums">{usd(i.unit_price_usd)}</td><td className="py-2 text-right font-sans font-semibold tabular-nums">{usd(i.line_total_usd)}</td></tr>)}</tbody></table>
      <div className="ml-auto mt-4 w-64 space-y-1">
        {o.discount_usd > 0 && <><p className="flex justify-between text-muted-foreground"><span>មុនបញ្ចុះ · Subtotal</span><span className="font-sans tabular-nums">{usd(o.total_usd + o.discount_usd)}</span></p><p className="flex justify-between text-success"><span>បញ្ចុះតម្លៃ{o.promo_code ? <> <span className="font-sans">({o.promo_code})</span></> : null}</span><span className="font-sans tabular-nums">-{usd(o.discount_usd)}</span></p></>}
        <p className="flex justify-between text-base font-bold"><span>សរុប · Total</span><span className="font-sans tabular-nums">{usd(o.total_usd)}</span></p>
        {p && <p className="flex justify-between text-muted-foreground"><span>ជារៀល</span><span className="font-sans tabular-nums">៛{Number(p.amount_khr).toLocaleString()}</span></p>}
        {paid && <p className="flex justify-between text-success"><span>បានបង់ · Paid</span><span className="font-sans tabular-nums">{usd(p!.amount_usd)}</span></p>}
        <p className="flex justify-between font-semibold"><span>នៅសល់ · Balance</span><span className="font-sans tabular-nums">{usd(paid || cancelled ? 0 : o.total_usd)}</span></p>
      </div>
      {paid && <p className="mt-4 text-xs text-muted-foreground">ទទួលនៅ · Paid on <span className="font-sans">{p?.settled_at ? dt(p.settled_at) : "—"}</span>{p?.bank_ref && <> · Ref <span className="font-sans">{p.bank_ref}</span></>}</p>}
      {o.note && <p className="mt-2 text-xs text-muted-foreground">កំណត់ចំណាំ: {o.note}</p>}
      <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">សូមអរគុណសម្រាប់ការគាំទ្រ · Thank you for your business</footer>
    </article>
  </div>;
}
