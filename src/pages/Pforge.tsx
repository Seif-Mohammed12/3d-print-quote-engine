import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/brand-catalog";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import QuickAddProductDialog from "@/components/QuickAddProductDialog";
import { useBrandProducts } from "@/hooks/use-brand-products";

const Pforge = () => {
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const { data: products, isPending, isError, error } = useBrandProducts("pforge");

  return (
    <Layout>
      <section className="section-padding relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020617] via-slate-950 to-black" />
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),_transparent)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(168,85,247,0.4),_transparent)] blur-3xl" />

        <div className="relative z-10 container mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col items-center text-center gap-4 md:gap-5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 blur-2xl bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.95),_transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 blur-3xl bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.6),_transparent_55%)]" />
              <img
                src="/pforge-logo.png"
                alt="Pforge logo"
                className="relative h-32 w-32 md:h-40 md:w-40 object-contain drop-shadow-[0_0_55px_rgba(56,189,248,0.95)] drop-shadow-[0_0_22px_rgba(168,85,247,0.65)]"
              />
            </div>
            <div>
              <p className="text-sm md:text-base font-semibold tracking-[0.38em] uppercase text-cyan-300/95">
                Pforge
              </p>
              <h1 className="mt-1 font-heading text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-cyan-200 via-white to-violet-200 text-transparent bg-clip-text">
                Gaming Line
              </h1>
            </div>
            <p className="max-w-xl text-sm md:text-base text-slate-300">
              Gaming desk accessories made to keep your setup clean and easy to reach.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8 border border-cyan-400/30 bg-gradient-to-br from-slate-950/70 via-slate-950/80 to-[#020617]/90 shadow-[0_0_40px_-12px_rgba(56,189,248,0.8)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-left space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-300">
                  Pforge
                </p>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-white">
                  Gaming Stands &amp; Accessories
                </h2>
                <p className="text-sm text-slate-300 max-w-xl">
                  Stands, hooks and docks built for controllers, headsets and everyday desk use.
                </p>
              </div>
              <div className="mt-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.7)]">
                Custom sizes &amp; logos available
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-7 md:grid-cols-3"
          >
            {isPending ? (
              <p className="col-span-full text-center text-sm text-slate-400 py-16">Loading products…</p>
            ) : isError ? (
              <p className="col-span-full text-center text-sm text-red-400 py-16">{error?.message || "Could not load products."}</p>
            ) : null}
            {(products ?? []).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-[0_0_25px_-15px_rgba(15,23,42,1)] flex flex-col"
              >
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <Link to={`/pforge/${product.id}`} className="block">
                  <div className="relative mb-5 h-48 rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/40 to-slate-950/70 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-500">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
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
                  className="relative z-10 mb-5 text-sm text-slate-300 min-h-[88px]"
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

