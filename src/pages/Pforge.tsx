import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Gamepad2, Headphones, MonitorSmartphone } from "lucide-react";

const products = [
  {
    id: "pforge-stand-ps5",
    icon: Gamepad2,
    name: "DualSense Display Stand",
    price: "EGP350",
    tagline: "Clean desk, hero setup.",
    description:
      "Low-profile stand designed for PS5 and Xbox controllers with cable pass‑through and anti-slip feet.",
  },
  {
    id: "pforge-headset-hook",
    icon: Headphones,
    name: "Headset Wall Hook",
    price: "EGP220",
    tagline: "Show off your gear.",
    description:
      "Compact mount for gaming headsets, tuned for FDM printing with strong wall anchors and smooth curves.",
  },
  {
    id: "pforge-dock",
    icon: MonitorSmartphone,
    name: "Desk Dock Combo",
    price: "EGP480",
    tagline: "Controller + phone + cards.",
    description:
      "All‑in‑one dock for controllers, phone and small accessories, perfect for RGB desk setups.",
  },
];

const Pforge = () => {
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
              Neon‑lit 3D prints built for gaming setups, battle stations and streaming desks.
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
                  Designed around real gaming setups: controller stands, wall mounts and desk docks
                  tuned for strength, cable routing and that neon glow.
                </p>
              </div>
              <div className="mt-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.7)]">
                Custom colors &amp; logos available
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
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_0_25px_-15px_rgba(15,23,42,1)]"
              >
                <div className="pointer-events-none absolute inset-px rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/30 text-cyan-300">
                      <product.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-white">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-cyan-200/80">{product.tagline}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {product.price}
                  </span>
                </div>

                <p className="relative z-10 text-xs text-slate-300 mb-4">
                  {product.description}
                </p>

                <button className="relative z-10 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_20px_-5px_rgba(56,189,248,0.9)] transition-transform duration-200 group-hover:translate-y-0.5">
                  Request this Pforge item
                </button>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-[11px] text-slate-400">
            Looking for a custom mount or stand? Use the quote page and mention{" "}
            <span className="font-semibold text-cyan-300">“Pforge”</span> in your notes.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Pforge;

