import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

/**
 * Delete a category (manager or admin). Body: { id, expectedProductCount }.
 * Its products are kept and become uncategorised. The admin is shown the affected product count
 * first; if the count on the server differs (someone assigned products meanwhile), the delete is
 * refused so the warning they saw is never wrong.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { id, expectedProductCount } = body.value;
  if (!isUuidValue(id)) return json(400, { error: "Invalid id" });

  const { count, error: countErr } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (countErr) {
    if (isMissingSchema(countErr)) return setupRequired("Categories");
    return json(500, { error: countErr.message });
  }
  if (Number.isInteger(expectedProductCount) && expectedProductCount !== (count ?? 0)) {
    return json(409, {
      code: "COUNT_CHANGED",
      error: `This category now has ${count} product(s), not ${expectedProductCount}. Review and try again.`,
      productCount: count,
    });
  }

  const { error } = await supabase.from("product_categories").delete().eq("id", id);
  if (error) return json(500, { error: error.message });
  return json(200, { success: true, uncategorised: count ?? 0 });
};
