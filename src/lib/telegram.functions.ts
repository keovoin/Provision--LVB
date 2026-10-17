import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const METHOD: Record<string, string> = {
  cod: "💵 ទូទាត់ពេលទទួល · Cash on delivery",
  khqr: "📱 KHQR",
  link: "🔗 តំណទូទាត់ · Payment link",
  net30: "🧾 ឥណទាន · Net credit",
};
const NEXT: Record<string, string> = {
  cod: "សូមរៀបចំសាច់ប្រាក់ពេលទទួលទំនិញ។ យើងនឹងជូនដំណឹងពេលដឹកចេញ។\nPlease have cash ready on delivery. We'll notify you when it ships.",
  khqr: "សូមស្កេន KHQR ដើម្បីទូទាត់។ ការបញ្ជាទិញនឹងរៀបចំភ្លាមក្រោយទូទាត់។\nScan the KHQR to pay. We start packing as soon as payment arrives.",
  link: "សូមបើកតំណទូទាត់ដើម្បីបញ្ចប់ការទូទាត់។\nOpen the payment link to complete payment.",
  net30: "ការបញ្ជាទិញនឹងគិតលើឥណទានរបស់អ្នក ត្រូវទូទាត់តាមរយៈពេលដែលបានកំណត់។\nCharged to your credit line, due per your agreed terms.",
};

export const notifyTelegramOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid(), initData: z.string().min(1).max(4096) }).parse(d))
  .handler(async ({ data, context }) => {
    const { verifyInitData, tg, APP_URL } = await import("./telegram.server");
    const chatId = await verifyInitData(data.initData);
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, order_no, total_usd, discount_usd, payment_method, delivery_address, customer_id, order_items(qty, line_total_usd, products(name_km, name_en))")
      .eq("id", data.orderId)
      .eq("customer_id", context.userId)
      .single();
    if (error || !order) throw new Error("Order not found");
    const { data: payment } = await context.supabase.from("payments").select("id, amount_khr").eq("order_id", order.id).maybeSingle();
    const items = (order.order_items ?? []).map((i: { qty: number; line_total_usd: number; products: { name_km: string } | null }) =>
      `• ${i.products?.name_km ?? "-"} × ${i.qty} — $${Number(i.line_total_usd).toFixed(2)}`).join("\n");
    const total = Number(order.total_usd);
    const lines = [
      `✅ បានទទួលការបញ្ជាទិញ ${order.order_no ?? ""}`,
      "Order received!",
      "",
      items,
      "",
      Number(order.discount_usd) > 0 ? `បញ្ចុះតម្លៃ · Discount: −$${Number(order.discount_usd).toFixed(2)}` : "",
      `សរុប · Total: $${total.toFixed(2)} (≈ ៛${Math.round(Number(payment?.amount_khr ?? total * 4100)).toLocaleString("en-US")})`,
      `ការទូទាត់ · Payment: ${METHOD[order.payment_method] ?? order.payment_method}`,
      `ដឹកជញ្ជូនទៅ · Deliver to: ${order.delivery_address}`,
      "",
      "👉 ជំហានបន្ទាប់ · Next steps:",
      NEXT[order.payment_method] ?? "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
    const buttons = [[{ text: "📦 មើលការបញ្ជាទិញ · View order", web_app: { url: `${APP_URL}/store/order/${order.id}` } }]];
    if (payment && (order.payment_method === "khqr" || order.payment_method === "link")) {
      buttons.unshift([{ text: "📱 ទូទាត់ឥឡូវ · Pay now", web_app: { url: `${APP_URL}/store/payment/${payment.id}` } }]);
    }
    await tg("sendMessage", { chat_id: chatId, text: lines.join("\n"), reply_markup: { inline_keyboard: buttons } });
    return { ok: true };
  });
