ALTER TABLE public.staff_permissions DROP CONSTRAINT staff_permissions_section_check;
ALTER TABLE public.staff_permissions ADD CONSTRAINT staff_permissions_section_check CHECK (section IN ('dashboard','orders','customers','products','categories','drops','receivables','reports','stock','pos','requests'));
CREATE OR REPLACE FUNCTION public.set_staff_access(_user_id uuid, _staff boolean, _sections text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the owner can manage staff'; END IF;
 IF _user_id=auth.uid() OR public.has_role(_user_id,'owner') THEN RAISE EXCEPTION 'Owner access cannot be changed here'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(COALESCE(_sections,'{}')) s WHERE s NOT IN ('orders','customers','products','categories','drops','receivables','reports','stock','pos','requests')) THEN RAISE EXCEPTION 'Invalid section'; END IF;
 DELETE FROM public.staff_permissions WHERE user_id=_user_id;
 IF _staff THEN
 INSERT INTO public.user_roles(user_id,role) SELECT _user_id,'staff' WHERE NOT public.has_role(_user_id,'staff');
 INSERT INTO public.staff_permissions(user_id,section) SELECT _user_id,s FROM (SELECT DISTINCT unnest(COALESCE(_sections,'{}')) s) t;
 ELSE DELETE FROM public.user_roles WHERE user_id=_user_id AND role='staff'; END IF;
END $$;
CREATE TABLE public.customer_requests (
 id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES public.profiles(id), kind text NOT NULL CHECK(kind IN ('quote','custom')), subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 160), details text NOT NULL CHECK(length(details) BETWEEN 1 AND 20000), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','quoted','accepted','declined')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_requests TO authenticated; GRANT ALL ON public.customer_requests TO service_role;
ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_read ON public.customer_requests FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.can_access(auth.uid(),'requests'));
CREATE TABLE public.request_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES public.profiles(id), is_staff boolean NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 20000), amount_usd numeric(12,2) CHECK(amount_usd >= 0), offer_status text CHECK(offer_status IN ('open','accepted','declined','superseded')), created_at timestamptz NOT NULL DEFAULT now(), CHECK((amount_usd IS NULL AND offer_status IS NULL) OR (amount_usd IS NOT NULL AND offer_status IS NOT NULL AND is_staff))
);
GRANT SELECT ON public.request_messages TO authenticated; GRANT ALL ON public.request_messages TO service_role;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY message_read ON public.request_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.customer_requests r WHERE r.id=request_id AND (r.customer_id=auth.uid() OR public.can_access(auth.uid(),'requests'))));
CREATE TABLE public.request_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE, storage_path text NOT NULL UNIQUE, sort_order integer NOT NULL
);
GRANT SELECT ON public.request_images TO authenticated; GRANT ALL ON public.request_images TO service_role;
ALTER TABLE public.request_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY image_read ON public.request_images FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.customer_requests r WHERE r.id=request_id AND (r.customer_id=auth.uid() OR public.can_access(auth.uid(),'requests'))));
CREATE INDEX customer_requests_customer_date ON public.customer_requests(customer_id,created_at DESC);
CREATE INDEX request_messages_request ON public.request_messages(request_id,created_at);
CREATE POLICY request_image_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='request-images' AND (storage.foldername(name))[1]=auth.uid()::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY request_image_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='request-images' AND ((storage.foldername(name))[1]=auth.uid()::text OR (public.can_access(auth.uid(),'requests') AND EXISTS(SELECT 1 FROM public.request_images i WHERE i.storage_path=name))));
CREATE POLICY request_image_cleanup ON storage.objects FOR DELETE TO authenticated USING(bucket_id='request-images' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.request_images i WHERE i.storage_path=name));
CREATE OR REPLACE FUNCTION public.submit_customer_request(_id uuid,_kind text,_subject text,_details text,_images text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p text; n integer:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 IF (SELECT count(*) FROM public.customer_requests WHERE customer_id=auth.uid() AND created_at>now()-interval '1 minute')>=3 THEN RAISE EXCEPTION 'Please wait a minute before sending another request'; END IF;
 IF cardinality(_images)>8 THEN RAISE EXCEPTION 'Maximum 8 images'; END IF;
 INSERT INTO public.customer_requests(id,customer_id,kind,subject,details) VALUES(_id,auth.uid(),_kind,trim(_subject),trim(_details));
 FOREACH p IN ARRAY COALESCE(_images,'{}') LOOP
 IF p NOT LIKE auth.uid()::text||'/'||_id::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='request-images' AND name=p AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')) THEN RAISE EXCEPTION 'Invalid image attachment'; END IF;
 INSERT INTO public.request_images(request_id,storage_path,sort_order) VALUES(_id,p,n); n:=n+1;
 END LOOP;
 RETURN _id;
END $$;
CREATE OR REPLACE FUNCTION public.reply_customer_request(_id uuid,_body text,_amount numeric DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.customer_requests; staff boolean; mid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO r FROM public.customer_requests WHERE id=_id FOR UPDATE;
 staff:=public.can_access(auth.uid(),'requests');
 IF r.id IS NULL OR (NOT staff AND r.customer_id<>auth.uid()) THEN RAISE EXCEPTION 'Request not found or access denied'; END IF;
 IF r.status IN ('accepted','declined') THEN RAISE EXCEPTION 'This request is closed'; END IF;
 IF _amount IS NOT NULL AND NOT staff THEN RAISE EXCEPTION 'Only authorized staff can send offers'; END IF;
 IF (SELECT count(*) FROM public.request_messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Please wait before sending another reply'; END IF;
 IF _amount IS NOT NULL THEN
 UPDATE public.request_messages SET offer_status='superseded' WHERE request_id=_id AND offer_status='open';
 UPDATE public.customer_requests SET status='quoted',updated_at=now() WHERE id=_id;
 ELSE UPDATE public.customer_requests SET updated_at=now() WHERE id=_id; END IF;
 INSERT INTO public.request_messages(request_id,sender_id,is_staff,body,amount_usd,offer_status) VALUES(_id,auth.uid(),staff,trim(_body),_amount,CASE WHEN _amount IS NOT NULL THEN 'open' END) RETURNING id INTO mid;
 RETURN mid;
END $$;
CREATE OR REPLACE FUNCTION public.decide_request_offer(_request_id uuid,_message_id uuid,_accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.customer_requests;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO r FROM public.customer_requests WHERE id=_request_id FOR UPDATE;
 IF r.id IS NULL OR r.customer_id<>auth.uid() THEN RAISE EXCEPTION 'Only the requesting customer can decide'; END IF;
 IF r.status<>'quoted' OR NOT EXISTS(SELECT 1 FROM public.request_messages WHERE id=_message_id AND request_id=_request_id AND offer_status='open') THEN RAISE EXCEPTION 'Offer is no longer available'; END IF;
 UPDATE public.request_messages SET offer_status=CASE WHEN _accept THEN 'accepted' ELSE 'declined' END WHERE id=_message_id;
 UPDATE public.customer_requests SET status=CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,updated_at=now() WHERE id=_request_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_customer_request(uuid,text,text,text,text[]),public.reply_customer_request(uuid,text,numeric),public.decide_request_offer(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_customer_request(uuid,text,text,text,text[]),public.reply_customer_request(uuid,text,numeric),public.decide_request_offer(uuid,uuid,boolean) TO authenticated;