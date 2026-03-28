import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Clock, Layers, Box, Cpu } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

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

const Home = () => (
  <Layout>
    {/* Hero */}
    <section className="relative min-h-[90vh] flex items-center justify-center section-padding grid-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-6">
            Next-Gen 3D Printing
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 text-foreground leading-tight">
            Turn Your Ideas
            <br />
            <span className="gradient-text">Into Reality</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Professional 3D printing services with instant quoting. Upload your design, pick your material, and we'll bring it to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/quote"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_30px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300"
            >
              Upload Your File <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/quote"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-all duration-300"
            >
              Get a Quote
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Features */}
    <section className="section-padding">
      <div className="container mx-auto">
        <SectionHeading title="Why Choose Us" subtitle="Speed, quality, and affordability — we deliver on all three." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card-hover p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Gallery Preview */}
    <section className="section-padding bg-card/20">
      <div className="container mx-auto">
        <SectionHeading title="Our Work" subtitle="A glimpse of what we've printed for our clients." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {galleryItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card-hover aspect-square flex items-end p-5 overflow-hidden relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Box className="w-16 h-16 text-primary/20" />
              </div>
              <span className="relative z-10 font-heading font-semibold text-sm text-foreground">{item.title}</span>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/gallery" className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1">
            View Full Gallery <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card neon-border p-10 md:p-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Ready to Start Printing?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Upload your 3D model and get an instant quote. No waiting, no hassle.
          </p>
          <Link
            to="/quote"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_30px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300"
          >
            Get Your Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  </Layout>
);

export default Home;
