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

export function firstColorHex(product: Pick<Product, "primaryColors">) {
  return product.primaryColors[0]?.hex || "hsl(var(--rule))";
}
