import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { FileText, Grid2X2, Home, Moon, Package, ShoppingCart, Sun, UserRound } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { StoreProvider, useStore } from "./store-context";
import { PrefsProvider, usePrefs } from "./prefs";
import brandMark from "@/assets/logos/provisionkh-mark-header.png";

const links = [
  { to: "/store", key: "home", icon: Home },
  { to: "/store/categories", key: "categories", icon: Grid2X2 },
  { to: "/store/cart", key: "cart", icon: ShoppingCart },
  { to: "/store/orders", key: "orders", icon: Package },
  { to: "/store/profile", key: "account", icon: UserRound },
] as const;

function StoreFrame() {
  const location = useLocation();
  const { itemCount } = useStore();
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const active = (to: string) => to === "/store" ? location.pathname === to || location.pathname.startsWith("/store/product") : location.pathname.startsWith(to);
  return <div className="commerce-store min-h-dvh bg-background pb-24 font-khmer md:pb-10">
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/store" className="flex min-w-0 items-center gap-2">
          <img src={brandMark} alt="ProvisionKH" width={56} height={56} className="size-14 shrink-0 object-contain" />
          <span className="min-w-0"><strong className="block font-sans text-base font-bold leading-tight sm:text-lg">ProvisionKH</strong><span className="mt-1 block text-xs text-muted-foreground">{t("tagline")}</span></span>
        </Link>
        <nav aria-label={t("home")} className="hidden items-center gap-1 md:flex">{links.filter(l => l.key !== "cart").map(({to, key, icon: Icon}) => <Button key={to} asChild variant={active(to) ? "secondary" : "ghost"}><Link to={to} aria-current={active(to) ? "page" : undefined}><Icon className="size-4" />{t(key)}</Link></Button>)}</nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="icon"><Link to="/store/requests" aria-label={lang === "km" ? "សំណើតម្លៃ" : "Requests"} title={lang === "km" ? "សំណើតម្លៃ និងតាមតម្រូវការ" : "Quotes & custom requests"}><FileText className="size-5"/></Link></Button>
          <Button variant="ghost" size="icon" className="font-sans text-xs" onClick={() => setLang(lang === "km" ? "en" : "km")} aria-label={t("language")}>{lang === "km" ? "EN" : "KH"}</Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t("darkMode")} title={t("darkMode")}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
          <Button asChild variant="outline" size="icon"><Link to="/store/cart" className="relative" aria-label={t("cart")}><ShoppingCart className="size-5" />{itemCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-control bg-primary px-1 font-sans text-xs font-bold text-primary-foreground">{itemCount}</span>}</Link></Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
    <nav aria-label={t("account")} className="store-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden">
      <div className="grid grid-cols-5 px-1 py-2">{links.map(({ to, key, icon: Icon }) => <Link key={to} to={to} aria-current={active(to) ? "page" : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-control px-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${active(to) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}><Icon className="size-5" strokeWidth={active(to) ? 2.2 : 1.8} /><span className="max-w-full truncate">{t(key)}</span></Link>)}</div>
    </nav>
  </div>;
}

export function StoreShell() {
  return <PrefsProvider><StoreProvider><StoreFrame /></StoreProvider></PrefsProvider>;
}
