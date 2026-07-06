create extension if not exists "pgcrypto";

create table if not exists public.stl_upload_jobs (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  original_name text not null,
  sanitized_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum text not null,
  storage_bucket text not null,
  storage_path text not null unique,
  status text not null default 'stored' check (status in ('stored', 'failed', 'deleted')),
  validation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stl_upload_jobs_user_created_idx
  on public.stl_upload_jobs (user_id, created_at desc);

create index if not exists stl_upload_jobs_status_created_idx
  on public.stl_upload_jobs (status, created_at desc);

drop trigger if exists trg_stl_upload_jobs_updated_at on public.stl_upload_jobs;
create trigger trg_stl_upload_jobs_updated_at
before update on public.stl_upload_jobs
for each row
execute function public.set_updated_at();

alter table public.stl_upload_jobs enable row level security;

drop policy if exists "Upload jobs self read" on public.stl_upload_jobs;
create policy "Upload jobs self read"
on public.stl_upload_jobs
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists "Upload jobs admin manage" on public.stl_upload_jobs;
create policy "Upload jobs admin manage"
on public.stl_upload_jobs
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

insert into storage.buckets (id, name, public)
values ('stl-uploads', 'stl-uploads', false)
on conflict (id) do nothing;