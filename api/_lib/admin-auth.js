import { getSupabaseForAdminDb, getSupabaseForAuthVerify } from "./supabase-admin.js";
import { json } from "./http.js";

function parseAllowedAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

const ROLE_RANK = { viewer: 1, manager: 2, admin: 3 };

async function getDbAdminRole(authClient, userId) {
  const { data, error } = await authClient
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return ROLE_RANK[data.role] ? data.role : null;
}

/**
 * Verifies the caller's Supabase token and their admin role.
 *
 * `minRole` defaults by HTTP method: reads (GET) need at least "viewer", anything that changes
 * data needs at least "manager". Pass { minRole: "admin" } for destructive actions.
 */
export async function requireAdmin(event, { minRole } = {}) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { ok: false, response: json(401, { error: "Missing authorization token" }) };
  }

  const authClient = getSupabaseForAuthVerify();
  if (!authClient) {
    return { ok: false, response: json(500, { error: "Server misconfigured: Supabase env vars are missing" }) };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { ok: false, response: json(401, { error: "Invalid or expired token" }) };
  }

  const supabase = getSupabaseForAdminDb(token);
  if (!supabase) {
    return { ok: false, response: json(500, { error: "Server misconfigured: Supabase env vars are missing" }) };
  }

  let role = await getDbAdminRole(supabase, data.user.id);
  if (!role) {
    // Temporary compatibility fallback while teams migrate current admins to public.admin_users.
    // Only a confirmed email counts: otherwise anyone could sign up with an allowlisted
    // address that has no account yet and become an admin without ever proving they own it.
    const userEmail = data.user.email.toLowerCase();
    const allowed = parseAllowedAdminEmails();
    const emailConfirmed = Boolean(data.user.email_confirmed_at || data.user.confirmed_at);
    if (!emailConfirmed || !allowed.includes(userEmail)) {
      return { ok: false, response: json(403, { error: "Not authorized for admin actions" }) };
    }
    role = "admin";
  }

  const required = minRole || (event?.httpMethod === "GET" ? "viewer" : "manager");
  if (ROLE_RANK[role] < (ROLE_RANK[required] || ROLE_RANK.admin)) {
    return { ok: false, response: json(403, { error: `Your admin role (${role}) can't do this.` }) };
  }

  return { ok: true, user: data.user, supabase, role };
}

