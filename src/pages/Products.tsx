import Layout from "@/components/Layout";
import QuickAddProductDialog from "@/components/QuickAddProductDialog";
import { useProducts } from "@/hooks/use-brand-products";
import type { Product } from "@/lib/brand-catalog";
import { motion } from "framer-motion";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const brandLabel: Record<string, string> = {
  pforge: "Gaming & Setup",
  printique: "Home & Decor",
};

export default function Products() {
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const isMobile = useIsMobile();
  const { data: products, isPending, isError, error } = useProducts();

  return (
    <Layout>
      <section className="section-padding relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020617] via-slate-950 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_30%)]" />

        <div className="relative z-10 container mx-auto max-w-6xl space-y-12">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-blue-200/80">
              Products
            </p>
            <h1 className="font-heading text-5xl font-bold leading-[0.95] text-slate-50 md:text-7xl">
              Ready-made prints, all in one place.
            </h1>
            <p className="text-sm text-slate-300/85 md:text-lg">
              Browse our current product lineup, customize your colors, and add items straight to cart.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-7 md:grid-cols-3"
          >
            {isPending ? (
              <p className="col-span-full py-16 text-center text-sm text-slate-400">Loading products...</p>
            ) : isError ? (
              <p className="col-span-full py-16 text-center text-sm text-red-400">{error?.message || "Could not load products."}</p>
            ) : (products?.length || 0) === 0 ? (
              <p className="col-span-full py-16 text-center text-sm text-slate-400">No products available yet.</p>
            ) : null}

            {(products ?? []).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={isMobile ? false : { opacity: 0, y: 16 }}
                animate={isMobile ? { opacity: 1, y: 0 } : undefined}
                whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
                viewport={isMobile ? undefined : { once: true }}
                transition={{ delay: idx * 0.06 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-[0_14px_30px_-22px_rgba(2,6,23,1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/35"
              >
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <Link to={`/products/${product.id}`} className="block">
                  <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-slate-800/70 bg-gradient-to-b from-slate-900/35 to-slate-950/70">
                    {product.isBundle ? (
                      <span className="absolute left-3 top-3 z-10 rounded-full border border-amber-200/30 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                        Bundle
                      </span>
                    ) : null}
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-500">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                  </div>
                </Link>

                <div className="mb-4 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/70">
                    {brandLabel[product.brand || ""] || "Product"}
                  </p>
                  <Link to={`/products/${product.id}`}>
                    <h3 className="font-heading text-base font-semibold text-slate-50 transition-colors hover:text-blue-100">
                      {product.name}
                    </h3>
                  </Link>
                  <p
                    className="mt-0.5 text-xs text-slate-300/85"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.short}
                  </p>
                  {product.isBundle && product.bundleItems?.length ? (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Includes {product.bundleItems.map((item) => `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`).join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="mb-4 text-sm">
                  {product.discount?.enabled && product.discount.price > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-blue-200">EGP{product.discount.price}</span>
                      <span className="text-xs text-slate-500 line-through">EGP{product.basePrice}</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-blue-200">EGP{product.basePrice}</span>
                  )}
                </div>

                <div className="relative z-10 mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddProduct(product)}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 group-hover:translate-y-0.5 hover:shadow-[0_0_18px_-5px_hsl(var(--neon-glow)/0.8)]"
                  >
                    Add to cart
                  </button>
                  <Link
                    to={`/products/${product.id}`}
                    className="inline-flex items-center justify-center rounded-lg px-3 py-3 text-xs font-semibold text-blue-200/90 transition-colors hover:text-blue-100"
                  >
                    Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <QuickAddProductDialog
        brand={quickAddProduct?.brand || "pforge"}
        product={quickAddProduct}
        open={Boolean(quickAddProduct)}
        onOpenChange={(open) => {
          if (!open) setQuickAddProduct(null);
        }}
        accentClassName="text-blue-200"
      />
    </Layout>
  );
}
