import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  try {
    const body = JSON.parse(event.body || "{}");
    const { orderCode, orderDate, customerName, customerEmail, customerPhone, revenue, weightGrams, notes } = body;

    if (!orderCode || !orderDate || !customerName || revenue === undefined || weightGrams === undefined) {
      return json(400, { error: "Missing required fields: orderCode, orderDate, customerName, revenue, weightGrams" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("admin_order_stats")
      .select("id")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (existingError) return json(500, { error: existingError.message });
    if (existing) return json(409, { error: "Order code already exists" });

    const { data: stat, error } = await supabase
      .from("admin_order_stats")
      .insert({
        order_code: orderCode,
        order_date: new Date(orderDate).toISOString(),
        order_type: "manual",
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        revenue: Number(revenue),
        weight_grams: Number(weightGrams),
        item_count: 1,
        notes: notes || null,
        is_active: true,
        is_completed: true,
      })
      .select()
      .single();

    if (error) return json(500, { error: error.message });

    return json(200, { success: true, stat, userId: admin.user.id });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to add order to statistics" });
  }
};
