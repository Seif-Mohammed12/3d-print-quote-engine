-- Add grams column to products table for tracking filament weight
alter table if exists public.products
  add column if not exists grams numeric(8,2) default 0 check (grams >= 0);

-- Create admin stats table to track sales and filament usage
create table if not exists public.admin_order_stats (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  order_date timestamptz not null,
  order_type text not null check (order_type in ('site', 'manual')),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  revenue numeric(10,2) not null check (revenue >= 0),
  weight_grams numeric(10,2) not null default 0 check (weight_grams >= 0),
  item_count integer not null default 1,
  notes text,
  is_active boolean not null default true,
  is_completed boolean not null default true,
  linked_order_id uuid references public.orders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for efficient date range queries
create index if not exists admin_stats_date_idx
  on public.admin_order_stats (order_date desc, is_completed, is_active);

create index if not exists admin_stats_order_code_idx
  on public.admin_order_stats (order_code);

-- Enable RLS
alter table public.admin_order_stats enable row level security;

-- Policies: Only admins can read and manage stats
drop policy if exists "Admin stats read" on public.admin_order_stats;
create policy "Admin stats read"
on public.admin_order_stats
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin stats manage" on public.admin_order_stats;
create policy "Admin stats manage"
on public.admin_order_stats
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

-- Function to automatically create a stat entry when an order is created
create or replace function public.create_stat_from_completed_order()
returns trigger
language plpgsql
as $$
declare
  v_total_weight numeric(10,2);
  v_total_revenue numeric(10,2);
begin
  -- Only create stats entry when order reaches 'completed' status
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    -- Calculate total revenue from totals jsonb
    v_total_revenue := coalesce((new.totals->>'total')::numeric, 0);
    
    -- Calculate total weight from metadata
    v_total_weight := coalesce((new.metadata->>'totalWeight')::numeric, 0);
    
    insert into public.admin_order_stats (
      order_code,
      order_date,
      order_type,
      customer_name,
      customer_email,
      customer_phone,
      revenue,
      weight_grams,
      item_count,
      linked_order_id,
      is_completed,
      is_active,
      notes
    ) values (
      new.order_code,
      new.created_at,
      case when new.user_id is not null or (new.guest_token is not null) then 'site' else 'site' end,
      new.customer_name,
      new.customer_email,
      new.customer_phone,
      v_total_revenue,
      v_total_weight,
      1,
      new.id,
      true,
      true,
      'Auto-created from site order'
    );
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_order_stats_on_complete on public.orders;
create trigger trg_order_stats_on_complete
after insert or update on public.orders
for each row
execute function public.create_stat_from_completed_order();

-- Timestamp update trigger
create or replace function public.set_stats_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_stats_updated_at on public.admin_order_stats;
create trigger trg_admin_stats_updated_at
before update on public.admin_order_stats
for each row
execute function public.set_stats_updated_at();
