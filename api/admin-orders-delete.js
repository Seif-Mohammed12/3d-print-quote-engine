import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

const MAX_BULK = 200;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "DELETE") return json(405, { error: "Method not allowed" });

  // Deleting orders is irreversible, so it needs the full admin role.
  const admin = await requireAdmin(event, { minRole: "admin" });
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const deleteAll = event.queryStringParameters?.all === "true";
  if (deleteAll) {
    // The database rejects a DELETE without a WHERE clause, so match every row explicitly.
    const { data, error } = await supabase.from("orders").delete().not("id", "is", null).select("id");
    if (error) return json(500, { error: error.message });
    return json(200, { success: true, message: "All orders deleted", count: Array.isArray(data) ? data.length : 0 });
  }

  // Bulk: DELETE with a JSON body { ids: [...] }.
  if (event.body) {
    const parsed = parseJsonBody(event);
    if (parsed.response) return parsed.response;
    const ids = parsed.value.ids;
    if (!Array.isArray(ids) || ids.length === 0) return json(400, { error: "Send ids: a non-empty list of order IDs." });
    if (ids.length > MAX_BULK) return json(400, { error: `Delete at most ${MAX_BULK} orders at a time.` });
    const unique = [...new Set(ids)];
    if (!unique.every(isUuidValue)) return json(400, { error: "Every id must be an order ID." });

    const { data, error } = await supabase.from("orders").delete().in("id", unique).select("id, order_code");
    if (error) return json(500, { error: error.message });
    const deleted = Array.isArray(data) ? data : [];
    const found = new Set(deleted.map((row) => row.id));
    return json(200, {
      success: true,
      deleted,
      missing: unique.filter((id) => !found.has(id)),
    });
  }

  const id = event.queryStringParameters?.id;
  if (!id) return json(400, { error: "Missing order ID" });

  const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id, order_code").single();
  if (error) return json(500, { error: error.message });

  return json(200, { success: true, message: "Order deleted", order: data });
};
