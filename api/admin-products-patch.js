import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { friendlyDbError, isUuidValue, normaliseDiscount, uniqueSlug, validateProductFields } from "./_lib/product-admin.js";

const INLINE_FIELDS = new Set([
  "name", "basePrice", "base_price", "discountEnabled", "discount_enabled", "discountPrice", "discount_price",
  "stockQty", "stock_qty", "inStock", "in_stock", "isPublished", "is_published", "categoryId", "category_id", "slug",
]);

/** Change a few fields of one product (inline editing). Body: { id, fields: {...} }. Manager or admin. */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { id, fields } = body.value;
  if (!isUuidValue(id)) return json(400, { error: "Invalid id" });
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return json(400, { error: "fields is required" });
  const unknown = Object.keys(fields).filter((k) => !INLINE_FIELDS.has(k));
  if (unknown.length) return json(400, { error: `These fields can't be edited inline: ${unknown.join(", ")}` });

  const validated = validateProductFields(fields, { partial: true });
  if (validated.error) return json(400, { error: validated.error });
  const row = validated.value;
  if (!Object.keys(row).length) return json(400, { error: "Nothing to update" });

  const { data: current, error: readErr } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (readErr) return json(500, { error: readErr.message });
  if (!current) return json(404, { error: "Product not found" });

  const discount = normaliseDiscount(row, current);
  if (discount.error) return json(400, { error: discount.error });

  try {
    if ("slug" in row) row.slug = await uniqueSlug(supabase, row.slug, id);
  } catch (err) {
    return json(500, { error: err?.message || "Slug check failed" });
  }

  const { data, error } = await supabase.from("products").update(row).eq("id", id).select("*").single();
  if (error) {
    if ("category_id" in row && isMissingSchema(error)) return setupRequired("Categories");
    return json(400, { error: friendlyDbError(error) });
  }
  return json(200, { product: data });
};
