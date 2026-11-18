import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody } from "./_lib/schema.js";
import { isUuid } from "./_lib/order-pricing.js";
import { ORDER_STATUSES } from "./_lib/order-admin.js";

const MAX = 100;

/**
 * Set the same status on several orders (manager or admin). Body: { orderIds, status }.
 * Each order is updated on its own and recorded in its status history by the existing trigger;
 * the response lists which succeeded and which didn't.
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
  const { orderIds, status } = body.value;
  if (!ORDER_STATUSES.includes(status)) return json(400, { error: "Invalid status" });
  if (!Array.isArray(orderIds) || !orderIds.length || orderIds.length > MAX || !orderIds.every(isUuid)) {
    return json(400, { error: `orderIds must be 1–${MAX} order ids` });
  }

  const updated = [];
  const failed = [];
  for (const id of [...new Set(orderIds)]) {
    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("id, status, updated_at").maybeSingle();
    if (error) failed.push({ id, error: error.message });
    else if (!data) failed.push({ id, error: "Order not found" });
    else updated.push(data);
  }
  return json(200, { updated, failed });
};
