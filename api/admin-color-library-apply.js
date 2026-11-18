import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody } from "./_lib/schema.js";
import { isUuidValue } from "./_lib/product-admin.js";

/**
 * Add a library colour to several products at once (manager or admin).
 * Body: { colorId, role: "primary" | "secondary", productIds: [...] }.
 * Products that already have the colour in that role are skipped, not duplicated.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { colorId, role, productIds } = body.value;
  if (typeof colorId !== "string" || !colorId) return json(400, { error: "colorId is required" });
  if (!["primary", "secondary"].includes(role)) return json(400, { error: "role must be primary or secondary" });
  if (!Array.isArray(productIds) || !productIds.length || productIds.length > 200 || !productIds.every(isUuidValue)) {
    return json(400, { error: "productIds must be 1–200 product ids" });
  }

  const { data: colour, error: colourErr } = await supabase.from("color_library").select("*").eq("color_id", colorId).maybeSingle();
  if (colourErr) return json(500, { error: colourErr.message });
  if (!colour) return json(404, { error: "Library colour not found" });

  const ids = [...new Set(productIds)];
  const { data: existing, error: exErr } = await supabase
    .from("product_colors")
    .select("product_id, color_id, sort_order")
    .in("product_id", ids)
    .eq("role", role);
  if (exErr) return json(500, { error: exErr.message });

  const has = new Set((existing || []).filter((r) => r.color_id === colorId).map((r) => r.product_id));
  const nextSort = {};
  for (const r of existing || []) nextSort[r.product_id] = Math.max(nextSort[r.product_id] ?? -1, Number(r.sort_order || 0));

  const rows = ids
    .filter((id) => !has.has(id))
    .map((id) => ({
      product_id: id,
      role,
      color_id: colour.color_id,
      name: colour.name,
      hex: colour.hex,
      sort_order: (nextSort[id] ?? -1) + 1,
    }));

  if (rows.length) {
    const { error } = await supabase.from("product_colors").insert(rows);
    if (error) return json(500, { error: error.message });
  }
  return json(200, { added: rows.map((r) => r.product_id), skipped: [...has] });
};
