DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers create own payments" ON public.payments;
REVOKE INSERT ON public.orders, public.order_items, public.payments FROM anon, authenticated;