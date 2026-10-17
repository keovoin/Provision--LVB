ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'package';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram text, ADD COLUMN IF NOT EXISTS business_address text, ADD COLUMN IF NOT EXISTS business_lat double precision, ADD COLUMN IF NOT EXISTS business_lng double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS banner_id uuid, ADD COLUMN IF NOT EXISTS delivery_lat double precision, ADD COLUMN IF NOT EXISTS delivery_lng double precision;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS checkout_url text;

-- Customers must not raise their own credit limit
CREATE OR REPLACE FUNCTION public.guard_profile_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.credit_limit_usd IS DISTINCT FROM OLD.credit_limit_usd
     AND auth.uid() IS NOT NULL AND NOT public.can_access(auth.uid(), 'customers') THEN
    RAISE EXCEPTION 'Credit limit can only be changed by staff';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_credit_before_update ON public.profiles;
CREATE TRIGGER guard_profile_credit_before_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_credit();

CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_km text NOT NULL,
  title_en text NOT NULL,
  subtitle_km text,
  subtitle_en text,
  image_path text,
  link_type text NOT NULL DEFAULT 'category' CHECK (link_type IN ('product','category')),
  link_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read active banners" ON public.banners FOR SELECT TO authenticated USING (active OR public.can_access(auth.uid(), 'products'));
CREATE POLICY "Product staff manage banners" ON public.banners FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'products')) WITH CHECK (public.can_access(auth.uid(), 'products'));

CREATE TABLE public.banner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.banners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX banner_clicks_banner_idx ON public.banner_clicks(banner_id, user_id);
GRANT SELECT, INSERT ON public.banner_clicks TO authenticated;
GRANT ALL ON public.banner_clicks TO service_role;
ALTER TABLE public.banner_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own clicks" ON public.banner_clicks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff read clicks" ON public.banner_clicks FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_access(auth.uid(), 'products'));

CREATE OR REPLACE FUNCTION public.attribute_order_banner(_order_id uuid, _banner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.banner_clicks WHERE banner_id = _banner_id AND user_id = auth.uid() AND created_at > now() - interval '7 days') THEN RETURN; END IF;
  UPDATE public.orders SET banner_id = _banner_id WHERE id = _order_id AND customer_id = auth.uid() AND banner_id IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.set_order_location(_order_id uuid, _lat double precision, _lng double precision)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.orders SET delivery_lat = _lat, delivery_lng = _lng WHERE id = _order_id AND customer_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.banner_stats()
RETURNS TABLE(banner_id uuid, title text, clicks bigint, unique_users bigint, orders bigint, completed bigint, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_access(auth.uid(), 'products') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT b.id, b.title_km,
    (SELECT count(*) FROM public.banner_clicks c WHERE c.banner_id = b.id),
    (SELECT count(DISTINCT c.user_id) FROM public.banner_clicks c WHERE c.banner_id = b.id),
    (SELECT count(*) FROM public.orders o WHERE o.banner_id = b.id),
    (SELECT count(*) FROM public.orders o WHERE o.banner_id = b.id AND o.status IN ('paid','picking','out_for_delivery','delivered')),
    (SELECT COALESCE(sum(o.total_usd),0) FROM public.orders o WHERE o.banner_id = b.id AND o.status IN ('paid','picking','out_for_delivery','delivered'))
  FROM public.banners b ORDER BY b.sort_order;
END $$;

CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid(),
  label text NOT NULL DEFAULT '',
  address text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own addresses" ON public.customer_addresses FOR ALL TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE TABLE public.credit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid(),
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.credit_requests TO authenticated;
GRANT ALL ON public.credit_requests TO service_role;
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers create own credit requests" ON public.credit_requests FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND status = 'pending');
CREATE POLICY "Read own or staff credit requests" ON public.credit_requests FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.can_access(auth.uid(), 'customers'));
CREATE POLICY "Staff update credit requests" ON public.credit_requests FOR UPDATE TO authenticated USING (public.can_access(auth.uid(), 'customers')) WITH CHECK (public.can_access(auth.uid(), 'customers'));

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid(),
  reviewer_name text NOT NULL DEFAULT '',
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read reviews" ON public.product_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write own review" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Update own review" ON public.product_reviews FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Delete own review" ON public.product_reviews FOR DELETE TO authenticated USING (customer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bind_external_payment(_payment_id uuid, _provider_payment_id text, _qr_code text, _expires_at timestamp with time zone)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF COALESCE(trim(_provider_payment_id), '') = '' OR COALESCE(trim(_qr_code), '') = '' THEN
    RAISE EXCEPTION 'Invalid payment response';
  END IF;
  UPDATE public.payments
  SET provider_payment_id = trim(_provider_payment_id), provider_status = 'pending',
      khqr_code = _qr_code, khqr_expiry = _expires_at, updated_at = now()
  WHERE id = _payment_id AND customer_id = auth.uid()
    AND method::text IN ('khqr','link') AND status = 'pending'
    AND (provider_payment_id IS NULL OR provider_payment_id = trim(_provider_payment_id));
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not available'; END IF;
END
$function$;

UPDATE public.categories SET icon = CASE slug
  WHEN 'rice-flour' THEN 'wheat' WHEN 'oils-sauces' THEN 'droplet' WHEN 'dairy-powder' THEN 'milk'
  WHEN 'beverages' THEN 'cup-soda' WHEN 'cleaning-household' THEN 'spray-can' WHEN 'meat-frozen' THEN 'snowflake' ELSE 'package' END;