create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('pforge', 'printique')),
  name text not null,
  product_a_id uuid not null references public.products(id) on delete cascade,
  product_b_id uuid not null references public.products(id) on delete cascade,
  bundle_price numeric(10,2) not null check (bundle_price > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_bundles_products_distinct check (product_a_id <> product_b_id)
);

create index if not exists product_bundles_brand_sort_idx
  on public.product_bundles (brand, sort_order, created_at);

drop trigger if exists trg_product_bundles_updated_at on public.product_bundles;
create trigger trg_product_bundles_updated_at
before update on public.product_bundles
for each row
execute function public.set_updated_at();

alter table public.product_bundles enable row level security;

drop policy if exists "Public can read active bundles" on public.product_bundles;
create policy "Public can read active bundles"
on public.product_bundles
for select
using (is_active = true);

drop policy if exists "Authenticated users can manage bundles" on public.product_bundles;
create policy "Authenticated users can manage bundles"
on public.product_bundles
for all
to authenticated
using (true)
with check (true);

