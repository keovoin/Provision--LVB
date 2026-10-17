import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const GUEST = "guest";

/** Current signed-in user id, or null for guests. */
export function useUserId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return id;
}

export const favoritesOptions = (userId: string) => queryOptions({
  queryKey: ["store", userId, "favorites"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("favorites").select("product_id");
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.product_id));
  },
});

export function goSignIn(navigate: ReturnType<typeof useNavigate>) {
  void navigate({ to: "/auth", search: { redirect: window.location.pathname } as never });
}

export function useFavorites() {
  const userId = useUserId();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ ...favoritesOptions(userId ?? GUEST), enabled: !!userId });
  const ids = data ?? new Set<string>();
  async function toggle(productId: string) {
    if (!userId) { toast("សូមចូលគណនីដើម្បីរក្សាទុក · Sign in to save favourites"); goSignIn(navigate); return; }
    const on = ids.has(productId);
    const key = favoritesOptions(userId).queryKey;
    qc.setQueryData(key, (old: Set<string> | undefined) => { const n = new Set(old); if (on) n.delete(productId); else n.add(productId); return n; });
    const { error } = on
      ? await supabase.from("favorites").delete().eq("user_id", userId).eq("product_id", productId)
      : await supabase.from("favorites").insert({ user_id: userId, product_id: productId });
    if (error) { toast.error(error.message); void qc.invalidateQueries({ queryKey: key }); }
  }
  return { ids, toggle, signedIn: !!userId };
}

export async function shareProduct(id: string, title: string) {
  const url = `${window.location.origin}/store/product/${id}`;
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast.success("បានចម្លងតំណ · Link copied");
  } catch { /* user cancelled */ }
}
