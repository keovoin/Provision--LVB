import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, PackageCheck, Search } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { homeOptions, storeScope } from "@/app/store-queries";
import { Button, SearchInput } from "@/design-system/provisionkh";
import { CategoryIcon } from "@/app/CategoryIcon";
import { priceInfo } from "@/app/catalog";
import { usePrefs } from "@/app/prefs";

export const Route = createFileRoute("/_authenticated/store/categories")({
  head: () => ({ meta: [{ title: "ប្រភេទទំនិញ | SastraKH" }, { name: "description", content: "Browse SastraKH wholesale products by category." }, { property: "og:title", content: "SastraKH Product Categories" }, { property: "og:description", content: "Find wholesale groceries by category and compare quantity prices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    const userId = await storeScope();
    await context.queryClient.ensureQueryData(homeOptions(userId));
    return { userId };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const { userId } = Route.useLoaderData();
  const { data: { products, categories, photos } } = useSuspenseQuery(homeOptions(userId));
  const { pick, lang } = usePrefs();
  const [selected, setSelected] = useState(categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const activeCategory = categories.find((category) => category.id === selected) ?? categories[0];
  const shown = useMemo(() => products.filter((product) => (!activeCategory || product.category_id === activeCategory.id) && `${product.name_km} ${product.name_en}`.toLowerCase().includes(query.toLowerCase())), [products, activeCategory, query]);

  return <div className="-mx-4 -mt-6 min-h-[calc(100dvh-10rem)] sm:mx-0 sm:mt-0">
    <div className="sticky top-20 z-20 border-b border-border bg-background px-4 py-3 sm:static sm:px-0 sm:pt-0">
      <h1 className="text-xl font-bold">{lang === "km" ? "ប្រភេទទំនិញ" : "Categories"}</h1>
      <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "km" ? "ស្វែងរកក្នុងប្រភេទ…" : "Search this category…"} className="mt-3 h-11 bg-surface" />
    </div>
    <div className="grid min-h-[calc(100dvh-14rem)] grid-cols-[6.5rem_1fr] border-b border-border sm:mt-4 sm:grid-cols-[13rem_1fr] sm:overflow-hidden sm:rounded-panel sm:border">
      <aside className="border-r border-border bg-muted/60" aria-label={lang === "km" ? "ប្រភេទ" : "Categories"}>
        {categories.map((category) => { const active = category.id === activeCategory?.id; return <Button key={category.id} type="button" variant="ghost" aria-pressed={active} onClick={() => setSelected(category.id)} className={`h-auto min-h-16 w-full justify-start rounded-none border-b border-border px-3 py-2 text-left ${active ? "border-l-4 border-l-primary bg-surface text-foreground" : "text-muted-foreground"}`}>
          <CategoryIcon name={category.icon} className="size-5 shrink-0" /><span className="min-w-0 text-xs font-semibold sm:text-sm">{pick(category.name_km, category.name_en)}</span>
        </Button>; })}
      </aside>
      <section className="min-w-0 bg-surface p-3 sm:p-5">
        {activeCategory && <div className="flex items-center justify-between gap-2 border-b border-border pb-3"><div className="flex min-w-0 items-center gap-2"><CategoryIcon name={activeCategory.icon} className="size-6 shrink-0 text-primary" /><h2 className="truncate text-base font-bold sm:text-lg">{pick(activeCategory.name_km, activeCategory.name_en)}</h2></div><span className="font-sans text-xs text-muted-foreground">{shown.length}</span></div>}
        {shown.length === 0 ? <div className="py-20 text-center text-muted-foreground"><Search className="mx-auto size-8" /><p className="mt-2 text-sm">{lang === "km" ? "រកមិនឃើញទំនិញ" : "No products found"}</p></div>
          : <div className="grid grid-cols-2 gap-x-3 gap-y-5 pt-4 sm:grid-cols-3 lg:grid-cols-4">{shown.map((product) => { const photo = photos[product.photo_url ?? ""]; const price = priceInfo(product).retail; return <Link key={product.id} to="/store/product/$id" params={{ id: product.id }} className="group min-w-0">
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-control bg-muted">{photo ? <img src={photo} alt={pick(product.name_km, product.name_en)} loading="lazy" className="size-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105" /> : <PackageCheck className="size-9 text-muted-foreground" />}</div>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-relaxed group-hover:text-primary">{pick(product.name_km, product.name_en)}</p>
            <div className="mt-1 flex items-center justify-between gap-1"><strong className="font-sans text-base">${price.toFixed(2)}</strong><ChevronRight className="size-4 text-muted-foreground" /></div>
          </Link>; })}</div>}
      </section>
    </div>
  </div>;
}