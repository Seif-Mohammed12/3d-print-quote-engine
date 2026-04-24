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

  const bundleProductId = String(payload.bundleProductId || "").trim();
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!bundleProductId) return json(400, { error: "bundleProductId is required" });

  const { data: bundle, error: bundleErr } = await supabase
    .from("products")
    .select("id,is_bundle")
    .eq("id", bundleProductId)
    .maybeSingle();
  if (bundleErr) return json(500, { error: bundleErr.message });
  if (!bundle) return json(404, { error: "Bundle product not found" });
  if (!bundle.is_bundle) return json(400, { error: "This product is not marked as a bundle" });

  const normalized = items
    .map((it, idx) => ({
      idx,
      component_product_id: String(it?.productId || "").trim(),
      qty: Number(it?.qty || 1),
    }))
    .filter((it) => it.component_product_id);

  const seen = new Set();
  for (const it of normalized) {
    if (!Number.isFinite(it.qty) || it.qty < 1) return json(400, { error: "Invalid qty in items" });
    if (seen.has(it.component_product_id)) return json(400, { error: "Duplicate product in bundle items" });
    seen.add(it.component_product_id);
  }

  const { error: delErr } = await supabase.from("product_bundle_items").delete().eq("bundle_product_id", bundleProductId);
  if (delErr) return json(500, { error: delErr.message });

  if (!normalized.length) return json(200, { ok: true, items: [] });

  const rows = normalized.map((it, sort_order) => ({
    bundle_product_id: bundleProductId,
    component_product_id: it.component_product_id,
    qty: it.qty,
    sort_order,
  }));

  const { data, error } = await supabase.from("product_bundle_items").insert(rows).select("*");
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, items: data || [] });
};

