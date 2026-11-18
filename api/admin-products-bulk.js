import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { friendlyDbError, isUuidValue } from "./_lib/product-admin.js";

const ACTIONS = new Set(["publish", "unpublish", "in_stock", "out_of_stock", "set_category", "delete"]);
const MAX_IDS = 200;

/**
 * Apply one action to several products (manager or admin).
 * Body: { ids: [...], action, categoryId? }. Each product is handled on its own; the response
 * lists which ones succeeded and which failed, so a partial failure is never hidden.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { ids, action, categoryId } = body.value;
  if (!ACTIONS.has(action)) return json(400, { error: "Unknown action" });
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_IDS || !ids.every(isUuidValue)) {
    return json(400, { error: `ids must be 1–${MAX_IDS} product ids` });
  }
  const unique = [...new Set(ids)];

  if (action === "delete") {
    const done = [];
    const failed = [];
    const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
    for (const id of unique) {
      const { data: images } = await supabase.from("product_images").select("image_path").eq("product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        failed.push({ id, error: friendlyDbError(error) });
        continue;
      }
      // Only remove the photo files once the product row is gone.
      const paths = (images || []).map((i) => i.image_path).filter(Boolean);
      if (paths.length) await supabase.storage.from(bucket).remove(paths);
      done.push(id);
    }
    return json(200, { done, failed });
  }

  let patch;
  if (action === "publish") patch = { is_published: true };
  if (action === "unpublish") patch = { is_published: false };
  if (action === "in_stock") patch = { in_stock: true };
  if (action === "out_of_stock") patch = { in_stock: false };
  if (action === "set_category") {
    if (categoryId !== null && !isUuidValue(categoryId)) return json(400, { error: "Invalid category" });
    patch = { category_id: categoryId };
  }

  const { data, error } = await supabase.from("products").update(patch).in("id", unique).select("id");
  if (error) {
    if (action === "set_category" && isMissingSchema(error)) return setupRequired("Categories");
    return json(400, { error: friendlyDbError(error) });
  }
  const done = (data || []).map((r) => r.id);
  const failed = unique.filter((id) => !done.includes(id)).map((id) => ({ id, error: "Product not found" }));
  return json(200, { done, failed, patch });
};
