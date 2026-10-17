CREATE OR REPLACE FUNCTION public.set_staff_access(_user_id uuid, _staff boolean, _sections text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Only the owner can manage staff'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own access'; END IF;
  IF public.has_role(_user_id, 'owner') THEN RAISE EXCEPTION 'Owner access cannot be changed here'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_sections, '{}')) s WHERE s NOT IN ('orders','customers','products','drops','receivables')) THEN
    RAISE EXCEPTION 'Invalid section';
  END IF;
  DELETE FROM public.staff_permissions WHERE user_id = _user_id;
  IF _staff THEN
    INSERT INTO public.user_roles(user_id, role) SELECT _user_id, 'staff' WHERE NOT public.has_role(_user_id, 'staff');
    INSERT INTO public.staff_permissions(user_id, section) SELECT _user_id, s FROM unnest(COALESCE(_sections, '{}')) s;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'staff';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_staff_access(uuid, boolean, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_access(uuid, boolean, text[]) TO authenticated;