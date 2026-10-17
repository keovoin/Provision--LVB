import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Guests may browse the catalog; ordering, account and admin pages still need a sign-in.
const GUEST_PATHS = [/^\/store\/?$/, /^\/store\/categories/, /^\/store\/product\//, /^\/store\/info\//, /^\/store\/wholesale/, /^\/store\/cart/];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (GUEST_PATHS.some((r) => r.test(location.pathname))) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: Outlet,
});
