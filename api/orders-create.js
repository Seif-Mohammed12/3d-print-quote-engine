import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";

function generateOrderCode(type) {
  const prefix = type === "quote" ? "QR" : "PO";
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  let userId = null;
  const auth = await requireUser(event);
  if (auth.ok) userId = auth.user.id;

  try {
    const body = JSON.parse(event.body || "{}");
    const orderType = body?.orderType === "quote" ? "quote" : "product";
    const customer = body?.customer || {};

    if (!customer?.name || !customer?.email) {
      return json(400, { error: "Missing customer name or email" });
    }

    const orderPayload = {
      order_code: generateOrderCode(orderType),
      order_type: orderType,
      status: "pending",
      user_id: userId,
      guest_token: userId ? null : body?.guestToken || null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      customer_notes: customer.notes || null,
      shipping: body?.shipping || null,
      payment: body?.payment || null,
      totals: body?.totals || null,
      metadata: body || null,
    };

    if (!orderPayload.user_id && !orderPayload.guest_token) {
      return json(400, { error: "Missing guest token for unauthenticated order" });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id, order_code, status, created_at")
      .single();

    if (orderErr) return json(500, { error: orderErr.message });

    const rawItems = Array.isArray(body?.items)
      ? body.items
      : body?.product
        ? [{
            productId: body.product.id,
            name: body.product.name,
            brand: body.brand || null,
            qty: body.product.qty || 1,
            unitPrice: body.product.unitPrice || null,
            subtotal: body.product.subtotal || null,
            ...body.product,
          }]
        : [];

    if (rawItems.length > 0) {
      const items = rawItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId || null,
        name: item.name || "Custom Order",
        brand: item.brand || null,
        qty: Math.max(1, Number(item.qty || 1)),
        unit_price: item.unitPrice != null ? Number(item.unitPrice) : null,
        subtotal: item.subtotal != null ? Number(item.subtotal) : null,
        item_data: item,
      }));

      const { error: itemErr } = await supabase.from("order_items").insert(items);
      if (itemErr) return json(500, { error: itemErr.message });
    }

    return json(200, { success: true, order });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to create order" });
  }
};
