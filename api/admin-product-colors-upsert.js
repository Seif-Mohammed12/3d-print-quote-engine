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
  const productId = payload.productId;
  const role = payload.role;
  const colorId = String(payload.colorId || "").trim();
  const name = String(payload.name || "").trim();
  const hex = String(payload.hex || "").trim();
  const sortOrder = Number(payload.sortOrder || 0);
  // One-off colours stay on this product only; library colours keep the library in sync.
  const saveToLibrary = payload.saveToLibrary !== false;

  if (!productId) return json(400, { error: "productId is required" });
  if (!["primary", "secondary"].includes(role)) return json(400, { error: "role must be primary or secondary" });
  if (!colorId || !name || !hex) return json(400, { error: "colorId, name and hex are required" });
  if (colorId.length > 100 || name.length > 60) return json(400, { error: "Colour id or name is too long" });
  if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) return json(400, { error: "Hex must look like #1A2B3C" });

  const row = { product_id: productId, role, color_id: colorId, name, hex, sort_order: sortOrder };

  if (id) {
    const { data, error } = await supabase.from("product_colors").update(row).eq("id", id).select("*").single();
    if (error) return json(500, { error: error.message });
    if (saveToLibrary) {
      const libErr = await upsertColorLibrary(supabase, { colorId, name, hex });
      if (libErr) return json(500, { error: libErr });
    }
    return json(200, { color: data });
  }

  const { data, error } = await supabase.from("product_colors").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") return json(400, { error: "This product already has that colour in that role." });
    return json(500, { error: error.message });
  }
  if (saveToLibrary) {
    const libErr = await upsertColorLibrary(supabase, { colorId, name, hex });
    if (libErr) return json(500, { error: libErr });
  }
  return json(200, { color: data });
};

// Adds the colour to the library if it isn't there yet. An existing library colour is left
// alone: its name and hex are edited in the colour manager, which updates every product using it.
async function upsertColorLibrary(supabase, { colorId, name, hex }) {
  const { error } = await supabase
    .from("color_library")
    .upsert({ color_id: colorId, name, hex, sort_order: 0 }, { onConflict: "color_id", ignoreDuplicates: true });
  return error?.message || null;
}

