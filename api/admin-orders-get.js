import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { hasColumn } from "./_lib/schema.js";
import { isUuid } from "./_lib/order-pricing.js";

/** One order with its items and status history (viewer and up). */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const id = event.queryStringParameters?.id;
  if (!isUuid(id)) return json(400, { error: "Invalid order id" });

  const [{ data: order, error }, { data: history, error: hErr }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(id, product_id, name, brand, qty, unit_price, subtotal, item_data)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_status_history")
      .select("id, old_status, new_status, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (error) return json(500, { error: error.message });
  if (!order) return json(404, { error: "Order not found" });
  if (hErr) return json(500, { error: hErr.message });

  let productionFields = false;
  try {
    productionFields = await hasColumn(supabase, "orders", "due_date");
  } catch {
    productionFields = false;
  }

  const { guest_token: _g, metadata: _m, ...safe } = order;
  return json(200, { order: safe, history: history || [], productionFields });
};
