CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock staff manage suppliers" ON public.suppliers FOR ALL TO authenticated
USING (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'))
WITH CHECK (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'));

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','received','cancelled')),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock staff manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated
USING (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'))
WITH CHECK (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'));

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock staff manage PO items" ON public.purchase_order_items FOR ALL TO authenticated
USING (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'))
WITH CHECK (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner'));

CREATE TABLE public.pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_no TEXT,
  staff_id UUID REFERENCES public.profiles(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','khqr')),
  total_usd NUMERIC(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pos_sales TO authenticated;
GRANT ALL ON public.pos_sales TO service_role;
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "POS staff read sales" ON public.pos_sales FOR SELECT TO authenticated
USING (can_access(auth.uid(), 'pos') OR can_access(auth.uid(), 'reports') OR has_role(auth.uid(), 'owner'));

CREATE TABLE public.pos_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_usd NUMERIC(10,2) NOT NULL,
  line_total_usd NUMERIC(10,2) NOT NULL
);
GRANT SELECT ON public.pos_sale_items TO authenticated;
GRANT ALL ON public.pos_sale_items TO service_role;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "POS staff read sale items" ON public.pos_sale_items FOR SELECT TO authenticated
USING (can_access(auth.uid(), 'pos') OR can_access(auth.uid(), 'reports') OR has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.set_po_no() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.po_no IS NULL THEN NEW.po_no := 'PO-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER po_no BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION set_po_no();

CREATE OR REPLACE FUNCTION public.set_sale_no() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sale_no IS NULL THEN NEW.sale_no := 'POS-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random()*10000))::text, 4, '0'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sale_no BEFORE INSERT ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION set_sale_no();

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (can_access(auth.uid(), 'stock') OR can_access(auth.uid(), 'products') OR has_role(auth.uid(), 'owner')) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = _po_id AND status = 'draft') THEN RAISE EXCEPTION 'PO not found or already received'; END IF;
  UPDATE products p SET stock_qty = p.stock_qty + i.qty, updated_at = now()
  FROM purchase_order_items i WHERE i.po_id = _po_id AND i.product_id = p.id;
  INSERT INTO stock_movements (product_id, kind, qty, note, created_by)
  SELECT i.product_id, 'in', i.qty, 'PO ' || (SELECT po_no FROM purchase_orders WHERE id = _po_id), auth.uid()
  FROM purchase_order_items i WHERE i.po_id = _po_id;
  UPDATE purchase_orders SET status = 'received', received_at = now() WHERE id = _po_id;
END; $$;

CREATE OR REPLACE FUNCTION public.pos_checkout(_payment_method TEXT, _items JSONB, _note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sale_id UUID; _sale_no TEXT; _total NUMERIC(10,2) := 0;
  _item JSONB; _p products%ROWTYPE; _price NUMERIC(10,2); _qty INT;
BEGIN
  IF NOT (can_access(auth.uid(), 'pos') OR has_role(auth.uid(), 'owner')) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _payment_method NOT IN ('cash','khqr') THEN RAISE EXCEPTION 'invalid payment method'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'empty cart'; END IF;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_item->>'qty')::int;
    SELECT * INTO _p FROM products WHERE id = (_item->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product not found'; END IF;
    IF _p.stock_qty < _qty THEN RAISE EXCEPTION 'ស្តុកមិនគ្រប់ / Not enough stock for % (have %)', _p.name_km, _p.stock_qty; END IF;
    SELECT price_usd INTO _price FROM product_prices
    WHERE product_id = _p.id AND qty_min <= _qty AND (qty_max IS NULL OR qty_max >= _qty)
    ORDER BY qty_min DESC LIMIT 1;
    IF _price IS NULL THEN RAISE EXCEPTION 'no price for %', _p.name_km; END IF;
    _total := _total + _price * _qty;
  END LOOP;
  INSERT INTO pos_sales (staff_id, payment_method, total_usd, note) VALUES (auth.uid(), _payment_method, _total, NULLIF(btrim(_note), '')) RETURNING id, sale_no INTO _sale_id, _sale_no;
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_item->>'qty')::int;
    SELECT * INTO _p FROM products WHERE id = (_item->>'product_id')::uuid;
    SELECT price_usd INTO _price FROM product_prices
    WHERE product_id = _p.id AND qty_min <= _qty AND (qty_max IS NULL OR qty_max >= _qty)
    ORDER BY qty_min DESC LIMIT 1;
    UPDATE products SET stock_qty = stock_qty - _qty, updated_at = now() WHERE id = _p.id;
    INSERT INTO pos_sale_items (sale_id, product_id, qty, unit_price_usd, line_total_usd) VALUES (_sale_id, _p.id, _qty, _price, _price * _qty);
    INSERT INTO stock_movements (product_id, kind, qty, note, created_by) VALUES (_p.id, 'out', _qty, 'POS ' || _sale_no, auth.uid());
  END LOOP;
  RETURN jsonb_build_object('sale_id', _sale_id, 'sale_no', _sale_no, 'total_usd', _total);
END; $$;