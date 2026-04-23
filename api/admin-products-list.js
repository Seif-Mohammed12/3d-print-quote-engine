import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireAdmin(event);
  if (!auth.ok) return auth.response;

  const { supabase } = auth;
  const { brand = "" } = event.queryStringParameters || {};

  let productsQuery = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (brand) productsQuery = productsQuery.eq("brand", brand);

  const { data: products, error: productsError } = await productsQuery;
  if (productsError) return json(500, { error: productsError.message });

  const { data: colorLibrary, error: libraryError } = await supabase
    .from("color_library")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (libraryError) return json(500, { error: libraryError.message });

  const { data: bundles, error: bundlesError } = await supabase
    .from("product_bundles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (bundlesError) return json(500, { error: bundlesError.message });

  const productIds = (products || []).map((p) => p.id);
  if (!productIds.length) {
    return json(200, {
      products: [],
      images: [],
      colors: [],
      colorLibrary: colorLibrary || [],
      bundles: bundles || [],
    });
  }

  const [{ data: images, error: imagesError }, { data: colors, error: colorsError }] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_colors")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (imagesError) return json(500, { error: imagesError.message });
  if (colorsError) return json(500, { error: colorsError.message });

  return json(200, {
    products: products || [],
    images: images || [],
    colors: colors || [],
    colorLibrary: colorLibrary || [],
    bundles: bundles || [],
  });
};

