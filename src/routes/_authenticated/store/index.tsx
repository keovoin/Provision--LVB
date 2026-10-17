import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { homeOptions, bannerOptions, storeScope } from "@/app/store-queries";
import { Button, SearchInput } from "@/design-system/provisionkh";
import { BannerCarousel } from "@/app/BannerCarousel";
import { CategoryIcon } from "@/app/CategoryIcon";
import { ProductCard } from "@/app/ProductCard";
import { usePrefs } from "@/app/prefs";
import { StoreFooter } from "@/app/StoreFooter";
export const Route = createFileRoute("/_authenticated/store/")({
  head: () => ({ meta: [{ title: "ហាងលក់ដុំ | ProvisionKH" }, { name: "description", content: "Browse ProvisionKH wholesale groceries with tiered pricing." }, { property: "og:title", content: "ProvisionKH Wholesale Store" }, { property: "og:description", content: "Wholesale groceries for Cambodian businesses." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    const userId = await storeScope();
    void context.queryClient.prefetchQuery(bannerOptions(userId));
    await context.queryClient.ensureQueryData(homeOptions(userId));
    return { userId };
  },
  errorComponent: ({ error }) => <p role="alert">{error instanceof Error ? error.message : "Unable to load this page"}</p>,
  notFoundComponent: () => <p>Store not found</p>,
  component: StoreHome,
});

function StoreHome() {
  const { t, pick, view, setView } = usePrefs();
  const { userId } = Route.useLoaderData();
  const { data: { products, categories, photos, storefrontContent } } = useSuspenseQuery(homeOptions(userId));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const loading = false;
  const shown = useMemo(() => products.filter((p) => (category === "all" || p.category_id === category) && `${p.name_km} ${p.name_en}`.toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  const cats = [{ id: "all", name_km: t("all"), name_en: t("all"), icon: "all" }, ...categories];

  return <>
    <BannerCarousel userId={userId} onCategory={setCategory} />
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-bold sm:text-2xl">{t("products")} <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">{products.length}</span></h1>
      <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("search")} placeholder={t("search")} containerClassName="w-full sm:max-w-md" className="h-12 bg-surface" />
    </div>
    <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {cats.map((c) => { const active = category === c.id; return <Button key={c.id} type="button" variant={active ? "secondary" : "outline"} onClick={() => setCategory(c.id)} aria-pressed={active} className={`h-auto min-h-20 min-w-24 flex-col gap-2 px-3 py-3 text-xs ${active ? "border border-primary/40" : ""}`}>
        <CategoryIcon name={c.icon} className={`size-6 ${active ? "text-secondary-foreground" : "text-muted-foreground"}`} />
        <span>{pick(c.name_km, c.name_en)}</span>
      </Button>; })}
    </div>
    <div id="products" className="mt-5 flex scroll-mt-28 items-center justify-between border-t border-border pt-5">
      <h2 className="text-sm font-semibold">{category === "all" ? t("all") : pick(categories.find(c => c.id === category)?.name_km ?? "", categories.find(c => c.id === category)?.name_en ?? "")} <span className="ml-1 font-sans font-normal text-muted-foreground">({shown.length})</span></h2>
      <div className="flex gap-1 rounded-control border border-border bg-surface p-1">
        {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => <Button key={v} size="icon" variant={view === v ? "secondary" : "ghost"} aria-label={v} title={v} aria-pressed={view === v} onClick={() => setView(v)}><Icon className="size-4" /></Button>)}
      </div>
    </div>
    {loading ? <div className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-panel bg-muted" />)}</div>
      : shown.length === 0 ? <div className="py-20 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">{t("notFound")}</p></div>
      : <div className={`pt-4 ${view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" : "space-y-3"}`}>{shown.map((p) => <ProductCard key={p.id} product={p} photo={photos[p.photo_url ?? ""]} view={view} />)}</div>}
    <StoreFooter content={storefrontContent} />
  </>;
}
