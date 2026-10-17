ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS min_order_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.banners DROP CONSTRAINT banners_link_type_check;
ALTER TABLE public.banners ADD CONSTRAINT banners_link_type_check CHECK (link_type = ANY (ARRAY['product','category','wholesale']));

CREATE OR REPLACE FUNCTION public.get_min_order() RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE((SELECT min_order_usd FROM public.app_settings WHERE id LIMIT 1), 0) $$;
GRANT EXECUTE ON FUNCTION public.get_min_order() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_min_order(_amount numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  IF NOT public.can_access(auth.uid(), 'products') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  UPDATE public.app_settings SET min_order_usd = round(_amount, 2), updated_at = now() WHERE id;
END $$;
GRANT EXECUTE ON FUNCTION public.set_min_order(numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_min_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE _min numeric := public.get_min_order(); BEGIN
  IF NEW.total_usd < _min THEN RAISE EXCEPTION 'Minimum order is $%', _min; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_min_order_before_insert ON public.orders;
CREATE TRIGGER check_min_order_before_insert BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.check_min_order();

CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid, _bank_ref text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ DECLARE _p public.payments%ROWTYPE; _item record; BEGIN
  IF NOT (public.can_access(auth.uid(), 'orders') OR public.can_access(auth.uid(), 'receivables')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _p.status = 'paid' THEN RETURN; END IF;
  FOR _item IN SELECT product_id, qty FROM public.order_items WHERE order_id = _p.order_id LOOP
    UPDATE public.products SET stock_qty = stock_qty - _item.qty, updated_at = now() WHERE id = _item.product_id AND stock_qty >= _item.qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough stock'; END IF;
  END LOOP;
  UPDATE public.payments SET status = 'paid', settled_at = now(), bank_ref = COALESCE(NULLIF(trim(_bank_ref), ''), 'MANUAL-' || _p.payment_no), updated_at = now() WHERE id = _p.id;
  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = _p.order_id AND status = 'pending';
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text) TO authenticated;