import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "PUT") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  try {
    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { error: "Missing stat ID" });

    const body = JSON.parse(event.body || "{}");
    const updates = {};
    if (body.weightGrams !== undefined) updates.weight_grams = Number(body.weightGrams);
    if (body.revenue !== undefined) updates.revenue = Number(body.revenue);
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.isCompleted !== undefined) updates.is_completed = Boolean(body.isCompleted);

    if (Object.keys(updates).length === 0) return json(400, { error: "No fields to update" });

    const { data: stat, error } = await supabase
      .from("admin_order_stats")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return json(500, { error: error.message });
    return json(200, { success: true, stat });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to update statistic" });
  }
};
