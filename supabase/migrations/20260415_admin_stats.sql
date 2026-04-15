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
  v_total_weight numeric(10,2) := 0;
  v_total_revenue numeric(10,2) := 0;
  v_total_text text;
  v_weight_text text;
begin
  -- Only act when order becomes completed (insert as completed OR status transition to completed).
  if new.status = 'completed' and (tg_op = 'INSERT' or coalesce(old.status, '') <> 'completed') then
    v_total_text := coalesce(new.totals->>'total', '');
    if v_total_text ~ '^[0-9]+(\.[0-9]+)?$' then
      v_total_revenue := v_total_text::numeric;
    end if;

    v_weight_text := coalesce(new.metadata->>'totalWeight', '');
    if v_weight_text = '' then
      v_weight_text := coalesce(new.metadata->>'weightGrams', '');
    end if;
    if v_weight_text ~ '^[0-9]+(\.[0-9]+)?$' then
      v_total_weight := v_weight_text::numeric;
    end if;

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
      'site',
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
    )
    on conflict (order_code) do update
      set order_date = excluded.order_date,
          customer_name = excluded.customer_name,
          customer_email = excluded.customer_email,
          customer_phone = excluded.customer_phone,
          revenue = excluded.revenue,
          weight_grams = excluded.weight_grams,
          linked_order_id = excluded.linked_order_id,
          is_completed = true,
          is_active = true,
          notes = excluded.notes,
          updated_at = now();
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
