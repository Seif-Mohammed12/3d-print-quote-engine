import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

/**
 * Link a product photo to one of the same product's option values, or clear the link
 * (optionValueId: null). Manager or admin.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { id, optionValueId } = body.value;
  if (!isUuidValue(id)) return json(400, { error: "Invalid photo id" });
  if (optionValueId !== null && !isUuidValue(optionValueId)) return json(400, { error: "Invalid option value" });

  const { data: image, error: imgErr } = await supabase.from("product_images").select("id, product_id").eq("id", id).maybeSingle();
  if (imgErr) return json(500, { error: imgErr.message });
  if (!image) return json(404, { error: "Photo not found" });

  if (optionValueId) {
    const { data: value, error: vErr } = await supabase
      .from("product_option_values")
      .select("id, product_option_groups!inner(product_id)")
      .eq("id", optionValueId)
      .maybeSingle();
    if (vErr) {
      if (isMissingSchema(vErr)) return setupRequired("Product options");
      return json(500, { error: vErr.message });
    }
    if (!value || value.product_option_groups?.product_id !== image.product_id) {
      return json(400, { error: "That option belongs to a different product" });
    }
  }

  const { error } = await supabase.from("product_images").update({ option_value_id: optionValueId }).eq("id", id);
  if (error) {
    if (isMissingSchema(error)) return setupRequired("Product options");
    return json(500, { error: error.message });
  }
  return json(200, { success: true });
};
