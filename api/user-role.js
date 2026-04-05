import { json } from "./_lib/http.js";
import { getSupabaseForAdminDb } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";

function parseAllowedAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseForAdminDb(auth.token);
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) return json(500, { error: error.message });

  const role = data?.role || null;
  const allowedEmails = parseAllowedAdminEmails();
  const isFallbackAdmin = Boolean(auth.user?.email && allowedEmails.includes(auth.user.email.toLowerCase()));
  const isAdmin = Boolean(role) || isFallbackAdmin;

  return json(200, {
    role: role || (isFallbackAdmin ? "admin" : null),
    isAdmin,
  });
};
