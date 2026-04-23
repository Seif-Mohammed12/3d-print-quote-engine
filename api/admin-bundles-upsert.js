import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const id = payload.id || null;
  const brand = payload.brand;
  const name = String(payload.name || "").trim();
  const productAId = String(payload.productAId || "").trim();
  const productBId = String(payload.productBId || "").trim();
  const bundlePrice = Number(payload.bundlePrice);
  const sortOrder = Number(payload.sortOrder || 0);
  const isActive = Boolean(payload.isActive);

  if (!["pforge", "printique"].includes(brand)) return json(400, { error: "Invalid brand" });
  if (!name) return json(400, { error: "Name is required" });
  if (!productAId || !productBId) return json(400, { error: "Select two products" });
  if (productAId === productBId) return json(400, { error: "Bundle products must be different" });
  if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) return json(400, { error: "Invalid bundle price" });

  const row = {
    brand,
    name,
    product_a_id: productAId,
    product_b_id: productBId,
    bundle_price: bundlePrice,
    sort_order: sortOrder,
    is_active: isActive,
  };

  if (id) {
    const { data, error } = await supabase.from("product_bundles").update(row).eq("id", id).select("*").single();
    if (error) return json(500, { error: error.message });
    return json(200, { bundle: data });
  }

  const { data, error } = await supabase.from("product_bundles").insert(row).select("*").single();
  if (error) return json(500, { error: error.message });
  return json(200, { bundle: data });
};

