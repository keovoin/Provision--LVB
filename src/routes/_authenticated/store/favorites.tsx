import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { homeOptions, storeScope } from "@/app/store-queries";
import { ProductCard } from "@/app/ProductCard";
import { useFavorites } from "@/app/favorites";
import { usePrefs } from "@/app/prefs";

export const Route = createFileRoute("/_authenticated/store/favorites")({
  head: () => ({ meta: [{ title: "ទំនិញដែលចូលចិត្ត | ProvisionKH" }, { name: "description", content: "Your saved ProvisionKH products for quick reordering." }, { property: "og:title", content: "ProvisionKH Favourites" }, { property: "og:description", content: "Saved wholesale products." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    const userId = await storeScope();
    await context.queryClient.ensureQueryData(homeOptions(userId));
    return { userId };
  },
  component: FavoritesPage,
});

function FavoritesPage() {
  const { userId } = Route.useLoaderData();
  const { lang, view } = usePrefs();
  const { data: { products, photos } } = useSuspenseQuery(homeOptions(userId));
  const { ids } = useFavorites();
  const saved = products.filter((p) => ids.has(p.id));
  return <>
    <h1 className="text-xl font-bold">{lang === "km" ? "ទំនិញដែលចូលចិត្ត" : "Favourites"} <span className="font-sans text-sm font-normal text-muted-foreground">{saved.length}</span></h1>
    {saved.length === 0 ? <div className="py-20 text-center"><Heart className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">{lang === "km" ? "មិនទាន់មានទំនិញដែលបានរក្សាទុក" : "No saved products yet"}</p><Button asChild className="mt-5"><Link to="/store">{lang === "km" ? "ទៅហាង" : "Go shopping"}</Link></Button></div>
      : <div className={`pt-4 ${view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" : "space-y-3"}`}>{saved.map((p) => <ProductCard key={p.id} product={p} photo={photos[p.photo_url ?? ""]} view={view} />)}</div>}
  </>;
}
