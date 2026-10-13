import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { FileText } from "lucide-react";
import ReceiptPdfDialog from "@/components/ReceiptPdfDialog";

export default function ProductOrderConfirmation() {
  const navigate = useNavigate();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (!order) return;

    const items = Array.isArray(order.items) ? order.items : order.product ? [order.product] : [];
    // jspdf is loaded on demand so it stays out of the storefront bundle.
    let cancelled = false;
    let url: string | null = null;

    void import("@/lib/receipt-pdf").then(({ createReceiptPdfBlob }) => {
      if (cancelled) return;
      const blob = createReceiptPdfBlob({
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
              {
                label: "Address",
                value: order.shipping?.address
                  ? [
                      order.shipping.address.line1,
                      order.shipping.address.line2,
                      order.shipping.address.city,
                      order.shipping.address.governorate,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "-",
              },
            ],
          },
        ],
        items,
        totals: [
          { label: "Subtotal", value: `${Number(order.totals?.subtotal || 0).toFixed(0)} EGP` },
          { label: "Shipping", value: `${Number(order.totals?.shipping || 0).toFixed(0)} EGP` },
          { label: "Total", value: `${Number(order.totals?.total || 0).toFixed(0)} EGP` },
        ],
        notes: order.customer?.notes || null,
    });

    url = URL.createObjectURL(blob);
    setReceiptPdfUrl(url);
    });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [order]);

  if (!order) return null;

  const receiptFileName = `${order.orderCode || "product-order"}-receipt.pdf`;

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-3xl space-y-6">
          <SectionHeading
            title="Order placed"
            subtitle="We’ve received your request and sent a confirmation email."
          />

          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-heading font-semibold text-foreground">Summary</h3>
              <button
                type="button"
                onClick={() => setReceiptOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all"
              >
                <FileText className="h-4 w-4" />
                View receipt
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
                    {order.items.map((it: { name?: string; brand?: string; qty?: number; isBundle?: boolean; bundleItems?: Array<{ name?: string; qty?: number }> }, i: number) => (
                      <li key={i}>
                        {it.name}
                        {it.brand ? ` (${String(it.brand).toUpperCase()})` : ""}
                        {it.qty != null ? ` × ${it.qty}` : ""}
                        {it.isBundle ? " [Bundle]" : ""}
                        {it.isBundle && it.bundleItems?.length
                          ? ` - Includes ${it.bundleItems.map((bundleItem) => `${bundleItem.name}${(bundleItem.qty || 1) > 1 ? ` x${bundleItem.qty}` : ""}`).join(", ")}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <span className="text-foreground font-medium">Product:</span>{" "}
                  {order.product?.name}
                  {order.product?.isBundle ? " [Bundle]" : ""}
                  {order.product?.isBundle && order.product?.bundleItems?.length
                    ? ` - Includes ${order.product.bundleItems.map((bundleItem: { name?: string; qty?: number }) => `${bundleItem.name}${(bundleItem.qty || 1) > 1 ? ` x${bundleItem.qty}` : ""}`).join(", ")}`
                    : ""}
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
                {order.totals?.total} EGP
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
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-all"
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

          <ReceiptPdfDialog
            open={receiptOpen}
            onOpenChange={setReceiptOpen}
            title="Product order receipt"
            description="Review the PDF receipt here or download a copy for your records."
            pdfUrl={receiptPdfUrl}
            fileName={receiptFileName}
          />
        </div>
      </section>
    </Layout>
  );
}

