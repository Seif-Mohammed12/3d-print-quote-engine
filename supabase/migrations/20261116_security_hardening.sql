-- Security hardening (audit 2026-11-16). Run once in the Supabase SQL Editor, after all
-- earlier migrations. Safe to re-run.
--
-- What it closes:
--   1. product_bundles / product_bundle_items were writable by ANY signed-in customer
--      (policies "using (true)" were never replaced when the other catalogue tables were).
--   2. Customers could rewrite their own orders and order items directly through the
--      Supabase API (status, totals, prices), bypassing the server's checks.
--   3. Any admin_users row, including role 'viewer', could edit admin_users and promote itself.
--   4. is_admin_user() ran with the caller's rights, so it depended on (and could recurse
--      through) the RLS policies that call it.
--   5. The public product-images bucket accepted any file type and size.
--
-- The site's Netlify functions use the service-role key, which bypasses RLS, so storefront,
-- checkout, order history and the admin area keep working unchanged.

-- 1. Admin helpers -----------------------------------------------------------------------

create or replace function public.is_admin_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.id = p_user_id
  );
$$;

-- True when the CURRENT user holds one of the given admin roles.
create or replace function public.has_admin_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.role = any (p_roles)
  );
$$;

revoke all on function public.is_admin_user(uuid) from public, anon;
revoke all on function public.has_admin_role(text[]) from public, anon;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;
grant execute on function public.has_admin_role(text[]) to authenticated, service_role;

-- 2. admin_users: only full admins manage the admin list ---------------------------------

drop policy if exists "Admin users admin manage" on public.admin_users;
create policy "Admin users admin manage"
on public.admin_users
for all
to authenticated
using (public.has_admin_role(array['admin']))
with check (public.has_admin_role(array['admin']));

-- 3. Catalogue: writes need manager or admin (viewers stay read-only) ---------------------

drop policy if exists "Admin users can manage products" on public.products;
create policy "Admin users can manage products"
on public.products
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Admin users can read all products" on public.products;
create policy "Admin users can read all products"
on public.products
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin users can manage product images" on public.product_images;
create policy "Admin users can manage product images"
on public.product_images
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Admin users can read all product images" on public.product_images;
create policy "Admin users can read all product images"
on public.product_images
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin users can manage product colors" on public.product_colors;
create policy "Admin users can manage product colors"
on public.product_colors
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Admin users can read all product colors" on public.product_colors;
create policy "Admin users can read all product colors"
on public.product_colors
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admin users can manage color library" on public.color_library;
create policy "Admin users can manage color library"
on public.color_library
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Admin users can read color library" on public.color_library;
create policy "Admin users can read color library"
on public.color_library
for select
to authenticated
using (public.is_admin_user(auth.uid()));

-- These two were open to every signed-in user.
drop policy if exists "Authenticated users can manage bundles" on public.product_bundles;
drop policy if exists "Admin users can manage bundles" on public.product_bundles;
create policy "Admin users can manage bundles"
on public.product_bundles
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Authenticated users can manage bundle items" on public.product_bundle_items;
drop policy if exists "Admin users can manage bundle items" on public.product_bundle_items;
create policy "Admin users can manage bundle items"
on public.product_bundle_items
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

-- 4. Orders: customers read their own; only the server and admins write ------------------
-- Orders are created by /api/orders-create and cancelled by /api/orders-cancel, which
-- validate prices and allowed status changes. Direct customer writes skipped all of that.

drop policy if exists "Orders self insert" on public.orders;
drop policy if exists "Orders admin insert" on public.orders;
create policy "Orders admin insert"
on public.orders
for insert
to authenticated
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Orders self update" on public.orders;
drop policy if exists "Orders admin update" on public.orders;
create policy "Orders admin update"
on public.orders
for update
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Orders admin delete" on public.orders;
create policy "Orders admin delete"
on public.orders
for delete
to authenticated
using (public.has_admin_role(array['admin']));

drop policy if exists "Order items write" on public.order_items;
drop policy if exists "Order items admin write" on public.order_items;
create policy "Order items admin write"
on public.order_items
for all
to authenticated
using (public.has_admin_role(array['manager', 'admin']))
with check (public.has_admin_role(array['manager', 'admin']));

drop policy if exists "Order history admin write" on public.order_status_history;
create policy "Order history admin write"
on public.order_status_history
for insert
to authenticated
with check (public.has_admin_role(array['manager', 'admin']));

-- 5. Schema invariants -------------------------------------------------------------------
-- NOT VALID: enforced for new and changed rows without failing on any historic data.

alter table public.order_items drop constraint if exists order_items_qty_check;
alter table public.order_items
  add constraint order_items_qty_check check (qty >= 1 and qty <= 1000) not valid;

alter table public.order_items drop constraint if exists order_items_amounts_check;
alter table public.order_items
  add constraint order_items_amounts_check
  check ((unit_price is null or unit_price >= 0) and (subtotal is null or subtotal >= 0)) not valid;

-- 6. Storage: product photos only --------------------------------------------------------
-- The bucket stays public for reading. Uploads go through the admin API (service role);
-- these limits also apply to any upload path added later.

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
where id = 'product-images';
