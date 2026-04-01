create table if not exists public.color_library (
  id uuid primary key default gen_random_uuid(),
  color_id text not null unique,
  name text not null,
  hex text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists color_library_sort_name_idx
  on public.color_library (sort_order, name);

drop trigger if exists trg_color_library_updated_at on public.color_library;
create trigger trg_color_library_updated_at
before update on public.color_library
for each row
execute function public.set_updated_at();

alter table public.color_library enable row level security;

drop policy if exists "Authenticated users can manage color library" on public.color_library;
create policy "Authenticated users can manage color library"
on public.color_library
for all
to authenticated
using (true)
with check (true);

-- Seed from colors already used on products (one row per distinct color_id)
insert into public.color_library (color_id, name, hex, sort_order)
select distinct on (pc.color_id)
  pc.color_id,
  pc.name,
  pc.hex,
  0
from public.product_colors pc
order by pc.color_id, pc.created_at asc
on conflict (color_id) do nothing;
