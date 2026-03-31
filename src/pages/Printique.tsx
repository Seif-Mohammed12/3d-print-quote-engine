import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Sparkles, PictureInPicture2, Droplets } from "lucide-react";

const products = [
  {
    id: "printique-vase",
    icon: Droplets,
    name: "Organic Flow Vase",
    style: "Modern decor",
    price: "EGP280",
    description:
      "Soft curves and layered contours that look sculpted, not “3D printed”. Perfect for dried flowers and desk styling.",
  },
  {
    id: "printique-panel",
    icon: PictureInPicture2,
    name: "Geometric Wall Panel",
    style: "Wall art",
    price: "EGP450",
    description:
      "Interlocking tiles that create depth and texture on any wall, finished in deep blues with subtle highlights.",
  },
  {
    id: "printique-tray",
    icon: Sparkles,
    name: "Halo Catch-All Tray",
    style: "Everyday objects",
    price: "EGP230",
    description:
      "Elegant tray for keys, watches or jewelry with a soft lip and subtle gold accents.",
  },
];

const Printique = () => {
  return (
    <Layout>
      <section className="section-padding relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020617] via-slate-950 to-[#020617]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.55),_transparent)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(250,204,21,0.45),_transparent)] blur-3xl" />

        <div className="relative z-10 container mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col items-center text-center gap-4 md:gap-5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 blur-2xl bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.95),_transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 blur-3xl bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.55),_transparent_55%)]" />
              <img
                src="/printique-logo.png"
                alt="Printique logo"
                className="relative h-32 w-32 md:h-40 md:w-40 object-contain drop-shadow-[0_0_55px_rgba(37,99,235,0.95)] drop-shadow-[0_0_22px_rgba(250,204,21,0.6)]"
              />
            </div>
            <div>
              <p className="text-sm md:text-base font-semibold tracking-[0.38em] uppercase text-blue-200/95">
                Printique
              </p>
              <h1 className="mt-1 font-heading text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-blue-200 via-slate-50 to-amber-200 text-transparent bg-clip-text">
                Aesthetic Line
              </h1>
            </div>
            <p className="max-w-xl text-sm md:text-base text-slate-300">
              Dark, elegant 3D printed decor pieces in deep blues and soft gold accents.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8 border border-blue-400/30 bg-gradient-to-br from-slate-950/80 via-slate-950/90 to-slate-900/80 shadow-[0_0_40px_-18px_rgba(30,64,175,0.9)]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-blue-200">
                  Printique
                </p>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-50">
                  Statement Pieces for Dark Interiors
                </h2>
                <p className="text-sm text-slate-300 max-w-xl">
                  Designed to live on shelves, desks and walls — with finishes that feel closer to
                  ceramic and metal than raw filament.
                </p>
              </div>
              <div className="mt-2 rounded-2xl border border-amber-300/40 bg-slate-900/70 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-200 shadow-[0_0_24px_-10px_rgba(245,158,11,0.9)]">
                Royal blue &amp; gold finishes
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-[0_0_25px_-18px_rgba(15,23,42,1)]"
              >
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-400/25 text-blue-200">
                      <product.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-slate-50">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-amber-200/90">{product.style}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-blue-200">
                    {product.price}
                  </span>
                </div>

                <p className="relative z-10 mb-4 text-xs text-slate-300">{product.description}</p>

                <button className="relative z-10 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_-6px_rgba(37,99,235,0.9)] transition-transform duration-200 group-hover:translate-y-0.5">
                  Request this Printique piece
                </button>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-[11px] text-slate-400">
            For custom decor, mention{" "}
            <span className="font-semibold text-blue-200">“Printique”</span> when you reach out and
            tell us about your space and colors.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Printique;

