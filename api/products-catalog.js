import { json } from "./_lib/http.js";
import { getSupabaseForPublicRead } from "./_lib/supabase-admin.js";

function mapProduct(row, imagesByProduct, colorsByProduct) {
  const colors = colorsByProduct[row.id] || [];
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    name: row.name,
    short: row.short,
    description: row.description,
    basePrice: Number(row.base_price || 0),
    discount: {
      enabled: Boolean(row.discount_enabled),
      price: row.discount_price == null ? 0 : Number(row.discount_price),
    },
    stockQty: Number(row.stock_qty || 0),
    inStock: Boolean(row.in_stock),
    isPublished: Boolean(row.is_published),
    sortOrder: Number(row.sort_order || 0),
    isBundle: Boolean(row.is_bundle),
    bundleItems: row.bundle_items || [],
    images: (imagesByProduct[row.id] || []).map((img) => img.image_url),
    primaryColors: colors
      .filter((c) => c.role === "primary")
      .map((c) => ({ id: c.color_id, name: c.name, hex: c.hex })),
    secondaryColors: colors
      .filter((c) => c.role === "secondary")
      .map((c) => ({ id: c.color_id, name: c.name, hex: c.hex })),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  try {
  const supabase = getSupabaseForPublicRead();
  if (!supabase) {
    return json(500, {
      error:
        "Server misconfigured: set SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY (Netlify: Site settings → Environment variables).",
    });
  }

  const { brand = "" } = event.queryStringParameters || {};

  let productsQuery = supabase
    .from("products")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (brand) productsQuery = productsQuery.eq("brand", brand);

  const { data: products, error: productsError } = await productsQuery;
  if (productsError) return json(500, { error: productsError.message });

  const productIds = (products || []).map((p) => p.id);
  if (!productIds.length) return json(200, { products: [] });

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

  const bundleProductIds = (products || []).filter((product) => product.is_bundle).map((product) => product.id);
  let bundleItemsByProduct = {};
  if (bundleProductIds.length > 0) {
    const { data: bundleItems, error: bundleItemsError } = await supabase
      .from("product_bundle_items")
      .select("bundle_product_id, qty, component_product:component_product_id (id, name, slug)")
      .in("bundle_product_id", bundleProductIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (bundleItemsError) return json(500, { error: bundleItemsError.message });

    bundleItemsByProduct = (bundleItems || []).reduce((acc, row) => {
      acc[row.bundle_product_id] ||= [];
      if (row.component_product?.id) {
        acc[row.bundle_product_id].push({
          productId: row.component_product.id,
          name: row.component_product.name,
          slug: row.component_product.slug || undefined,
          qty: Number(row.qty || 1),
        });
      }
      return acc;
    }, {});
  }

  const imagesByProduct = {};
  for (const img of images || []) {
    imagesByProduct[img.product_id] ||= [];
    imagesByProduct[img.product_id].push(img);
  }

  const colorsByProduct = {};
  for (const color of colors || []) {
    colorsByProduct[color.product_id] ||= [];
    colorsByProduct[color.product_id].push(color);
  }

  return json(200, {
    products: (products || []).map((p) =>
      mapProduct({ ...p, bundle_items: bundleItemsByProduct[p.id] || [] }, imagesByProduct, colorsByProduct)
    ),
  });
  } catch (err) {
    console.error("products-catalog error:", err);
    return json(500, {
      error: err?.message || "Catalog request failed",
      hint: "Check Netlify function logs and Supabase RLS / table names.",
    });
  }
};

