import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgePercent, ShoppingCart, Truck } from "lucide-react";
import { Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/store/wholesale")({
  head: () => ({ meta: [{ title: "តម្លៃលក់ដុំ | SastraKH" }, { name: "description", content: "តម្លៃលក់ដុំ ការបញ្ជាទិញអប្បបរមា និងព័ត៌មានដឹកជញ្ជូន SastraKH។" }, { property: "og:title", content: "SastraKH តម្លៃលក់ដុំ" }, { property: "og:description", content: "ទិញច្រើន តម្លៃថោកជាង។" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WholesaleStore,
});

interface Row { id: string; name_km: string; unit_km: string; product_prices: { qty_min: number; qty_max: number | null; price_usd: number }[] }

function WholesaleStore() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [info, setInfo] = useState<{ min_order_usd: number; shipping_info_km: string }>({ min_order_usd: 0, shipping_info_km: "" });
  useEffect(() => {
    void supabase.from("products").select("id,name_km,unit_km,product_prices(qty_min,qty_max,price_usd)").eq("active", true).order("name_km").then(({ data }) => setRows(((data ?? []) as Row[]).filter((r) => r.product_prices.length > 1)));
    void supabase.rpc("get_wholesale_info").then(({ data }) => data && setInfo(data as typeof info));
  }, []);
  return <div lang="km" className="space-y-4 py-4 font-khmer">
    <Link to="/store" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" />ត្រឡប់ទៅហាង</Link>
    <div><h1 className="text-2xl font-bold">តម្លៃលក់ដុំ</h1><p className="mt-1 text-sm leading-relaxed text-muted-foreground">ទិញកាន់តែច្រើន តម្លៃក្នុងមួយឯកតាកាន់តែថោក។ តម្លៃប្តូរដោយស្វ័យប្រវត្តិនៅក្នុងកន្ត្រក។</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex gap-3 p-4"><ShoppingCart className="size-5 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">ការបញ្ជាទិញអប្បបរមា</p><p className="font-sans text-lg font-bold">{info.min_order_usd > 0 ? `$${Number(info.min_order_usd).toFixed(2)}` : "គ្មាន"}</p></div></CardContent></Card>
      <Card><CardContent className="flex gap-3 p-4"><BadgePercent className="size-5 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">ទំនិញមានតម្លៃលក់ដុំ</p><p className="font-sans text-lg font-bold">{rows?.length ?? "…"}</p></div></CardContent></Card>
      <Card className="sm:col-span-1"><CardContent className="flex gap-3 p-4"><Truck className="size-5 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">ការដឹកជញ្ជូន</p><p className="whitespace-pre-line text-sm leading-relaxed">{info.shipping_info_km || "ដឹកដល់ទីតាំងអាជីវកម្មរបស់អ្នក។ ទាក់ទងយើងសម្រាប់ព័ត៌មានបន្ថែម។"}</p></div></CardContent></Card>
    </div>
    <h2 className="pt-2 text-lg font-semibold">តារាងតម្លៃតាមបរិមាណ</h2>
    {!rows ? <div className="h-40 animate-pulse rounded-panel bg-muted" /> : rows.map((r) => {
      const tiers = [...r.product_prices].sort((a, b) => a.qty_min - b.qty_min);
      return <Link key={r.id} to="/store/product/$id" params={{ id: r.id }} className="block"><Card><CardContent className="p-4">
        <p className="font-semibold">{r.name_km}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{tiers.map((t, i) => <div key={i} className="rounded-control bg-muted/60 p-2 text-center">
          <p className="text-xs text-muted-foreground"><span className="font-sans">{t.qty_min}{t.qty_max ? `–${t.qty_max}` : "+"}</span> {r.unit_km}</p>
          <p className="font-sans font-bold text-primary">${Number(t.price_usd).toFixed(2)}</p>
        </div>)}</div>
      </CardContent></Card></Link>;
    })}
  </div>;
}
