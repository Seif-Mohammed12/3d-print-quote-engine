import { brandCatalog, type BrandId } from "@/lib/brand-catalog";
import { getCachedProduct } from "@/lib/runtime-product-cache";

export type ShippingMethod = "pickup" | "aramex";
export type PaymentMethod = "cod" | "instapay";

export type ProductOrderDraft = {
  brand: BrandId;
  productId: string;
  primaryColorId: string;
  secondaryColorId: string;
  ledsEnabled: boolean;
  qty: number;
};

export type ProductOrderCustomer = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  governorate: string;
  notes: string;
};

export function getProduct(brand: BrandId, productId: string) {
  const cached = getCachedProduct(brand, productId);
  if (cached) return cached;
  return brandCatalog[brand].products.find((p) => p.id === productId) || null;
}

export function getEffectiveBasePrice(product: { basePrice: number; discount?: { enabled: boolean; price: number } }) {
  return product.discount?.enabled && product.discount.price > 0 ? product.discount.price : product.basePrice;
}

export function getUnitPrice(product: { basePrice: number; discount?: { enabled: boolean; price: number }; supportsLeds: boolean; ledExtraPrice: number }, ledsEnabled: boolean) {
  const base = getEffectiveBasePrice(product);
  return base + (product.supportsLeds && ledsEnabled ? product.ledExtraPrice : 0);
}

