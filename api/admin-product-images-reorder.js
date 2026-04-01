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

  const ids = Array.isArray(payload.ids) ? payload.ids : [];
  if (!ids.length) return json(400, { error: "ids[] is required" });

  const updates = ids.map((id, idx) =>
    supabase.from("product_images").update({ sort_order: idx }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return json(500, { error: failed.error.message });
  return json(200, { success: true });
};

