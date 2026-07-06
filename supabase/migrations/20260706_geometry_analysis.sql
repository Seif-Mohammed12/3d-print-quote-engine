create extension if not exists "pgcrypto";

create table if not exists public.geometry_analysis_jobs (
  id uuid primary key,
  stl_upload_job_id uuid not null references public.stl_upload_jobs(id) on delete cascade,
  file_name text not null,
  file_size bigint not null check (file_size > 0),
  bounding_box jsonb not null,
  width numeric(12,4) not null,
  height numeric(12,4) not null,
  depth numeric(12,4) not null,
  mesh_volume numeric(16,6) not null,
  surface_area numeric(16,6) not null,
  triangle_count integer not null check (triangle_count >= 0),
  face_count integer not null check (face_count >= 0),
  watertight boolean not null,
  non_manifold boolean not null,
  estimated_complexity text not null check (estimated_complexity in ('low', 'medium', 'high')),
  aspect_ratio numeric(12,6) not null,
  center_of_mass jsonb not null,
  analysis jsonb not null,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists geometry_analysis_jobs_upload_unique
  on public.geometry_analysis_jobs (stl_upload_job_id);

create index if not exists geometry_analysis_jobs_analyzed_at_idx
  on public.geometry_analysis_jobs (analyzed_at desc);

create index if not exists geometry_analysis_jobs_complexity_idx
  on public.geometry_analysis_jobs (estimated_complexity, analyzed_at desc);

drop trigger if exists trg_geometry_analysis_jobs_updated_at on public.geometry_analysis_jobs;
create trigger trg_geometry_analysis_jobs_updated_at
before update on public.geometry_analysis_jobs
for each row
execute function public.set_updated_at();

alter table public.geometry_analysis_jobs enable row level security;

drop policy if exists "Geometry analysis self read" on public.geometry_analysis_jobs;
create policy "Geometry analysis self read"
on public.geometry_analysis_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.stl_upload_jobs u
    where u.id = geometry_analysis_jobs.stl_upload_job_id
      and (u.user_id = auth.uid() or public.is_admin_user(auth.uid()))
  )
);

drop policy if exists "Geometry analysis admin manage" on public.geometry_analysis_jobs;
create policy "Geometry analysis admin manage"
on public.geometry_analysis_jobs
for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
