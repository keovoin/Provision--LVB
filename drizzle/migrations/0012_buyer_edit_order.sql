CREATE OR REPLACE FUNCTION public.buyer_update_order(_order_id uuid, _delivery_address text, _lat double precision, _lng double precision, _payment_method payment_method)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _o public.orders%ROWTYPE; _limit numeric;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR _o.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status <> 'pending' THEN RAISE EXCEPTION 'Order can no longer be changed'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE order_id = _order_id AND status = 'paid') THEN RAISE EXCEPTION 'Order already paid'; END IF;
  IF COALESCE(trim(_delivery_address), '') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF _payment_method = 'net30' AND _o.payment_method <> 'net30' THEN
    SELECT credit_limit_usd INTO _limit FROM public.profiles WHERE id = _o.customer_id;
    IF _limit IS NULL OR public.customer_credit_used(_o.customer_id) + _o.total_usd > _limit THEN RAISE EXCEPTION 'Credit limit exceeded'; END IF;
  END IF;
  UPDATE public.orders SET delivery_address = trim(_delivery_address), delivery_lat = _lat, delivery_lng = _lng, payment_method = _payment_method, updated_at = now() WHERE id = _order_id;
  IF _payment_method <> _o.payment_method THEN
    UPDATE public.payments SET method = _payment_method, khqr_code = NULL, khqr_expiry = NULL, provider_payment_id = NULL, provider_status = NULL, checkout_url = NULL,
      credit_due_at = CASE WHEN _payment_method = 'net30' THEN now() + interval '30 days' ELSE NULL END, updated_at = now()
    WHERE order_id = _order_id AND status <> 'paid';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.buyer_update_order(uuid, text, double precision, double precision, payment_method) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.buyer_update_order(uuid, text, double precision, double precision, payment_method) TO authenticated;