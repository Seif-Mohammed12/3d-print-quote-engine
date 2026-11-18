import { json } from "./_lib/http.js";
import { getSupabaseForPublicRead } from "./_lib/supabase-admin.js";
import { isMissingSchema } from "./_lib/schema.js";

function mapColour(c, outOfStock) {
  return { id: c.color_id, name: c.name, hex: c.hex, ...(outOfStock.has(c.color_id) ? { outOfStock: true } : {}) };
}

function mapProduct(row, { imagesByProduct, colorsByProduct, optionsByProduct, categoriesById, outOfStock }) {
  const colors = colorsByProduct[row.id] || [];
  const images = imagesByProduct[row.id] || [];
  const category = row.category_id ? categoriesById[row.category_id] : null;
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
    category: category ? { id: category.id, slug: category.slug, name: category.name, sortOrder: Number(category.sort_order || 0) } : null,
    images: images.map((img) => img.image_url),
    // Colour and option value shown in each photo, parallel to `images`; null for general shots.
    imageColorIds: images.map((img) => img.color_id ?? null),
    imageOptionValueIds: images.map((img) => img.option_value_id ?? null),
    primaryColors: colors.filter((c) => c.role === "primary").map((c) => mapColour(c, outOfStock)),
    secondaryColors: colors.filter((c) => c.role === "secondary").map((c) => mapColour(c, outOfStock)),
    optionGroups: optionsByProduct[row.id] || [],
  };
}

/** Optional reads for tables added by 20261118_admin_workspace.sql: empty until it's run. */
async function optional(query) {
  const { data, error } = await query;
  if (error) {
    if (isMissingSchema(error)) return [];
    throw new Error(error.message);
  }
  return data || [];
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

    const [categories, groups, library] = await Promise.all([
      optional(supabase.from("product_categories").select("*")),
      optional(supabase.from("product_option_groups").select("*").in("product_id", productIds).order("sort_order", { ascending: true })),
      optional(supabase.from("color_library").select("*")),
    ]);
    const groupIds = groups.map((g) => g.id);
    const values = groupIds.length
      ? await optional(supabase.from("product_option_values").select("*").in("group_id", groupIds).order("sort_order", { ascending: true }))
      : [];

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
    for (const img of images || []) (imagesByProduct[img.product_id] ||= []).push(img);

    const colorsByProduct = {};
    for (const color of colors || []) (colorsByProduct[color.product_id] ||= []).push(color);

    const valuesByGroup = {};
    for (const v of values) (valuesByGroup[v.group_id] ||= []).push(v);
    const optionsByProduct = {};
    for (const g of groups) {
      const groupValues = valuesByGroup[g.id] || [];
      if (!groupValues.length) continue;
      (optionsByProduct[g.product_id] ||= []).push({
        id: g.id,
        name: g.name,
        displayType: g.display_type,
        isRequired: Boolean(g.is_required),
        values: groupValues.map((v) => ({
          id: v.id,
          label: v.label,
          swatchHex: v.swatch_hex || null,
          priceDelta: Number(v.price_delta || 0),
          isAvailable: Boolean(v.is_available),
        })),
      });
    }

    const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
    const outOfStock = new Set(library.filter((c) => c.out_of_stock).map((c) => c.color_id));

    return json(200, {
      products: (products || []).map((p) =>
        mapProduct({ ...p, bundle_items: bundleItemsByProduct[p.id] || [] }, { imagesByProduct, colorsByProduct, optionsByProduct, categoriesById, outOfStock })
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
