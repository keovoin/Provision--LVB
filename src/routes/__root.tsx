import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_FONTS_URL } from "@/design-system/provisionkh";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ProvisionKH | ហាងលក់ដុំ" },
      { name: "description", content: "Order wholesale essentials from ProvisionKH." },
      { name: "author", content: "ProvisionKH" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png?v=provision-logo-2", type: "image/png", sizes: "64x64" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: GOOGLE_FONTS_URL },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="km">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes (/__mockup,
// /__component) render inside it, so any chrome leaks into every frame.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Telegram Mini App support, loaded after hydration so the page's first
    // render stays identical on the server and in the browser.
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; ready: () => void; expand: () => void; setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void } } }).Telegram?.WebApp;
      if (!tg?.initData) return;
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#ffffff");
      document.documentElement.classList.add("telegram-mini-app");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event === "SIGNED_OUT") queryClient.clear();
      else void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
