import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";

const allowed = new Set(["pending", "confirmed", "processing", "shipped", "completed", "cancelled"]);

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  try {
    const body = JSON.parse(event.body || "{}");
    if (!body?.orderId || !body?.status) return json(400, { error: "orderId and status are required" });
    if (!allowed.has(body.status)) return json(400, { error: "Invalid status" });

    const { data, error } = await supabase
      .from("orders")
      .update({ status: body.status, admin_notes: body.adminNotes || null })
      .eq("id", body.orderId)
      .select("id, order_code, status, admin_notes")
      .single();

    if (error) return json(500, { error: error.message });
    return json(200, { success: true, order: data });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to update order" });
  }
};
