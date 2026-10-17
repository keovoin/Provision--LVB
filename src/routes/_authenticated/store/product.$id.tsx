import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productOptions, storeScope } from "@/app/store-queries";
import { ArrowLeft, Camera, Heart, Share2, Check, ChevronLeft, ChevronRight, Minus, PackageCheck, Play, Plus, Star, X } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/app/store-context";
import { usePrefs } from "@/app/prefs";
import { priceInfo, signPhotos, toCartLine, type Product } from "@/app/catalog";
import { activeTierMinimum, tierDiscountPercent } from "@/app/tiers";
import { toast, uploadPhoto } from "@/app/admin-ui";
import { shareProduct, useFavorites } from "@/app/favorites";

interface ReviewMedia { id: string; storage_path: string; sort_order: number }
interface Review { id: string; customer_id: string; reviewer_name: string; rating: number; comment: string | null; created_at: string; review_media: ReviewMedia[] }
export const Route = createFileRoute("/_authenticated/store/product/$id")({
  loader: async ({ context, params }) => {
    const userId = await storeScope();
    const { product } = await context.queryClient.ensureQueryData(productOptions(userId, params.id));
    return { userId, meta: { km: product.name_km, en: product.name_en, sku: product.id, unit: product.unit } };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.meta;
    const title = p ? `${p.km} · ${p.en} | ProvisionKH` : "ទំនិញ | ProvisionKH";
    const desc = p ? `${p.en} (${p.km}) — wholesale ${p.unit} from ProvisionKH. Bulk quantity pricing and fast delivery in Cambodia.` : "Product details, quantity pricing, and customer reviews.";
    return {
      meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "product" }, { property: "og:url", content: `https://ecom-kh.lovable.app/store/product/${params.id}` }, { name: "twitter:card", content: "summary" }],
      scripts: p ? [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: p.en, alternateName: p.km, sku: p.sku, description: desc, brand: { "@type": "Brand", name: "ProvisionKH" } }) }] : [],
    };
  },
  errorComponent: ({ error }) => <p role="alert">{error instanceof Error ? error.message : "Unable to load this page"}</p>,
  notFoundComponent: () => <p>Product not found</p>,
  component: ProductPage,
});

function Stars({ value, onPick, size = "size-4" }: { value: number; onPick?: (n: number) => void; size?: string }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => onPick
    ? <Button key={n} variant="ghost" size="icon" type="button" aria-label={`${n} stars`} onClick={() => onPick(n)}><Star className={`${size} ${n <= value ? "fill-warning text-warning" : "text-muted-foreground"}`} /></Button>
    : <Star key={n} className={`${size} ${n <= value ? "fill-warning text-warning" : "text-muted-foreground"}`} />)}</div>;
}

function ProductPage() {
  const { id } = Route.useParams();
  const { addItem } = useStore();
  const { t, pick, lang } = usePrefs();
  const { userId } = Route.useLoaderData();
  const { data: { product, media, related, blocks, urls } } = useSuspenseQuery(productOptions(userId, id));
  const gallery = [...(product.photo_url ? [{ id: "primary", media_type: "image", storage_path: product.photo_url }] : []), ...media.filter((item) => item.storage_path !== product.photo_url)];
  const [activeMedia, setActiveMedia] = useState(0);
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewUrls, setReviewUrls] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [added, setAdded] = useState(false);
  const favs = useFavorites();

  const loadReviews = () => supabase.from("product_reviews").select("id,customer_id,reviewer_name,rating,comment,created_at,review_media(id,storage_path,sort_order)").eq("product_id", id).order("created_at", { ascending: false }).then(async ({ data }) => {
    const next = (data ?? []) as Review[];
    setReviews(next);
    setReviewUrls(await signPhotos(next.flatMap((review) => review.review_media.map((item) => item.storage_path))));
  });
  useEffect(() => { void (async () => {
    if (userId === "guest") return;
    const { data: prof } = await supabase.from("profiles").select("name,business_name").eq("id", userId).single(); setMe({ id: userId, name: prof?.business_name || prof?.name || "Customer" });
  })(); void loadReviews(); }, [id, userId]);

  if (!product) return <div className="h-96 animate-pulse rounded-panel bg-muted" />;
  const { prices } = priceInfo(product);
  const selectedMinimum = activeTierMinimum(prices, qty);
  const basePrice = prices[0]?.price_usd ?? 0;
  const unitLabel = lang === "km" ? product.unit_km : product.unit;
  const unit = [...prices].reverse().find((p) => qty >= p.qty_min)?.price_usd ?? prices[0]?.price_usd ?? 0;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  
  const name = pick(product.name_km, product.name_en);

  async function submitReview() {
    if (!me) return;
    setSubmittingReview(true);
    try {
      const { data: review, error } = await supabase.from("product_reviews").upsert({ product_id: id, customer_id: me.id, reviewer_name: me.name, rating, comment: comment.trim() || null }, { onConflict: "product_id,customer_id" }).select("id").single();
      if (error) throw error;
      for (const [index, file] of reviewPhotos.entries()) {
        const storage_path = await uploadPhoto(`reviews/${me.id}/${review.id}/`, file, 1280);
        const { error: mediaError } = await supabase.from("review_media").insert({ review_id: review.id, customer_id: me.id, storage_path, sort_order: index });
        if (mediaError) throw mediaError;
      }
      setComment(""); setReviewPhotos([]); await loadReviews();
      toast.success("បានបញ្ចូលការវាយតម្លៃ · Review submitted");
    } catch (error) { toast.error((error as Error).message); } finally { setSubmittingReview(false); }
  }

  const active = gallery[activeMedia] ?? gallery[0];

  return <div className="mx-auto max-w-5xl pb-24">
    <Link to="/store" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{t("back")}</Link>
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <div className="min-w-0">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-panel border border-border bg-muted">
          {!active ? <PackageCheck className="size-20 text-primary" /> : active.media_type === "video" ? <video key={active.storage_path} src={urls[active.storage_path]} controls playsInline preload="metadata" className="size-full object-contain" /> : <img src={urls[active.storage_path]} alt={name} width={768} height={768} className="size-full object-contain" />}
          {gallery.length > 1 && <><Button type="button" size="icon" variant="secondary" aria-label="Previous image" className="absolute left-2 size-9" onClick={() => setActiveMedia((activeMedia - 1 + gallery.length) % gallery.length)}><ChevronLeft className="size-5" /></Button><Button type="button" size="icon" variant="secondary" aria-label="Next image" className="absolute right-2 size-9" onClick={() => setActiveMedia((activeMedia + 1) % gallery.length)}><ChevronRight className="size-5" /></Button><Badge variant="neutral" className="absolute bottom-2 right-2 font-sans">{activeMedia + 1}/{gallery.length}</Badge></>}
        </div>
        {gallery.length > 1 && <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">{gallery.map((item, index) => <Button key={item.id} type="button" variant="outline" aria-label={`Open media ${index + 1}`} aria-pressed={index === activeMedia} onClick={() => setActiveMedia(index)} className={`relative size-16 shrink-0 snap-start overflow-hidden p-0 ${index === activeMedia ? "border-primary ring-2 ring-ring/20" : ""}`}>
          {item.media_type === "video" ? <><video src={urls[item.storage_path]} muted preload="metadata" className="size-full object-cover" /><Play className="absolute size-5 text-primary-foreground" /></> : <img src={urls[item.storage_path]} alt="" loading={index > 2 ? "lazy" : "eager"} className="size-full object-cover" />}
        </Button>)}</div>}
      </div>
      <div>
        <div className="flex items-start gap-2"><h1 className="min-w-0 flex-1 text-2xl font-semibold leading-relaxed">{name}</h1><Button type="button" variant="outline" size="icon" aria-label="Save favourite" aria-pressed={favs.ids.has(id)} onClick={() => void favs.toggle(id)}><Heart className={`size-5 ${favs.ids.has(id) ? "fill-primary text-primary" : ""}`} /></Button><Button type="button" variant="outline" size="icon" aria-label="Share" onClick={() => void shareProduct(id, name)}><Share2 className="size-5" /></Button></div>
        {lang === "km" && <p className="font-sans text-sm text-muted-foreground">{product.name_en}</p>}
        <div className="mt-2 flex items-center gap-2"><Stars value={Math.round(avg)} /><span className="font-sans text-sm text-muted-foreground">{avg.toFixed(1)} ({reviews.length})</span></div>
        <p className="mt-3"><strong className="font-sans text-3xl font-bold text-foreground">${unit.toFixed(2)}</strong><span className="text-sm text-muted-foreground"> / {product.unit_km}</span></p>
        <Badge variant={product.stock_qty > 0 ? "success" : "destructive"} className="mt-2">{product.stock_qty > 0 ? `${t("inStock")} · ${product.stock_qty}` : t("outOfStock")}</Badge>
        <section className="mt-5 border-y border-border py-4" aria-labelledby="quantity-pricing-heading"><h2 id="quantity-pricing-heading" className="text-base font-bold">{t("tiers")}</h2>
          <div className="mt-2 grid gap-1.5">{prices.map((p, index) => {
            const selected = selectedMinimum === p.qty_min;
            const discount = tierDiscountPercent(basePrice, p.price_usd);
            const rangeEnd = prices[index + 1]?.qty_min;
            const range = rangeEnd ? `${p.qty_min}–${rangeEnd - 1}` : `${p.qty_min}+`;
            return <Button key={p.qty_min} type="button" variant="outline" aria-pressed={selected} onClick={() => { setQty(p.qty_min); setAdded(false); }} className={`h-auto min-h-11 w-full justify-start gap-2.5 whitespace-normal px-3 py-1.5 text-left ${selected ? "border-primary bg-secondary hover:bg-secondary" : ""}`}>
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`} aria-hidden="true">{selected && <Check className="size-3" />}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold"><span className="font-sans tabular-nums">{range}</span> {unitLabel}</span>
              {discount > 0 && <span className="hidden shrink-0 font-sans text-xs font-normal tabular-nums text-muted-foreground line-through sm:inline">${basePrice.toFixed(2)}</span>}
              <strong className="shrink-0 font-sans text-base font-bold tabular-nums">${p.price_usd.toFixed(2)}</strong>
              {discount > 0 && <Badge variant="primary" className="shrink-0 px-1.5 py-0 text-[11px]">{lang === "km" ? "សន្សំ" : "Save"} <span className="font-sans tabular-nums">{Number(discount.toFixed(1))}%</span></Badge>}
            </Button>;
          })}</div>
        </section>
      </div>
    </div>

    {blocks.length > 0 && <section className="mt-8 space-y-4 border-t border-border pt-6">
      <h2 className="text-base font-bold">{lang === "km" ? "ការពិពណ៌នា" : "Description"}</h2>
      {blocks.map((b, i) => b.type === "text"
        ? <p key={i} className="whitespace-pre-line text-sm leading-relaxed">{pick(b.km || b.en, b.en || b.km)}</p>
        : urls[b.path] && <img key={i} src={urls[b.path]} alt="" loading="lazy" className="w-full rounded-panel object-cover" />)}
    </section>}

    <section className="mt-8 border-t border-border pt-6">
      <h2 className="text-base font-bold">{t("reviews")}</h2>
      {userId === "guest" && <Link to="/auth" search={{ redirect: `/store/product/${id}` } as never} className="mt-3 block text-sm font-medium text-primary">{lang === "km" ? "ចូលគណនីដើម្បីសរសេរការវាយតម្លៃ" : "Sign in to write a review"}</Link>}
      {me && <Card className="mt-3"><CardContent className="space-y-3 p-4"><p className="text-sm font-semibold">{t("writeReview")}</p><Stars value={rating} onPick={setRating} size="size-7" />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-control border border-input bg-surface p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <div className="flex flex-wrap gap-2">{reviewPhotos.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-control border border-border px-2 py-1 font-sans text-xs"><Camera className="size-3" /><span className="max-w-32 truncate">{file.name}</span><Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Remove photo" onClick={() => setReviewPhotos((current) => current.filter((_, i) => i !== index))}><X className="size-3" /></Button></span>)}</div>
        <div className="flex gap-2"><Button asChild size="sm" variant="outline"><label className="cursor-pointer"><Camera className="size-4" />{lang === "km" ? "បន្ថែមរូប" : "Add photos"}<input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => setReviewPhotos((current) => [...current, ...Array.from(event.target.files ?? [])].slice(0, 5))} /></label></Button><Button size="sm" disabled={submittingReview} onClick={() => void submitReview()}>{submittingReview ? "…" : t("submit")}</Button></div></CardContent></Card>}
      <div className="mt-3 space-y-3">{reviews.length === 0 ? <p className="text-sm text-muted-foreground">{t("noReviews")}</p> : reviews.map((r) => <Card key={r.id}><CardContent className="p-4"><div className="flex items-center justify-between"><strong className="text-sm">{r.reviewer_name}</strong><Stars value={r.rating} /></div>{r.comment && <p className="mt-2 text-sm">{r.comment}</p>}{r.review_media.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto">{[...r.review_media].sort((a, b) => a.sort_order - b.sort_order).map((item) => <img key={item.id} src={reviewUrls[item.storage_path]} alt="Review attachment" loading="lazy" className="size-24 shrink-0 rounded-control border border-border object-cover" />)}</div>}<p className="mt-1 font-sans text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p></CardContent></Card>)}</div>
    </section>

    {related.length > 0 && <section className="mt-8 border-t border-border pt-6"><h2 className="text-base font-bold">{lang === "km" ? "ទំនិញណែនាំ" : "Recommended products"}</h2><div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">{related.map((item: Product) => { const relatedPhoto = urls[item.photo_url ?? ""]; const relatedPrice = priceInfo(item).retail; return <Link key={item.id} to="/store/product/$id" params={{ id: item.id }} className="w-40 shrink-0 snap-start overflow-hidden rounded-panel border border-border bg-surface"><div className="grid aspect-square place-items-center bg-muted">{relatedPhoto ? <img src={relatedPhoto} alt={pick(item.name_km, item.name_en)} loading="lazy" className="size-full object-cover" /> : <PackageCheck className="size-10 text-primary" />}</div><div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold">{pick(item.name_km, item.name_en)}</p><p className="mt-1 font-sans text-base font-bold">${relatedPrice.toFixed(2)}</p></div></Link>; })}</div></section>}

    <div className="product-purchase-bar fixed inset-x-0 bottom-20 z-30 border-t border-border bg-surface p-4 md:sticky md:bottom-4 md:mt-8 md:rounded-panel md:border">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-control border border-border bg-surface"><Button variant="ghost" size="icon" className="size-10" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="size-4" /></Button><span className="w-10 text-center font-sans font-semibold">{qty}</span><Button variant="ghost" size="icon" className="size-10" aria-label="Increase quantity" onClick={() => setQty(qty + 1)}><Plus className="size-4" /></Button></div>
        <Button className="h-12 min-w-0 flex-1 text-sm" disabled={product.stock_qty < 1} onClick={() => { addItem(toCartLine(product), qty); setAdded(true); setTimeout(() => setAdded(false), 1500); }}>{added ? "✓" : `${t("addToCart")} · $${(unit * qty).toFixed(2)}`}</Button>
      </div>
    </div>
  </div>;
}
