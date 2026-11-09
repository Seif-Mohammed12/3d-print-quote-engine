import type { Product } from "@/lib/brand-catalog";

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

/** PHOTO PLACEHOLDER copy: which shot-list photo each product is waiting for. */
const pendingShots: Record<string, string> = {
  "printique-vase": "Shot 8: the vase on a desk with dried stems, soft side light so the layer lines show.",
  "printique-panel": "Shot 9: three panels mounted on a plain wall, light raking from one side to show depth.",
  "printique-tray": "Shot 10: the tray from above holding keys, a watch and earbuds.",
};

export function shotFor(product: Pick<Product, "id" | "slug" | "name">) {
  return pendingShots[product.slug || product.id] || `Real photo of the ${product.name} on a desk, printed in its default colour.`;
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
