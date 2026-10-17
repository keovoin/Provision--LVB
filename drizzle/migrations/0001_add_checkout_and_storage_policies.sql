CREATE POLICY "Product photos readable by everyone" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-photos');
CREATE POLICY "Product staff upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-photos' AND public.can_access(auth.uid(), 'products'));
CREATE POLICY "Product staff update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-photos' AND public.can_access(auth.uid(), 'products')) WITH CHECK (bucket_id = 'product-photos' AND public.can_access(auth.uid(), 'products'));
CREATE POLICY "Product staff delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-photos' AND public.can_access(auth.uid(), 'products'));

CREATE OR REPLACE FUNCTION public.customer_credit_used(_customer_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount_usd), 0) FROM public.payments
  WHERE customer_id = _customer_id AND method = 'net30' AND settled_at IS NULL AND status = 'pending'
$$;
GRANT EXECUTE ON FUNCTION public.customer_credit_used(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.place_order(
  _payment_method public.payment_method,
  _delivery_address text,
  _note text,
  _items jsonb,
  _exchange_rate numeric DEFAULT 4100
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _customer uuid := auth.uid();
  _order_id uuid;
  _order_no text;
  _payment_id uuid;
  _total numeric := 0;
  _row jsonb;
  _product public.products%ROWTYPE;
  _qty integer;
  _unit_price numeric;
  _credit_limit numeric;
BEGIN
  IF _customer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(_customer, 'customer') THEN RAISE EXCEPTION 'Customer account required'; END IF;
  IF COALESCE(trim(_delivery_address), '') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT * INTO _product FROM public.products WHERE id = (_row->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF _qty <= 0 OR _product.stock_qty < _qty THEN RAISE EXCEPTION 'Insufficient stock for %', _product.name_en; END IF;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = _product.id AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max)
      ORDER BY qty_min DESC LIMIT 1;
    IF _unit_price IS NULL THEN RAISE EXCEPTION 'Price unavailable for %', _product.name_en; END IF;
    _total := _total + (_unit_price * _qty);
  END LOOP;

  IF _payment_method = 'net30' THEN
    SELECT credit_limit_usd INTO _credit_limit FROM public.profiles WHERE id = _customer;
    IF _credit_limit IS NULL OR public.customer_credit_used(_customer) + _total > _credit_limit THEN
      RAISE EXCEPTION 'Credit limit exceeded';
    END IF;
  END IF;

  INSERT INTO public.orders(customer_id, payment_method, total_usd, delivery_address, note)
  VALUES (_customer, _payment_method, round(_total,2), trim(_delivery_address), NULLIF(trim(_note), ''))
  RETURNING id, order_no INTO _order_id, _order_no;

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = (_row->>'product_id')::uuid AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max)
      ORDER BY qty_min DESC LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, qty, unit_price_usd, line_total_usd)
    VALUES (_order_id, (_row->>'product_id')::uuid, _qty, _unit_price, round(_unit_price * _qty, 2));
  END LOOP;

  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, khqr_code, khqr_expiry, credit_due_at)
  VALUES (
    _order_id, _customer, _payment_method, round(_total,2), round(_total * _exchange_rate),
    CASE WHEN _payment_method = 'khqr' THEN 'KHQR|PROVISIONKH|' || _order_no || '|' || round(_total,2) ELSE NULL END,
    CASE WHEN _payment_method = 'khqr' THEN now() + interval '15 minutes' ELSE NULL END,
    CASE WHEN _payment_method = 'net30' THEN now() + interval '30 days' ELSE NULL END
  ) RETURNING id INTO _payment_id;

  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'payment_id', _payment_id, 'total_usd', round(_total,2));
END $$;
GRANT EXECUTE ON FUNCTION public.place_order(public.payment_method, text, text, jsonb, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.simulate_khqr_payment(_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _payment public.payments%ROWTYPE;
  _item record;
BEGIN
  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id AND customer_id = auth.uid() AND method = 'khqr' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _payment.status <> 'pending' THEN RETURN; END IF;
  IF _payment.khqr_expiry < now() THEN
    UPDATE public.payments SET status = 'expired', updated_at = now() WHERE id = _payment.id;
    RAISE EXCEPTION 'Payment expired';
  END IF;
  FOR _item IN SELECT product_id, qty FROM public.order_items WHERE order_id = _payment.order_id LOOP
    UPDATE public.products SET stock_qty = stock_qty - _item.qty, updated_at = now()
    WHERE id = _item.product_id AND stock_qty >= _item.qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock changed before payment'; END IF;
  END LOOP;
  UPDATE public.payments SET status = 'paid', settled_at = now(), bank_ref = 'DEMO-' || upper(substr(replace(_payment.id::text,'-',''),1,10)), updated_at = now() WHERE id = _payment.id;
  UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = _payment.order_id;
END $$;
GRANT EXECUTE ON FUNCTION public.simulate_khqr_payment(uuid) TO authenticated;
