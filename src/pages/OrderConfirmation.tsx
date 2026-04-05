import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, MessageCircle, ArrowLeft, Download } from "lucide-react";
import Layout from "@/components/Layout";
import { buildReceiptHtml, downloadReceipt } from "@/lib/receipt";

interface OrderData {
  customer: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  items: any[];
  total: string;
  timestamp: string;
}

const OrderConfirmation = () => {
  const [order] = useState<OrderData | null>(() => {
    const saved = sessionStorage.getItem("lastOrder");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as OrderData;
    } catch {
      return null;
    }
  });

  const receiptFileName = useMemo(() => {
    const stamp = order?.timestamp ? new Date(order.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, "-") : "order";
    return `quote-receipt-${stamp}.html`;
  }, [order?.timestamp]);

  const handleDownloadReceipt = () => {
    if (!order) return;

    const html = buildReceiptHtml({
      title: "Quote Receipt",
      subtitle: "Your quote request has been received and is ready for review.",
      referenceLabel: "Receipt ID",
      referenceValue: order.timestamp ? new Date(order.timestamp).toISOString().slice(0, 10) : "Quote request",
      customerName: order.customer,
      createdAt: order.timestamp,
      sections: [
        {
          title: "Customer details",
          rows: [
            { label: "Customer", value: order.customer },
            { label: "Email", value: order.email },
            { label: "Phone", value: order.phone },
            { label: "Company", value: order.company || "-" },
          ],
        },
        {
          title: "Order details",
          rows: [
            { label: "Item count", value: String(order.items?.length || 0) },
            { label: "Submitted", value: order.timestamp ? new Date(order.timestamp).toLocaleString() : "-" },
          ],
        },
      ],
      items: order.items,
      totals: [
        { label: "Estimated total", value: `EGP${Number(order.total || 0).toFixed(2)}` },
      ],
      notes: order.notes || null,
    });

    downloadReceipt(receiptFileName, html);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-block"
            >
              <CheckCircle className="w-24 h-24 text-green-400 mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-foreground mt-4 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-lg text-muted-foreground">
              Thank you for your order. We'll review your files and contact you shortly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8 space-y-6 mb-6"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3 text-sm">
              <p className="font-semibold text-foreground">✓ What happens next:</p>
              <div className="space-y-2 text-muted-foreground">
                <p>• Check your email for the order confirmation</p>
                <p>• We'll review your 3D files and specifications</p>
                <p>• Final quote and timeline will be emailed to you</p>
                <p>• We'll confirm payment and schedule printing</p>
              </div>
            </div>

            {order && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-heading font-semibold text-foreground">Order Details</h3>
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download receipt
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="text-foreground font-medium">{order.customer}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-foreground font-medium">{order.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-foreground font-medium">{order.phone}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Company</span>
                    <span className="text-foreground font-medium">{order.company || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Items</span>
                    <span className="text-foreground font-medium">{order.items.length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Estimated Total</span>
                    <span className="text-foreground font-bold">EGP{order.total}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 text-center space-y-4"
          >
            <h3 className="font-heading font-semibold text-foreground">Questions?</h3>
            <p className="text-muted-foreground text-sm">
              Reach out to us directly via WhatsApp or email. We respond within 2 hours during business hours.
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href="whatsapp://send?phone=201099228486&text=Hi%20there!%20I%20just%20placed%20an%20order"
                className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </a>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back Home
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default OrderConfirmation;
