ALTER TABLE public.payments
  ADD COLUMN provider_payment_id text,
  ADD COLUMN provider_status text;

CREATE UNIQUE INDEX payments_provider_payment_id_idx
  ON public.payments(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

COMMENT ON COLUMN public.payments.provider_payment_id IS 'Server-only external payment identifier.';
COMMENT ON COLUMN public.payments.provider_status IS 'Last verified status returned by the payment service.';

CREATE OR REPLACE FUNCTION public.bind_external_payment(
  _payment_id uuid,
  _provider_payment_id text,
  _qr_code text,
  _expires_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF COALESCE(trim(_provider_payment_id), '') = '' OR COALESCE(trim(_qr_code), '') = '' THEN
    RAISE EXCEPTION 'Invalid payment response';
  END IF;

  UPDATE public.payments
  SET provider_payment_id = trim(_provider_payment_id),
      provider_status = 'pending',
      khqr_code = _qr_code,
      khqr_expiry = _expires_at,
      updated_at = now()
  WHERE id = _payment_id
    AND customer_id = auth.uid()
    AND method = 'khqr'
    AND status = 'pending'
    AND (provider_payment_id IS NULL OR provider_payment_id = trim(_provider_payment_id));

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not available'; END IF;
END
$$;
GRANT EXECUTE ON FUNCTION public.bind_external_payment(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bind_external_payment(uuid, text, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_external_payment_status(
  _provider_payment_id text,
  _provider_status text,
  _bank_ref text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment public.payments%ROWTYPE;
  _item record;
BEGIN
  IF _provider_status NOT IN ('pending', 'scanned', 'paid', 'expired', 'failed') THEN
    RAISE EXCEPTION 'Invalid provider status';
  END IF;

  SELECT * INTO _payment
  FROM public.payments
  WHERE provider_payment_id = _provider_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _payment.status = 'paid' THEN RETURN; END IF;

  IF _provider_status = 'paid' THEN
    FOR _item IN SELECT product_id, qty FROM public.order_items WHERE order_id = _payment.order_id LOOP
      UPDATE public.products
      SET stock_qty = stock_qty - _item.qty, updated_at = now()
      WHERE id = _item.product_id AND stock_qty >= _item.qty;
      IF NOT FOUND THEN RAISE EXCEPTION 'Stock changed before payment'; END IF;
    END LOOP;

    UPDATE public.payments
    SET status = 'paid', provider_status = 'paid', settled_at = now(),
        bank_ref = COALESCE(NULLIF(trim(_bank_ref), ''), _provider_payment_id), updated_at = now()
    WHERE id = _payment.id;
    UPDATE public.orders SET status = 'paid', updated_at = now() WHERE id = _payment.order_id;
  ELSIF _provider_status IN ('expired', 'failed') THEN
    UPDATE public.payments
    SET status = _provider_status::public.payment_status,
        provider_status = _provider_status, updated_at = now()
    WHERE id = _payment.id;
  ELSE
    UPDATE public.payments
    SET provider_status = _provider_status, updated_at = now()
    WHERE id = _payment.id;
  END IF;
END
$$;
REVOKE ALL ON FUNCTION public.apply_external_payment_status(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_external_payment_status(text, text, text) TO service_role;

ALTER TABLE public.app_settings
  ALTER COLUMN payment_provider_label SET DEFAULT 'KHQR payment';
UPDATE public.app_settings SET payment_provider_label = 'KHQR payment' WHERE id = true;