import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };

export function getSupabaseAdmin() {
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, clientOptions);
}

/**
 * Admin API DB access: service role (bypasses RLS) when set; otherwise anon key + user's access token
 * so PostgREST runs as `authenticated` and RLS policies apply.
 */
export function getSupabaseForAdminDb(accessToken) {
  if (!url || !accessToken) return null;
  if (serviceRole) {
    return createClient(url, serviceRole, clientOptions);
  }
  if (!anonKey) return null;
  return createClient(url, anonKey, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/** Minimal client for auth.getUser(jwt); anon or service key both work. */
export function getSupabaseForAuthVerify() {
  if (!url) return null;
  const key = serviceRole || anonKey;
  if (!key) return null;
  return createClient(url, key, clientOptions);
}

/**
 * Public catalog reads: prefer service role if present; otherwise anon key (RLS allows published rows).
 */
export function getSupabaseForPublicRead() {
  if (!url) return null;
  if (serviceRole) {
    return createClient(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  if (anonKey) {
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

