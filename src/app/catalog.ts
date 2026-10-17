import { supabase } from "@/integrations/supabase/client";

export interface Product { id: string; name_km: string; name_en: string; unit_km: string; unit: string; stock_qty: number; category_id: string | null; photo_url: string | null; product_prices: { qty_min: number; qty_max?: number | null; price_usd: number }[] }

const cache = new Map<string, { url: string; at: number }>();
/** Signed links for private photos, cached for 50 minutes. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const missing = [...new Set(paths)].filter((p) => {
    const cached = cache.get(p);
    return !cached || now - cached.at > 50 * 60_000;
  });
  if (missing.length) {
    const { data } = await supabase.storage.from("product-photos").createSignedUrls(missing, 60 * 60);
    for (const item of data ?? []) if (item.signedUrl && item.path) cache.set(item.path, { url: item.signedUrl, at: now });
  }
  return Object.fromEntries(paths.map((p) => [p, cache.get(p)?.url ?? ""]));
}

export function priceInfo(p: Product) {
  const prices = [...p.product_prices].sort((a, b) => a.qty_min - b.qty_min);
  const retail = prices[0]?.price_usd ?? 0;
  const bulk = prices.at(-1) ?? prices[0];
  return { prices, retail, bulk };
}

export function toCartLine(p: Product) {
  const { retail, bulk } = priceInfo(p);
  return { productId: p.id, nameKm: p.name_km, nameEn: p.name_en, unitKm: p.unit_km, photoPath: p.photo_url, retailPrice: retail, casePrice: bulk?.price_usd ?? retail, caseMinimum: bulk?.qty_min ?? 1 };
}

const BANNER_KEY = "provisionkh-banner";
export function rememberBanner(id: string) { window.localStorage.setItem(BANNER_KEY, JSON.stringify({ id, at: Date.now() })); }
export function recentBanner(): string | null {
  try { const v = JSON.parse(window.localStorage.getItem(BANNER_KEY) ?? "null") as { id: string; at: number } | null; return v && Date.now() - v.at < 7 * 86_400_000 ? v.id : null; } catch { return null; }
}
export function clearBanner() { window.localStorage.removeItem(BANNER_KEY); }
