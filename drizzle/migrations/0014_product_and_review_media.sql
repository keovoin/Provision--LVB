CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, storage_path),
  CONSTRAINT product_media_type_valid CHECK (media_type IN ('image', 'video'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read product media" ON public.product_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Product staff manage product media" ON public.product_media FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'products')) WITH CHECK (public.can_access(auth.uid(), 'products'));
CREATE INDEX product_media_product_order_idx ON public.product_media(product_id, sort_order, created_at);

CREATE TABLE public.review_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, storage_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_media TO authenticated;
GRANT ALL ON public.review_media TO service_role;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read review media" ON public.review_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers insert own review media" ON public.review_media FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.product_reviews r WHERE r.id = review_id AND r.customer_id = auth.uid()));
CREATE POLICY "Customers update own review media" ON public.review_media FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers delete own review media" ON public.review_media FOR DELETE TO authenticated USING (customer_id = auth.uid());
CREATE INDEX review_media_review_order_idx ON public.review_media(review_id, sort_order, created_at);

CREATE POLICY "Customers upload own review photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = 'reviews' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Customers update own review photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = 'reviews' AND (storage.foldername(name))[2] = auth.uid()::text) WITH CHECK (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = 'reviews' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Customers delete own review photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = 'reviews' AND (storage.foldername(name))[2] = auth.uid()::text);