ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS shipping_info_km text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.get_wholesale_info() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT jsonb_build_object('min_order_usd', COALESCE(min_order_usd,0), 'shipping_info_km', COALESCE(shipping_info_km,'')) FROM public.app_settings WHERE id LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.get_wholesale_info() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_shipping_info(_text text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  IF NOT public.can_access(auth.uid(), 'products') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.app_settings SET shipping_info_km = COALESCE(trim(_text),''), updated_at = now() WHERE id;
END $$;
GRANT EXECUTE ON FUNCTION public.set_shipping_info(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_create_order(_customer uuid, _payment_method payment_method, _delivery_address text, _note text, _items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _order_id uuid; _order_no text; _total numeric := 0; _row jsonb; _product public.products%ROWTYPE; _qty integer; _unit numeric; _rate numeric; _limit numeric;
BEGIN
  IF NOT public.can_access(auth.uid(), 'orders') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _customer) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF COALESCE(trim(_delivery_address),'') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'No items'; END IF;
  SELECT COALESCE(exchange_rate,4100) INTO _rate FROM public.app_settings WHERE id LIMIT 1;
  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT * INTO _product FROM public.products WHERE id = (_row->>'product_id')::uuid AND active;
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
  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, credit_due_at)
  VALUES (_order_id, _customer, _payment_method, round(_total,2), round(_total*_rate), CASE WHEN _payment_method='net30' THEN now()+interval '30 days' END);
  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'total_usd', round(_total,2));
END $$;
GRANT EXECUTE ON FUNCTION public.staff_create_order(uuid, payment_method, text, text, jsonb) TO authenticated;