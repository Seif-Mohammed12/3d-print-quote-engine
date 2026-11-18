import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { friendlyDbError, isUuidValue, normaliseDiscount, uniqueSlug, validateProductFields } from "./_lib/product-admin.js";

/**
 * Create or save a product (manager or admin).
 * New products are created as drafts unless the request explicitly publishes them, and saving
 * never changes the published flag unless `isPublished` is sent.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const payload = body.value;
  const id = payload.id || null;
  if (id && !isUuidValue(id)) return json(400, { error: "Invalid id" });

  const fields = validateProductFields(payload, { partial: Boolean(id) });
  if (fields.error) return json(400, { error: fields.error });
  const row = fields.value;

  let current = {};
  if (id) {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(404, { error: "Product not found" });
    current = data;
  }

  const discount = normaliseDiscount(row, current);
  if (discount.error) return json(400, { error: discount.error });

  try {
    if (id) {
      if ("slug" in row) row.slug = await uniqueSlug(supabase, row.slug, id);
      const { data, error } = await supabase.from("products").update(row).eq("id", id).select("*").single();
      if (error) {
        if ("category_id" in row && isMissingSchema(error)) return setupRequired("Categories");
        return json(400, { error: friendlyDbError(error) });
      }
      return json(200, { product: data });
    }

    // New product: a draft at the end of the catalogue unless told otherwise.
    const { data: last } = await supabase
      .from("products")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const insert = {
      brand: "pforge",
      short: "",
      description: "",
      stock_qty: 0,
      in_stock: true,
      is_published: false,
      is_bundle: false,
      sort_order: Number(last?.sort_order ?? -1) + 1,
      ...row,
    };
    insert.slug = await uniqueSlug(supabase, row.slug || row.name);
    const { data, error } = await supabase.from("products").insert(insert).select("*").single();
    if (error) {
      if ("category_id" in row && isMissingSchema(error)) return setupRequired("Categories");
      return json(400, { error: friendlyDbError(error) });
    }
    return json(200, { product: data });
  } catch (err) {
    return json(500, { error: err?.message || "Save failed" });
  }
};
