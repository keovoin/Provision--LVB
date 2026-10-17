ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.reserve_order_stock(_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _item record;
BEGIN
  IF (SELECT stock_reserved FROM public.orders WHERE id = _order_id FOR UPDATE) THEN RETURN; END IF;
  FOR _item IN SELECT oi.product_id, oi.qty, p.name_en FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = _order_id LOOP
    UPDATE public.products SET stock_qty = stock_qty - _item.qty, updated_at = now() WHERE id = _item.product_id AND stock_qty >= _item.qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %', _item.name_en; END IF;
  END LOOP;
  UPDATE public.orders SET stock_reserved = true WHERE id = _order_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.release_stock_on_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _item record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND OLD.stock_reserved THEN
    FOR _item IN SELECT product_id, qty FROM public.order_items WHERE order_id = NEW.id LOOP
      UPDATE public.products SET stock_qty = stock_qty + _item.qty, updated_at = now() WHERE id = _item.product_id;
    END LOOP;
    NEW.stock_reserved := false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS release_stock_on_cancel ON public.orders;
CREATE TRIGGER release_stock_on_cancel BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.release_stock_on_cancel();

CREATE OR REPLACE FUNCTION public.place_order(_payment_method payment_method, _delivery_address text, _note text, _items jsonb, _exchange_rate numeric, _promo_code text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _customer uuid := auth.uid(); _order_id uuid; _order_no text; _payment_id uuid; _total numeric := 0; _discount numeric := 0;
  _row jsonb; _product public.products%ROWTYPE; _qty integer; _unit_price numeric; _credit_limit numeric; _rate numeric;
begin
  IF _customer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(_customer, 'customer') THEN RAISE EXCEPTION 'Customer account required'; END IF;
  IF COALESCE(trim(_delivery_address), '') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  SELECT COALESCE(exchange_rate, 4100) INTO _rate FROM public.app_settings WHERE id LIMIT 1;
  _rate := COALESCE(_rate, 4100);

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT * INTO _product FROM public.products WHERE id = (_row->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF _qty <= 0 OR _product.stock_qty < _qty THEN RAISE EXCEPTION 'Insufficient stock for %', _product.name_en; END IF;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = _product.id AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max) ORDER BY qty_min DESC LIMIT 1;
    IF _unit_price IS NULL THEN RAISE EXCEPTION 'Price unavailable for %', _product.name_en; END IF;
    _total := _total + (_unit_price * _qty);
  END LOOP;

  IF _payment_method = 'net30' THEN
    SELECT credit_limit_usd INTO _credit_limit FROM public.profiles WHERE id = _customer;
    IF _credit_limit IS NULL OR public.customer_credit_used(_customer) + _total > _credit_limit THEN RAISE EXCEPTION 'Credit limit exceeded'; END IF;
  END IF;

  INSERT INTO public.orders(customer_id, payment_method, total_usd, delivery_address, note, promo_code)
  VALUES (_customer, _payment_method, round(_total,2), trim(_delivery_address), NULLIF(trim(_note), ''), NULLIF(upper(trim(_promo_code)), ''))
  RETURNING id, order_no, total_usd, discount_usd INTO _order_id, _order_no, _total, _discount;

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = (_row->>'product_id')::uuid AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max) ORDER BY qty_min DESC LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, qty, unit_price_usd, line_total_usd)
    VALUES (_order_id, (_row->>'product_id')::uuid, _qty, _unit_price, round(_unit_price * _qty, 2));
  END LOOP;
  PERFORM public.reserve_order_stock(_order_id);

  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, khqr_code, khqr_expiry, credit_due_at)
  VALUES (_order_id, _customer, _payment_method, round(_total,2), round(_total * _rate),
    CASE WHEN _payment_method = 'khqr' THEN 'KHQR|PROVISIONKH|' || _order_no || '|' || round(_total,2) ELSE NULL END,
    CASE WHEN _payment_method = 'khqr' THEN now() + interval '15 minutes' ELSE NULL END,
    CASE WHEN _payment_method = 'net30' THEN now() + interval '30 days' ELSE NULL END
  ) RETURNING id INTO _payment_id;

  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'payment_id', _payment_id, 'total_usd', round(_total,2), 'discount_usd', _discount);
END $function$;

CREATE OR REPLACE FUNCTION public.staff_create_order(_customer uuid, _payment_method payment_method, _delivery_address text, _note text, _items jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _order_id uuid; _order_no text; _total numeric := 0; _row jsonb; _product public.products%ROWTYPE; _qty integer; _unit numeric; _rate numeric; _limit numeric;
BEGIN
  IF NOT public.can_access(auth.uid(), 'orders') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _customer) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF COALESCE(trim(_delivery_address),'') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'No items'; END IF;
  SELECT COALESCE(exchange_rate,4100) INTO _rate FROM public.app_settings WHERE id LIMIT 1;
  _rate := COALESCE(_rate, 4100);
  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT * INTO _product FROM public.products WHERE id = (_row->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF _qty <= 0 OR _product.stock_qty < _qty THEN RAISE EXCEPTION 'Insufficient stock for %', _product.name_en; END IF;
    SELECT price_usd INTO _unit FROM public.product_prices WHERE product_id = _product.id AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max) ORDER BY qty_min DESC LIMIT 1;
    IF _unit IS NULL THEN RAISE EXCEPTION 'Price unavailable for %', _product.name_en; END IF;
    _total := _total + _unit * _qty;
  END LOOP;
  IF _payment_method = 'net30' THEN
    SELECT credit_limit_usd INTO _limit FROM public.profiles WHERE id = _customer;
    IF _limit IS NULL OR public.customer_credit_used(_customer) + _total > _limit THEN RAISE EXCEPTION 'Credit limit exceeded'; END IF;
  END IF;
  INSERT INTO public.orders(customer_id, payment_method, total_usd, delivery_address, note)
  VALUES (_customer, _payment_method, round(_total,2), trim(_delivery_address), NULLIF(trim(_note),'')) RETURNING id, order_no INTO _order_id, _order_no;
  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT price_usd INTO _unit FROM public.product_prices WHERE product_id = (_row->>'product_id')::uuid AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max) ORDER BY qty_min DESC LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, qty, unit_price_usd, line_total_usd) VALUES (_order_id, (_row->>'product_id')::uuid, _qty, _unit, round(_unit*_qty,2));
  END LOOP;
  PERFORM public.reserve_order_stock(_order_id);
  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, credit_due_at)
  VALUES (_order_id, _customer, _payment_method, round(_total,2), round(_total*_rate), CASE WHEN _payment_method='net30' THEN now()+interval '30 days' END);
  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'total_usd', round(_total,2));
END $function$;

CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid, _bank_ref text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE _p public.payments%ROWTYPE; BEGIN
  IF NOT (public.can_access(auth.uid(), 'orders') OR public.can_access(auth.uid(), 'receivables')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _p.status = 'paid' THEN RETURN; END IF;
  IF (SELECT status FROM public.orders WHERE id = _p.order_id) = 'cancelled' THEN RAISE EXCEPTION 'Order was cancelled'; END IF;
  PERFORM public.reserve_order_stock(_p.order_id);
  UPDATE public.payments SET status = 'paid', settled_at = now(), bank_ref = COALESCE(NULLIF(trim(_bank_ref), ''), 'MANUAL-' || _p.payment_no), updated_at = now() WHERE id = _p.id;
  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = _p.order_id AND status = 'pending';
END $function$;

CREATE OR REPLACE FUNCTION public.apply_external_payment_status(_provider_payment_id text, _provider_status text, _bank_ref text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _payment public.payments%ROWTYPE;
BEGIN
  IF _provider_status NOT IN ('pending', 'scanned', 'paid', 'expired', 'failed') THEN RAISE EXCEPTION 'Invalid provider status'; END IF;
  SELECT * INTO _payment FROM public.payments WHERE provider_payment_id = _provider_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _payment.status = 'paid' THEN RETURN; END IF;
  IF _provider_status = 'paid' THEN
    -- Money arrived: revive a cancelled order rather than lose the payment.
    UPDATE public.orders SET status = 'pending', updated_at = now() WHERE id = _payment.order_id AND status = 'cancelled';
    PERFORM public.reserve_order_stock(_payment.order_id);
    UPDATE public.payments SET status = 'paid', provider_status = 'paid', settled_at = now(),
        bank_ref = COALESCE(NULLIF(trim(_bank_ref), ''), _provider_payment_id), updated_at = now() WHERE id = _payment.id;
    UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = _payment.order_id;
  ELSIF _provider_status IN ('expired', 'failed') THEN
    UPDATE public.payments SET status = _provider_status::public.payment_status, provider_status = _provider_status, updated_at = now() WHERE id = _payment.id;
  ELSE
    UPDATE public.payments SET provider_status = _provider_status, updated_at = now() WHERE id = _payment.id;
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n integer;
BEGIN
  WITH stale AS (
    UPDATE public.orders o SET status = 'cancelled', updated_at = now()
    WHERE o.status = 'pending' AND o.payment_method IN ('khqr','link') AND o.created_at < now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id = o.id AND p.status = 'paid')
    RETURNING o.id)
  SELECT count(*) INTO _n FROM stale;
  UPDATE public.payments p SET status = 'expired', updated_at = now()
  FROM public.orders o WHERE o.id = p.order_id AND o.status = 'cancelled' AND p.status = 'pending' AND p.method IN ('khqr','link');
  RETURN _n;
END $$;
REVOKE EXECUTE ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-unpaid-orders', '15 * * * *', 'SELECT public.expire_unpaid_orders()');