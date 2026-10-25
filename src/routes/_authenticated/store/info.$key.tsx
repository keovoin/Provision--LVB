import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/app/prefs";
import type { StorefrontContent } from "@/app/StoreFooter";

type InfoKey = "delivery_information" | "returns_refunds_policy" | "privacy_policy" | "terms_conditions";

const pages: Record<InfoKey, { km: string; en: string }> = {
  delivery_information: { km: "ព័ត៌មានដឹកជញ្ជូន", en: "Delivery Information" },
  returns_refunds_policy: { km: "គោលការណ៍ប្តូរ និងសងប្រាក់", en: "Returns & Refunds Policy" },
  privacy_policy: { km: "គោលការណ៍ឯកជនភាព", en: "Privacy Policy" },
  terms_conditions: { km: "លក្ខខណ្ឌប្រើប្រាស់", en: "Terms & Conditions" },
};

const infoOptions = (key: InfoKey) => queryOptions({
  queryKey: ["store-info", key],
  queryFn: async () => {
    const { data } = await supabase.rpc("get_storefront_info");
    return ((data as Record<string, string> | null)?.[key] ?? "") as string;
  },
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/store/info/$key")({
  beforeLoad: ({ params }) => {
    if (!(params.key in pages)) throw notFound();
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(infoOptions(params.key as InfoKey)),
  head: ({ params }) => {
    const page = pages[params.key as InfoKey];
    return {
      meta: [
        { title: `${page?.en ?? "Info"} — SastraKH` },
        { name: "description", content: page?.en ?? "Store information" },
        { property: "og:title", content: `${page?.en ?? "Info"} — SastraKH` },
        { property: "og:description", content: page?.en ?? "Store information" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: InfoPage,
});

function InfoPage() {
  const { key } = Route.useParams();
  const { lang } = usePrefs();
  const page = pages[key as InfoKey];
  const { data: body } = useSuspenseQuery(infoOptions(key as InfoKey));
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <Link to="/store" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="size-4" />{lang === "km" ? "ត្រឡប់ទៅហាង" : "Back to store"}
      </Link>
      <h1 className="text-xl font-bold">{lang === "km" ? page.km : page.en}</h1>
      <p className="font-sans text-sm text-muted-foreground">{lang === "km" ? page.en : page.km}</p>
      {body
        ? <p className="whitespace-pre-line rounded-card border border-border bg-surface p-4 text-sm leading-7">{body}</p>
        : <p className="rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">{lang === "km" ? "មិនទាន់មានព័ត៌មាននៅឡើយទេ។" : "No information published yet."}</p>}
    </div>
  );
}
