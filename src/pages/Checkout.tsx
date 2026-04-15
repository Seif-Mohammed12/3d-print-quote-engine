import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileType, Mail, Phone, MapPin } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import CheckoutAuthPrompt from "@/components/CheckoutAuthPrompt";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createOrderRecord } from "@/lib/orders-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Email sending service - sends order details and files using FormData (multipart)
const sendOrderEmail = async (orderDetails: any, fileBuffers: { name: string; buffer: ArrayBuffer }[]) => {
  try {
    const formData = new FormData();
    
    // Add order details as JSON
    formData.append('orderDetails', JSON.stringify(orderDetails));
    
    // Add file buffers as binary
    fileBuffers.forEach((file, index) => {
      const blob = new Blob([file.buffer], { type: 'application/octet-stream' });
      formData.append(`files`, blob, file.name);
    });

    const response = await fetch(
      import.meta.env.VITE_API_URL || '/api/send-order-email',
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with boundary
      }
    );

    const data = await response.json();
    return response.ok && data.success;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapContact = async () => {
      if (!supabase || !user?.id) {
        if (user?.email && !cancelled) {
          setForm((prev) => ({
            ...prev,
            email: prev.email || user.email || "",
          }));
        }
        return;
      }

      const { data } = await supabase
        .from("customer_profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setForm((prev) => ({
        ...prev,
        name: prev.name || data?.full_name || user.user_metadata?.full_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || data?.phone || "",
      }));
    };

    void bootstrapContact();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  if (cart.length === 0) {
    navigate("/cart");
    return null;
  }

  if (!user && !guestMode) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container mx-auto max-w-4xl space-y-6">
            <SectionHeading
              title="Checkout"
              subtitle="Choose how you want to continue before placing your order."
            />
            <CheckoutAuthPrompt
              title="Continue to checkout"
              subtitle="Sign in to track everything in your account, or continue as guest and still receive confirmation emails."
              onLogin={() => navigate("/login", { state: { from: "/checkout" } })}
              onSignup={() => navigate("/signup", { state: { from: "/checkout" } })}
              onContinueGuest={() => setGuestMode(true)}
            />
          </div>
        </section>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare order details
      const orderDetails = {
        orderType: "quote",
        customer: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company || "N/A",
        notes: form.notes,
        items: cart.map(item => ({
          file: item.fileName,
          material: item.material,
          quality: item.quality,
          infill: item.infill,
          weight: item.quote.weightGrams.toFixed(1),
          time: item.quote.estimatedTime,
          price: item.quote.totalPrice.toFixed(2),
        })),
        total: getTotalPrice().toFixed(2),
      };

      const orderRecordPayload = {
        orderType: "quote",
        createdAt: new Date().toISOString(),
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
        },
        payment: null,
        shipping: null,
        totals: {
          subtotal: Number(getTotalPrice().toFixed(2)),
          shipping: 0,
          total: Number(getTotalPrice().toFixed(2)),
          currency: "EGP",
        },
        items: cart.map((item) => ({
          name: item.fileName,
          brand: "custom",
          qty: 1,
          unitPrice: Number(item.quote.totalPrice.toFixed(2)),
          subtotal: Number(item.quote.totalPrice.toFixed(2)),
          material: item.material,
          quality: item.quality,
          infill: item.infill,
          weight: Number(item.quote.weightGrams.toFixed(1)),
          time: item.quote.estimatedTime,
          file: item.fileName,
        })),
      };

      const created = await createOrderRecord(orderRecordPayload);
      const persistedOrder = created?.order || null;

      if (persistedOrder?.order_code) {
        (orderDetails as any).orderCode = persistedOrder.order_code;
      }
      if (persistedOrder?.id) {
        (orderDetails as any).orderId = persistedOrder.id;
      }

      // Prepare file buffers with names
      const fileBuffers = cart.map(item => ({
        name: item.fileName,
        buffer: item.fileBuffer,
      }));

      // Send email with order details and files
      const emailSent = await sendOrderEmail(orderDetails, fileBuffers);
      
      if (!emailSent) {
        toast.error("Failed to send order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Store order temporarily
      sessionStorage.setItem("lastOrder", JSON.stringify({
        ...orderDetails,
        timestamp: new Date().toISOString(),
      }));

      // Clear cart and redirect to confirmation
      clearCart();
      toast.success("Order placed! Confirmation sent to your email.");
      
      setTimeout(() => {
        navigate("/order-confirmation", { replace: true });
      }, 500);
    } catch {
      toast.error("Failed to process order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading title="Checkout" subtitle="Review your order and provide contact details" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Review */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-4"
              >
                <h3 className="font-heading font-semibold text-foreground mb-4">Order Summary</h3>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-start justify-between pb-3 border-b border-border/50 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <FileType className="w-4 h-4 text-primary mt-1" />
                        <div>
                          <p className="font-medium text-foreground">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground">{item.material} • {item.quality} • {item.infill}%</p>
                        </div>
                      </div>
                      <p className="font-semibold text-primary">EGP{item.quote.totalPrice.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="glass-card p-6 space-y-5"
              >
                <h3 className="font-heading font-semibold text-foreground">Contact Information</h3>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Your name"
                    minLength={2}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="your@email.com"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="+20 1XX XXX XXXX"
                    pattern="[0-9+\-() ]{10,20}"
                    minLength={10}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Company (Optional)</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Company name"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Special Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Any special requests or notes..."
                    maxLength={1000}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </button>
              </motion.form>
            </div>

            {/* Order Total */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 sticky top-24 space-y-4"
              >
                <h3 className="font-heading font-semibold text-foreground">Order Total</h3>

                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="text-foreground">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">EGP{getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <p className="text-3xl font-heading font-bold neon-text">
                    EGP{getTotalPrice().toFixed(2)}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-lg">
                  ℹ️ Your order will be sent via email. We'll contact you shortly for detailed review and final confirmation.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: Mail, label: "Email", value: "3d.print.ittt@gmail.com" },
              { icon: Phone, label: "WhatsApp", value: "+20 109 922 8486" },
              { icon: MapPin, label: "Location", value: "New Cairo, Egypt" },
            ].map(info => (
              <div key={info.label} className="glass-card p-4 text-center">
                <info.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">{info.label}</p>
                <p className="font-medium text-foreground text-sm">{info.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
