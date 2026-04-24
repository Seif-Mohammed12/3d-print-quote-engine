import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Clock, Layers, Box, Cpu } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useIsMobile } from "@/hooks/use-mobile";

const features = [
  { icon: Zap, title: "Lightning Fast", desc: "48-hour turnaround on most orders" },
  { icon: Shield, title: "Premium Quality", desc: "Layer resolution down to 0.05mm" },
  { icon: Clock, title: "Instant Quotes", desc: "Upload a file, get a price in seconds" },
  { icon: Layers, title: "Multi-Material", desc: "PLA, ABS, PETG, Resin & more" },
  { icon: Box, title: "Any Scale", desc: "From prototypes to production runs" },
  { icon: Cpu, title: "Smart Slicer", desc: "AI-powered cost estimation" },
];

const galleryItems = [
  { title: "Mechanical Parts", color: "from-primary/20 to-accent/20" },
  { title: "Architectural Models", color: "from-accent/20 to-primary/20" },
  { title: "Custom Figurines", color: "from-primary/20 to-neon-purple/20" },
  { title: "Product Prototypes", color: "from-neon-purple/20 to-primary/20" },
];

const Home = () => {
  const isMobile = useIsMobile();

  return (
    <Layout>
      <section className="section-padding relative flex min-h-[90vh] items-center justify-center overflow-hidden grid-background">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="mb-6 inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              Next-Gen 3D Printing
            </span>
            <h1 className="mb-6 font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl lg:text-7xl">
              Turn Your Ideas
              <br />
              <span className="gradient-text">Into Reality</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Professional 3D printing services with instant quoting. Upload your design, pick your material, and we&apos;ll bring it to life.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/quote"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(var(--neon-glow)/0.5)]"
              >
                Upload Your File <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-8 py-3.5 font-semibold text-foreground transition-all duration-300 hover:bg-secondary"
              >
                Browse Products
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: 20 }}
            animate={isMobile ? { opacity: 1, y: 0 } : undefined}
            whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
            viewport={isMobile ? undefined : { once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-blue-400/30 bg-gradient-to-br from-slate-950/90 via-slate-950 to-slate-900 p-6 shadow-[0_0_30px_-12px_rgba(59,130,246,0.7)] md:p-8"
          >
            <div className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.5),_transparent)] blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(34,197,94,0.22),_transparent)] blur-2xl" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Shop Products</p>
              <h3 className="font-heading text-xl font-semibold text-foreground">Browse our ready-made catalog</h3>
              <p className="text-sm text-muted-foreground">
                One storefront for all current products, from setup accessories to decor pieces and bundle offers.
              </p>
              <Link to="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-200 hover:text-blue-100">
                Explore products <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          <SectionHeading title="Why Choose Us" subtitle="Speed, quality, and affordability - we deliver on all three." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={isMobile ? false : { opacity: 0, y: 20 }}
                animate={isMobile ? { opacity: 1, y: 0 } : undefined}
                whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
                viewport={isMobile ? undefined : { once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-card-hover p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-heading font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-card/20">
        <div className="container mx-auto">
          <SectionHeading title="Our Work" subtitle="A glimpse of what we've printed for our clients." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {galleryItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={isMobile ? false : { opacity: 0, scale: 0.95 }}
                animate={isMobile ? { opacity: 1, scale: 1 } : undefined}
                whileInView={isMobile ? undefined : { opacity: 1, scale: 1 }}
                viewport={isMobile ? undefined : { once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="glass-card-hover relative aspect-square overflow-hidden p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Box className="h-16 w-16 text-primary/20" />
                </div>
                <span className="relative z-10 font-heading text-sm font-semibold text-foreground">{item.title}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/gallery" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View Full Gallery <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          <motion.div
            initial={isMobile ? false : { opacity: 0, y: 20 }}
            animate={isMobile ? { opacity: 1, y: 0 } : undefined}
            whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
            viewport={isMobile ? undefined : { once: true }}
            className="glass-card neon-border p-10 text-center md:p-16"
          >
            <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">Ready to Start Printing?</h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Upload your 3D model and get an instant quote. No waiting, no hassle.
            </p>
            <Link
              to="/quote"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(var(--neon-glow)/0.5)]"
            >
              Get Your Quote <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
