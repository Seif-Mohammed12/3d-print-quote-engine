import { motion } from "framer-motion";
import { Target, Rocket, Heart } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const values = [
  { icon: Target, title: "Precision", desc: "Every print meets exacting standards. We obsess over quality so you don't have to." },
  { icon: Rocket, title: "Speed", desc: "Most orders ship within 48 hours. Need it faster? We offer rush options." },
  { icon: Heart, title: "Affordability", desc: "Transparent pricing with no hidden fees. Our smart quoting system ensures fair prices." },
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
