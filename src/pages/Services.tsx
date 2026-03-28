import { motion } from "framer-motion";
import { Printer, Cog, Package, Palette, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const services = [
  {
    icon: Printer,
    title: "Custom 3D Printing",
    desc: "Upload any STL or OBJ file and we'll print it in the material of your choice with precision accuracy.",
    features: ["FDM & SLA printing", "Layer resolution from 0.05mm", "Parts up to 300×300×400mm"],
  },
  {
    icon: Cog,
    title: "Rapid Prototyping",
    desc: "Go from CAD to physical prototype in as little as 24 hours. Perfect for startups and engineers.",
    features: ["24–48hr turnaround", "Iterative design support", "Functional testing ready"],
  },
  {
    icon: Package,
    title: "Bulk Orders",
    desc: "Need 100+ identical parts? We offer volume pricing and consistent quality across batches.",
    features: ["Volume discounts", "Quality-checked batches", "Dedicated project manager"],
  },
  {
    icon: Palette,
    title: "Design Assistance",
    desc: "Don't have a 3D model? Our design team can turn your sketches or concepts into printable files.",
    features: ["Sketch-to-CAD", "File optimization", "DFM analysis"],
  },
];

const materials = [
  { name: "PLA", desc: "Eco-friendly, great surface finish", color: "text-green-400" },
  { name: "ABS", desc: "Heat resistant, durable", color: "text-orange-400" },
  { name: "PETG", desc: "Chemical resistant, strong", color: "text-blue-400" },
  { name: "Resin", desc: "Ultra-fine detail, smooth", color: "text-purple-400" },
  { name: "Nylon", desc: "Flexible, high impact strength", color: "text-cyan-400" },
  { name: "TPU", desc: "Rubber-like flexibility", color: "text-pink-400" },
];

const Services = () => (
  <Layout>
    <section className="section-padding">
      <div className="container mx-auto">
        <SectionHeading title="Our Services" subtitle="End-to-end 3D printing solutions for every need." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{s.desc}</p>
              <ul className="space-y-2">
                {s.features.map((f) => (
                  <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <SectionHeading title="Materials" subtitle="Choose from a wide range of printing materials." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {materials.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 text-center"
            >
              <span className={`font-heading font-bold text-lg ${m.color}`}>{m.name}</span>
              <p className="text-xs text-muted-foreground mt-2">{m.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/quote"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_30px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300"
          >
            Get a Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default Services;
