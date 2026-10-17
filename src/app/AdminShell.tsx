import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, Megaphone, Boxes, CreditCard, FolderTree, LogOut, Menu, MessageSquare, PackageCheck, Send, Settings, ShoppingBag, Tag, Truck, Users, X } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PrefsProvider, usePrefs } from "./prefs";
import { KeyRound, Moon, Sun } from "lucide-react";
import { ChangePasswordForm, clearFirstLoginFlag } from "./ChangePassword";
import brandMark from "@/assets/logos/provisionkh-mark-header.png";

const items = [
  ["/admin/requests", ["សំណើអតិថិជន","Requests"], MessageSquare],
  ["/admin", ["ទិដ្ឋភាពទូទៅ","Overview"], BarChart3], ["/admin/orders", ["ការបញ្ជាទិញ","Orders"], ShoppingBag], ["/admin/new-order", ["បង្កើតការបញ្ជាទិញ","Create order"], Send],
  ["/admin/customers", ["អតិថិជន","Customers"], Users], ["/admin/products", ["ទំនិញ","Products"], Boxes], ["/admin/categories", ["ក្រុមទំនិញ","Categories"], FolderTree], ["/admin/wholesale", ["តម្លៃលក់ដុំ","Wholesale prices"], CreditCard],
  ["/admin/banners", ["បដាផ្សព្វផ្សាយ","Banners"], Megaphone], ["/admin/promotions", ["បញ្ចុះតម្លៃ","Promotions"], Tag], ["/admin/drops", ["ដឹកជញ្ជូនជាប្រចាំ","Scheduled deliveries"], Truck], ["/admin/receivables", ["ប្រាក់ត្រូវទទួល","Receivables"], CreditCard],
  ["/admin/pos", ["លក់ផ្ទាល់","POS"], ShoppingBag], ["/admin/stock", ["ស្កេនស្តុក","Stock scan"], Boxes], ["/admin/suppliers", ["អ្នកផ្គត់ផ្គង់","Suppliers"], Users], ["/admin/purchase-orders", ["ទិញចូល","Purchase orders"], PackageCheck],
  ["/admin/reports", ["របាយការណ៍លក់","Sales report"], BarChart3], ["/admin/backups", ["ច្បាប់ចម្លងទិន្នន័យ","Backups"], Settings], ["/admin/staff", ["បុគ្គលិក","Staff"], PackageCheck], ["/admin/settings", ["ការកំណត់","Settings"], Settings],
] as const;

// Section each page needs; "owner" = owner only.
const NEED: Record<string, string> = {
  "/admin/requests": "requests",
  "/admin": "owner", "/admin/orders": "orders", "/admin/new-order": "orders", "/admin/customers": "customers",
  "/admin/products": "products", "/admin/bulk-upload": "products", "/admin/categories": "categories", "/admin/wholesale": "owner", "/admin/banners": "products", "/admin/promotions": "owner",
  "/admin/drops": "drops", "/admin/receivables": "receivables", "/admin/staff": "owner", "/admin/reports": "reports", "/admin/backups": "owner", "/admin/settings": "owner",
  "/admin/pos": "pos", "/admin/stock": "stock", "/admin/suppliers": "stock", "/admin/purchase-orders": "stock",
};

function useAccess() {
  const [acc, setAcc] = useState<{ owner: boolean; staff: boolean; sections: string[]; mustChange: boolean } | null>(null);
  useEffect(() => { void (async () => {
    const { data: u } = await supabase.auth.getUser(); const id = u.user?.id;
    if (!id) return setAcc({ owner: false, staff: false, sections: [], mustChange: false });
    const [r, s] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("staff_permissions").select("section").eq("user_id", id),
    ]);
    const roles = (r.data ?? []).map((x) => x.role as string);
    setAcc({ owner: roles.includes("owner"), staff: roles.includes("staff"), sections: (s.data ?? []).map((x) => x.section), mustChange: u.user?.user_metadata?.must_change_password === true });
  })(); }, []);
  return acc;
}

export function AdminShell() { return <PrefsProvider><AdminFrame /></PrefsProvider>; }

function AdminFrame() {
  const { lang, setLang, theme, setTheme } = usePrefs();
  const L = (km: string, en: string) => lang === "en" ? en : km;
  const acc = useAccess();
  const allowed = (to: string) => !!acc && (acc.owner || (acc.staff && NEED[to] !== "owner" && acc.sections.includes(NEED[to])));
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (acc && !acc.owner && acc.staff && location.pathname === "/admin") {
      const first = items.find(([to]) => allowed(to))?.[0]; if (first) void navigate({ to: first, replace: true });
    }
  }, [acc, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidePw, setHidePw] = useState(false);
  const showPw = !!acc?.mustChange && !hidePw;
  const skipPw = () => { setHidePw(true); void clearFirstLoginFlag(); };
  const current = items.find(([to]) => location.pathname === to)?.[1]; const currentLabel = current ? L(current[0], current[1]) : "ProvisionKH";
  return <div className="operations-app min-h-dvh bg-muted md:grid md:grid-cols-[256px_minmax(0,1fr)]">
    {menuOpen && <Button variant="ghost" aria-label="បិទម៉ឺនុយ" className="fixed inset-0 z-40 h-full w-full rounded-none bg-foreground/30 md:hidden" onClick={() => setMenuOpen(false)} />}
    <aside aria-label="មជ្ឈមណ្ឌលប្រតិបត្តិការ" className={`${menuOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-dvh md:w-auto`}>
      <div className="flex min-h-24 items-center gap-2 px-5"><img src={brandMark} alt="ProvisionKH" className="size-14 shrink-0 object-contain"/><span><strong className="block font-sans text-base">ProvisionKH</strong><small className="font-sans text-xs text-muted-foreground">Operations</small></span><Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="បិទម៉ឺនុយ" onClick={() => setMenuOpen(false)}><X className="size-4" /></Button></div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">{items.map(([to,label,Icon], i) => !allowed(to) ? null : <div key={to}>{(i === 0 || i === 3 || i === 8) && <p className="mb-2 mt-5 px-3 text-xs font-medium text-muted-foreground">{i === 0 ? L("ប្រតិបត្តិការ","Operations") : i === 3 ? L("ការគ្រប់គ្រងហាង","Store management") : L("រដ្ឋបាល","Administration")}</p>}<Button asChild variant={location.pathname === to ? "secondary" : "ghost"} className={`mb-1 h-11 w-full justify-start px-3 font-medium ${location.pathname === to ? "" : "text-muted-foreground"}`}><Link to={to} aria-current={location.pathname === to ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon className="size-4 shrink-0"/>{L(label[0], label[1])}</Link></Button></div>)}</nav>
      <div className="border-t border-border p-3"><Button asChild variant="ghost" className="mb-1 w-full justify-start text-muted-foreground"><Link to="/admin/account" onClick={() => setMenuOpen(false)}><KeyRound className="size-4"/>{L("ប្តូរពាក្យសម្ងាត់","Change password")}</Link></Button><Button asChild variant="outline" className="mb-2 w-full justify-between"><Link to="/store">{L("មើលហាង","View store")}<ArrowUpRight className="size-4" /></Link></Button><Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/auth"); }}><LogOut className="size-4"/>{L("ចាកចេញ","Sign out")}</Button></div>
    </aside>
    <div className="min-w-0 md:p-3"><div className="min-h-dvh border-border bg-background md:min-h-[calc(100dvh-1.5rem)] md:rounded-panel md:border">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:rounded-t-panel md:px-7"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden" aria-label="បើកម៉ឺនុយ" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu className="size-5" /></Button><span className="hidden text-xs text-muted-foreground sm:inline">ProvisionKH</span><span className="hidden text-muted-foreground sm:inline">/</span><strong className="truncate text-sm font-medium">{currentLabel}</strong></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="font-sans text-xs" onClick={() => setLang(lang === "km" ? "en" : "km")} aria-label={L("ភាសា","Language")}>{lang === "km" ? "EN" : "KH"}</Button><Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={L("របៀបងងឹត","Dark mode")}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button><Button asChild variant="ghost" size="sm"><Link to="/store">{L("មើលហាង","View store")}<ArrowUpRight className="size-4" /></Link></Button></div></header>
      <main className="mx-auto max-w-screen-2xl p-4 md:p-7">{!acc ? null : !acc.owner && !acc.staff ? <NoAccess msg={L("គណនីនេះមិនមែនជាបុគ្គលិកទេ","This account is not staff.")} /> : allowed(location.pathname) || !(location.pathname in NEED) ? <Outlet/> : <NoAccess msg={L("អ្នកមិនមានសិទ្ធិចូលផ្នែកនេះទេ","You don't have access to this section.")} first={items.find(([to]) => allowed(to))?.[0]} />}</main>
    </div></div>
    {showPw && <div role="dialog" aria-modal="true" aria-labelledby="pw-title" className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4">
      <div className="w-full max-w-sm rounded-panel border border-border bg-surface p-6 shadow-overlay">
        <h2 id="pw-title" className="text-lg font-semibold">{L("សូមស្វាគមន៍! ប្តូរពាក្យសម្ងាត់?", "Welcome! Change your password?")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{L("អ្នកកំពុងប្រើពាក្យសម្ងាត់បណ្តោះអាសន្ន។ អាចប្តូរឥឡូវ ឬពេលក្រោយ។", "You're using a temporary password. Change it now or later.")}</p>
        <ChangePasswordForm onDone={() => setHidePw(true)} />
        <Button variant="ghost" className="mt-2 w-full" onClick={skipPw}>{L("ពេលក្រោយ", "Later")}</Button>
      </div>
    </div>}
  </div>;
}

function NoAccess({ msg, first }: { msg: string; first?: string }) {
  return <div className="mx-auto mt-16 max-w-md rounded-panel border border-border bg-surface p-6 text-center">
    <p className="font-semibold">{msg}</p>
    <div className="mt-4 flex justify-center gap-2">{first && <Button asChild size="sm"><Link to={first}>បើកផ្នែករបស់ខ្ញុំ</Link></Button>}<Button asChild size="sm" variant="outline"><Link to="/store">ទៅហាង</Link></Button></div>
  </div>;
}
