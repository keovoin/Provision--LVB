import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "km" | "en";
export type Theme = "light" | "dark";
export type ListView = "grid" | "list";

const dict = {
  home: ["ទំព័រដើម", "Home"], cart: ["កន្ត្រក", "Cart"], orders: ["ការបញ្ជាទិញ", "Orders"], account: ["គណនី", "Account"],
  tagline: ["ទំនិញលក់ដុំ សម្រាប់អាជីវកម្ម", "Wholesale for businesses"],
  search: ["ស្វែងរកទំនិញ…", "Search products…"], all: ["ទាំងអស់", "All"], notFound: ["រកមិនឃើញទំនិញ", "No products found"],
  categories: ["ប្រភេទទំនិញ", "Categories"], products: ["ទំនិញ", "Products"], from: ["ចាប់ពី", "from"],
  add: ["បន្ថែម", "Add"], addToCart: ["បន្ថែមទៅកន្ត្រក", "Add to cart"], outOfStock: ["អស់ពីស្តុក", "Out of stock"], inStock: ["មានក្នុងស្តុក", "In stock"],
  tiers: ["តម្លៃតាមបរិមាណ", "Quantity pricing"], reviews: ["ការវាយតម្លៃ", "Reviews"], writeReview: ["សរសេរការវាយតម្លៃ", "Write a review"],
  noReviews: ["មិនទាន់មានការវាយតម្លៃ", "No reviews yet"], submit: ["បញ្ជូន", "Submit"], back: ["ត្រឡប់", "Back"],
  cartEmpty: ["កន្ត្រករបស់អ្នកទទេ", "Your cart is empty"], shop: ["ទៅទិញទំនិញ", "Start shopping"], continueShopping: ["បន្តទិញទំនិញ", "Continue shopping"],
  delivery: ["ព័ត៌មានដឹកជញ្ជូន", "Delivery details"], address: ["អាសយដ្ឋានដឹកជញ្ជូន", "Delivery address"], note: ["កំណត់ចំណាំ (មិនចាំបាច់)", "Note (optional)"],
  savedAddresses: ["អាសយដ្ឋានដែលបានរក្សាទុក", "Saved addresses"], saveAddress: ["រក្សាទុកអាសយដ្ឋាននេះ", "Save this address"],
  myLocation: ["ទីតាំងខ្ញុំ", "My location"], dragPin: ["អូសម្ជុល ឬចុចលើផែនទី ដើម្បីកំណត់ទីតាំង", "Drag the pin or tap the map to set location"],
  payMethod: ["ជ្រើសរើសវិធីទូទាត់", "Choose payment method"], cod: ["ទូទាត់ពេលទទួល", "Cash on delivery"], qr: ["ស្កេន KHQR", "Scan KHQR"],
  link: ["តំណទូទាត់", "Payment link"], net30: ["ឥណទាន", "Net credit"], total: ["សរុប", "Total"],
  placeOrder: ["បញ្ជាក់ការបញ្ជាទិញ", "Place order"], placing: ["កំពុងបញ្ជាទិញ…", "Placing order…"], selectPayFirst: ["សូមជ្រើសរើសវិធីទូទាត់ជាមុន", "Select a payment method first"],
  profile: ["ព័ត៌មានអាជីវកម្ម", "Business profile"], name: ["ឈ្មោះ", "Name"], businessName: ["ឈ្មោះអាជីវកម្ម", "Business name"],
  phone: ["លេខទូរស័ព្ទ", "Phone number"], telegram: ["Telegram", "Telegram"], businessLocation: ["ទីតាំងអាជីវកម្ម", "Business location"],
  save: ["រក្សាទុក", "Save"], saved: ["បានរក្សាទុក", "Saved"], creditLimit: ["កម្រិតឥណទាន", "Credit limit"], requestCredit: ["ស្នើសុំឥណទាន", "Request credit line"],
  amount: ["ចំនួនទឹកប្រាក់ (USD)", "Amount (USD)"], requested: ["សំណើបានផ្ញើ", "Request sent"], support: ["ទាក់ទងផ្នែកជំនួយ", "Contact support"],
  settings: ["ការកំណត់", "Settings"], language: ["ភាសា", "Language"], darkMode: ["ពណ៌ងងឹត", "Dark mode"], signOut: ["ចាកចេញ", "Sign out"],
  pending: ["កំពុងរង់ចាំ", "Pending"], specialPrice: ["តម្លៃពិសេសសម្រាប់អាជីវកម្ម", "Business pricing"],
} as const;
export type TKey = keyof typeof dict;

interface Prefs { lang: Lang; theme: Theme; view: ListView; setLang: (l: Lang) => void; setTheme: (t: Theme) => void; setView: (v: ListView) => void; t: (k: TKey) => string; pick: (km: string, en: string | null | undefined) => string }
const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("km");
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<ListView>("grid");
  useEffect(() => {
    const s = JSON.parse(window.localStorage.getItem("provisionkh-prefs") ?? "{}") as Partial<Prefs>;
    if (s.lang) setLang(s.lang); if (s.theme) setTheme(s.theme); if (s.view) setView(s.view);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("provisionkh-prefs", JSON.stringify({ lang, theme, view }));
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [lang, theme, view]);
  const value = useMemo<Prefs>(() => ({
    lang, theme, view, setLang, setTheme, setView,
    t: (k) => dict[k][lang === "km" ? 0 : 1],
    pick: (km, en) => (lang === "en" && en ? en : km),
  }), [lang, theme, view]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsContext);
  if (!c) throw new Error("usePrefs must be used inside PrefsProvider");
  return c;
}
