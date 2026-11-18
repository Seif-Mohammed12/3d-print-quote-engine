import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { hasColumn } from "./_lib/schema.js";

// Every order with its items, newest first. Guest tokens are stripped: they let whoever holds
// one claim the order, and the admin UI never needs them.
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(id, product_id, name, brand, qty, unit_price, subtotal, item_data)")
    .order("created_at", { ascending: false });

  if (error) return json(500, { error: error.message });

  let productionFields = false;
  try {
    productionFields = await hasColumn(supabase, "orders", "due_date");
  } catch {
    productionFields = false;
  }

  const orders = (data || []).map(({ guest_token: _guestToken, metadata: _metadata, ...order }) => order);
  return json(200, { orders, productionFields });
};
