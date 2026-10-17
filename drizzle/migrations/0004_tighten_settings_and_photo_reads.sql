-- Tighten product photo reads: signed-in accounts only (was: anyone, including anonymous visitors)
DROP POLICY IF EXISTS "Product photos readable by everyone" ON storage.objects;
CREATE POLICY "Signed-in users read product photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-photos');

-- Tighten settings reads: staff and owner only (was: anyone, including anonymous visitors)
DROP POLICY IF EXISTS "Everyone reads settings" ON public.app_settings;
CREATE POLICY "Staff read settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'staff'));

REVOKE SELECT ON public.app_settings FROM anon;