import { Link } from "@tanstack/react-router";
import { ChevronRight, Facebook, Send } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { usePrefs } from "./prefs";
import brandMark from "@/assets/logos/provisionkh-mark-header.png";

export interface StorefrontContent {
  company_profile: string;
  delivery_information: string;
  returns_refunds_policy: string;
  privacy_policy: string;
  terms_conditions: string;
  facebook_url: string;
  telegram_url: string;
}

const usefulLinks: { key: keyof StorefrontContent; km: string; en: string }[] = [
  { key: "delivery_information", km: "ព័ត៌មានដឹកជញ្ជូន", en: "Delivery Information" },
  { key: "returns_refunds_policy", km: "គោលការណ៍ប្តូរ និងសងប្រាក់", en: "Returns & Refunds Policy" },
  { key: "privacy_policy", km: "គោលការណ៍ឯកជនភាព", en: "Privacy Policy" },
  { key: "terms_conditions", km: "លក្ខខណ្ឌប្រើប្រាស់", en: "Terms & Conditions" },
];

export function StoreFooter({ content }: { content: StorefrontContent | null }) {
  const { lang, t } = usePrefs();
  if (!content) return null;
  const social = Boolean(content.facebook_url || content.telegram_url);
  return <footer className="-mx-4 mt-12 border-t border-border bg-surface px-4 py-8 sm:mx-0 sm:rounded-panel sm:border sm:px-6">
    <Link to="/store" className="inline-flex items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={brandMark} alt="ProvisionKH" width={48} height={48} className="size-12 shrink-0 object-contain" /><span className="min-w-0"><strong className="block font-sans text-lg font-bold leading-tight">ProvisionKH</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{t("tagline")}</span></span></Link>
    <div className="mt-8 grid gap-8 border-t border-border pt-8 md:grid-cols-[1.25fr_2fr_0.8fr]">
      <section><p className="text-xs font-semibold uppercase text-primary">{lang === "km" ? "អំពីយើង" : "About"}</p><h2 className="mt-2 text-lg font-bold">{lang === "km" ? "ប្រវត្តិក្រុមហ៊ុន" : "Company Profile"}</h2>{content.company_profile && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{content.company_profile}</p>}</section>
      <section><h2 className="text-lg font-bold">{lang === "km" ? "តំណមានប្រយោជន៍" : "Useful Links"}</h2><div className="mt-3 divide-y divide-border border-y border-border">{usefulLinks.map((item) => <Link key={item.key} to="/store/info/$key" params={{ key: item.key }} className="flex items-center justify-between py-3 text-sm font-semibold transition-colors hover:text-primary">{lang === "km" ? item.km : item.en}<ChevronRight className="size-4 text-muted-foreground" /></Link>)}</div></section>
      <section><h2 className="text-lg font-bold">{lang === "km" ? "តាមដានយើង" : "Follow Us"}</h2>{social && <div className="mt-3 flex flex-wrap gap-2">{content.facebook_url && <Button asChild variant="outline" size="sm"><a href={content.facebook_url} target="_blank" rel="noreferrer"><Facebook className="size-4" />Facebook</a></Button>}{content.telegram_url && <Button asChild variant="outline" size="sm"><a href={content.telegram_url} target="_blank" rel="noreferrer"><Send className="size-4" />Telegram</a></Button>}</div>}</section>
    </div>
    <p className="mt-8 border-t border-border pt-5 text-center font-sans text-xs text-muted-foreground">© {new Date().getFullYear()} ProvisionKH · Developed by Sastra Digital Innovation</p>
  </footer>;
}