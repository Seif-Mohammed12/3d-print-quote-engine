import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { toast } from "sonner";
import { useCart, type ProductCartItem } from "@/lib/cart-context";
import type { Product } from "@/lib/brand-catalog";
import {
  getProduct,
  getUnitPrice,
  type PaymentMethod,
  type ProductOrderCustomer,
  type ProductOrderDraft,
  type ShippingMethod,
} from "@/lib/product-order";
import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchProductByBrandAndId, mapDbProductToLegacyProduct } from "@/lib/products-api";
import { createOrderRecord } from "@/lib/orders-api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type CheckoutMode = "loading" | "single" | "cart" | "empty";

type CartLineResolved = {
  item: ProductCartItem;
  product: Product | null;
  primary: { name: string } | null;
  secondary: { name: string } | null;
  unitPrice: number;
  lineSubtotal: number;
};

async function sendProductOrderEmail(payload: any) {
  const response = await fetch("/api/send-product-order-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  let data: any = null;
  let text: string | null = null;

  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      text = await response.text();
    }
  } catch {
    // ignore
  }

  return { ok: response.ok, status: response.status, data, text };
}

export default function ProductCheckout() {
  const navigate = useNavigate();
  const { clearProductCart, productCart } = useCart();
  const { user } = useAuth();
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("loading");
  const [draft, setDraft] = useState<ProductOrderDraft | null>(null);
  const [shipping, setShipping] = useState<ShippingMethod>("pickup");
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customer, setCustomer] = useState<ProductOrderCustomer>({
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    governorate: "",
    notes: "",
  });

  useEffect(() => {
    const cartFlag = sessionStorage.getItem("productCartCheckout") === "true";
    sessionStorage.removeItem("productCartCheckout");

    if (cartFlag && productCart.length > 0) {
      setCheckoutMode("cart");
      return;
    }

    const raw = sessionStorage.getItem("productOrderDraft");
    if (raw) {
      try {
        setDraft(JSON.parse(raw) as ProductOrderDraft);
        setCheckoutMode("single");
        return;
      } catch {
        // fall through
      }
    }

    if (productCart.length > 0) {
      setCheckoutMode("cart");
      return;
    }

    setCheckoutMode("empty");
    // Intentionally read `productCart` once on entry (modal sets session flag, then navigates here).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapCustomer = async () => {
      if (!supabase || !user?.id) return;

      const { data } = await supabase
        .from("customer_profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setCustomer((prev) => ({
        ...prev,
        name: prev.name || data?.full_name || user.user_metadata?.full_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || data?.phone || "",
      }));
    };

    void bootstrapCustomer();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  const { data: liveProduct } = useQuery({
    queryKey: ["checkout-product", draft?.brand, draft?.productId],
    enabled: checkoutMode === "single" && Boolean(draft?.brand && draft?.productId),
    queryFn: async () => {
      if (!draft) return null;
      return fetchProductByBrandAndId(draft.brand, draft.productId);
    },
    retry: 1,
  });

  const cartQueries = useQueries({
    queries:
      checkoutMode === "cart"
        ? productCart.map((item) => ({
            queryKey: ["checkout-cart-line", item.brand, item.productId] as const,
            queryFn: () => fetchProductByBrandAndId(item.brand, item.productId),
            enabled: checkoutMode === "cart",
            retry: 1,
          }))
        : [],
  });

  const product = useMemo(() => {
    if (checkoutMode !== "single" || !draft) return null;
    if (liveProduct) return mapDbProductToLegacyProduct(liveProduct);
    return getProduct(draft.brand, draft.productId);
  }, [checkoutMode, draft, liveProduct]);

  const cartLines: CartLineResolved[] = useMemo(() => {
    if (checkoutMode !== "cart") return [];
    return productCart.map((item, idx) => {
      const live = cartQueries[idx]?.data;
      const legacy = live ? mapDbProductToLegacyProduct(live) : getProduct(item.brand, item.productId);
      const qty = Math.max(1, item.qty || 1);
      const unitPrice = item.unitPrice;
      const lineSubtotal = unitPrice * qty;
      if (!legacy) {
        return {
          item,
          product: null,
          primary: null,
          secondary: null,
          unitPrice,
          lineSubtotal,
        };
      }
      const primary = legacy.primaryColors.find((c) => c.id === item.primaryColorId) || null;
      const secondary = legacy.secondaryColors.find((c) => c.id === item.secondaryColorId) || null;
      return {
        item,
        product: legacy,
        primary,
        secondary,
        unitPrice,
        lineSubtotal,
      };
    });
  }, [checkoutMode, productCart, cartQueries]);

  const primary = useMemo(() => {
    if (!draft || !product) return null;
    return product.primaryColors.find((c) => c.id === draft.primaryColorId) || null;
  }, [draft, product]);

  const secondary = useMemo(() => {
    if (!draft || !product) return null;
    return product.secondaryColors.find((c) => c.id === draft.secondaryColorId) || null;
  }, [draft, product]);

  const unitPrice = useMemo(() => {
    if (!draft || !product) return 0;
    return getUnitPrice(product, false);
  }, [draft, product]);

  const singleSubtotal = useMemo(() => {
    if (!draft) return 0;
    return unitPrice * Math.max(1, draft.qty || 1);
  }, [draft, unitPrice]);

  const cartSubtotal = useMemo(() => {
    if (checkoutMode !== "cart") return 0;
    return cartLines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  }, [checkoutMode, cartLines]);

  const subtotal = checkoutMode === "cart" ? cartSubtotal : singleSubtotal;

  // For now, treat shipping cost as "to be confirmed" (especially for Aramex).
  const shippingCost = 0;
  const total = subtotal + shippingCost;

  const cartPending = checkoutMode === "cart" && cartQueries.some((q) => q.isPending);
  const cartReady = checkoutMode === "cart" && !cartPending;

  useEffect(() => {
    if (checkoutMode !== "single" || !draft) return;
    if (!product) {
      toast.error("Product not found");
      navigate(draft.brand === "pforge" ? "/pforge" : "/printique", { replace: true });
    }
  }, [checkoutMode, draft, product, navigate]);

  useEffect(() => {
    if (!cartReady) return;
    const missing = cartLines.filter((l) => !l.product);
    if (missing.length > 0) {
      toast.error("One or more products could not be loaded.");
      navigate("/product-cart", { replace: true });
    }
  }, [cartReady, cartLines, navigate]);

  if (checkoutMode === "loading" || (checkoutMode === "cart" && cartPending)) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <SectionHeading title="Checkout" subtitle="Loading your order…" />
          </div>
        </section>
      </Layout>
    );
  }

  if (
    checkoutMode === "empty" ||
    (checkoutMode === "cart" && productCart.length === 0)
  ) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <SectionHeading title="Checkout" subtitle="No products in your cart yet." />
            <button
              type="button"
              onClick={() => navigate("/product-cart")}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
            >
              View cart
            </button>
          </div>
        </section>
      </Layout>
    );
  }

  if (checkoutMode === "single" && (!draft || !product)) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <SectionHeading title="Checkout" subtitle="No product selected yet." />
            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
            >
              Go home
            </button>
          </div>
        </section>
      </Layout>
    );
  }

  if (checkoutMode === "cart" && cartReady && !cartLines.every((l) => l.product)) {
    return null;
  }

  const requiresAddress = shipping === "aramex";

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (requiresAddress) {
      if (!customer.addressLine1 || !customer.city || !customer.governorate) {
        toast.error("Please fill in your shipping address.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const shippingPayload = {
        method: shipping,
        provider: shipping === "aramex" ? "Aramex" : "Pickup",
        cost: shippingCost,
        address:
          shipping === "aramex"
            ? {
                line1: customer.addressLine1,
                line2: customer.addressLine2,
                city: customer.city,
                governorate: customer.governorate,
              }
            : null,
      };

      const customerPayload = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
      };

      const totalsPayload = {
        subtotal,
        shipping: shippingCost,
        total,
        currency: "EGP",
      };

      const payload =
        checkoutMode === "cart"
          ? {
              orderType: "product",
              createdAt: new Date().toISOString(),
              isMultiItem: true,
              items: cartLines
                .filter((l) => l.product)
                .map((line) => ({
                  brand: line.item.brand,
                  productId: line.product!.id,
                  name: line.product!.name,
                  qty: line.item.qty,
                  unitPrice: line.unitPrice,
                  subtotal: line.lineSubtotal,
                  primaryColor: line.primary?.name || "",
                  secondaryColor: line.secondary?.name || "",
                  discount:
                    line.product!.discount?.enabled && line.product!.discount.price
                      ? { oldPrice: line.product!.basePrice, newPrice: line.product!.discount.price }
                      : null,
                })),
              brand: cartLines[0]?.item.brand ?? "",
              product: null,
              shipping: shippingPayload,
              payment: { method: payment },
              customer: customerPayload,
              totals: totalsPayload,
            }
          : {
              orderType: "product",
              createdAt: new Date().toISOString(),
              brand: draft!.brand,
              product: {
                id: product!.id,
                name: product!.name,
                qty: draft!.qty,
                unitPrice,
                subtotal,
                primaryColor: primary?.name || "",
                secondaryColor: secondary?.name || "",
                discount: product!.discount?.enabled
                  ? { oldPrice: product!.basePrice, newPrice: product!.discount.price }
                  : null,
              },
              shipping: shippingPayload,
              payment: { method: payment },
              customer: customerPayload,
              totals: totalsPayload,
            };

      const created = await createOrderRecord(payload);
      const persistedOrder = created?.order || null;

      const payloadWithOrder = {
        ...payload,
        orderId: persistedOrder?.id,
        orderCode: persistedOrder?.order_code,
      };

      const result = await sendProductOrderEmail(payloadWithOrder);
      if (!result.ok || !result.data?.success) {
        const apiError =
          result.data?.error ||
          (result.text ? result.text.slice(0, 140) : null) ||
          (result.status ? `Request failed (${result.status})` : "Failed to place order");
        toast.error(apiError);
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem("lastProductOrder", JSON.stringify(payloadWithOrder));
      sessionStorage.removeItem("productOrderDraft");
      toast.success("Order placed! Confirmation sent to your email.");
      navigate("/product-order-confirmation", { replace: true });
      clearProductCart();
    } catch (err: any) {
      toast.error("Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Checkout" subtitle="Review your order and enter shipping details." />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-4"
              >
                <h3 className="font-heading font-semibold text-foreground">Order Summary</h3>

                {checkoutMode === "cart" ? (
                  <div className="space-y-4">
                    {cartLines
                      .filter((l) => l.product)
                      .map((line, idx, arr) => (
                        <div
                          key={line.item.id}
                          className={`flex items-start justify-between gap-4 ${
                            idx < arr.length - 1 ? "border-b border-border/50 pb-4" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{line.product!.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {line.item.brand.toUpperCase()} • Qty {line.item.qty} • Primary:{" "}
                              {line.primary?.name || "—"} • Secondary: {line.secondary?.name || "—"}
                            </p>
                          </div>
                          <p className="font-semibold text-primary shrink-0">
                            EGP{line.lineSubtotal.toFixed(0)}
                          </p>
                        </div>
                      ))}
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground font-medium">
                        {shipping === "pickup" ? "Pickup (free)" : "Aramex (to be confirmed)"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
                      <div>
                        <p className="font-semibold text-foreground">{product!.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {draft!.brand.toUpperCase()} • Primary: {primary?.name || "—"} • Secondary:{" "}
                          {secondary?.name || "—"}
                        </p>
                      </div>
                      <p className="font-semibold text-primary">EGP{subtotal.toFixed(0)}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Qty</span>
                      <span className="text-foreground font-medium">{draft!.qty}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Unit price</span>
                      <span className="text-foreground font-medium">EGP{unitPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground font-medium">
                        {shipping === "pickup" ? "Pickup (free)" : "Aramex (to be confirmed)"}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={placeOrder}
                className="glass-card p-6 space-y-6"
              >
                <h3 className="font-heading font-semibold text-foreground">Shipping & Payment</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Shipping method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShipping("pickup")}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          shipping === "pickup"
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setShipping("aramex")}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          shipping === "aramex"
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Aramex
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Payment method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayment("cod")}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          payment === "cod"
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Cash on delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayment("instapay")}
                        className={`p-3 rounded-lg text-sm transition-all ${
                          payment === "instapay"
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Instapay
                      </button>
                    </div>
                    {payment === "instapay" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        After placing the order, we’ll reply with the Instapay details and confirm.
                      </p>
                    )}
                  </div>
                </div>

                <h3 className="font-heading font-semibold text-foreground">Customer details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full name *</label>
                    <input
                      required
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                    <input
                      type="email"
                      required
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone *</label>
                    <input
                      required
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+20 ..."
                    />
                  </div>
                </div>

                {requiresAddress && (
                  <>
                    <h3 className="font-heading font-semibold text-foreground">Shipping address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Address line 1 *</label>
                        <input
                          value={customer.addressLine1}
                          onChange={(e) => setCustomer({ ...customer, addressLine1: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Street, building, apartment"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Address line 2 (optional)</label>
                        <input
                          value={customer.addressLine2}
                          onChange={(e) => setCustomer({ ...customer, addressLine2: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Landmark, floor, etc."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">City *</label>
                        <input
                          value={customer.city}
                          onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Governorate *</label>
                        <input
                          value={customer.governorate}
                          onChange={(e) => setCustomer({ ...customer, governorate: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Governorate"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={customer.notes}
                    onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Any special notes..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Placing order..." : "Place order"}
                </button>
              </motion.form>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 sticky top-24 space-y-4"
              >
                <h3 className="font-heading font-semibold text-foreground">Total</h3>
                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">EGP{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">EGP{shippingCost.toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <p className="text-3xl font-heading font-bold neon-text">EGP{total.toFixed(0)}</p>
                </div>

                <p className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-lg">
                  We’ll confirm production time and shipping cost after we receive your request.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

