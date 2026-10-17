-- ============ Promo codes & sales ============
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null,
  discount_value numeric not null,
  min_order_usd numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.promo_codes to authenticated;
grant all on public.promo_codes to service_role;

alter table public.promo_codes enable row level security;

create policy promo_codes_staff_all on public.promo_codes
  for all to authenticated
  using (public.has_role(auth.uid(), 'staff') or public.has_role(auth.uid(), 'owner'))
  with check (public.has_role(auth.uid(), 'staff') or public.has_role(auth.uid(), 'owner'));

-- ============ Field validation via trigger ============
create or replace function public.validate_promo_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.discount_type not in ('percent', 'fixed') then
    raise exception 'discount_type must be percent or fixed';
  end if;
  if new.discount_value is null or new.discount_value <= 0 then
    raise exception 'Discount must be greater than zero';
  end if;
  if new.discount_type = 'percent' and new.discount_value > 100 then
    raise exception 'Percent discount cannot exceed 100';
  end if;
  if new.starts_at is not null and new.ends_at is not null and new.ends_at < new.starts_at then
    raise exception 'End date must be after start date';
  end if;
  if new.max_uses is not null and new.max_uses < 1 then
    raise exception 'Usage limit must be at least 1';
  end if;
  if new.code is null or length(trim(new.code)) < 3 then
    raise exception 'Code must be at least 3 characters';
  end if;
  return new;
end $$;

drop trigger if exists validate_promo_fields_t on public.promo_codes;
create trigger validate_promo_fields_t before insert or update on public.promo_codes
  for each row execute function public.validate_promo_fields();

-- ============ Orders gain promo columns ============
alter table public.orders
  add column if not exists promo_code text,
  add column if not exists discount_usd numeric not null default 0;

-- ============ Customer-facing validation ============
create or replace function public.validate_promo(_code text, _subtotal numeric)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  p public.promo_codes%ROWTYPE;
  _disc numeric;
begin
  if _code is null or trim(_code) = '' then raise exception 'បានបញ្ចូលកូដមិនត្រូវ'; end if;
  select * into p from public.promo_codes where upper(code) = upper(trim(_code));
  if not found or not p.active then raise exception 'កូដបញ្ចុះតម្លៃមិនត្រឹមត្រូវ'; end if;
  if p.starts_at is not null and now() < p.starts_at then raise exception 'កូដមិនទាន់ចាប់ផ្តើមយ៉ាងណា'; end if;
  if p.ends_at is not null and now() > p.ends_at then raise exception 'កូដបា�់អស់សុពលភាព'; end if;
  if p.max_uses is not null and p.used_count >= p.max_uses then raise exception 'កូដបានប្រើឈតផ្តាច់'; end if;
  if _subtotal is null or _subtotal < p.min_order_usd then
    raise exception 'Minimum order for this code is $% · ការទិញអប្បបរមា ដល់ $%', p.min_order_usd, p.min_order_usd;
  end if;
  _disc := case when p.discount_type = 'percent' then _subtotal * p.discount_value / 100 else p.discount_value end;
  if _disc > _subtotal then _disc := _subtotal; end if;
  return round(_disc, 2);
end $$;

grant execute on function public.validate_promo(text, numeric) to authenticated;

-- ============ Apply promo on order insert ============
create or replace function public.apply_order_promo() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.promo_codes%ROWTYPE;
  _disc numeric;
begin
  if new.promo_code is null or trim(new.promo_code) = '' then return new; end if;
  _disc := public.validate_promo(new.promo_code, new.total_usd);
  select * into p from public.promo_codes where upper(code) = upper(trim(new.promo_code));
  new.discount_usd := _disc;
  new.total_usd := round(new.total_usd - _disc, 2);
  update public.promo_codes set used_count = used_count + 1 where id = p.id;
  return new;
end $$;

drop trigger if exists apply_order_promo_t on public.orders;
create trigger apply_order_promo_t before insert on public.orders
  for each row execute function public.apply_order_promo();

-- ============ Admin upsert / delete ============
create or replace function public.admin_upsert_promo(
  _id uuid, _code text, _discount_type text, _discount_value numeric,
  _min_order_usd numeric, _starts_at timestamptz, _ends_at timestamptz,
  _max_uses integer, _active boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _caller uuid := auth.uid();
  _out uuid;
begin
  if _caller is null or (not public.has_role(_caller, 'staff') and not public.has_role(_caller, 'owner')) then
    raise exception 'Staff access required';
  end if;
  if _id is null then
    insert into public.promo_codes(code, discount_type, discount_value, min_order_usd, starts_at, ends_at, max_uses, active)
    values (upper(trim(_code)), _discount_type, _discount_value, coalesce(_min_order_usd, 0), _starts_at, _ends_at, _max_uses, _active)
    returning id into _out;
  else
    update public.promo_codes
      set code = upper(trim(_code)), discount_type = _discount_type, discount_value = _discount_value,
          min_order_usd = coalesce(_min_order_usd, 0), starts_at = _starts_at, ends_at = _ends_at,
          max_uses = _max_uses, active = _active
      where id = _id
      returning id into _out;
  end if;
  return _out;
end $$;

create or replace function public.admin_delete_promo(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  _caller uuid := auth.uid();
begin
  if _caller is null or (not public.has_role(_caller, 'staff') and not public.has_role(_caller, 'owner')) then
    raise exception 'Staff access required';
  end if;
  delete from public.promo_codes where id = _id;
end $$;

grant execute on function public.admin_upsert_promo(uuid, text, text, numeric, numeric, timestamptz, timestamptz, integer, boolean) to authenticated;
grant execute on function public.admin_delete_promo(uuid) to authenticated;

-- ============ place_order with promo support ============
drop function if exists public.place_order(_payment_method payment_method, _delivery_address text, _note text, _items jsonb, _exchange_rate numeric);
create or replace function public.place_order(
  _payment_method payment_method, _delivery_address text, _note text,
  _items jsonb, _exchange_rate numeric, _promo_code text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  _customer uuid := auth.uid();
  _order_id uuid;
  _order_no text;
  _payment_id uuid;
  _total numeric := 0;
  _discount numeric := 0;
  _row jsonb;
  _product public.products%ROWTYPE;
  _qty integer;
  _unit_price numeric;
  _credit_limit numeric;
begin
  IF _customer IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(_customer, 'customer') THEN RAISE EXCEPTION 'Customer account required'; END IF;
  IF COALESCE(trim(_delivery_address), '') = '' THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT * INTO _product FROM public.products WHERE id = (_row->>'product_id')::uuid AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF _qty <= 0 OR _product.stock_qty < _qty THEN RAISE EXCEPTION 'Insufficient stock for %', _product.name_en; END IF;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = _product.id AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max)
      ORDER BY qty_min DESC LIMIT 1;
    IF _unit_price IS NULL THEN RAISE EXCEPTION 'Price unavailable for %', _product.name_en; END IF;
    _total := _total + (_unit_price * _qty);
  END LOOP;

  IF _payment_method = 'net30' THEN
    SELECT credit_limit_usd INTO _credit_limit FROM public.profiles WHERE id = _customer;
    IF _credit_limit IS NULL OR public.customer_credit_used(_customer) + _total > _credit_limit THEN
      RAISE EXCEPTION 'Credit limit exceeded';
    END IF;
  END IF;

  INSERT INTO public.orders(customer_id, payment_method, total_usd, delivery_address, note, promo_code)
  VALUES (_customer, _payment_method, round(_total,2), trim(_delivery_address), NULLIF(trim(_note), ''), NULLIF(upper(trim(_promo_code)), ''))
  RETURNING id, order_no, total_usd, discount_usd INTO _order_id, _order_no, _total, _discount;

  FOR _row IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := (_row->>'qty')::integer;
    SELECT price_usd INTO _unit_price FROM public.product_prices
      WHERE product_id = (_row->>'product_id')::uuid AND _qty >= qty_min AND (qty_max IS NULL OR _qty <= qty_max)
      ORDER BY qty_min DESC LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, qty, unit_price_usd, line_total_usd)
    VALUES (_order_id, (_row->>'product_id')::uuid, _qty, _unit_price, round(_unit_price * _qty, 2));
  END LOOP;

  INSERT INTO public.payments(order_id, customer_id, method, amount_usd, amount_khr, khqr_code, khqr_expiry, credit_due_at)
  VALUES (
    _order_id, _customer, _payment_method, round(_total,2), round(_total * _exchange_rate),
    CASE WHEN _payment_method = 'khqr' THEN 'KHQR|PROVISIONKH|' || _order_no || '|' || round(_total,2) ELSE NULL END,
    CASE WHEN _payment_method = 'khqr' THEN now() + interval '15 minutes' ELSE NULL END,
    CASE WHEN _payment_method = 'net30' THEN now() + interval '30 days' ELSE NULL END
  ) RETURNING id INTO _payment_id;

  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'payment_id', _payment_id, 'total_usd', round(_total,2), 'discount_usd', _discount);
END $$;
