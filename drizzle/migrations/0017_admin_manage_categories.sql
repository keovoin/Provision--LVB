CREATE OR REPLACE FUNCTION public.admin_upsert_category(_id uuid, _slug text, _name_en text, _name_km text, _icon text, _sort_order integer, _active boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.can_access(auth.uid(), 'categories')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.categories (slug, name_en, name_km, icon, sort_order, active)
    VALUES (_slug, _name_en, _name_km, COALESCE(_icon, ''), COALESCE(_sort_order, 0), COALESCE(_active, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.categories
    SET slug = _slug, name_en = _name_en, name_km = _name_km, icon = COALESCE(_icon, ''), sort_order = COALESCE(_sort_order, 0), active = COALESCE(_active, true)
    WHERE id = _id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'category not found'; END IF;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_category(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.can_access(auth.uid(), 'categories')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.products WHERE category_id = _id) THEN
    RAISE EXCEPTION 'category has products';
  END IF;
  DELETE FROM public.categories WHERE id = _id;
END;
$$;