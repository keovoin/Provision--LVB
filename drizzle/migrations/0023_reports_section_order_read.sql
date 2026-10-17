DROP POLICY IF EXISTS "Customers read own orders" ON public.orders;
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT TO authenticated
USING (customer_id = auth.uid() OR can_access(auth.uid(), 'orders') OR can_access(auth.uid(), 'reports'));

DROP POLICY IF EXISTS "Customers read own order items" ON public.order_items;
CREATE POLICY "Customers read own order items" ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND (o.customer_id = auth.uid() OR can_access(auth.uid(), 'orders') OR can_access(auth.uid(), 'reports'))));