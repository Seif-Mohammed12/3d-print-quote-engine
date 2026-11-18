import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { cleanText, isUuidValue, slugify } from "./_lib/product-admin.js";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Create or edit a library colour (manager or admin).
 * Body: { id?, colorId?, name, hex, outOfStock?, isArchived? }
 *
 * The colour's `color_id` never changes after creation: products and tagged photos link to it.
 * Renaming or re-colouring a library colour also updates the copy stored on every product
 * that uses it, so the shop shows the new name and swatch everywhere.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const p = body.value;

  const name = cleanText(p.name, 60);
  const hex = String(p.hex || "").trim();
  if (!name) return json(400, { error: "Name is required" });
  if (!HEX_RE.test(hex)) return json(400, { error: "Hex must look like #1A2B3C" });

  const row = { name, hex: hex.toUpperCase() };
  const usesFlags = "outOfStock" in p || "isArchived" in p;
  if ("outOfStock" in p) row.out_of_stock = Boolean(p.outOfStock);
  if ("isArchived" in p) row.is_archived = Boolean(p.isArchived);

  if (p.id) {
    if (!isUuidValue(p.id)) return json(400, { error: "Invalid id" });
    const { data, error } = await supabase.from("color_library").update(row).eq("id", p.id).select("*").maybeSingle();
    if (error) {
      if (usesFlags && isMissingSchema(error)) return setupRequired("Colour stock and archive flags");
      return json(500, { error: error.message });
    }
    if (!data) return json(404, { error: "Colour not found" });

    const { data: updated, error: propErr } = await supabase
      .from("product_colors")
      .update({ name: data.name, hex: data.hex })
      .eq("color_id", data.color_id)
      .select("id");
    if (propErr) return json(500, { error: `Colour saved, but products weren't updated: ${propErr.message}` });
    return json(200, { colour: data, productsUpdated: (updated || []).length });
  }

  // New colour: keep a provided id (e.g. saving a one-off colour), else derive one from the name.
  const colorId = slugify(p.colorId || name).slice(0, 100) || "colour";
  const { data: existing } = await supabase.from("color_library").select("id").eq("color_id", colorId).maybeSingle();
  if (existing) return json(409, { error: "A library colour with that id already exists. Pick a different name." });

  const { data: last } = await supabase.from("color_library").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("color_library")
    .insert({ ...row, color_id: colorId, sort_order: Number(last?.sort_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error) {
    if (usesFlags && isMissingSchema(error)) return setupRequired("Colour stock and archive flags");
    return json(500, { error: error.message });
  }
  return json(200, { colour: data, productsUpdated: 0 });
};
