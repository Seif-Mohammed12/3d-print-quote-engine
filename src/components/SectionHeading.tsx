import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  gradient?: boolean;
}

const SectionHeading = ({ title, subtitle, gradient = true }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="text-center mb-12 md:mb-16"
  >
    <h2 className={`text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-4 ${gradient ? "gradient-text" : "text-foreground"}`}>
      {title}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">{subtitle}</p>
    )}
  </motion.div>
);

export default SectionHeading;
