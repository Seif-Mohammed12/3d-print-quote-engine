import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/brand-catalog";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import QuickAddProductDialog from "@/components/QuickAddProductDialog";
import { useBrandProducts } from "@/hooks/use-brand-products";
import { useIsMobile } from "@/hooks/use-mobile";

const Printique = () => {
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const isMobile = useIsMobile();
  const { data: products, isPending, isError, error } = useBrandProducts("printique");

  return (
    <Layout>
      <section className="section-padding relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020617] via-slate-950 to-[#020617]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.14),_transparent_52%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_48%,_rgba(2,6,23,0.82)_100%)]" />

        <div className="relative z-10 container mx-auto max-w-5xl space-y-14">
          <div className="flex flex-col items-center text-center gap-6 md:gap-8 pt-2 md:pt-5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 blur-xl bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.45),_transparent_62%)]" />
              <div className="pointer-events-none absolute inset-0 blur-2xl bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.22),_transparent_68%)]" />
              <img
                src="/printique-logo.png"
                alt="Printique logo"
                className="relative h-32 w-32 md:h-44 md:w-44 object-contain drop-shadow-[0_0_24px_rgba(37,99,235,0.45)]"
              />
            </div>
            <div className="space-y-4 md:space-y-5">
              <p className="text-sm md:text-base font-semibold tracking-[0.34em] uppercase text-blue-200/85">
                PRINTIQUE
              </p>
              <h1 className="font-heading text-5xl md:text-7xl font-bold leading-[0.95] bg-gradient-to-r from-blue-200 via-slate-100 to-amber-200 text-transparent bg-clip-text">
                Dark Elegance. Everyday Space.
              </h1>
            </div>
            <p className="max-w-2xl text-sm md:text-lg text-slate-300/90">
              Premium decor upgrades that make your space feel intentional and refined.
            </p>
            <p className="text-xs md:text-sm uppercase tracking-[0.22em] text-amber-200/70">
              Refined pieces for modern interiors
            </p>
          </div>

          <div className="relative py-2 md:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.12),_transparent_70%)]" />
            <div className="relative flex items-center gap-4 md:gap-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-300/45 to-amber-200/10" />
              <p className="text-[11px] md:text-xs font-semibold tracking-[0.28em] uppercase text-blue-200/85">
                Signature Collection
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blue-300/45 to-amber-200/10" />
            </div>
          </div>

          <div className="text-center space-y-2 md:space-y-3">
            <h2 className="font-heading text-2xl md:text-4xl font-semibold text-slate-100">
              Signature Objects
            </h2>
            <p className="mx-auto max-w-2xl text-sm md:text-base text-slate-300/85">
              A curated lineup of decor forms designed to add depth, contrast, and character to your space.
            </p>
          </div>

          <motion.div
            id="printique-products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-7 md:grid-cols-3 pt-2 md:pt-4"
          >
            {isPending ? (
              <p className="col-span-full text-center text-sm text-slate-400 py-16">Loading products…</p>
            ) : isError ? (
              <p className="col-span-full text-center text-sm text-red-400 py-16">{error?.message || "Could not load products."}</p>
            ) : null}
            {(products ?? []).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={isMobile ? false : { opacity: 0, y: 16 }}
                animate={isMobile ? { opacity: 1, y: 0 } : undefined}
                whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
                viewport={isMobile ? undefined : { once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group relative h-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-[0_14px_30px_-22px_rgba(2,6,23,1)] hover:-translate-y-0.5 hover:border-blue-300/35 transition-all duration-300 flex flex-col"
              >
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <Link to={`/printique/${product.id}`} className="block">
                  <div className="relative mb-4 h-44 rounded-xl border border-slate-800/70 bg-gradient-to-b from-slate-900/35 to-slate-950/70 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-500">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(59,130,246,0.2),_transparent_45%)] opacity-60" />
                  </div>
                </Link>

                <div className="relative min-w-0 mb-4">
                    <Link to={`/printique/${product.id}`}>
                      <h3 className="font-heading text-base font-semibold text-slate-50 hover:text-blue-100 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p
                      className="text-xs text-amber-200/90 mt-0.5"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {product.short}
                    </p>
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
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_18px_-5px_hsl(var(--neon-glow)/0.8)] transition-transform duration-200 group-hover:translate-y-0.5"
                  >
                    Add to cart
                  </button>
                  <Link
                    to={`/printique/${product.id}`}
                    className="inline-flex items-center justify-center rounded-lg px-3 py-3 text-xs font-semibold text-blue-200/90 hover:text-blue-100 transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-[11px] text-slate-400">
            For custom decor, mention{" "}
            <span className="font-semibold text-blue-200">“Printique”</span> when you message us.
          </p>
        </div>
      </section>
      <QuickAddProductDialog
        brand="printique"
        product={quickAddProduct}
        open={Boolean(quickAddProduct)}
        onOpenChange={(open) => {
          if (!open) setQuickAddProduct(null);
        }}
        accentClassName="text-blue-200"
      />
    </Layout>
  );
};

export default Printique;

