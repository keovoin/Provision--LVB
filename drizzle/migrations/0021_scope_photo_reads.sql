DROP POLICY IF EXISTS "Guests read product photos" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users read product photos" ON storage.objects;
CREATE OR REPLACE FUNCTION public.is_public_photo(_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM products WHERE active AND photo_url = _name)
      OR EXISTS (SELECT 1 FROM product_media m JOIN products p ON p.id = m.product_id WHERE p.active AND m.storage_path = _name)
      OR EXISTS (SELECT 1 FROM banners WHERE active AND image_path = _name)
      OR EXISTS (SELECT 1 FROM review_media WHERE storage_path = _name)
      OR EXISTS (SELECT 1 FROM products WHERE active AND description::text LIKE '%"' || _name || '"%')
$$;
GRANT EXECUTE ON FUNCTION public.is_public_photo(text) TO anon, authenticated;
CREATE POLICY "Read published catalog photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-photos' AND public.is_public_photo(name));
CREATE POLICY "Staff and owners read their photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-photos' AND (public.can_access(auth.uid(), 'products') OR ((storage.foldername(name))[1] = 'reviews' AND (storage.foldername(name))[2] = auth.uid()::text)));