import type { ReactNode } from "react";
import { Badge, Button } from "@/design-system/provisionkh";

export const STATUS_KM: Record<string, string> = {
  pending: "រង់ចាំ", paid: "បានបង់", picking: "កំពុងរៀបចំ", out_for_delivery: "កំពុងដឹក",
  delivered: "បានដឹកដល់", cancelled: "បានបោះបង់", failed: "បរាជ័យ", expired: "ផុតកំណត់",
  approved: "បានអនុម័ត", rejected: "បានបដិសេធ",
};
export const METHOD_KM: Record<string, string> = { khqr: "KHQR", cod: "សាច់ប្រាក់ពេលដឹក", link: "តំណបង់ប្រាក់", net30: "ឥណទាន · Net" };

export function StatusBadge({ status }: { status: string }) {
  const v = ["paid", "delivered", "approved"].includes(status) ? "success"
    : ["cancelled", "failed", "expired", "rejected"].includes(status) ? "destructive"
    : status === "pending" ? "warning" : "neutral";
  return <Badge variant={v}>{STATUS_KM[status] ?? status}</Badge>;
}

export const usd = (n: number) => `$${Number(n).toFixed(2)}`;
export const day = (s: string) => new Date(s).toLocaleDateString("en-GB");

export function PageHead({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>{children}</div>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string, number?][] }) {
  return <div className="flex flex-wrap gap-1 border-b border-border pb-2">{items.map(([k, label, count]) =>
    <Button key={k} type="button" variant={value === k ? "secondary" : "ghost"} onClick={() => onChange(k)} className="min-h-10 px-3 text-sm font-medium">
      {label}{count !== undefined && <span className="ml-1.5 font-sans text-xs opacity-80">{count}</span>}
    </Button>)}</div>;
}

export function SkeletonRows({ n = 6 }: { n?: number }) {
  return <div className="divide-y divide-border">{Array.from({ length: n }, (_, i) => <div key={i} className="flex gap-4 p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted" /><div className="h-4 flex-1 animate-pulse rounded bg-muted" /><div className="h-4 w-16 animate-pulse rounded bg-muted" /></div>)}</div>;
}

export const inputCls = "h-9 rounded-control border border-border bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";

export { toast } from "sonner";

/** Resize to fit `max` px and re-encode as JPEG so uploaded pictures stay light on phone data. */
export async function compressImage(file: File, max = 960, quality = 0.72): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) { bmp.close(); throw new Error("Image processing unavailable"); }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("Image failed"))), "image/jpeg", quality));
}

/** Upload a compressed picture to the private photo store and return its saved path. */
export async function uploadPhoto(folder: string, file: File, max: number): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const path = `${folder}${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("product-photos").upload(path, await compressImage(file, max), { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

export const PRODUCT_VIDEO_MAX_BYTES = 8 * 1024 * 1024;

/** Keep storefront clips short and light; videos outside the mobile budget are rejected before upload. */
export async function validateProductVideo(file: File): Promise<void> {
  if (!file.type.startsWith("video/")) throw new Error("សូមជ្រើសវីដេអូ · Please choose a video");
  if (file.size > PRODUCT_VIDEO_MAX_BYTES) throw new Error("វីដេអូត្រូវតែតូចជាង 8MB · Video must be under 8MB");
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("មិនអាចអានវីដេអូនេះបាន · Unable to read this video"));
    });
    if (video.duration > 30.5) throw new Error("វីដេអូត្រូវតែ 30 វិនាទី ឬខ្លីជាងនេះ · Video must be 30 seconds or shorter");
    if (video.videoWidth > 1280 || video.videoHeight > 1280) throw new Error("សូមបង្ហាប់វីដេអូជា 720p · Please compress the video to 720p");
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadProductVideo(folder: string, file: File): Promise<string> {
  await validateProductVideo(file);
  const { supabase } = await import("@/integrations/supabase/client");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `${folder}${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}
