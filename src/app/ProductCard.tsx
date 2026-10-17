import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Heart, PackageCheck, Plus } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { usePrefs, type ListView } from "./prefs";
import { priceInfo, type Product } from "./catalog";
import { useFavorites } from "./favorites";
import { QuickView } from "./QuickView";

export function ProductCard({ product, photo, view }: { product: Product; photo?: string; view: ListView }) {
  const { t, pick, lang } = usePrefs();
  const { ids, toggle } = useFavorites();
  const [quick, setQuick] = useState(false);
  const { retail, bulk } = priceInfo(product);
  const list = view === "list";
  const name = pick(product.name_km, product.name_en);
  const out = product.stock_qty < 1;
  const fav = ids.has(product.id);
  return <article className={`group relative overflow-hidden rounded-panel border border-border bg-surface transition-colors hover:border-input ${list ? "flex items-center gap-4 p-3" : ""}`}>
    <div className={`relative shrink-0 ${list ? "size-24" : "w-full"}`}>
      <Link to="/store/product/$id" params={{ id: product.id }} className={`relative grid place-items-center overflow-hidden bg-muted ${list ? "size-24 rounded-control" : "aspect-square w-full border-b border-border"}`}>
        {photo ? <img src={photo} alt={name} loading="lazy" decoding="async" width={256} height={256} className="size-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105" /> : <PackageCheck className="size-10 text-muted-foreground" />}
        {out && <span className="absolute inset-0 grid place-items-center bg-surface/80 text-xs font-bold text-destructive">{t("outOfStock")}</span>}
      </Link>
      <button type="button" aria-label={fav ? "Remove favourite" : "Save favourite"} aria-pressed={fav} onClick={() => void toggle(product.id)} className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-control bg-surface/90 outline-none focus-visible:ring-2 focus-visible:ring-ring"><Heart className={`size-4 ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
      {!list && <button type="button" aria-label={`${lang === "km" ? "មើលរហ័ស" : "Quick view"} ${name}`} onClick={() => setQuick(true)} className="absolute bottom-1.5 left-1.5 flex h-8 items-center gap-1 rounded-control bg-surface/90 px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"><Eye className="size-3.5" />{lang === "km" ? "មើលរហ័ស" : "Quick view"}</button>}
    </div>
    <div className={list ? "min-w-0 flex-1 py-1" : "p-3"}>
      <Link to="/store/product/$id" params={{ id: product.id }} className="line-clamp-2 text-sm font-semibold leading-5 hover:text-primary">{name}</Link>
      {lang === "km" && <p className="mt-0.5 truncate font-sans text-[11px] leading-4 text-muted-foreground">{product.name_en}</p>}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0"><strong className="font-sans text-lg font-bold text-foreground">${retail.toFixed(2)}</strong><p className="mt-0.5 text-xs text-muted-foreground">/ {lang === "km" ? product.unit_km : product.unit}</p></div>
        <Button size="icon" variant="secondary" aria-label={`${t("add")} ${name}`} disabled={out} onClick={() => setQuick(true)} title={t("addToCart")}><Plus className="size-5" /></Button>
      </div>
      {bulk && bulk.qty_min > 1 && <p className="mt-2 border-t border-border pt-1.5 text-xs font-medium leading-4 text-secondary-foreground"><span className="font-sans">${bulk.price_usd.toFixed(2)}</span> · {t("from")} {bulk.qty_min}</p>}
    </div>
    {quick && <QuickView product={product} photo={photo} onClose={() => setQuick(false)} />}
  </article>;
}
