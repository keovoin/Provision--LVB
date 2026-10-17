CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  kind TEXT NOT NULL CHECK (kind IN ('in','out')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_created_idx ON public.stock_movements (created_at DESC);
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read stock movements" ON public.stock_movements FOR SELECT TO authenticated
USING (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.record_stock_movement(_product_id UUID, _kind TEXT, _qty INTEGER, _note TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _stock INTEGER;
BEGIN
  IF NOT (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _kind NOT IN ('in','out') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'qty must be positive'; END IF;
  SELECT stock_qty INTO _stock FROM products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
  IF _kind = 'out' AND _stock < _qty THEN
    RAISE EXCEPTION 'ស្តុកមិនគ្រប់ / Not enough stock (have %, need %)', _stock, _qty;
  END IF;
  UPDATE products SET stock_qty = stock_qty + CASE WHEN _kind = 'in' THEN _qty ELSE -_qty END, updated_at = now() WHERE id = _product_id;
  INSERT INTO stock_movements (product_id, kind, qty, note, created_by) VALUES (_product_id, _kind, _qty, NULLIF(btrim(_note), ''), auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END;
$$;