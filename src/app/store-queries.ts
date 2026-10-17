import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos, type Product } from "./catalog";
import { parseBlocks } from "./description";
import type { StorefrontContent } from "./StoreFooter";

export interface Category { id: string; name_km: string; name_en: string; icon: string }
export interface Banner { id: string; title_km: string; title_en: string; subtitle_km: string | null; subtitle_en: string | null; image_path: string | null; link_type: string; link_id: string }
export interface Order { id: string; order_no: string | null; status: string; total_usd: number; created_at: string; payment_method: string; delivery_address: string; note: string | null; order_items: { product_id: string; qty: number; line_total_usd: number; products: { name_km: string; unit_km: string } | null }[]; payments: { id: string; payment_no: string | null; method: string; amount_usd: number; amount_khr: number; settled_at: string | null; bank_ref: string | null; credit_due_at: string | null; status: string; khqr_code: string | null; khqr_expiry: string | null; provider_payment_id: string | null; provider_status: string | null } | null }

// Local identity scopes the browser cache only; database policies still authorize every read.
// Guests get the "guest" scope and can only read the public catalog.
export async function storeScope() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? "guest";
}

export interface StoreInfo { exchange_rate: number; delivery_fee_usd: number; free_delivery_min_usd: number | null; min_order_usd: number; telegram_url: string; [k: string]: unknown }
export const storeInfoOptions = () => queryOptions({
  queryKey: ["store-info-all"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_storefront_info");
    if (error) throw error;
    return (data ?? {}) as unknown as StoreInfo;
  },
});

export const homeOptions = (userId: string) => queryOptions({
  queryKey: ["store", userId, "catalog"],
  staleTime: 60_000,
  queryFn: async () => {
    const [p, c, s] = await Promise.all([
      supabase.from("products").select("id,name_km,name_en,unit,unit_km,stock_qty,category_id,photo_url,product_prices(qty_min,price_usd)").eq("active", true).order("name_km"),
      supabase.from("categories").select("id,name_km,name_en,icon").eq("active", true).order("sort_order"),
      supabase.rpc("get_storefront_info"),
    ]);
    if (p.error) throw p.error;
    if (c.error) throw c.error;
    const products = (p.data ?? []) as Product[];
    return { products, categories: (c.data ?? []) as Category[], storefrontContent: s.data as StorefrontContent | null, photos: await signPhotos(products.flatMap(p => p.photo_url ? [p.photo_url] : [])) };
  },
});

export const bannerOptions = (userId: string) => queryOptions({
  queryKey: ["store", userId, "banners"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("banners").select("id,title_km,title_en,subtitle_km,subtitle_en,image_path,link_type,link_id").eq("active", true).order("sort_order");
    if (error) throw error;
    const banners = (data ?? []) as Banner[];
    return { banners, urls: await signPhotos(banners.flatMap(b => b.image_path ? [b.image_path] : [])) };
  },
});

export const ordersOptions = (userId: string) => queryOptions({
  queryKey: ["store", userId, "orders"],
  staleTime: 4_000,
  refetchInterval: 4_000,
  refetchIntervalInBackground: false,
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("id,order_no,status,total_usd,created_at,payment_method,delivery_address,note,payments(id,payment_no,method,amount_usd,amount_khr,settled_at,bank_ref,credit_due_at,status,khqr_code,khqr_expiry,provider_payment_id,provider_status),order_items(product_id,qty,line_total_usd,products(name_km,unit_km))").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },
});

export interface PaymentDetail { id: string; payment_no: string | null; method: string; amount_usd: number; amount_khr: number; status: string; khqr_code: string | null; khqr_expiry: string | null; provider_payment_id: string | null; settled_at: string | null; orders: { id: string; order_no: string | null; status: string; total_usd: number; created_at: string; delivery_address: string; note: string | null; order_items: { qty: number; line_total_usd: number; products: { name_km: string; unit_km: string } | null }[] } | null }

export const paymentOptions = (userId: string, paymentId: string) => queryOptions({
  queryKey: ["store", userId, "payment", paymentId],
  staleTime: 4_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("payments").select("id,payment_no,method,amount_usd,amount_khr,status,khqr_code,khqr_expiry,provider_payment_id,settled_at,orders(id,order_no,status,total_usd,created_at,delivery_address,note,order_items(qty,line_total_usd,products(name_km,unit_km)))").eq("id", paymentId).single();
    if (error) throw error;
    return data as PaymentDetail;
  },
});

export const productOptions = (userId: string, id: string) => queryOptions({
  queryKey: ["store", userId, "product", id],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("id,name_km,name_en,unit,unit_km,stock_qty,category_id,photo_url,description,product_prices(qty_min,qty_max,price_usd),product_media(id,media_type,storage_path,sort_order)").eq("id", id).single();
    if (error) throw error;
    const blocks = parseBlocks(data.description);
    const relatedResult = data.category_id ? await supabase.from("products").select("id,name_km,name_en,unit,unit_km,stock_qty,category_id,photo_url,product_prices(qty_min,price_usd)").eq("active", true).eq("category_id", data.category_id).neq("id", id).limit(8) : { data: [] };
    const related = (relatedResult.data ?? []) as Product[];
    const media = [...data.product_media].sort((a, b) => a.sort_order - b.sort_order);
    const paths = [...(data.photo_url ? [data.photo_url] : []), ...media.map((item) => item.storage_path), ...blocks.flatMap(b => b.type === "image" ? [b.path] : []), ...related.flatMap((item) => item.photo_url ? [item.photo_url] : [])];
    return { product: data as Product, media, related, blocks, urls: await signPhotos(paths) };
  },
});