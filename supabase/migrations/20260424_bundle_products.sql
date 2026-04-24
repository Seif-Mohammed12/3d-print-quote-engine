-- Bundle products: bundles are first-class products with their own images/colors.
-- This migration introduces:
-- - products.is_bundle
-- - product_bundle_items mapping bundle product -> component products (any count)

alter table public.products
  add column if not exists is_bundle boolean not null default false;

create table if not exists public.product_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_product_id uuid not null references public.products(id) on delete cascade,
  component_product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null default 1 check (qty >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_bundle_items_bundle_sort_idx
  on public.product_bundle_items (bundle_product_id, sort_order, created_at);

create unique index if not exists product_bundle_items_unique_component
  on public.product_bundle_items (bundle_product_id, component_product_id);

alter table public.product_bundle_items enable row level security;

drop policy if exists "Public can read published bundle items" on public.product_bundle_items;
create policy "Public can read published bundle items"
on public.product_bundle_items
for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_bundle_items.bundle_product_id
      and p.is_published = true
  )
);

drop policy if exists "Authenticated users can manage bundle items" on public.product_bundle_items;
create policy "Authenticated users can manage bundle items"
on public.product_bundle_items
for all
to authenticated
using (true)
with check (true);

