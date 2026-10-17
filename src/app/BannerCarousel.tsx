import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "./prefs";
import { rememberBanner } from "./catalog";
import { useQuery } from "@tanstack/react-query";
import { bannerOptions, type Banner } from "./store-queries";

export function BannerCarousel({ userId, onCategory }: { userId: string; onCategory: (id: string) => void }) {
  const { data } = useQuery(bannerOptions(userId));
  const banners = data?.banners ?? [];
  const urls = data?.urls ?? {};
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pick } = usePrefs();

  useEffect(() => {
    if (banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = track.current; if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % banners.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  async function open(b: Banner) {
    rememberBanner(b.id);
    void supabase.from("banner_clicks").insert({ banner_id: b.id, user_id: userId });
    if (b.link_type === "wholesale") await navigate({ to: "/store/wholesale" });
    else if (b.link_type === "product") await navigate({ to: "/store/product/$id", params: { id: b.link_id } });
    else { onCategory(b.link_id); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }
  }

  if (!banners.length) return <div className="aspect-[2/1] animate-pulse rounded-panel bg-muted sm:aspect-[3/1]" />;
  return <div className="relative">
    <div ref={track} onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex snap-x snap-mandatory overflow-x-auto rounded-panel border border-border [scrollbar-width:none]">
      {banners.map((b, i) => <Button key={b.id} variant="ghost" type="button" onClick={() => void open(b)} className="relative aspect-[2/1] h-auto w-full shrink-0 snap-start overflow-hidden rounded-none bg-secondary p-0 text-left sm:aspect-[3/1]">
        {urls[b.image_path ?? ""] && <img src={urls[b.image_path ?? ""]} alt="" width={960} height={480} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />}
        <span className="absolute inset-0 bg-gradient-to-r from-scrim/75 via-scrim/30 to-transparent" />
        <span className="relative flex h-full w-full max-w-[70%] flex-col justify-center p-5 text-white sm:p-8">
          <strong className="text-lg font-bold leading-snug sm:text-2xl">{pick(b.title_km, b.title_en)}</strong>
          {b.subtitle_km && <span className="mt-1 text-sm opacity-90">{pick(b.subtitle_km, b.subtitle_en)}</span>}
        </span>
      </Button>)}
    </div>
    <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">{banners.map((b, i) => <span key={b.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
  </div>;
}
