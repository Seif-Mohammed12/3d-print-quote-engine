import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

/** Set the library's order (manager or admin). Body: { ids: [library row ids in order] }. */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const ids = body.value.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(isUuidValue)) {
    return json(400, { error: "ids must be a list of colour ids" });
  }

  const results = await Promise.all(ids.map((id, idx) => supabase.from("color_library").update({ sort_order: idx }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return json(500, { error: failed.error.message });
  return json(200, { ok: true });
};
