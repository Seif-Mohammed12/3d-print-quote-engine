// Validation shared by the admin product endpoints.

export const LEGACY_BRANDS = ["pforge", "printique"];
const MAX_PRICE = 1_000_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function slugify(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function cleanText(value, max) {
  return String(value ?? "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, max);
}

function money(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) return { error: `${label} must be a number between 0 and ${MAX_PRICE}` };
  return { value: Math.round(n * 100) / 100 };
}

/**
 * Validate the editable product fields present in `input` (camelCase or snake_case keys).
 * Returns { value: row } with snake_case columns, or { error }.
 */
export function validateProductFields(input, { partial }) {
  const row = {};
  const has = (...keys) => keys.some((k) => k in input);
  const get = (...keys) => input[keys.find((k) => k in input)];

  if (!partial || has("name")) {
    const name = cleanText(get("name"), 120);
    if (!name) return { error: "Name is required" };
    row.name = name;
  }
  if (has("slug") && get("slug")) {
    const slug = slugify(get("slug"));
    if (!slug) return { error: "Slug must contain letters or numbers" };
    row.slug = slug;
  }
  if (has("short")) row.short = cleanText(get("short"), 200);
  if (has("description")) row.description = cleanText(get("description"), 5000);
  if (has("grams")) {
    const g = Number(get("grams") || 0);
    if (!Number.isFinite(g) || g < 0 || g > 100000) return { error: "Weight must be 0 or more grams" };
    row.grams = Math.round(g * 100) / 100;
  }
  if (!partial || has("basePrice", "base_price")) {
    const p = money(get("basePrice", "base_price") ?? 0, "Price");
    if (p.error) return p;
    row.base_price = p.value;
  }
  if (has("discountEnabled", "discount_enabled")) row.discount_enabled = Boolean(get("discountEnabled", "discount_enabled"));
  if (has("discountPrice", "discount_price")) {
    const raw = get("discountPrice", "discount_price");
    if (raw === null || raw === "") row.discount_price = null;
    else {
      const p = money(raw, "Sale price");
      if (p.error) return p;
      row.discount_price = p.value;
    }
  }
  if (has("stockQty", "stock_qty")) {
    const q = Number(get("stockQty", "stock_qty"));
    if (!Number.isInteger(q) || q < 0 || q > 1_000_000) return { error: "Stock must be a whole number, 0 or more" };
    row.stock_qty = q;
  }
  if (has("inStock", "in_stock")) row.in_stock = Boolean(get("inStock", "in_stock"));
  if (has("isPublished", "is_published")) row.is_published = Boolean(get("isPublished", "is_published"));
  if (has("isBundle", "is_bundle")) row.is_bundle = Boolean(get("isBundle", "is_bundle"));
  if (has("sortOrder", "sort_order")) {
    const s = Number(get("sortOrder", "sort_order"));
    if (!Number.isInteger(s) || s < 0) return { error: "Invalid sort order" };
    row.sort_order = s;
  }
  if (has("categoryId", "category_id")) {
    const c = get("categoryId", "category_id");
    if (c === null || c === "") row.category_id = null;
    else if (typeof c !== "string" || !UUID_RE.test(c)) return { error: "Invalid category" };
    else row.category_id = c;
  }
  if (has("brand") && get("brand")) {
    const b = get("brand");
    if (!LEGACY_BRANDS.includes(b)) return { error: "Invalid brand" };
    row.brand = b;
  }
  return { value: row };
}

/**
 * Make the discount columns consistent with the table's check constraint: a sale needs a
 * positive price below the base price; switching it off clears the price.
 * `current` is the stored row (for partial updates).
 */
export function normaliseDiscount(row, current = {}) {
  const enabled = "discount_enabled" in row ? row.discount_enabled : Boolean(current.discount_enabled);
  if (!enabled) {
    if ("discount_enabled" in row || "discount_price" in row) {
      row.discount_enabled = false;
      row.discount_price = null;
    }
    return {};
  }
  const price = "discount_price" in row ? row.discount_price : current.discount_price;
  const base = "base_price" in row ? row.base_price : Number(current.base_price);
  if (price == null || !(Number(price) > 0)) return { error: "Enter a sale price, or switch the sale off" };
  if (Number.isFinite(base) && Number(price) >= base) return { error: "Sale price must be lower than the regular price" };
  row.discount_enabled = true;
  row.discount_price = Number(price);
  return {};
}

/** A slug not used by another product: base, base-2, base-3… */
export async function uniqueSlug(supabase, base, excludeId = null) {
  const root = slugify(base) || "product";
  const { data, error } = await supabase.from("products").select("id, slug").like("slug", `${root}%`);
  if (error) throw new Error(error.message);
  const taken = new Set((data || []).filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export function friendlyDbError(error) {
  const msg = String(error?.message || "");
  if (error?.code === "23505" && /slug/.test(msg)) return "Another product already uses that URL slug.";
  if (error?.code === "23503" && /product_bundle_items/.test(msg)) {
    return "This product is part of a bundle. Remove it from the bundle first.";
  }
  if (error?.code === "23514" && /discount/.test(msg)) return "Sale price doesn't fit: switch the sale off or give it a price.";
  return msg || "Database error";
}

export function isUuidValue(value) {
  return typeof value === "string" && UUID_RE.test(value);
}
