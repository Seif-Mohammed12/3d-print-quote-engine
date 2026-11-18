import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { hasColumn, isMissingSchema } from "./_lib/schema.js";

/**
 * Everything the catalogue manager needs in one read (viewer and up): products (drafts too),
 * photos, colours, the colour library, bundle contents, categories and option groups.
 * `setup` says which parts of 20261118_admin_workspace.sql have been run, so the admin can show
 * a clear notice instead of failing.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;

  const [products, colorLibrary, images, colors, bundleItems, categories, optionGroups, optionValues] = await Promise.all([
    supabase.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("color_library").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_images").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("product_colors").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("product_bundle_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("product_categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_option_groups").select("*").order("sort_order", { ascending: true }),
    supabase.from("product_option_values").select("*").order("sort_order", { ascending: true }),
  ]);

  for (const res of [products, colorLibrary, images, colors, bundleItems]) {
    if (res.error) return json(500, { error: res.error.message });
  }
  for (const res of [categories, optionGroups, optionValues]) {
    if (res.error && !isMissingSchema(res.error)) return json(500, { error: res.error.message });
  }

  let colourFlags = false;
  try {
    colourFlags = await hasColumn(supabase, "color_library", "out_of_stock");
  } catch {
    colourFlags = false;
  }

  return json(200, {
    products: products.data || [],
    images: images.data || [],
    colors: colors.data || [],
    colorLibrary: colorLibrary.data || [],
    bundleItems: bundleItems.data || [],
    categories: categories.data || [],
    optionGroups: optionGroups.data || [],
    optionValues: optionValues.data || [],
    setup: {
      categories: !categories.error,
      options: !optionGroups.error && !optionValues.error,
      colourLibrary: colourFlags,
    },
  });
};
