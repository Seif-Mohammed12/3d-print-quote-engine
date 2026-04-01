# Supabase Setup

1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/20260331_admin_catalog.sql`.
3. In Authentication, create at least one admin user (email/password).
4. Set environment variables in Netlify and local `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PRODUCT_IMAGES_BUCKET` (default `product-images`)
   - `ADMIN_EMAILS` (comma-separated admin emails)
5. Ensure bucket `product-images` exists and is public.

## Note on RLS and admin APIs

The app uses authenticated Supabase sessions in the browser. Admin write actions are executed through Netlify Functions with service role credentials and an explicit admin email allowlist (`ADMIN_EMAILS`).
