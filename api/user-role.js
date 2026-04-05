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

function logDebug(message, data) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[USER-ROLE-DEBUG ${timestamp}] ${message}${dataStr}`);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  logDebug('Request received', { userId: auth.user.id, email: auth.user.email });

  const supabase = getSupabaseForAdminDb(auth.token);
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    logDebug('DB query error', { error: error.message });
    return json(500, { error: error.message });
  }

  const role = data?.role || null;
  logDebug('DB query result', { userId: auth.user.id, roleFound: role, hadRow: Boolean(data) });

  const allowedEmails = parseAllowedAdminEmails();
  const adminEmailsSet = Boolean(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);
  logDebug('Email allowlist check', { 
    userEmail: auth.user.email, 
    adminEmailsConfigured: adminEmailsSet,
    emaiCount: allowedEmails.length 
  });

  const isFallbackAdmin = Boolean(auth.user?.email && allowedEmails.includes(auth.user.email.toLowerCase()));
  logDebug('Email fallback result', { isFallbackAdmin, isInAllowlist: isFallbackAdmin });

  const isAdmin = Boolean(role) || isFallbackAdmin;
  const resolvedRole = role || (isFallbackAdmin ? "admin" : null);
  const roleSource = role ? 'DB' : (isFallbackAdmin ? 'email-allowlist' : 'none');
  
  logDebug('Final role decision', { 
    role: resolvedRole, 
    isAdmin, 
    source: roleSource,
    userId: auth.user.id
  });

  return json(200, {
    role: resolvedRole,
    isAdmin,
  });
};
