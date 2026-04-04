import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/brand-catalog";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import QuickAddProductDialog from "@/components/QuickAddProductDialog";
import { useBrandProducts } from "@/hooks/use-brand-products";
import { useIsMobile } from "@/hooks/use-mobile";

const Pforge = () => {
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const isMobile = useIsMobile();
  const { data: products, isPending, isError, error } = useBrandProducts("pforge");

  return (
    <Layout>
      <section className="section-padding relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020617] via-slate-950 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.14),_transparent_52%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_48%,_rgba(2,6,23,0.82)_100%)]" />

        <div className="relative z-10 container mx-auto max-w-5xl space-y-14">
          <div className="flex flex-col items-center text-center gap-6 md:gap-8 pt-2 md:pt-5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 blur-xl bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.42),_transparent_62%)]" />
              <img
                src="/pforge-logo.png"
                alt="Pforge logo"
                className="relative h-32 w-32 md:h-44 md:w-44 object-contain drop-shadow-[0_0_24px_rgba(56,189,248,0.45)]"
              />
            </div>
            <div className="space-y-4 md:space-y-5">
              <p className="text-sm md:text-base font-semibold tracking-[0.34em] uppercase text-cyan-200/80">
                PFORGE
              </p>
              <h1 className="font-heading text-5xl md:text-7xl font-bold leading-[0.95] bg-gradient-to-r from-cyan-200 via-slate-100 to-blue-200 text-transparent bg-clip-text">
                Clean Setup. Better Play.
              </h1>
            </div>
            <p className="max-w-2xl text-sm md:text-lg text-slate-300/90">
              Simple upgrades that make your setup look and feel better.
            </p>
            <p className="text-xs md:text-sm uppercase tracking-[0.22em] text-cyan-200/70">
              Precision-built gaming accessories
            </p>
          </div>

          <div className="relative py-2 md:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.12),_transparent_70%)]" />
            <div className="relative flex items-center gap-4 md:gap-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/45 to-cyan-300/10" />
              <p className="text-[11px] md:text-xs font-semibold tracking-[0.28em] uppercase text-cyan-200/85">
                Featured Collection
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-300/45 to-cyan-300/10" />
            </div>
          </div>

          <div className="text-center space-y-2 md:space-y-3">
            <h2 className="font-heading text-2xl md:text-4xl font-semibold text-slate-100">
              Built For Real Setups
            </h2>
            <p className="mx-auto max-w-2xl text-sm md:text-base text-slate-300/85">
              Minimal forms, premium finish, and practical function - made to elevate your desk without visual noise.
            </p>
          </div>

          <motion.div
            id="pforge-products"
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
                className="group relative h-full overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/80 p-6 shadow-[0_0_24px_-14px_rgba(15,23,42,1),0_0_0_1px_rgba(56,189,248,0.06)] hover:-translate-y-0.5 hover:shadow-[0_0_42px_-14px_rgba(56,189,248,0.5),0_0_0_1px_rgba(56,189,248,0.22)] transition-all duration-300 flex flex-col"
              >
                <div className="pointer-events-none absolute -inset-10 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_60%)] opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70" />
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <Link to={`/pforge/${product.id}`} className="block">
                  <div className="relative mb-6 h-52 rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/40 to-slate-950/70 overflow-hidden">
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
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(56,189,248,0.2),_transparent_45%)] opacity-60" />
                  </div>
                </Link>

                <div className="relative flex items-start justify-between mb-4 gap-3">
                  <div className="min-h-[64px] min-w-0 flex-1">
                    <Link to={`/pforge/${product.id}`}>
                      <h3 className="font-heading text-base font-semibold text-white hover:text-cyan-200 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p
                      className="text-xs text-cyan-200/80 mt-0.5"
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
                  <div className="rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 whitespace-nowrap">
                    {product.discount?.enabled && product.discount.price > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-slate-400 line-through">EGP{product.basePrice}</span>
                        <span>EGP{product.discount.price}</span>
                      </span>
                    ) : (
                      <span>EGP{product.basePrice}</span>
                    )}
                  </div>
                </div>

                <p
                  className="relative z-10 mb-6 text-sm leading-6 text-slate-300 min-h-[96px]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {product.description}
                </p>

                <div className="relative z-10 mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddProduct(product)}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_18px_-5px_hsl(var(--neon-glow)/0.8)] transition-transform duration-200 group-hover:translate-y-0.5"
                  >
                    Add to cart
                  </button>
                  <Link
                    to={`/pforge/${product.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-3 text-xs font-semibold text-slate-200 hover:border-cyan-300/40 hover:text-cyan-200 transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-[11px] text-slate-400">
            Looking for a custom mount or stand? Use the quote page and mention{" "}
            <span className="font-semibold text-cyan-300">“Pforge”</span> in your notes.
          </p>
        </div>
      </section>
      <QuickAddProductDialog
        brand="pforge"
        product={quickAddProduct}
        open={Boolean(quickAddProduct)}
        onOpenChange={(open) => {
          if (!open) setQuickAddProduct(null);
        }}
        accentClassName="text-cyan-300"
      />
    </Layout>
  );
};

export default Pforge;

