import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";
import { isLegacyQuoteFlowEnabled, LEGACY_FLOW_DISABLED_MESSAGE } from "./_lib/legacy-flow.js";
import { getResendFromEmail, isResendConfigured, sendResendEmail } from "./_lib/resend.js";
import { buildAdminOrderHtml, buildCustomerOrderHtml, orderEmailSubjects } from "./_lib/order-email.js";
import {
  LIMITS,
  cleanText,
  generateOrderCode,
  isValidGuestToken,
  normalizeRequestedItems,
  priceProductOrder,
  totalsMismatch,
  validateCustomer,
  validatePayment,
  validateShipping,
} from "./_lib/order-pricing.js";

const UNIQUE_VIOLATION = "23505";

function nonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < 1e7 ? Math.round(n * 100) / 100 : null;
}

/** Load the trusted catalogue rows (and bundle contents) for the requested product ids. */
async function loadCatalogue(supabase, productIds) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, brand, name, base_price, discount_enabled, discount_price, is_published, is_bundle")
    .in("id", productIds);
  if (error) throw new Error("catalogue lookup failed");

  const productsById = Object.fromEntries((products || []).map((p) => [p.id, p]));
  const bundleIds = (products || []).filter((p) => p.is_bundle).map((p) => p.id);
  const bundleItemsByProduct = {};

  if (bundleIds.length > 0) {
    const { data: bundleItems, error: bundleError } = await supabase
      .from("product_bundle_items")
      .select("bundle_product_id, qty, component_product:component_product_id (id, name, slug)")
      .in("bundle_product_id", bundleIds)
      .order("sort_order", { ascending: true });
    if (bundleError) throw new Error("bundle lookup failed");

    for (const item of bundleItems || []) {
      if (!item.component_product?.id) continue;
      (bundleItemsByProduct[item.bundle_product_id] ||= []).push({
        productId: item.component_product.id,
        name: item.component_product.name,
        slug: item.component_product.slug || undefined,
        qty: Number(item.qty || 1),
      });
    }
  }

  return { productsById, bundleItemsByProduct };
}

/** Product order: everything about price comes from the database, never from the request. */
async function buildProductOrder(supabase, body) {
  const requested = normalizeRequestedItems(body);
  if (requested.error) return { status: 400, error: requested.error };
  const shipping = validateShipping(body?.shipping);
  if (shipping.error) return { status: 400, error: shipping.error };
  const payment = validatePayment(body?.payment);
  if (payment.error) return { status: 400, error: payment.error };

  const ids = [...new Set(requested.value.map((i) => i.productId))];
  const { productsById, bundleItemsByProduct } = await loadCatalogue(supabase, ids);
  const priced = priceProductOrder(requested.value, productsById, bundleItemsByProduct);
  if (priced.error) return { status: 409, error: priced.error };

  const { items, totals } = priced.value;
  if (totalsMismatch(body?.totals?.total, totals.total)) {
    return {
      status: 409,
      code: "PRICE_CHANGED",
      error: "Prices have changed since you opened checkout. Refresh the page to see the current prices.",
    };
  }

  return {
    value: {
      shipping: shipping.value,
      payment: payment.value,
      totals,
      items,
      metadata: {
        orderType: "product",
        pricing: "server",
        isMultiItem: items.length > 1,
        brand: items[0]?.brand || null,
      },
      itemRows: items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        brand: item.brand,
        qty: item.qty,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        item_data: item,
      })),
    },
  };
}

/**
 * Legacy custom-quote request. The figures are the browser's own estimate, so they are stored
 * as an unverified estimate for the studio to confirm, never as an agreed price.
 */
function buildQuoteOrder(body) {
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length > LIMITS.items) return { status: 400, error: "Too many items in this request." };

  const { guestToken: _guestToken, ...rest } = body;
  return {
    value: {
      shipping: null,
      payment: null,
      totals: body?.totals
        ? {
            subtotal: nonNegativeNumber(body.totals.subtotal),
            shipping: 0,
            total: nonNegativeNumber(body.totals.total),
            currency: "EGP",
          }
        : null,
      items: [],
      metadata: { ...rest, pricing: "client_estimate" },
      itemRows: rawItems.map((item) => ({
        product_id: null,
        name: cleanText(item?.name, 200) || "Custom Order",
        brand: cleanText(item?.brand, 40) || null,
        qty: Math.min(LIMITS.qty, Math.max(1, Math.trunc(Number(item?.qty)) || 1)),
        unit_price: nonNegativeNumber(item?.unitPrice),
        subtotal: nonNegativeNumber(item?.subtotal),
        item_data: item && typeof item === "object" ? item : null,
      })),
    },
  };
}

async function insertOrder(supabase, orderType, payload) {
  // Order codes are short, so retry on the rare collision instead of failing the checkout.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...payload, order_code: generateOrderCode(orderType) })
      .select("id, order_code, status, created_at")
      .single();
    if (!error) return data;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error("could not allocate an order code");
}

async function sendOrderEmails({ orderCode, customer, order }) {
  if (!isResendConfigured()) return false;
  const from = getResendFromEmail();
  const adminTo = process.env.ADMIN_EMAIL || "3d.print.ittt@gmail.com";
  const details = { orderCode, customer, ...order };
  const subjects = orderEmailSubjects(details);

  const results = await Promise.allSettled([
    sendResendEmail({ to: adminTo, from, subject: subjects.admin, html: buildAdminOrderHtml(details), reply_to: customer.email }),
    sendResendEmail({ to: customer.email, from, subject: subjects.customer, html: buildCustomerOrderHtml(details) }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("orders-create: email failed", result.reason?.status, result.reason?.message);
    }
  }
  return results.every((r) => r.status === "fulfilled");
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  const rawBody = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8").toString("utf8");
  if (Buffer.byteLength(rawBody) > LIMITS.bodyBytes) return json(413, { error: "Order is too large." });

  let body;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "Request body must be a JSON object." });
  }

  let userId = null;
  const auth = await requireUser(event);
  if (auth.ok) userId = auth.user.id;

  const guestToken = userId ? null : body.guestToken;
  if (!userId && !isValidGuestToken(guestToken)) {
    return json(400, { error: "Missing guest token for unauthenticated order" });
  }

  const customer = validateCustomer(body.customer);
  if (customer.error) return json(400, { error: customer.error });

  try {
    const orderType = body.orderType === "quote" ? "quote" : "product";
    // Quote orders only come from the retired STL flow; don't record one that can't be completed.
    if (orderType === "quote" && !isLegacyQuoteFlowEnabled()) {
      return json(410, { error: LEGACY_FLOW_DISABLED_MESSAGE, code: "LEGACY_FLOW_DISABLED" });
    }
    const built = orderType === "product" ? await buildProductOrder(supabase, body) : buildQuoteOrder(body);
    if (built.error) return json(built.status, { error: built.error, code: built.code });
    const order = built.value;

    const created = await insertOrder(supabase, orderType, {
      order_type: orderType,
      status: "pending",
      user_id: userId,
      guest_token: guestToken,
      customer_name: customer.value.name,
      customer_email: customer.value.email,
      customer_phone: customer.value.phone,
      customer_notes: customer.value.notes,
      shipping: order.shipping,
      payment: order.payment,
      totals: order.totals,
      metadata: order.metadata,
    });

    if (order.itemRows.length > 0) {
      const { error: itemErr } = await supabase
        .from("order_items")
        .insert(order.itemRows.map((row) => ({ ...row, order_id: created.id })));
      if (itemErr) {
        // Don't leave an order with no items behind.
        await supabase.from("orders").delete().eq("id", created.id);
        throw new Error(itemErr.message);
      }
    }

    // Product order emails are sent here, from validated data, so there is no public
    // "send an email with this content to this address" endpoint to abuse.
    const emailSent =
      orderType === "product"
        ? await sendOrderEmails({ orderCode: created.order_code, customer: customer.value, order })
        : undefined;

    return json(200, {
      success: true,
      order: created,
      totals: order.totals,
      items: orderType === "product" ? order.items : undefined,
      emailSent,
    });
  } catch (error) {
    console.error("orders-create failed:", error?.message);
    return json(500, { error: "We couldn't save your order. Please try again." });
  }
};
