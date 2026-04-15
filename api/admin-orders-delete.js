import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const deleteAll = event.queryStringParameters?.all === "true";
  if (deleteAll) {
    const { data, error } = await supabase.from("orders").delete().select("id");
    if (error) return json(500, { error: error.message });
    return json(200, { success: true, message: "All orders deleted", count: Array.isArray(data) ? data.length : 0 });
  }

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "Missing order ID" });

  const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id, order_code").single();
  if (error) return json(500, { error: error.message });

  return json(200, { success: true, message: "Order deleted", order: data });
};