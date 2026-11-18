import type { Product, SelectedOption } from "@/lib/brand-catalog";

export const categoryLabel: Record<string, string> = {
  pforge: "Gaming & Setup",
  printique: "Home & Decor",
};

export const categoryOrder = ["pforge", "printique"] as const;

/** "650 EGP" — whole pounds, thin grouping for thousands. */
export function formatEGP(value: number) {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("en-US")} EGP`;
}

export function effectivePrice(product: Pick<Product, "basePrice" | "discount">) {
  return product.discount?.enabled && product.discount.price > 0 ? product.discount.price : product.basePrice;
}

export function hasDiscount(product: Pick<Product, "basePrice" | "discount">) {
  return Boolean(product.discount?.enabled && product.discount.price > 0 && product.discount.price < product.basePrice);
}

/**
 * Catalogue number shown on sleeves and rows, e.g. "3DP-007".
 * Derived from the product's position in the published catalogue order.
 */
export function catalogueNo(products: Product[] | undefined, productId: string) {
  const index = (products ?? []).findIndex((p) => p.id === productId);
  return `3DP-${String(index < 0 ? 0 : index + 1).padStart(3, "0")}`;
}

/** Link by slug when the product has one, so shared links stay readable. */
export function productHref(product: Pick<Product, "id" | "slug">) {
  return `/products/${product.slug || product.id}`;
}

/**
 * The photos to show for a chosen colour. Only single-colour products switch: their photos can be
 * tagged with the colour they show. The chosen colour's photos come first, then general (untagged)
 * shots. A colour with no photos of its own shows the general shots, or everything if there are none.
 */
export function imagesForColor(product: Pick<Product, "images" | "imageColorIds" | "secondaryColors">, colorId: string | undefined) {
  const images = product.images || [];
  const tags = product.imageColorIds;
  if (!colorId || !tags || tags.length !== images.length || product.secondaryColors.length > 0) return images;
  const own = images.filter((_, i) => tags[i] === colorId);
  const general = images.filter((_, i) => !tags[i]);
  if (own.length) return [...own, ...general];
  return general.length ? general : images;
}

export function firstColorHex(product: Pick<Product, "primaryColors">) {
  return product.primaryColors[0]?.hex || "hsl(var(--rule))";
}

/** The product's shelf name: its category, or the legacy label for products not yet moved. */
export function productCategoryLabel(product: Pick<Product, "category" | "brand">) {
  return product.category?.name || categoryLabel[product.brand || ""] || "Product";
}

/** Key used in shop filters and ?category= links. */
export function productCategoryKey(product: Pick<Product, "category" | "brand">) {
  return product.category?.slug || product.brand || "";
}

/**
 * Filters for the shop, in the admin's category order. Only categories with products show.
 * Falls back to the legacy shelves when no product has a category yet.
 */
export function storefrontCategories(products: Array<Pick<Product, "category" | "brand">>) {
  const seen = new Map<string, { key: string; label: string; order: number }>();
  for (const p of products) {
    if (p.category) {
      if (!seen.has(p.category.slug)) seen.set(p.category.slug, { key: p.category.slug, label: p.category.name, order: p.category.sortOrder });
    } else if (p.brand && categoryLabel[p.brand] && !seen.has(p.brand)) {
      seen.set(p.brand, { key: p.brand, label: categoryLabel[p.brand], order: 1000 + categoryOrder.indexOf(p.brand as (typeof categoryOrder)[number]) });
    }
  }
  return [...seen.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function firstAvailableColorId(colors: Product["primaryColors"]) {
  return (colors.find((c) => !c.outOfStock) || colors[0])?.id || "";
}

/** groupId → chosen valueId ("" for none). Required groups start on their first available value. */
export type OptionSelection = Record<string, string>;

export function defaultOptionSelection(product: Pick<Product, "optionGroups">): OptionSelection {
  const sel: OptionSelection = {};
  for (const g of product.optionGroups || []) {
    sel[g.id] = g.isRequired ? g.values.find((v) => v.isAvailable)?.id || "" : "";
  }
  return sel;
}

export function selectedOptions(product: Pick<Product, "optionGroups">, selection: OptionSelection): SelectedOption[] {
  const out: SelectedOption[] = [];
  for (const g of product.optionGroups || []) {
    const v = g.values.find((x) => x.id === selection[g.id]);
    if (v) out.push({ groupId: g.id, groupName: g.name, valueId: v.id, valueLabel: v.label, priceDelta: v.priceDelta });
  }
  return out;
}

/** Required groups still without a choice (or with a value that's become unavailable). */
export function missingRequiredOptions(product: Pick<Product, "optionGroups">, selection: OptionSelection) {
  return (product.optionGroups || []).filter((g) => {
    if (!g.isRequired) return false;
    const v = g.values.find((x) => x.id === selection[g.id]);
    return !v || !v.isAvailable;
  });
}

/** Unit price with option adjustments. Mirrors api/_lib/order-pricing.js; the server decides. */
export function priceWithOptions(product: Pick<Product, "basePrice" | "discount">, options: Array<{ priceDelta: number }>) {
  const total = effectivePrice(product) + options.reduce((s, o) => s + Number(o.priceDelta || 0), 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

/** Photos for the current colour and option choices: photos of chosen option values first. */
export function imagesForSelection(
  product: Pick<Product, "images" | "imageColorIds" | "imageOptionValueIds" | "secondaryColors">,
  colorId: string | undefined,
  valueIds: string[]
) {
  const byColour = imagesForColor(product, colorId);
  const tags = product.imageOptionValueIds;
  if (!valueIds.length || !tags || tags.length !== product.images.length) return byColour;
  const chosen = new Set(valueIds);
  const own = product.images.filter((_, i) => tags[i] && chosen.has(tags[i] as string));
  if (!own.length) return byColour;
  return [...own, ...byColour.filter((src) => !own.includes(src))];
}

/** Re-read saved option choices against the live product so prices and labels are current. */
export function liveOptions(product: Pick<Product, "optionGroups">, saved: SelectedOption[] | undefined): SelectedOption[] {
  const selection: OptionSelection = {};
  for (const o of saved || []) selection[o.groupId] = o.valueId;
  return selectedOptions(product, selection);
}
