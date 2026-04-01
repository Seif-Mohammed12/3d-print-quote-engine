import { getSupabaseAdmin } from "./supabase-admin.js";
import { json } from "./http.js";

function parseAllowedAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(event) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { ok: false, response: json(401, { error: "Missing authorization token" }) };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, response: json(500, { error: "Server misconfigured: Supabase env vars are missing" }) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { ok: false, response: json(401, { error: "Invalid or expired token" }) };
  }

  const userEmail = data.user.email.toLowerCase();
  const allowed = parseAllowedAdminEmails();
  if (!allowed.includes(userEmail)) {
    return { ok: false, response: json(403, { error: "Not authorized for admin actions" }) };
  }

  return { ok: true, user: data.user, supabase };
}

