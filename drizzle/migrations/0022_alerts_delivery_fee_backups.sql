CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS delivery_fee_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS free_delivery_min_usd numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_usd numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_delivery_fee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _fee numeric; _free numeric;
BEGIN
  IF NEW.customer_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  SELECT delivery_fee_usd, free_delivery_min_usd INTO _fee, _free FROM public.app_settings WHERE id LIMIT 1;
  _fee := COALESCE(_fee, 0);
  IF _fee <= 0 OR (_free IS NOT NULL AND NEW.total_usd >= _free) THEN NEW.delivery_fee_usd := 0; RETURN NEW; END IF;
  NEW.delivery_fee_usd := round(_fee, 2);
  NEW.total_usd := round(NEW.total_usd + _fee, 2);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_delivery_fee() FROM anon, authenticated, public;
CREATE TRIGGER zz_apply_delivery_fee BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_delivery_fee();

CREATE OR REPLACE FUNCTION public.get_storefront_info() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('company_profile', company_profile, 'delivery_information', delivery_information,
    'returns_refunds_policy', returns_refunds_policy, 'privacy_policy', privacy_policy, 'terms_conditions', terms_conditions,
    'facebook_url', facebook_url, 'telegram_url', telegram_url, 'exchange_rate', exchange_rate,
    'delivery_fee_usd', delivery_fee_usd, 'free_delivery_min_usd', free_delivery_min_usd, 'min_order_usd', min_order_usd)
  FROM public.app_settings WHERE id LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_storefront_info() TO anon, authenticated;

CREATE TABLE public.alert_settings (
  id boolean PRIMARY KEY DEFAULT true,
  telegram_bot_token text,
  telegram_chat_id text,
  enabled boolean NOT NULL DEFAULT false,
  notify_new_order boolean NOT NULL DEFAULT true,
  notify_paid boolean NOT NULL DEFAULT true,
  notify_low_stock boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.alert_settings TO authenticated;
GRANT ALL ON public.alert_settings TO service_role;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads alerts" ON public.alert_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner inserts alerts" ON public.alert_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner') AND id);
CREATE POLICY "Owner updates alerts" ON public.alert_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (id);
INSERT INTO public.alert_settings(id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.send_alert(_text text, _kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE s public.alert_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.alert_settings WHERE id;
  IF NOT FOUND OR NOT s.enabled OR COALESCE(s.telegram_bot_token,'') = '' OR COALESCE(s.telegram_chat_id,'') = '' THEN RETURN; END IF;
  IF (_kind = 'order' AND NOT s.notify_new_order) OR (_kind = 'paid' AND NOT s.notify_paid) OR (_kind = 'stock' AND NOT s.notify_low_stock) THEN RETURN; END IF;
  PERFORM net.http_post(url := 'https://api.telegram.org/bot' || s.telegram_bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', s.telegram_chat_id, 'text', _text),
    headers := '{"Content-Type":"application/json"}'::jsonb);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'alert failed: %', SQLERRM;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_alert(text, text) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.test_alert() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  PERFORM public.send_alert('✅ ProvisionKH: ការជូនដំណឹងដំណើរការ · Alerts are working', 'test');
END $$;
REVOKE EXECUTE ON FUNCTION public.test_alert() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.test_alert() TO authenticated;

CREATE OR REPLACE FUNCTION public.order_alerts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _who text;
BEGIN
  SELECT COALESCE(NULLIF(business_name,''), name) INTO _who FROM public.profiles WHERE id = NEW.customer_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.send_alert('🛒 ការបញ្ជាទិញថ្មី · New order ' || COALESCE(NEW.order_no,'') || E'\n' || COALESCE(_who,'-') || E'\n$' || to_char(NEW.total_usd,'FM999990.00') || ' · ' || NEW.payment_method::text || E'\n' || NEW.delivery_address, 'order');
  ELSIF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM public.send_alert('💰 បានទូទាត់ · Paid ' || COALESCE(NEW.order_no,'') || E'\n' || COALESCE(_who,'-') || E'\n$' || to_char(NEW.total_usd,'FM999990.00'), 'paid');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.order_alerts() FROM anon, authenticated, public;
CREATE TRIGGER order_alerts_t AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_alerts();

CREATE OR REPLACE FUNCTION public.stock_alerts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active AND NEW.stock_qty <= NEW.reorder_threshold AND OLD.stock_qty > OLD.reorder_threshold THEN
    PERFORM public.send_alert('⚠️ ស្តុកទាប · Low stock: ' || NEW.name_km || ' (' || NEW.sku || E')\nនៅសល់ · Left: ' || NEW.stock_qty || ' ' || NEW.unit_km, 'stock');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.stock_alerts() FROM anon, authenticated, public;
CREATE TRIGGER stock_alerts_t AFTER UPDATE OF stock_qty ON public.products FOR EACH ROW EXECUTE FUNCTION public.stock_alerts();

CREATE TABLE public.db_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  size_bytes integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL
);
GRANT SELECT ON public.db_backups TO authenticated;
GRANT ALL ON public.db_backups TO service_role;
ALTER TABLE public.db_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads backups" ON public.db_backups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.create_db_backup() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d jsonb := '{}'::jsonb; _part jsonb; _id uuid; t text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  FOREACH t IN ARRAY ARRAY['app_settings','categories','products','product_prices','product_media','profiles','customer_addresses','orders','order_items','order_status_events','payments','promo_codes','banners','drops','drop_items','credit_requests','product_reviews','review_media','user_roles','staff_permissions','favorites'] LOOP
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM public.%I x', t) INTO _part;
    _d := _d || jsonb_build_object(t, _part);
  END LOOP;
  INSERT INTO public.db_backups(data, size_bytes) VALUES (_d, octet_length(_d::text)) RETURNING id INTO _id;
  DELETE FROM public.db_backups WHERE id IN (SELECT id FROM public.db_backups ORDER BY created_at DESC OFFSET 14);
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_db_backup() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_db_backup() TO authenticated;

SELECT cron.schedule('daily-db-backup', '0 20 * * *', 'SELECT public.create_db_backup()');
