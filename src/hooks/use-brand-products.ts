import { useQuery } from "@tanstack/react-query";
import type { BrandId } from "@/lib/brand-catalog";
import { fetchPublicProducts, mapDbProductToLegacyProduct } from "@/lib/products-api";
import { cacheProducts } from "@/lib/runtime-product-cache";

export function useBrandProducts(brand: BrandId) {
  return useQuery({
    queryKey: ["brand-products", brand],
    queryFn: async () => {
      const live = await fetchPublicProducts(brand);
      const mapped = live.map(mapDbProductToLegacyProduct);
      cacheProducts(brand, mapped);
      return mapped;
    },
    staleTime: 60_000,
    retry: 1,
    // Do not use placeholderData from static catalog — it caused a flash of old products,
    // then a second paint when live Supabase data arrived.
    refetchOnWindowFocus: false,
  });
}

