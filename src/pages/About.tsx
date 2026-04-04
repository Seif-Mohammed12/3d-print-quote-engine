import { motion } from "framer-motion";
import { Target, Rocket, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const values = [
  { icon: Target, title: "Precision", desc: "Every print meets exacting standards. We obsess over quality so you don't have to." },
  { icon: Rocket, title: "Speed", desc: "Most orders ship within 48 hours. Need it faster? We offer rush options." },
  { icon: Heart, title: "Affordability", desc: "Transparent pricing with no hidden fees. Our smart quoting system ensures fair prices." },
];

const subBrands = [
  {
    name: "Pforge",
    tag: "Gaming Accessories",
    desc: "A focused line of controller stands, headset hooks, docks, and setup accessories designed to elevate gaming spaces.",
    to: "/pforge",
    accent: "text-cyan-300",
    border: "border-cyan-500/35",
  },
  {
    name: "Printique",
    tag: "Premium Decor",
    desc: "A modern decor brand featuring curated pieces that blend dark elegance, clean forms, and practical everyday function.",
    to: "/printique",
    accent: "text-blue-200",
    border: "border-blue-500/35",
  },
];

const About = () => (
  <Layout>
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <SectionHeading title="About Us" subtitle="The story behind 3D Print It." />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 md:p-12 mb-16"
        >
          <p className="text-muted-foreground leading-relaxed mb-4">
            Founded in 2021, <span className="text-foreground font-semibold">3D Print It</span> was born from a simple idea: 
            everyone should have access to professional-grade 3D printing without the complexity or cost barriers.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            As a dedicated small business, we focus on delivering exceptional quality and personalized service to our customers. 
            We combine traditional craftsmanship with cutting-edge technology to bring your ideas to life with precision and care.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our smart quoting system uses advanced material analysis to provide instant, transparent pricing — 
            no hidden fees, no surprises, just honest business practices that build trust with every order.
          </p>
        </motion.div>

        <SectionHeading
          title="Our Sub-Brands"
          subtitle="Two focused product lines built under the 3D Print It umbrella."
          gradient={false}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {subBrands.map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card-hover p-6 ${brand.border}`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] font-semibold ${brand.accent}`}>{brand.tag}</p>
              <h3 className="font-heading text-2xl font-semibold text-foreground mt-2">{brand.name}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{brand.desc}</p>
              <Link to={brand.to} className={`inline-block mt-5 text-sm font-semibold ${brand.accent} hover:opacity-90`}>
                Explore {brand.name}
              </Link>
            </motion.div>
          ))}
        </div>

        <SectionHeading title="Our Values" gradient={false} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-hover p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
