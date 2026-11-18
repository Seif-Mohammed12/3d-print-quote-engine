import { adminFetch, adminPost } from "@/lib/admin/api";

export type AdminProduct = {
  id: string;
  brand: string;
  slug: string;
  name: string;
  short: string;
  description: string;
  grams: number | null;
  base_price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  stock_qty: number;
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
  is_bundle?: boolean;
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_path?: string;
  sort_order: number;
  color_id?: string | null;
  option_value_id?: string | null;
};

export type AdminProductColor = {
  id: string;
  product_id: string;
  role: "primary" | "secondary";
  color_id: string;
  name: string;
  hex: string;
  sort_order: number;
};

export type LibraryColor = {
  id: string;
  color_id: string;
  name: string;
  hex: string;
  sort_order: number;
  out_of_stock?: boolean;
  is_archived?: boolean;
};

export type BundleItem = {
  id: string;
  bundle_product_id: string;
  component_product_id: string;
  qty: number;
  sort_order: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type OptionDisplay = "buttons" | "swatches" | "dropdown";

export type OptionGroup = {
  id: string;
  product_id: string;
  name: string;
  display_type: OptionDisplay;
  is_required: boolean;
  sort_order: number;
};

export type OptionValue = {
  id: string;
  group_id: string;
  label: string;
  swatch_hex: string | null;
  price_delta: number;
  grams_delta: number;
  is_available: boolean;
  sort_order: number;
};

export type CatalogueSetup = { categories: boolean; options: boolean; colourLibrary: boolean };

export type AdminCatalogue = {
  products: AdminProduct[];
  images: AdminImage[];
  colors: AdminProductColor[];
  colorLibrary: LibraryColor[];
  bundleItems: BundleItem[];
  categories: Category[];
  optionGroups: OptionGroup[];
  optionValues: OptionValue[];
  setup: CatalogueSetup;
};

export const ADMIN_CATALOG_KEY = ["admin-catalog"] as const;

export async function fetchAdminCatalogue(): Promise<AdminCatalogue> {
  const data = await adminFetch<Partial<AdminCatalogue>>("/api/admin-products-list");
  return {
    products: data.products || [],
    images: data.images || [],
    colors: data.colors || [],
    colorLibrary: data.colorLibrary || [],
    bundleItems: data.bundleItems || [],
    categories: data.categories || [],
    optionGroups: data.optionGroups || [],
    optionValues: data.optionValues || [],
    setup: data.setup || { categories: false, options: false, colourLibrary: false },
  };
}

/** Fields the product editor saves. */
export type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  short: string;
  description: string;
  grams: number;
  basePrice: number;
  discountEnabled: boolean;
  discountPrice: number | null;
  stockQty: number;
  inStock: boolean;
  isPublished: boolean;
  isBundle: boolean;
  categoryId: string | null;
};

export function draftFromProduct(p: AdminProduct): ProductDraft {
  return {
    id: p.id,
    name: p.name || "",
    slug: p.slug || "",
    short: p.short || "",
    description: p.description || "",
    grams: Number(p.grams || 0),
    basePrice: Number(p.base_price || 0),
    discountEnabled: Boolean(p.discount_enabled),
    discountPrice: p.discount_price == null ? null : Number(p.discount_price),
    stockQty: Number(p.stock_qty || 0),
    inStock: Boolean(p.in_stock),
    isPublished: Boolean(p.is_published),
    isBundle: Boolean(p.is_bundle),
    categoryId: p.category_id ?? null,
  };
}

export function saveProduct(draft: ProductDraft, { includeCategory }: { includeCategory: boolean }) {
  const { categoryId, ...rest } = draft;
  return adminPost<{ product: AdminProduct }>("/api/admin-products-upsert", {
    ...rest,
    discountPrice: draft.discountEnabled ? draft.discountPrice : null,
    ...(includeCategory ? { categoryId } : {}),
  });
}

export function createDraftProduct(name: string, extra: Partial<ProductDraft> = {}) {
  return adminPost<{ product: AdminProduct }>("/api/admin-products-upsert", {
    name,
    basePrice: 0,
    isPublished: false,
    ...extra,
  });
}

export type InlineFields = Partial<{
  name: string;
  base_price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  stock_qty: number;
  in_stock: boolean;
  is_published: boolean;
  category_id: string | null;
  slug: string;
}>;

export function patchProduct(id: string, fields: InlineFields) {
  return adminPost<{ product: AdminProduct }>("/api/admin-products-patch", { id, fields });
}

export function duplicateProduct(id: string) {
  return adminPost<{ product: AdminProduct; warnings: string[] }>("/api/admin-products-duplicate", { id });
}

export type BulkAction = "publish" | "unpublish" | "in_stock" | "out_of_stock" | "set_category" | "delete";

export function bulkProducts(ids: string[], action: BulkAction, categoryId?: string | null) {
  return adminPost<{ done: string[]; failed: Array<{ id: string; error: string }> }>("/api/admin-products-bulk", {
    ids,
    action,
    categoryId,
  });
}

export function deleteProduct(id: string) {
  return adminPost<{ success: boolean }>("/api/admin-products-delete", { id });
}

export function reorderProducts(ids: string[]) {
  return adminPost<{ ok: boolean }>("/api/admin-products-reorder", { ids });
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function effectiveProductPrice(p: Pick<AdminProduct, "base_price" | "discount_enabled" | "discount_price">) {
  const sale = Number(p.discount_price);
  return p.discount_enabled && sale > 0 ? sale : Number(p.base_price || 0);
}

/** Move `from` to index `to` in a copy of the list. */
export function moveItem<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
