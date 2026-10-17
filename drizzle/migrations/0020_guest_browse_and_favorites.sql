GRANT SELECT ON public.products, public.product_prices, public.categories, public.banners, public.product_media, public.product_reviews, public.review_media TO anon;
CREATE POLICY "Guests read active banners" ON public.banners FOR SELECT TO anon USING (active);
CREATE POLICY "Guests read product media" ON public.product_media FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id AND p.active));
CREATE POLICY "Guests read reviews" ON public.product_reviews FOR SELECT TO anon USING (true);
CREATE POLICY "Guests read review media" ON public.review_media FOR SELECT TO anon USING (true);
CREATE POLICY "Guests read product photos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'product-photos');

CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favorites read" ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own favorites add" ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own favorites remove" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());