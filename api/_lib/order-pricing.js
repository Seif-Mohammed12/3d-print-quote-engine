import crypto from "node:crypto";

// Server-side validation and pricing for orders. The browser's prices, names and totals are
// never trusted for product orders: everything is rebuilt here from the products table.

export const LIMITS = {
  bodyBytes: 32 * 1024,
  items: 30,
  qty: 50,
  name: 100,
  email: 254,
  phone: 30,
  notes: 1000,
  addressLine: 200,
  city: 80,
  color: 60,
  guestTokenMin: 16,
  guestTokenMax: 128,
};

const EMAIL_RE = /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[^\s@<>"'(),;:\\]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_TOKEN_RE = /^[A-Za-z0-9_-]+$/;

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Trim, drop control characters, and cap the length. Non-strings become "". */
export function cleanText(value, max) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= LIMITS.email && EMAIL_RE.test(value);
}

export function isValidGuestToken(value) {
  return (
    typeof value === "string" &&
    value.length >= LIMITS.guestTokenMin &&
    value.length <= LIMITS.guestTokenMax &&
    GUEST_TOKEN_RE.test(value)
  );
}

export function validateCustomer(raw) {
  const name = cleanText(raw?.name, LIMITS.name);
  const email = cleanText(raw?.email, LIMITS.email + 1).toLowerCase();
  const phone = cleanText(raw?.phone, LIMITS.phone);
  const notes = cleanText(raw?.notes, LIMITS.notes);
  const address = cleanText(raw?.address, LIMITS.addressLine * 2);

  if (!name) return { error: "Please enter your name." };
  if (!isValidEmail(email)) return { error: "Please enter a valid email address." };

  return { value: { name, email, phone: phone || null, notes: notes || null, address: address || null } };
}

export function validateShipping(raw) {
  const method = raw?.method === "aramex" ? "aramex" : raw?.method === "pickup" ? "pickup" : null;
  if (!method) return { error: "Choose pickup or Aramex delivery." };
  if (method === "pickup") return { value: { method, provider: "Pickup", cost: 0, address: null } };

  const address = {
    line1: cleanText(raw?.address?.line1, LIMITS.addressLine),
    line2: cleanText(raw?.address?.line2, LIMITS.addressLine),
    city: cleanText(raw?.address?.city, LIMITS.city),
    governorate: cleanText(raw?.address?.governorate, LIMITS.city),
  };
  if (!address.line1 || !address.city || !address.governorate) {
    return { error: "Please fill in your shipping address." };
  }
  // Aramex cost is confirmed with the customer after the order, so it is recorded as 0 here.
  return { value: { method, provider: "Aramex", cost: 0, address } };
}

export function validatePayment(raw) {
  const method = raw?.method === "instapay" ? "instapay" : raw?.method === "cod" ? "cod" : null;
  if (!method) return { error: "Choose cash on delivery or InstaPay." };
  return { value: { method } };
}

/** Pull just the fields the browser is allowed to choose out of the request body. */
export function normalizeRequestedItems(body) {
  const source = Array.isArray(body?.items) ? body.items : body?.product ? [body.product] : [];
  if (source.length === 0) return { error: "Your order has no items." };
  if (source.length > LIMITS.items) return { error: `An order can hold at most ${LIMITS.items} different items.` };

  const items = [];
  for (const raw of source) {
    const productId = raw?.productId ?? raw?.id;
    if (!isUuid(productId)) return { error: "One of the items in your order is not a valid product." };
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.qty) {
      return { error: `Quantity must be a whole number between 1 and ${LIMITS.qty}.` };
    }
    items.push({
      productId: productId.toLowerCase(),
      qty,
      primaryColor: cleanText(raw?.primaryColor, LIMITS.color),
      secondaryColor: cleanText(raw?.secondaryColor, LIMITS.color),
    });
  }
  return { value: items };
}

function toMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

/** Same rule the storefront uses: the sale price wins when a discount is switched on. */
export function effectiveUnitPrice(row) {
  const base = Number(row?.base_price);
  const sale = Number(row?.discount_price);
  if (row?.discount_enabled && Number.isFinite(sale) && sale > 0) return toMoney(sale);
  return Number.isFinite(base) && base >= 0 ? toMoney(base) : NaN;
}

/**
 * Price requested items against trusted catalogue rows.
 * `productsById` maps product id -> products row; `bundleItemsByProduct` maps bundle id -> [{productId,name,slug,qty}].
 */
export function priceProductOrder(requested, productsById, bundleItemsByProduct = {}) {
  const items = [];
  let subtotal = 0;

  for (const line of requested) {
    const row = productsById[line.productId];
    if (!row || !row.is_published) {
      return { error: "One of the items in your order is no longer available. Please review your cart." };
    }
    const unitPrice = effectiveUnitPrice(row);
    if (!Number.isFinite(unitPrice)) return { error: "One of the items in your order has no price yet." };

    const lineSubtotal = toMoney(unitPrice * line.qty);
    subtotal = toMoney(subtotal + lineSubtotal);
    const isBundle = Boolean(row.is_bundle);
    const discounted = unitPrice !== toMoney(row.base_price);

    items.push({
      itemType: isBundle ? "bundle" : "product",
      isBundle,
      productId: row.id,
      brand: row.brand || null,
      name: row.name,
      qty: line.qty,
      unitPrice,
      subtotal: lineSubtotal,
      primaryColor: line.primaryColor,
      secondaryColor: line.secondaryColor,
      bundleItems: isBundle ? bundleItemsByProduct[row.id] || [] : [],
      discount: discounted ? { oldPrice: toMoney(row.base_price), newPrice: unitPrice } : null,
    });
  }

  return {
    value: {
      items,
      totals: { subtotal, shipping: 0, total: subtotal, currency: "EGP" },
    },
  };
}

/** True when the total the customer was shown differs from the authoritative one. */
export function totalsMismatch(clientTotal, serverTotal) {
  if (clientTotal === undefined || clientTotal === null || clientTotal === "") return false;
  const shown = Number(clientTotal);
  if (!Number.isFinite(shown)) return true;
  return Math.abs(shown - serverTotal) > 0.01;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateOrderCode(type, now = new Date()) {
  const prefix = type === "quote" ? "QR" : "PO";
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  let rand = "";
  for (const byte of crypto.randomBytes(4)) rand += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${prefix}-${y}${m}${d}-${rand}`;
}
