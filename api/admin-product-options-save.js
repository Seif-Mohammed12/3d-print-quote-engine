import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { cleanText, isUuidValue } from "./_lib/product-admin.js";

const DISPLAY = new Set(["buttons", "swatches", "dropdown"]);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_GROUPS = 10;
const MAX_VALUES = 40;

function validate(groups) {
  if (!Array.isArray(groups)) return { error: "groups must be a list" };
  if (groups.length > MAX_GROUPS) return { error: `At most ${MAX_GROUPS} option groups per product` };
  const out = [];
  const names = new Set();
  for (const [gi, g] of groups.entries()) {
    const name = cleanText(g?.name, 60);
    if (!name) return { error: `Option group ${gi + 1} needs a name` };
    if (names.has(name.toLowerCase())) return { error: `Two option groups are called “${name}”` };
    names.add(name.toLowerCase());
    if (g.id != null && !isUuidValue(g.id)) return { error: "Invalid option group id" };
    const displayType = DISPLAY.has(g.displayType) ? g.displayType : null;
    if (!displayType) return { error: `“${name}” needs a display type` };
    const values = Array.isArray(g.values) ? g.values : [];
    if (!values.length) return { error: `“${name}” needs at least one value` };
    if (values.length > MAX_VALUES) return { error: `“${name}” has more than ${MAX_VALUES} values` };
    const labels = new Set();
    const outValues = [];
    for (const [vi, v] of values.entries()) {
      const label = cleanText(v?.label, 60);
      if (!label) return { error: `“${name}” value ${vi + 1} needs a label` };
      if (labels.has(label.toLowerCase())) return { error: `“${name}” has two values called “${label}”` };
      labels.add(label.toLowerCase());
      if (v.id != null && !isUuidValue(v.id)) return { error: "Invalid option value id" };
      const price = Number(v.priceDelta ?? 0);
      const grams = Number(v.gramsDelta ?? 0);
      if (!Number.isFinite(price) || Math.abs(price) > 100000) return { error: `“${label}” price change is out of range` };
      if (!Number.isFinite(grams) || Math.abs(grams) > 100000) return { error: `“${label}” weight change is out of range` };
      const hex = v.swatchHex ? String(v.swatchHex).trim() : null;
      if (hex && !HEX_RE.test(hex)) return { error: `“${label}” swatch must look like #1A2B3C` };
      outValues.push({
        id: v.id || null,
        label,
        swatch_hex: hex,
        price_delta: Math.round(price * 100) / 100,
        grams_delta: Math.round(grams * 100) / 100,
        is_available: v.isAvailable !== false,
      });
    }
    const isRequired = g.isRequired !== false;
    if (isRequired && !outValues.some((v) => v.is_available)) {
      return { error: `“${name}” is required but has no available values, so nobody could order this product` };
    }
    out.push({ id: g.id || null, name, display_type: displayType, is_required: isRequired, values: outValues });
  }
  return { value: out };
}

/**
 * Save a product's option groups and values (manager or admin) in one transaction.
 * Body: { productId, groups: [{ id?, name, displayType, isRequired, values: [{ id?, label, swatchHex,
 * priceDelta, gramsDelta, isAvailable }] }] }. Removed values unlink their photos automatically.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event, 128 * 1024);
  if (body.response) return body.response;
  const { productId } = body.value;
  if (!isUuidValue(productId)) return json(400, { error: "Invalid productId" });

  const checked = validate(body.value.groups);
  if (checked.error) return json(400, { error: checked.error });

  // A price change can't take the product below zero.
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, base_price, discount_enabled, discount_price")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) return json(500, { error: pErr.message });
  if (!product) return json(404, { error: "Product not found" });
  const sale = Number(product.discount_price);
  const lowest = product.discount_enabled && sale > 0 ? sale : Number(product.base_price || 0);
  const totalNegative = checked.value.reduce((sum, g) => sum + Math.min(0, ...g.values.map((v) => v.price_delta)), 0);
  if (lowest + totalNegative < 0) return json(400, { error: "These price changes could make the product cost less than 0" });

  const { error } = await supabase.rpc("admin_save_product_options", { p_product_id: productId, p_groups: checked.value });
  if (error) {
    if (isMissingSchema(error) || /admin_save_product_options/.test(error.message || "")) return setupRequired("Product options");
    if (error.code === "P0001" || error.code === "P0002") return json(400, { error: error.message });
    return json(500, { error: error.message });
  }

  const { data: groups, error: gErr } = await supabase.from("product_option_groups").select("*").eq("product_id", productId).order("sort_order");
  if (gErr) return json(500, { error: gErr.message });
  const ids = (groups || []).map((g) => g.id);
  const { data: values, error: vErr } = ids.length
    ? await supabase.from("product_option_values").select("*").in("group_id", ids).order("sort_order")
    : { data: [], error: null };
  if (vErr) return json(500, { error: vErr.message });

  return json(200, { groups: groups || [], values: values || [] });
};
