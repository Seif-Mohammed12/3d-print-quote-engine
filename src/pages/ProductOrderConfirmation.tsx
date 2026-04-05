import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

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

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-3xl space-y-6">
          <SectionHeading
            title="Order placed"
            subtitle="We’ve received your request and sent a confirmation email."
          />

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">Summary</h3>
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

