import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

/** Set the order categories appear in the shop (manager or admin). Body: { ids: [...] }. */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const ids = body.value.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every(isUuidValue)) {
    return json(400, { error: "ids must be a list of category ids" });
  }

  const results = await Promise.all(ids.map((id, idx) => supabase.from("product_categories").update({ sort_order: idx }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    if (isMissingSchema(failed.error)) return setupRequired("Categories");
    return json(500, { error: failed.error.message });
  }
  return json(200, { ok: true });
};
