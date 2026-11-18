import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { isUuid } from "./_lib/order-pricing.js";
import { touchesProductionFields, validateOrderPatch } from "./_lib/order-admin.js";

/**
 * Update one order's status, internal notes or production fields (manager or admin).
 *
 * Body: { orderId, patch: {...}, expectedUpdatedAt? }. When expectedUpdatedAt is sent, the update
 * only applies if the order hasn't changed since; otherwise 409 CONFLICT with the current order,
 * so two people can't silently overwrite each other.
 * The older body shape { orderId, status, adminNotes } is still accepted.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { orderId, expectedUpdatedAt } = body.value;
  if (!isUuid(orderId)) return json(400, { error: "orderId is required" });

  const rawPatch = body.value.patch ?? {
    ...(body.value.status ? { status: body.value.status } : {}),
    ...("adminNotes" in body.value ? { admin_notes: body.value.adminNotes } : {}),
  };
  const patch = validateOrderPatch(rawPatch);
  if (patch.error) return json(400, { error: patch.error });

  let query = supabase.from("orders").update(patch.value).eq("id", orderId);
  if (expectedUpdatedAt) {
    if (typeof expectedUpdatedAt !== "string" || Number.isNaN(Date.parse(expectedUpdatedAt))) {
      return json(400, { error: "expectedUpdatedAt must be a timestamp" });
    }
    query = query.eq("updated_at", expectedUpdatedAt);
  }

  const { data, error } = await query.select("*").maybeSingle();
  if (error) {
    if (touchesProductionFields(patch.value) && isMissingSchema(error)) return setupRequired("Production fields");
    return json(500, { error: error.message });
  }

  if (!data) {
    const { data: current } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!current) return json(404, { error: "Order not found" });
    const { guest_token: _g, metadata: _m, ...order } = current;
    return json(409, {
      code: "CONFLICT",
      error: `${order.order_code} was changed by someone else a moment ago. Review the latest version and try again.`,
      order,
    });
  }

  const { guest_token: _g, metadata: _m, ...order } = data;
  return json(200, { success: true, order });
};
