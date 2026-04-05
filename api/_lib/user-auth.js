import { getSupabaseForAuthVerify } from "./supabase-admin.js";
import { json } from "./http.js";

function logDebug(message, data) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[AUTH-DEBUG ${timestamp}] ${message}${dataStr}`);
}

export async function requireUser(event) {
  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    logDebug('Token validation failed', { reason: 'Missing token' });
    return { ok: false, response: json(401, { error: "Missing authorization token" }) };
  }

  const authClient = getSupabaseForAuthVerify();
  if (!authClient) {
    logDebug('Token validation failed', { reason: 'Supabase client not configured' });
    return { ok: false, response: json(500, { error: "Server misconfigured: Supabase env vars are missing" }) };
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    logDebug('Token validation failed', { 
      reason: error ? 'JWT error' : 'No user in token',
      error: error?.message 
    });
    return { ok: false, response: json(401, { error: "Invalid or expired token" }) };
  }

  logDebug('Token validation succeeded', { userId: data.user.id, email: data.user.email });
  return { ok: true, user: data.user, token };
}
