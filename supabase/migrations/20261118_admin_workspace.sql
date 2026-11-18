-- Admin workspace (2026-11-18). Run once in the Supabase SQL Editor after all earlier
-- migrations (including 20261116_security_hardening.sql). Safe to re-run.
--
-- Adds:
--   1. Product categories (data-driven, replaces the hardcoded two "brands" for shop filters)
--   2. Product option groups and values (size, pattern, finish…), priced on the server
--   3. Colour library flags: out of stock everywhere, archived
--   4. Order production fields: due date, print time, filament, colour, printer
--
-- Netlify functions use the service-role key and bypass RLS; the policies below keep direct
-- Supabase API access to the same rules as the rest of the catalogue: anyone reads what the
-- shop shows, viewers read everything, managers and admins write.

-- 1. Categories --------------------------------------------------------------------------

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

alter table public.products
  add column if not exists category_id uuid references public.product_categories(id) on delete set null;

create index if not exists products_category_sort_idx on public.products (category_id, sort_order);

-- First run only: turn the two existing shelves into categories so nothing in the shop moves.
-- Rename or replace them in Admin → Catalogue → Categories. Skipped if any category exists.
do $$
begin
  if not exists (select 1 from public.product_categories) then
    insert into public.product_categories (slug, name, sort_order) values
      ('gaming-setup', 'Gaming & Setup', 0),
      ('home-decor', 'Home & Decor', 1);
    update public.products p set category_id = c.id
      from public.product_categories c
      where p.category_id is null
        and ((p.brand = 'pforge' and c.slug = 'gaming-setup') or (p.brand = 'printique' and c.slug = 'home-decor'));
  end if;
end $$;

alter table public.product_categories enable row level security;

drop policy if exists "Public can read categories" on public.product_categories;
create policy "Public can read categories"
on public.product_categories for select
using (true);

drop policy if exists "Admin users can manage categories" on public.product_categories;
create policy "Admin users can manage categories"
on public.product_categories for all to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

-- 2. Product options ---------------------------------------------------------------------

create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  display_type text not null default 'buttons' check (display_type in ('buttons', 'swatches', 'dropdown')),
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_option_groups_product_idx on public.product_option_groups (product_id, sort_order);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  swatch_hex text check (swatch_hex is null or swatch_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_delta numeric(10,2) not null default 0 check (price_delta between -100000 and 100000),
  grams_delta numeric(8,2) not null default 0 check (grams_delta between -100000 and 100000),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_option_values_group_idx on public.product_option_values (group_id, sort_order);

drop trigger if exists trg_product_option_groups_updated_at on public.product_option_groups;
create trigger trg_product_option_groups_updated_at
before update on public.product_option_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_option_values_updated_at on public.product_option_values;
create trigger trg_product_option_values_updated_at
before update on public.product_option_values
for each row execute function public.set_updated_at();

-- A photo can show one option value; selecting that value brings its photos forward.
alter table public.product_images
  add column if not exists option_value_id uuid references public.product_option_values(id) on delete set null;

create index if not exists product_images_option_value_idx on public.product_images (option_value_id);

alter table public.product_option_groups enable row level security;
alter table public.product_option_values enable row level security;

drop policy if exists "Public can read published option groups" on public.product_option_groups;
create policy "Public can read published option groups"
on public.product_option_groups for select
using (exists (select 1 from public.products p where p.id = product_option_groups.product_id and p.is_published = true));

drop policy if exists "Public can read published option values" on public.product_option_values;
create policy "Public can read published option values"
on public.product_option_values for select
using (exists (
  select 1 from public.product_option_groups g
  join public.products p on p.id = g.product_id
  where g.id = product_option_values.group_id and p.is_published = true
));

drop policy if exists "Admin users can read option groups" on public.product_option_groups;
create policy "Admin users can read option groups"
on public.product_option_groups for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin users can read option values" on public.product_option_values;
create policy "Admin users can read option values"
on public.product_option_values for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin users can manage option groups" on public.product_option_groups;
create policy "Admin users can manage option groups"
on public.product_option_groups for all to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Admin users can manage option values" on public.product_option_values;
create policy "Admin users can manage option values"
on public.product_option_values for all to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

-- Save all of a product's option groups and values in one transaction. Rows with an id are
-- updated (and must belong to this product), rows without one are inserted, and rows missing
-- from the payload are deleted. Runs with the caller's rights, so RLS still applies to
-- non-service callers. The admin API validates the payload before calling it.
create or replace function public.admin_save_product_options(p_product_id uuid, p_groups jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  g jsonb;
  v jsonb;
  gi integer := 0;
  vi integer;
  gid uuid;
  vid uuid;
  keep_groups uuid[] := '{}';
  keep_values uuid[];
begin
  if not exists (select 1 from products where id = p_product_id) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_groups) <> 'array' then
    raise exception 'groups must be an array' using errcode = '22023';
  end if;

  for g in select value from jsonb_array_elements(p_groups) loop
    if nullif(g->>'id', '') is not null then
      keep_groups := keep_groups || (g->>'id')::uuid;
    end if;
  end loop;

  delete from product_option_groups where product_id = p_product_id and not (id = any (keep_groups));

  for g in select value from jsonb_array_elements(p_groups) loop
    gid := nullif(g->>'id', '')::uuid;
    if gid is null then
      insert into product_option_groups (product_id, name, display_type, is_required, sort_order)
      values (p_product_id, g->>'name', g->>'display_type', coalesce((g->>'is_required')::boolean, true), gi)
      returning id into gid;
    else
      update product_option_groups
        set name = g->>'name',
            display_type = g->>'display_type',
            is_required = coalesce((g->>'is_required')::boolean, true),
            sort_order = gi
        where id = gid and product_id = p_product_id;
      if not found then
        raise exception 'Option group % does not belong to this product', gid using errcode = 'P0001';
      end if;
    end if;

    keep_values := '{}';
    for v in select value from jsonb_array_elements(coalesce(g->'values', '[]'::jsonb)) loop
      if nullif(v->>'id', '') is not null then
        keep_values := keep_values || (v->>'id')::uuid;
      end if;
    end loop;
    delete from product_option_values where group_id = gid and not (id = any (keep_values));

    vi := 0;
    for v in select value from jsonb_array_elements(coalesce(g->'values', '[]'::jsonb)) loop
      vid := nullif(v->>'id', '')::uuid;
      if vid is null then
        insert into product_option_values (group_id, label, swatch_hex, price_delta, grams_delta, is_available, sort_order)
        values (
          gid, v->>'label', nullif(v->>'swatch_hex', ''),
          coalesce((v->>'price_delta')::numeric, 0), coalesce((v->>'grams_delta')::numeric, 0),
          coalesce((v->>'is_available')::boolean, true), vi
        );
      else
        update product_option_values
          set label = v->>'label',
              swatch_hex = nullif(v->>'swatch_hex', ''),
              price_delta = coalesce((v->>'price_delta')::numeric, 0),
              grams_delta = coalesce((v->>'grams_delta')::numeric, 0),
              is_available = coalesce((v->>'is_available')::boolean, true),
              sort_order = vi
          where id = vid and group_id = gid;
        if not found then
          raise exception 'Option value % does not belong to this group', vid using errcode = 'P0001';
        end if;
      end if;
      vi := vi + 1;
    end loop;

    gi := gi + 1;
  end loop;
end;
$$;

revoke all on function public.admin_save_product_options(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_product_options(uuid, jsonb) to authenticated, service_role;

-- 3. Colour library flags -----------------------------------------------------------------

alter table public.color_library add column if not exists out_of_stock boolean not null default false;
alter table public.color_library add column if not exists is_archived boolean not null default false;

-- The shop needs to know which colours are out of stock. Names and hex codes aren't private.
drop policy if exists "Public can read color library" on public.color_library;
create policy "Public can read color library"
on public.color_library for select
using (true);

-- 4. Order production fields ---------------------------------------------------------------

alter table public.orders add column if not exists due_date date;
alter table public.orders add column if not exists print_minutes integer;
alter table public.orders add column if not exists filament_grams numeric(10,2);
alter table public.orders add column if not exists filament_material text;
alter table public.orders add column if not exists production_colour text;
alter table public.orders add column if not exists printer_name text;

alter table public.orders drop constraint if exists orders_production_fields_check;
alter table public.orders
  add constraint orders_production_fields_check check (
    (print_minutes is null or print_minutes between 0 and 100000)
    and (filament_grams is null or filament_grams between 0 and 1000000)
    and (filament_material is null or filament_material in ('PLA', 'PETG'))
    and (production_colour is null or char_length(production_colour) <= 100)
    and (printer_name is null or char_length(printer_name) <= 100)
  ) not valid;

create index if not exists orders_open_due_date_idx
  on public.orders (due_date)
  where due_date is not null and status not in ('completed', 'cancelled');
