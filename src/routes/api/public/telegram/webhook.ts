import { createFileRoute } from "@tanstack/react-router";
import { APP_URL, menuKeyboard, tg, webhookSecret } from "@/lib/telegram.server";

const WELCOME =
  "សូមស្វាគមន៍មកកាន់ ProvisionKH 🧡\nបញ្ជាទិញទំនិញលក់ដុំបានយ៉ាងងាយ ផ្ទាល់ក្នុង Telegram។\n\nWelcome! Choose an option below.";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = await webhookSecret();
        if ((request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "") !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const update = await request.json().catch(() => null);
        const msg = update?.message;
        const chatId = msg?.chat?.id;
        if (!chatId || typeof msg.text !== "string") return Response.json({ ok: true });
        const cmd = msg.text.trim().split(/[\s@]/)[0].toLowerCase();
        try {
          if (cmd === "/orders") {
            await tg("sendMessage", { chat_id: chatId, text: "📦 មើលការបញ្ជាទិញរបស់អ្នក · View your orders", reply_markup: { inline_keyboard: [[{ text: "បើក · Open", web_app: { url: `${APP_URL}/store/orders` } }]] } });
          } else if (cmd === "/admin") {
            await tg("sendMessage", { chat_id: chatId, text: "🛠 ផ្ទាំងគ្រប់គ្រង (សម្រាប់បុគ្គលិក) · Admin portal (staff only)", reply_markup: { inline_keyboard: [[{ text: "បើក · Open", web_app: { url: `${APP_URL}/admin` } }]] } });
          } else if (cmd === "/shop") {
            await tg("sendMessage", { chat_id: chatId, text: "🛒 ចាប់ផ្តើមទិញទំនិញ · Start shopping", reply_markup: { inline_keyboard: [[{ text: "បើកហាង · Open shop", web_app: { url: `${APP_URL}/store` } }]] } });
          } else {
            await tg("sendMessage", { chat_id: chatId, text: WELCOME, reply_markup: menuKeyboard });
          }
        } catch (e) {
          console.error(e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
