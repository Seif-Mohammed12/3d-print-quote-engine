create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('pforge', 'printique')),
  slug text not null unique,
  name text not null,
  short text not null default '',
  description text not null default '',
  base_price numeric(10,2) not null check (base_price >= 0),
  discount_enabled boolean not null default false,
  discount_price numeric(10,2),
  stock_qty integer not null default 0,
  in_stock boolean not null default true,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_discount_price_check
    check (
      (discount_enabled = false and discount_price is null)
      or (discount_enabled = true and discount_price is not null and discount_price >= 0)
    )
);

create index if not exists products_brand_published_sort_idx
  on public.products (brand, is_published, sort_order, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text not null,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order, created_at);

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  role text not null check (role in ('primary', 'secondary')),
  color_id text not null,
  name text not null,
  hex text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_colors_product_role_sort_idx
  on public.product_colors (product_id, role, sort_order, created_at);

create unique index if not exists product_colors_unique_per_role
  on public.product_colors (product_id, role, color_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_colors enable row level security;

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
on public.products
for select
using (is_published = true);

drop policy if exists "Public can read published product images" on public.product_images;
create policy "Public can read published product images"
on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id and p.is_published = true
  )
);

drop policy if exists "Public can read published product colors" on public.product_colors;
create policy "Public can read published product colors"
on public.product_colors
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_colors.product_id and p.is_published = true
  )
);

drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Authenticated users can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage product images" on public.product_images;
create policy "Authenticated users can manage product images"
on public.product_images
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage product colors" on public.product_colors;
create policy "Authenticated users can manage product colors"
on public.product_colors
for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
