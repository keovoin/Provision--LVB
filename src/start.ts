import { createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Extra browser protections. The storefront must be embeddable in customer/corporate
// websites, so framing is unrestricted there; the admin portal stays framed only by
// the app itself, Telegram (Mini App) and the editor preview.
const securityHeaders = createMiddleware().server(async ({ request, next }) => {
  const path = new URL(request.url).pathname;
  const frameAncestors = path.startsWith("/admin")
    ? "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://*.lovable.app https://lovable.dev https://*.lovable.dev;"
    : "";
  setResponseHeaders(
    new Headers({
      "Content-Security-Policy": `${frameAncestors} object-src 'none'; base-uri 'self'`,
      "Permissions-Policy": "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    }),
  );
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
  functionMiddleware: [attachSupabaseAuth],
}));
