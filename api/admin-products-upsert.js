import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  if (!["pforge", "printique"].includes(brand)) return json(400, { error: "Invalid brand" });
  if (!name) return json(400, { error: "Name is required" });

  const row = {
    brand,
    slug: slugify(payload.slug || name),
    name,
    short: String(payload.short || "").trim(),
    description: String(payload.description || "").trim(),
    base_price: Number(payload.basePrice || 0),
    discount_enabled: Boolean(payload.discountEnabled),
    discount_price: payload.discountEnabled ? Number(payload.discountPrice || 0) : null,
    stock_qty: Number(payload.stockQty || 0),
    in_stock: Boolean(payload.inStock),
    is_published: Boolean(payload.isPublished),
    sort_order: Number(payload.sortOrder || 0),
  };

  if (id) {
    const { data, error } = await supabase.from("products").update(row).eq("id", id).select("*").single();
    if (error) return json(500, { error: error.message });
    return json(200, { product: data });
  }

  const { data, error } = await supabase.from("products").insert(row).select("*").single();
  if (error) return json(500, { error: error.message });
  return json(200, { product: data });
};

