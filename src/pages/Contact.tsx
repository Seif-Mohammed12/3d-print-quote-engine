import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";

const fieldClass =
  "w-full min-h-12 border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none";

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
      <section className="frame pt-8 md:pt-14">
        <h1 className="text-[40px] font-bold leading-none tracking-[-0.035em] md:text-6xl">Contact</h1>
        <p className="mt-3 max-w-lg text-muted-foreground md:text-lg">WhatsApp is the fastest way to reach us. Email works too.</p>
      </section>

      <section className="frame mb-20 mt-10 grid gap-12 md:mb-28 md:mt-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-5">
          <dl className="ruled border-y border-border text-[17px]">
            <div className="py-5">
              <dt className="text-sm text-muted-foreground">WhatsApp</dt>
              <dd className="mt-1">
                <a href="https://wa.me/201099228486" className="text-2xl font-bold tracking-[-0.02em] hover:text-ink" rel="noopener">
                  +20 109 922 8486
                </a>
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm text-muted-foreground">Call</dt>
              <dd className="mt-1">
                <a href="tel:+201099228486" className="link-quiet">+20 109 922 8486</a>
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="mt-1">
                <a href="mailto:3d.print.ittt@gmail.com" className="link-quiet">3d.print.ittt@gmail.com</a>
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-sm text-muted-foreground">Studio</dt>
              <dd className="mt-1">New Cairo, Egypt. Pickup by arrangement.</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 md:col-span-6 md:col-start-7">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Or write to us here</h2>
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-[15px] font-semibold">Name</label>
            <input
              id="contact-name"
              type="text"
              required
              dir="auto"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldClass}
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-[15px] font-semibold">Email</label>
            <input
              id="contact-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={fieldClass}
              placeholder="you@example.com"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-[15px] font-semibold">Message</label>
            <textarea
              id="contact-message"
              required
              rows={5}
              dir="auto"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`${fieldClass} resize-y py-3`}
              placeholder="What do you want printed? Size, colour, quantity, deadline."
              minLength={10}
              maxLength={2000}
            />
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">
            Send message
          </button>
        </form>
      </section>
    </Layout>
  );
};

export default Contact;
