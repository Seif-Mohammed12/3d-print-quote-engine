import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  const deleteAll = event.queryStringParameters?.all === "true";
  if (deleteAll) {
    const { data: stats, error } = await supabase
      .from("admin_order_stats")
      .update({ is_active: false })
      .eq("is_active", true)
      .select("id");

    if (error) return json(500, { error: error.message });

    return json(200, {
      success: true,
      message: "All statistics entries deactivated",
      count: Array.isArray(stats) ? stats.length : 0,
    });
  }

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "Missing stat ID" });

  const { data: stat, error } = await supabase
    .from("admin_order_stats")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) return json(500, { error: error.message });

  return json(200, { success: true, message: "Statistic deactivated", stat });
};
