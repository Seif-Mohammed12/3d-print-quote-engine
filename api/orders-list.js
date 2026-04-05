import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_code, order_type, status, customer_name, customer_email, totals, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return json(500, { error: error.message });

  return json(200, { orders: data || [] });
};
