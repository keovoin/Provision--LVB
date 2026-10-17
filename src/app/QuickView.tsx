import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Minus, PackageCheck, Plus, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/design-system/provisionkh";
import { useStore } from "./store-context";
import { usePrefs } from "./prefs";
import { priceInfo, toCartLine, type Product } from "./catalog";
import { activeTierMinimum, tierDiscountPercent } from "./tiers";
import { shareProduct, useFavorites } from "./favorites";

export function QuickView({ product, photo, onClose }: { product: Product; photo?: string; onClose: () => void }) {
  const { addItem } = useStore();
  const { t, pick, lang } = usePrefs();
  const { ids, toggle } = useFavorites();
  const { prices } = priceInfo(product);
  const [qty, setQty] = useState(prices[0]?.qty_min ?? 1);
  const name = pick(product.name_km, product.name_en);
  const out = product.stock_qty < 1;
  const selected = activeTierMinimum(prices, qty);
  const unit = [...prices].reverse().find((p) => qty >= p.qty_min)?.price_usd ?? prices[0]?.price_usd ?? 0;
  const fav = ids.has(product.id);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={name} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-panel border border-border bg-surface p-4 sm:rounded-panel" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-control bg-muted">{photo ? <img src={photo} alt={name} className="size-full object-cover" /> : <PackageCheck className="size-10 text-muted-foreground" />}</div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base font-semibold leading-6">{name}</h2>
          {lang === "km" && <p className="truncate font-sans text-xs text-muted-foreground">{product.name_en}</p>}
          <p className="mt-1"><strong className="font-sans text-2xl font-bold">${unit.toFixed(2)}</strong><span className="text-sm text-muted-foreground"> / {lang === "km" ? product.unit_km : product.unit}</span></p>
          <p className={`text-xs ${out ? "text-destructive" : "text-muted-foreground"}`}>{out ? t("outOfStock") : `${t("inStock")} · ${product.stock_qty}`}</p>
        </div>
        <IconButton label="Close" onClick={onClose}><X className="size-5" /></IconButton>
      </div>
      {prices.length > 1 && <div className="mt-4 space-y-1.5">{prices.map((p) => { const active = p.qty_min === selected; const off = tierDiscountPercent(prices[0]?.price_usd ?? 0, p.price_usd); return <button key={p.qty_min} type="button" aria-pressed={active} onClick={() => setQty(p.qty_min)} className={`flex min-h-10 w-full items-center justify-between rounded-control border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-secondary text-secondary-foreground" : "border-border"}`}><span>{t("from")} <span className="font-sans font-semibold">{p.qty_min}</span>+</span><span className="flex items-center gap-2 font-sans"><strong>${p.price_usd.toFixed(2)}</strong>{off > 0 && <span className="rounded-control bg-primary px-1.5 text-xs font-bold text-primary-foreground">-{Math.round(off)}%</span>}</span></button>; })}</div>}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center rounded-control bg-muted"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="size-4" /></Button><input aria-label="Quantity" inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} className="w-12 bg-transparent text-center font-sans font-semibold outline-none" /><Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => setQty(qty + 1)}><Plus className="size-4" /></Button></div>
        <Button className="flex-1" size="lg" disabled={out} onClick={() => { addItem(toCartLine(product), qty); toast.success(`${t("addToCart")} · ${qty}`); onClose(); }}>{t("addToCart")}</Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Link to="/store/product/$id" params={{ id: product.id }} className="text-sm font-medium text-primary" onClick={onClose}>{lang === "km" ? "មើលព័ត៌មានលម្អិត" : "View details"}</Link>
        <div className="flex gap-1">
          <IconButton label={fav ? "Remove favourite" : "Save favourite"} aria-pressed={fav} onClick={() => void toggle(product.id)}><Heart className={`size-5 ${fav ? "fill-primary text-primary" : ""}`} /></IconButton>
          <IconButton label="Share" onClick={() => void shareProduct(product.id, name)}><Share2 className="size-5" /></IconButton>
        </div>
      </div>
    </div>
  </div>;
}
