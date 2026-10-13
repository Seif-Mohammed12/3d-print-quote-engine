import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { toast } from "sonner";
import { createOrderRecord } from "@/lib/orders-api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type QuoteRequestState = {
  fileName: string;
  fileType: string;
  fileBuffer: ArrayBuffer;
  upload?: {
    jobId: string;
    storagePath: string;
    checksum: string;
    uploadedAt: string;
    fileSize: number;
  };
  settings: {
    material: string;
    quality: string;
    infill: number;
  };
  estimate: {
    totalPrice: number;
    weightGrams: number;
    estimatedTime: string;
  };
};

async function sendQuoteEmail(details: any, file: { name: string; buffer: ArrayBuffer; type: string }) {
  const formData = new FormData();
  formData.append("quoteDetails", JSON.stringify(details));
  formData.append("file", new Blob([file.buffer], { type: file.type || "application/octet-stream" }), file.name);

  const response = await fetch("/api/send-quote-email", {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  const text = !data ? await response.text().catch(() => "") : "";
  return { ok: response.ok, status: response.status, data, text };
}

export default function QuoteRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = (location.state || null) as QuoteRequestState | null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (!state?.fileBuffer || !state?.fileName) {
      navigate("/quote", { replace: true });
    }
  }, [state, navigate]);

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

      setForm((prev) => ({
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

  const summary = useMemo(() => {
    if (!state) return null;
    return {
      fileName: state.fileName,
      material: state.settings.material,
      quality: state.settings.quality,
      infill: state.settings.infill,
    };
  }, [state]);

  if (!state || !summary) return null;

  const placeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        orderType: "quote",
        createdAt: new Date().toISOString(),
        file: { name: state.fileName, type: state.fileType },
        upload: state.upload || null,
        settings: state.settings,
        estimate: {
          totalPrice: state.estimate.totalPrice.toFixed(2),
          weightGrams: state.estimate.weightGrams.toFixed(1),
          estimatedTime: state.estimate.estimatedTime,
        },
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
        },
      };

      const created = await createOrderRecord(payload);
      const persistedOrder = created?.order || null;

      const payloadWithOrder = {
        ...payload,
        orderId: persistedOrder?.id,
        orderCode: persistedOrder?.order_code,
      };

      const result = await sendQuoteEmail(payloadWithOrder, {
        name: state.fileName,
        buffer: state.fileBuffer,
        type: state.fileType,
      });

      if (!result.ok || !result.data?.success) {
        toast.error(result.data?.error || result.text || `Request failed (${result.status})`);
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem("lastQuoteRequest", JSON.stringify({
        ...payloadWithOrder,
        requestId: result.data.requestId || persistedOrder?.order_code,
      }));

      toast.success("Request sent! We'll contact you soon.");
      navigate("/quote-confirmation", { replace: true });
    } catch {
      toast.error("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Request a quote" subtitle="Send your file or idea with your settings. We reply with the final price." />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-all"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className="panel p-6 space-y-4 sticky top-24"
              >
                <h3 className="font-heading font-semibold text-foreground">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File</span>
                    <span className="text-foreground font-medium text-right">{summary.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material</span>
                    <span className="text-foreground font-medium">{summary.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="text-foreground font-medium">{summary.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Infill</span>
                    <span className="text-foreground font-medium">{summary.infill}%</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-primary/10 p-3 rounded-lg">
                  Final price is confirmed after we review your model and print requirements.
                </p>
              </motion.div>
            </div>

            <div className="lg:col-span-2">
              <motion.form
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={placeRequest}
                className="panel p-6 space-y-5"
              >
                <h3 className="font-heading font-semibold text-foreground">Your details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone *</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      type="tel"
                      pattern="[0-9+\-() ]{10,20}"
                      minLength={10}
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Address (optional)</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="City, area…"
                      maxLength={200}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Deadlines, strength requirements, tolerances, quantity, etc."
                    maxLength={2000}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send request"}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Prefer WhatsApp? Use the contact page.{" "}
                  <Link to="/contact" className="text-primary hover:underline">
                    Contact us
                  </Link>
                </p>
              </motion.form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

