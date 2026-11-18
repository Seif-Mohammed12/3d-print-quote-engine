import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { parseJsonBody, hasTable } from "./_lib/schema.js";
import { friendlyDbError, isUuidValue, uniqueSlug } from "./_lib/product-admin.js";

/**
 * Copy a product as a new draft (manager or admin): details, colours, bundle contents, option
 * groups and photos. Photos are copied to new storage files, so deleting either product never
 * removes the other's pictures.
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
  if (!isUuidValue(id)) return json(400, { error: "Invalid id" });

  const { data: source, error: srcErr } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (srcErr) return json(500, { error: srcErr.message });
  if (!source) return json(404, { error: "Product not found" });

  const { id: _id, created_at: _c, updated_at: _u, slug, name, ...rest } = source;
  const { data: last } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();

  let copy;
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...rest,
        name: `${name} (copy)`.slice(0, 120),
        slug: await uniqueSlug(supabase, `${slug}-copy`),
        is_published: false,
        sort_order: Number(last?.sort_order ?? 0) + 1,
      })
      .select("*")
      .single();
    if (error) return json(400, { error: friendlyDbError(error) });
    copy = data;
  } catch (err) {
    return json(500, { error: err?.message || "Copy failed" });
  }

  const warnings = [];

  const { data: colors } = await supabase.from("product_colors").select("*").eq("product_id", id);
  if (colors?.length) {
    const { error } = await supabase
      .from("product_colors")
      .insert(colors.map(({ id: _cid, created_at: _cc, product_id: _p, ...c }) => ({ ...c, product_id: copy.id })));
    if (error) warnings.push(`Colours: ${error.message}`);
  }

  const { data: bundleItems } = await supabase.from("product_bundle_items").select("*").eq("bundle_product_id", id);
  if (bundleItems?.length) {
    const { error } = await supabase
      .from("product_bundle_items")
      .insert(bundleItems.map(({ id: _bid, created_at: _bc, bundle_product_id: _b, ...b }) => ({ ...b, bundle_product_id: copy.id })));
    if (error) warnings.push(`Bundle contents: ${error.message}`);
  }

  // Option groups and values (if options are set up); remember old → new value ids for photos.
  const valueIdMap = {};
  if (await hasTable(supabase, "product_option_groups").catch(() => false)) {
    const { data: groups } = await supabase.from("product_option_groups").select("*, product_option_values(*)").eq("product_id", id);
    for (const g of groups || []) {
      const { id: gid, created_at: _gc, updated_at: _gu, product_id: _gp, product_option_values: values, ...group } = g;
      const { data: newGroup, error } = await supabase
        .from("product_option_groups")
        .insert({ ...group, product_id: copy.id })
        .select("id")
        .single();
      if (error) {
        warnings.push(`Option group ${g.name}: ${error.message}`);
        continue;
      }
      for (const v of values || []) {
        const { id: vid, created_at: _vc, updated_at: _vu, group_id: _vg, ...value } = v;
        const { data: newValue, error: vErr } = await supabase
          .from("product_option_values")
          .insert({ ...value, group_id: newGroup.id })
          .select("id")
          .single();
        if (vErr) warnings.push(`Option ${v.label}: ${vErr.message}`);
        else valueIdMap[vid] = newValue.id;
      }
      void gid;
    }
  }

  const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
  const { data: images } = await supabase.from("product_images").select("*").eq("product_id", id).order("sort_order");
  for (const img of images || []) {
    const file = String(img.image_path || "").split("/").pop() || "photo";
    const newPath = `${copy.id}/${Date.now()}-${file}`;
    const { error: copyErr } = await supabase.storage.from(bucket).copy(img.image_path, newPath);
    if (copyErr) {
      warnings.push(`Photo ${file}: ${copyErr.message}`);
      continue;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(newPath);
    const { id: _iid, created_at: _ic, product_id: _ip, image_path: _path, image_url: _url, ...meta } = img;
    if ("option_value_id" in meta) meta.option_value_id = meta.option_value_id ? valueIdMap[meta.option_value_id] || null : null;
    const { error } = await supabase
      .from("product_images")
      .insert({ ...meta, product_id: copy.id, image_path: newPath, image_url: pub?.publicUrl || "" });
    if (error) warnings.push(`Photo ${file}: ${error.message}`);
  }

  return json(200, { product: copy, warnings });
};
