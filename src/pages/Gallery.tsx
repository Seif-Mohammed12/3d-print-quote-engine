import { motion } from "framer-motion";
import { Box } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useIsMobile } from "@/hooks/use-mobile";

const items = [
  { title: "Mechanical Gears", category: "Engineering", gradient: "from-primary/30 to-accent/10" },
  { title: "Phone Stand", category: "Consumer Products", gradient: "from-accent/30 to-primary/10" },
  { title: "Architectural Model", category: "Architecture", gradient: "from-primary/20 to-neon-purple/20" },
  { title: "Chess Set", category: "Art & Design", gradient: "from-neon-purple/20 to-primary/20" },
  { title: "Drone Parts", category: "Engineering", gradient: "from-primary/30 to-accent/10" },
  { title: "Custom Figurine", category: "Art & Design", gradient: "from-accent/20 to-primary/20" },
  { title: "Medical Prototype", category: "Medical", gradient: "from-primary/20 to-neon-purple/10" },
  { title: "Lamp Shade", category: "Home Decor", gradient: "from-neon-purple/30 to-primary/10" },
  { title: "Robot Parts", category: "Robotics", gradient: "from-primary/20 to-accent/20" },
];

const Gallery = () => {
  const isMobile = useIsMobile();

  return (
  <Layout>
    <section className="section-padding">
      <div className="container mx-auto">
        <SectionHeading title="Gallery" subtitle="Explore our portfolio of 3D printed creations." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={isMobile ? false : { opacity: 0, y: 20 }}
              animate={isMobile ? { opacity: 1, y: 0 } : undefined}
              whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
              viewport={isMobile ? undefined : { once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="glass-card-hover aspect-[4/3] relative overflow-hidden group cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Box className="w-20 h-20 text-primary/10 group-hover:text-primary/20 transition-colors duration-500 group-hover:scale-110 transform" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background/80 to-transparent">
                <span className="text-xs text-primary font-medium">{item.category}</span>
                <h3 className="font-heading font-semibold text-foreground">{item.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
  );
};

export default Gallery;
