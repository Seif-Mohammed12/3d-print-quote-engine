import { getSupabaseForAuthVerify } from "./supabase-admin.js";
import { json } from "./http.js";

export async function requireUser(event) {
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
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: "Invalid or expired token" }) };
  }

  return { ok: true, user: data.user, token };
}
