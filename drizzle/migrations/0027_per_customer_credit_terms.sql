ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credit_terms_days integer;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_credit_terms_days_check CHECK (credit_terms_days IS NULL OR credit_terms_days BETWEEN 1 AND 365);

CREATE OR REPLACE FUNCTION public.place_order(_payment_method payment_method, _delivery_address text, _note text, _items jsonb, _exchange_rate numeric, _promo_code text DEFAULT NULL::text)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _customer uuid := auth.uid(); _order_id uuid; _order_no text; _payment_id uuid; _total numeric := 0; _discount numeric := 0;
  _row jsonb; _product public.products%ROWTYPE; _qty integer; _unit_price numeric; _credit_limit numeric; _terms integer; _rate numeric;
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
    SELECT credit_limit_usd, credit_terms_days INTO _credit_limit, _terms FROM public.profiles WHERE id = _customer;
    IF _terms IS NULL THEN RAISE EXCEPTION 'Credit terms are not enabled for this account'; END IF;
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
    CASE WHEN _payment_method = 'net30' THEN now() + make_interval(days => _terms) ELSE NULL END
  ) RETURNING id INTO _payment_id;

  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'payment_id', _payment_id, 'total_usd', round(_total,2), 'discount_usd', _discount);
END $function$;

CREATE OR REPLACE FUNCTION public.staff_create_order(_customer uuid, _payment_method payment_method, _delivery_address text, _note text, _items jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _order_id uuid; _order_no text; _total numeric := 0; _row jsonb; _product public.products%ROWTYPE; _qty integer; _unit numeric; _rate numeric; _limit numeric; _terms integer;
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
    SELECT credit_limit_usd, credit_terms_days INTO _limit, _terms FROM public.profiles WHERE id = _customer;
    IF _terms IS NULL THEN RAISE EXCEPTION 'Credit terms are not enabled for this account'; END IF;
    IF _limit IS NULL OR public.customer_credit_used(_customer) + _total > _limit THEN RAISE EXCEPTION 'Credit limit exceeded'; END IF;
  END IF;
  INSERT INTO public.orders(customer_id, payment_method, total_usd, delivery_address, note)
  VALUES (_customer, _payment_method, round(_total,2), trim(_delivery_address), NULLIF(trim(_note),'')) RETURNING id, order_no INTO _order_id, _order_no;
  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT price_usd INTO _unit FROM public.product_prices WHERE product_id = _product.id AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max) ORDER BY qty_min DESC LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, qty, unit_price_usd, line_total_usd) VALUES (_order_id, (_row->>'product_id')::uuid, _qty, _unit, round(_unit*_qty,2));
  END LOOP;
  PERFORM public.reserve_order_stock(_order_id);
  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, credit_due_at)
  VALUES (_order_id, _customer, _payment_method, round(_total,2), round(_total*_rate), CASE WHEN _payment_method='net30' THEN now() + make_interval(days => _terms) END);
  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'total_usd', round(_total,2));
END $function$;