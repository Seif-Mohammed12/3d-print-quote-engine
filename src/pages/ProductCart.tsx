import { Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/product-order";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchPublicProducts, mapDbProductToLegacyProduct } from "@/lib/products-api";
import { cacheProducts } from "@/lib/runtime-product-cache";
import type { BrandId, Product } from "@/lib/brand-catalog";

export default function ProductCart() {
  const navigate = useNavigate();
  const { productCart, removeProductFromCart, clearProductCart, getProductSubtotal } = useCart();
  const items = productCart;
  const subtotal = getProductSubtotal();

  const brandsInCart = useMemo(
    () => Array.from(new Set(items.map((item) => item.brand))) as BrandId[],
    [items]
  );

  const brandQueries = useQueries({
    queries: brandsInCart.map((brand) => ({
      queryKey: ["brand-products", brand],
      queryFn: async () => {
        const live = await fetchPublicProducts(brand);
        const mapped = live.map(mapDbProductToLegacyProduct);
        cacheProducts(brand, mapped);
        return mapped;
      },
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: items.length > 0,
    })),
  });

  const liveProductMap = useMemo(() => {
    const map = new Map<string, Product>();
    brandsInCart.forEach((brand, idx) => {
      const rows = brandQueries[idx]?.data || [];
      rows.forEach((p) => map.set(`${brand}:${p.id}`, p));
    });
    return map;
  }, [brandsInCart, brandQueries]);

  const isCatalogLoading = brandQueries.some((query) => query.isPending);

  const resolveProduct = (brand: BrandId, productId: string) => {
    return liveProductMap.get(`${brand}:${productId}`) || getProduct(brand, productId);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Product Cart" subtitle="Review your items before checkout." />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Back
            </button>
          </div>

          {items.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Your product cart is empty.</p>
              <Link
                to="/pforge"
                className="inline-flex mt-4 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, idx) => {
                  const product = resolveProduct(item.brand, item.productId);
                  const primary = product?.primaryColors.find((c) => c.id === item.primaryColorId)?.name || (isCatalogLoading ? "Loading..." : "N/A");
                  const hasSecondaryColors = (product?.secondaryColors.length || 0) > 0;
                  const secondary = hasSecondaryColors
                    ? product?.secondaryColors.find((c) => c.id === item.secondaryColorId)?.name || (isCatalogLoading ? "Loading..." : "N/A")
                    : null;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{product?.name || (isCatalogLoading ? "Loading product..." : "Product unavailable")}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.brand.toUpperCase()} • Qty: {item.qty}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Primary: {primary}
                            {hasSecondaryColors ? ` • Secondary: ${secondary}` : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            EGP{(item.unitPrice * Math.max(1, item.qty)).toFixed(0)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeProductFromCart(item.id)}
                            className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="lg:col-span-1">
                <div className="glass-card p-6 sticky top-24 space-y-4">
                  <h3 className="font-heading font-semibold text-foreground">Summary</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="text-foreground">{items.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pb-4 border-b border-border">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">EGP{subtotal.toFixed(0)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem("productCartCheckout", "true");
                      navigate("/product-checkout");
                    }}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all"
                  >
                    Checkout
                  </button>

                  <button
                    type="button"
                    onClick={clearProductCart}
                    className="w-full py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-all"
                  >
                    Clear cart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

