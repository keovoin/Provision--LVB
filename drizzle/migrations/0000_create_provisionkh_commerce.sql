CREATE TYPE public.app_role AS ENUM ('customer', 'staff', 'owner');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'picking', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('khqr', 'net30');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'expired');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  business_name text,
  credit_limit_usd numeric(12,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('dashboard','orders','customers','products','drops','receivables')),
  UNIQUE(user_id, section)
);
GRANT SELECT ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access(_user_id uuid, _section text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'owner') OR (
    public.has_role(_user_id, 'staff') AND EXISTS (
      SELECT 1 FROM public.staff_permissions WHERE user_id = _user_id AND section = _section
    )
  )
$$;
GRANT EXECUTE ON FUNCTION public.can_access(uuid, text) TO authenticated, service_role;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_km text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_km text NOT NULL,
  unit text NOT NULL,
  unit_km text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  cost_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  stock_qty integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reorder_threshold integer NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty_min integer NOT NULL CHECK (qty_min > 0),
  qty_max integer CHECK (qty_max IS NULL OR qty_max >= qty_min),
  price_usd numeric(12,2) NOT NULL CHECK (price_usd >= 0),
  UNIQUE(product_id, qty_min)
);
GRANT SELECT ON public.product_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  total_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
  delivery_address text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX orders_customer_created_idx ON public.orders(customer_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status);

CREATE SEQUENCE public.order_no_seq START 1024;
GRANT USAGE, SELECT ON SEQUENCE public.order_no_seq TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.set_order_no() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_no IS NULL THEN NEW.order_no := 'PK-' || nextval('public.order_no_seq'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_order_no_before_insert BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_no();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty integer NOT NULL CHECK (qty > 0),
  unit_price_usd numeric(12,2) NOT NULL CHECK (unit_price_usd >= 0),
  line_total_usd numeric(12,2) NOT NULL CHECK (line_total_usd >= 0)
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

CREATE TABLE public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_events TO authenticated;
GRANT ALL ON public.order_status_events TO service_role;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX order_status_events_order_idx ON public.order_status_events(order_id, created_at);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no text UNIQUE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount_usd numeric(12,2) NOT NULL CHECK (amount_usd >= 0),
  amount_khr numeric(14,0) NOT NULL DEFAULT 0 CHECK (amount_khr >= 0),
  khqr_code text,
  khqr_expiry timestamptz,
  credit_due_at timestamptz,
  settled_at timestamptz,
  bank_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX payments_customer_status_idx ON public.payments(customer_id, status);
CREATE INDEX payments_due_idx ON public.payments(credit_due_at) WHERE method = 'net30' AND settled_at IS NULL;

CREATE SEQUENCE public.payment_no_seq START 5001;
GRANT USAGE, SELECT ON SEQUENCE public.payment_no_seq TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.set_payment_no() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_no IS NULL THEN NEW.payment_no := 'PAY-' || nextval('public.payment_no_seq'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_payment_no_before_insert BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_payment_no();

CREATE TABLE public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  delivery_time time NOT NULL,
  days text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drops TO authenticated;
GRANT ALL ON public.drops TO service_role;
ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.drop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  qty integer NOT NULL CHECK (qty > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drop_items TO authenticated;
GRANT ALL ON public.drop_items TO service_role;
ALTER TABLE public.drop_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  exchange_rate numeric(10,2) NOT NULL DEFAULT 4100 CHECK (exchange_rate > 0),
  payment_provider_label text NOT NULL DEFAULT 'Cutluy KHQR — ready to connect',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings(id) VALUES (true);

CREATE POLICY "Profiles read own or customer staff access" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.can_access(auth.uid(), 'customers'));
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Staff update customer profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.can_access(auth.uid(), 'customers')) WITH CHECK (public.can_access(auth.uid(), 'customers'));
CREATE POLICY "Roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Permissions read own or owner" ON public.staff_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Public active categories" ON public.categories FOR SELECT TO anon, authenticated USING (active OR public.can_access(auth.uid(), 'products'));
CREATE POLICY "Product staff manage categories" ON public.categories FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'products')) WITH CHECK (public.can_access(auth.uid(), 'products'));
CREATE POLICY "Public active products" ON public.products FOR SELECT TO anon, authenticated USING (active OR public.can_access(auth.uid(), 'products'));
CREATE POLICY "Product staff manage products" ON public.products FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'products')) WITH CHECK (public.can_access(auth.uid(), 'products'));
CREATE POLICY "Public active product prices" ON public.product_prices FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.active OR public.can_access(auth.uid(), 'products'))));
CREATE POLICY "Product staff manage prices" ON public.product_prices FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'products')) WITH CHECK (public.can_access(auth.uid(), 'products'));

CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.can_access(auth.uid(), 'orders'));
CREATE POLICY "Customers create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND status = 'pending');
CREATE POLICY "Order staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.can_access(auth.uid(), 'orders')) WITH CHECK (public.can_access(auth.uid(), 'orders'));
CREATE POLICY "Customers read own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.can_access(auth.uid(), 'orders'))));
CREATE POLICY "Customers insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid() AND o.status = 'pending'));
CREATE POLICY "Customers read own order events" ON public.order_status_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.can_access(auth.uid(), 'orders'))));
CREATE POLICY "Order staff create events" ON public.order_status_events FOR INSERT TO authenticated WITH CHECK (public.can_access(auth.uid(), 'orders'));

CREATE POLICY "Customers read own payments" ON public.payments FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.can_access(auth.uid(), 'receivables') OR public.can_access(auth.uid(), 'orders'));
CREATE POLICY "Customers create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND status = 'pending');
CREATE POLICY "Receivables staff update payments" ON public.payments FOR UPDATE TO authenticated USING (public.can_access(auth.uid(), 'receivables')) WITH CHECK (public.can_access(auth.uid(), 'receivables'));

CREATE POLICY "Customers read own drops" ON public.drops FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.can_access(auth.uid(), 'drops'));
CREATE POLICY "Drop staff manage drops" ON public.drops FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'drops')) WITH CHECK (public.can_access(auth.uid(), 'drops'));
CREATE POLICY "Customers read own drop items" ON public.drop_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.drops d WHERE d.id = drop_id AND (d.customer_id = auth.uid() OR public.can_access(auth.uid(), 'drops'))));
CREATE POLICY "Drop staff manage items" ON public.drop_items FOR ALL TO authenticated USING (public.can_access(auth.uid(), 'drops')) WITH CHECK (public.can_access(auth.uid(), 'drops'));
CREATE POLICY "Everyone reads settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner updates settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, name, phone, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), NULLIF(NEW.raw_user_meta_data->>'business_name', ''));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.track_order_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_events(order_id, status, created_by) VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER track_order_status_after_change AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.track_order_status();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
