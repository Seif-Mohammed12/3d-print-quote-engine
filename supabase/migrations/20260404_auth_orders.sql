create extension if not exists "pgcrypto";

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('viewer', 'manager', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  order_type text not null check (order_type in ('quote', 'product')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
  user_id uuid references auth.users(id) on delete set null,
  guest_token text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_notes text,
  shipping jsonb,
  payment jsonb,
  totals jsonb,
  metadata jsonb,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_identity_check check (user_id is not null or guest_token is not null)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  brand text,
  qty integer not null default 1,
  unit_price numeric(10,2),
  subtotal numeric(10,2),
  item_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists orders_guest_created_idx on public.orders(guest_token, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id, created_at asc);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at desc);

create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.id = p_user_id
  );
$$;

create or replace function public.capture_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), 'Order created');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), null);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customer_profiles_updated_at on public.customer_profiles;
create trigger trg_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_status_history on public.orders;
create trigger trg_orders_status_history
after insert or update on public.orders
for each row execute function public.capture_order_status_change();

alter table public.customer_profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists "Profiles self read" on public.customer_profiles;
create policy "Profiles self read"
on public.customer_profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Profiles self upsert" on public.customer_profiles;
create policy "Profiles self upsert"
on public.customer_profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admin users self read" on public.admin_users;
create policy "Admin users self read"
on public.admin_users
for select
to authenticated
using (id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Admin users admin manage" on public.admin_users;
create policy "Admin users admin manage"
on public.admin_users
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Orders self read" on public.orders;
create policy "Orders self read"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Orders self insert" on public.orders;
create policy "Orders self insert"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Orders self update" on public.orders;
create policy "Orders self update"
on public.orders
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user(auth.uid()))
with check (user_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Orders admin delete" on public.orders;
create policy "Orders admin delete"
on public.orders
for delete
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Order items read" on public.order_items;
create policy "Order items read"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin_user(auth.uid()))
  )
);

drop policy if exists "Order items write" on public.order_items;
create policy "Order items write"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin_user(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin_user(auth.uid()))
  )
);

drop policy if exists "Order history read" on public.order_status_history;
create policy "Order history read"
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id
      and (o.user_id = auth.uid() or public.is_admin_user(auth.uid()))
  )
);

drop policy if exists "Order history admin write" on public.order_status_history;
create policy "Order history admin write"
on public.order_status_history
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authenticated users can manage products" on public.products;
create policy "Admin users can manage products"
on public.products
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authenticated users can manage product images" on public.product_images;
create policy "Admin users can manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authenticated users can manage product colors" on public.product_colors;
create policy "Admin users can manage product colors"
on public.product_colors
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Authenticated users can manage color library" on public.color_library;
create policy "Admin users can manage color library"
on public.color_library
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));