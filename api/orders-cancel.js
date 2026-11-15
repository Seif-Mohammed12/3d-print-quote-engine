import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";

const CANCELLABLE_STATUSES = ["pending", "confirmed"];

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  try {
    const body = JSON.parse(event.body || "{}");
    const orderId = String(body?.orderId || "").trim();
    const reason = String(body?.reason || "").trim().slice(0, 500);

    if (!orderId) return json(400, { error: "Missing order ID" });

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, user_id, status, metadata")
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (findError) return json(500, { error: findError.message });
    if (!order) return json(404, { error: "Order not found" });

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return json(400, {
        error: `Order cannot be cancelled after ${order.status}. Allowed statuses: ${CANCELLABLE_STATUSES.join(", ")}`,
      });
    }

    const nextMetadata = {
      ...(order.metadata || {}),
      cancellation: {
        by: "customer",
        at: new Date().toISOString(),
        reason: reason || null,
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled", metadata: nextMetadata })
      .eq("id", orderId)
      .eq("user_id", auth.user.id)
      // Re-check the status in the same statement, so an order the studio moved to
      // "processing" a moment ago can't be cancelled by a request that raced it.
      .in("status", CANCELLABLE_STATUSES)
      .select("id, order_code, status")
      .maybeSingle();

    if (updateError) return json(500, { error: updateError.message });
    if (!updated) return json(409, { error: "This order can no longer be cancelled." });

    return json(200, { success: true, order: updated });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to cancel order" });
  }
};
