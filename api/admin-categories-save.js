import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, isMissingSchema, setupRequired } from "./_lib/schema.js";
import { cleanText, isUuidValue, slugify } from "./_lib/product-admin.js";

/**
 * Create or rename a category (manager or admin). Body: { id?, name, slug? }.
 * The slug is the category's address in shop links (/products?category=slug).
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = parseJsonBody(event);
  if (body.response) return body.response;
  const { id } = body.value;
  const name = cleanText(body.value.name, 60);
  if (!name) return json(400, { error: "Name is required" });
  const slug = slugify(body.value.slug || name).slice(0, 60);
  if (!slug) return json(400, { error: "The name needs letters or numbers for the shop link" });

  const { data: clash, error: clashErr } = await supabase.from("product_categories").select("id").eq("slug", slug).maybeSingle();
  if (clashErr) {
    if (isMissingSchema(clashErr)) return setupRequired("Categories");
    return json(500, { error: clashErr.message });
  }
  if (clash && clash.id !== id) return json(409, { error: `Another category already uses the link “${slug}”.` });

  if (id) {
    if (!isUuidValue(id)) return json(400, { error: "Invalid id" });
    const { data, error } = await supabase.from("product_categories").update({ name, slug }).eq("id", id).select("*").maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(404, { error: "Category not found" });
    return json(200, { category: data });
  }

  const { data: last } = await supabase.from("product_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name, slug, sort_order: Number(last?.sort_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { category: data });
};
