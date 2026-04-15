import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { toast } from "sonner";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    const prefill = sessionStorage.getItem("contactMessage");
    if (prefill) {
      setForm((prev) => ({ ...prev, message: prefill }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    setForm({ name: "", email: "", message: "" });
    sessionStorage.removeItem("contactMessage");
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading title="Contact Us" subtitle="Got a question? We'd love to hear from you." />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onSubmit={handleSubmit}
              className="glass-card p-8 space-y-5"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Your name"
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="you@example.com"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  placeholder="Tell us about your project..."
                  minLength={10}
                  maxLength={2000}
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300"
              >
                Send Message <Send className="w-4 h-4" />
              </button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="glass-card p-6 space-y-4">
                <h3 className="font-heading font-semibold text-foreground">Get in Touch</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-center gap-3"><Mail className="w-4 h-4 text-primary" /> 3d.print.ittt@gmail.com</p>
                  <p className="flex items-center gap-3"><Phone className="w-4 h-4 text-primary" /> +20 109 922 8486</p>
                  <p className="flex items-center gap-3"><MapPin className="w-4 h-4 text-primary" /> New Cairo, Egypt</p>
                </div>
              </div>

              <a
                href="whatsapp://send?phone=201099228486"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card-hover p-6 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground group-hover:text-green-400 transition-colors">
                    Chat on WhatsApp
                  </h3>
                  <p className="text-xs text-muted-foreground">Quick responses, instant support</p>
                </div>
              </a>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
