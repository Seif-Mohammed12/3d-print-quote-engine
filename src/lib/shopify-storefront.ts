/**
 * Shopify Storefront API catalogue source (PROJECT_OVERVIEW section 13, step 2).
 *
 * Off unless VITE_CATALOG_SOURCE=shopify and the store domain + public Storefront token are set.
 * Returns the same `DbProduct` shape the Supabase catalogue endpoint returns, so pages do not change.
 *
 * How a Shopify product maps onto the site:
 * - category (`brand`)  → handle of the product's first collection
 * - `slug`              → product handle; `id` → Shopify product GID
 * - price               → lowest variant price; a higher compare-at price becomes the struck-through base price
 * - primary colours     → the option named "Colour"/"Color"; secondary → the option named "Accent colour"
 *                         (swatch hex comes from the option value's swatch in Shopify admin)
 * - per-colour photos   → the image assigned to each variant is tagged with that variant's primary colour
 * - `short`             → metafield `custom.short` (must be exposed to the Storefront API), else first sentence
 * - catalogue order     → oldest product first, so a new product takes the next 3DP number
 */
import type { BrandId, ProductColor } from "@/lib/brand-catalog";
import type { DbProduct } from "@/lib/products-api";

const env = import.meta.env as Record<string, string | undefined>;
const storeDomain = (env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
const storefrontToken = env.VITE_SHOPIFY_STOREFRONT_TOKEN || "";
const apiVersion = env.VITE_SHOPIFY_API_VERSION || "2026-07";

export const isShopifyCatalogEnabled =
  env.VITE_CATALOG_SOURCE === "shopify" && Boolean(storeDomain) && Boolean(storefrontToken);

const PRIMARY_OPTION_NAMES = ["colour", "color", "primary colour", "primary color"];
const SECONDARY_OPTION_NAMES = ["accent colour", "accent color", "secondary colour", "secondary color", "accent"];

/**
 * Swatch hex for the studio's filament colours, keyed by colour id. Used when the Shopify option
 * value has no swatch of its own (plain text option values cannot carry one). Add new filaments here.
 */
const STUDIO_COLOR_HEX: Record<string, string> = {
  "matte-black": "#0b0d12",
  "matte-white": "#f3f4f6",
  "matte-gray": "#9ca3af",
  "matte-light-blue": "#5ca8c7",
  "matte-red": "#e03131",
};

type Money ={ amount: string; currencyCode: string };

export type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  totalInventory?: number | null;
  short?: { value: string } | null;
  collections: { nodes: Array<{ handle: string }> };
  priceRange: { minVariantPrice: Money };
  compareAtPriceRange: { maxVariantPrice: Money };
  options: Array<{
    name: string;
    optionValues: Array<{ name: string; swatch?: { color?: string | null } | null }>;
  }>;
  images: { nodes: Array<{ url: string }> };
  variants: {
    nodes: Array<{
      image?: { url: string } | null;
      selectedOptions: Array<{ name: string; value: string }>;
    }>;
  };
};

const PRODUCTS_QUERY = /* GraphQL */ `
  query Catalogue($after: String) {
    products(first: 100, after: $after, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        description
        availableForSale
        totalInventory
        short: metafield(namespace: "custom", key: "short") { value }
        collections(first: 1) { nodes { handle } }
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { maxVariantPrice { amount currencyCode } }
        options { name optionValues { name swatch { color } } }
        images(first: 20) { nodes { url } }
        variants(first: 100) { nodes { image { url } selectedOptions { name value } } }
      }
    }
  }
`;

export function colorIdFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function findOption(node: ShopifyProductNode, names: string[]) {
  return node.options.find((o) => names.includes(o.name.trim().toLowerCase()));
}

function toColors(option: ShopifyProductNode["options"][number] | undefined): ProductColor[] {
  if (!option) return [];
  return option.optionValues.map((v) => ({
    id: colorIdFromName(v.name),
    name: v.name,
    hex: v.swatch?.color || STUDIO_COLOR_HEX[colorIdFromName(v.name)] || "#9ca3af",
  }));
}

function firstSentence(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim().slice(0, 120);
}

/** Same photo, ignoring CDN query strings (size, version). */
function imageKey(url: string) {
  return url.split("?")[0];
}

export function mapShopifyProduct(node: ShopifyProductNode, sortOrder = 0): DbProduct {
  const primaryOption = findOption(node, PRIMARY_OPTION_NAMES);
  const secondaryOption = findOption(node, SECONDARY_OPTION_NAMES);

  const price = Number(node.priceRange.minVariantPrice.amount) || 0;
  const compareAt = Number(node.compareAtPriceRange.maxVariantPrice.amount) || 0;
  const onSale = compareAt > price;

  const images = node.images.nodes.map((img) => img.url);
  const colorByImage = new Map<string, string>();
  if (primaryOption) {
    for (const variant of node.variants.nodes) {
      if (!variant.image) continue;
      const chosen = variant.selectedOptions.find((o) => o.name === primaryOption.name);
      const key = imageKey(variant.image.url);
      if (chosen && !colorByImage.has(key)) colorByImage.set(key, colorIdFromName(chosen.value));
    }
  }

  return {
    id: node.id,
    slug: node.handle,
    // Categories are Shopify collections now; the handle stands in for the old hardcoded ids.
    brand: (node.collections.nodes[0]?.handle || "") as BrandId,
    name: node.title,
    short: node.short?.value?.trim() || firstSentence(node.description),
    description: node.description,
    basePrice: onSale ? compareAt : price,
    discount: { enabled: onSale, price: onSale ? price : 0 },
    images,
    imageColorIds: images.map((url) => colorByImage.get(imageKey(url)) ?? null),
    primaryColors: toColors(primaryOption),
    secondaryColors: toColors(secondaryOption),
    stockQty: node.totalInventory ?? undefined,
    inStock: node.availableForSale,
    isPublished: true,
    sortOrder,
    isBundle: false,
    bundleItems: [],
  };
}

async function storefrontRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${storeDomain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify Storefront API failed (${res.status})`);
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (body.errors?.length) throw new Error(`Shopify: ${body.errors.map((e) => e.message).join("; ")}`);
  if (!body.data) throw new Error("Shopify returned no data");
  return body.data;
}

type CataloguePage = {
  products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ShopifyProductNode[] };
};

/** Whole published catalogue, oldest first; optionally only one collection handle. */
export async function fetchShopifyProducts(brand?: BrandId): Promise<DbProduct[]> {
  const nodes: ShopifyProductNode[] = [];
  let after: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const data: CataloguePage = await storefrontRequest<CataloguePage>(PRODUCTS_QUERY, { after });
    nodes.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  const mapped = nodes.map((node, index) => mapShopifyProduct(node, index));
  return brand ? mapped.filter((p) => p.brand === brand) : mapped;
}
