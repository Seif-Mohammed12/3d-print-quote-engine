import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { Download } from "lucide-react";
import { buildReceiptHtml, downloadReceipt } from "@/lib/receipt";

export default function ProductOrderConfirmation() {
  const navigate = useNavigate();
  const order = useMemo(() => {
    const raw = sessionStorage.getItem("lastProductOrder");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!order) {
      navigate("/", { replace: true });
    }
  }, [order, navigate]);

  if (!order) return null;

  const receiptFileName = `${order.orderCode || "product-order"}-receipt.html`;

  const handleDownloadReceipt = () => {
    const items = Array.isArray(order.items) ? order.items : order.product ? [order.product] : [];
    const html = buildReceiptHtml({
      title: "Product Order Receipt",
      subtitle: "Your product order has been received and is ready for review.",
      referenceLabel: "Order code",
      referenceValue: order.orderCode || order.orderId || "-",
      customerName: order.customer?.name || null,
      createdAt: order.createdAt || null,
      sections: [
        {
          title: "Customer details",
          rows: [
            { label: "Customer", value: order.customer?.name || "-" },
            { label: "Email", value: order.customer?.email || "-" },
            { label: "Phone", value: order.customer?.phone || "-" },
          ],
        },
        {
          title: "Delivery & payment",
          rows: [
            { label: "Shipping", value: order.shipping?.method === "pickup" ? "Pickup" : "Aramex" },
            { label: "Payment", value: order.payment?.method === "cod" ? "Cash on delivery" : "Instapay" },
            { label: "Address", value: order.shipping?.address ? [order.shipping.address.line1, order.shipping.address.line2, order.shipping.address.city, order.shipping.address.governorate].filter(Boolean).join(", ") : "-" },
          ],
        },
      ],
      items,
      totals: [
        { label: "Subtotal", value: `EGP${Number(order.totals?.subtotal || 0).toFixed(0)}` },
        { label: "Shipping", value: `EGP${Number(order.totals?.shipping || 0).toFixed(0)}` },
        { label: "Total", value: `EGP${Number(order.totals?.total || 0).toFixed(0)}` },
      ],
      notes: order.customer?.notes || null,
    });

    downloadReceipt(receiptFileName, html);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-3xl space-y-6">
          <SectionHeading
            title="Order placed"
            subtitle="We’ve received your request and sent a confirmation email."
          />

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-heading font-semibold text-foreground">Summary</h3>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all"
              >
                <Download className="h-4 w-4" />
                Download receipt
              </button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              {order.orderCode ? (
                <div>
                  <span className="text-foreground font-medium">Order:</span>{" "}
                  {order.orderCode}
                </div>
              ) : null}
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-foreground font-medium">Items</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {order.items.map((it: { name?: string; brand?: string; qty?: number }, i: number) => (
                      <li key={i}>
                        {it.name}
                        {it.brand ? ` (${String(it.brand).toUpperCase()})` : ""}
                        {it.qty != null ? ` × ${it.qty}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <span className="text-foreground font-medium">Product:</span>{" "}
                  {order.product?.name}
                </div>
              )}
              <div>
                <span className="text-foreground font-medium">Shipping:</span>{" "}
                {order.shipping?.method === "pickup" ? "Pickup" : "Aramex"}
              </div>
              <div>
                <span className="text-foreground font-medium">Payment:</span>{" "}
                {order.payment?.method === "cod" ? "Cash on delivery" : "Instapay"}
              </div>
              <div>
                <span className="text-foreground font-medium">Total:</span>{" "}
                EGP{order.totals?.total}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Back
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all"
            >
              Back to home
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

