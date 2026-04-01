import type { BrandId, Product } from "@/lib/brand-catalog";

const cache = new Map<string, Product>();

export function cacheProducts(brand: BrandId, products: Product[]) {
  for (const product of products) {
    cache.set(`${brand}:${product.id}`, product);
  }
}

export function getCachedProduct(brand: BrandId, productId: string): Product | null {
  return cache.get(`${brand}:${productId}`) || null;
}

