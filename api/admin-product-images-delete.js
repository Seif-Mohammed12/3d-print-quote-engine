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

  const id = payload.id;
  if (!id) return json(400, { error: "Missing image id" });

  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) return json(500, { error: fetchError.message });

  if (image?.image_path) {
    const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
    await supabase.storage.from(bucket).remove([image.image_path]);
  }

  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) return json(500, { error: error.message });

  return json(200, { success: true });
};

