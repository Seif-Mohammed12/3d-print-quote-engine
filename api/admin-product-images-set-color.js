import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

// Tag a product photo with the colour it shows, or clear the tag (colorId: null).
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

  const id = typeof payload.id === "string" ? payload.id : "";
  const colorId = payload.colorId == null || payload.colorId === "" ? null : String(payload.colorId).trim();
  if (!id) return json(400, { error: "id is required" });
  if (colorId !== null && (colorId.length > 100 || !colorId)) return json(400, { error: "Invalid colorId" });

  const { error } = await supabase.from("product_images").update({ color_id: colorId }).eq("id", id);
  if (error) {
    const missingColumn = /color_id/.test(error.message) && /column|schema cache/i.test(error.message);
    return json(500, {
      error: missingColumn
        ? "Photo colours aren't set up yet: run supabase/migrations/20261109_product_image_colors.sql in Supabase."
        : error.message,
    });
  }
  return json(200, { success: true });
};
