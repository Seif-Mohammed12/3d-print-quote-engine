import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

export default function QuoteConfirmation() {
  const navigate = useNavigate();
  const request = useMemo(() => {
    const raw = sessionStorage.getItem("lastQuoteRequest");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!request) navigate("/quote", { replace: true });
  }, [request, navigate]);

  if (!request) return null;

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-3xl space-y-6">
          <SectionHeading
            title="Request sent"
            subtitle="We received your file and will reply with the final price."
          />

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="panel p-6 space-y-4"
          >
            <h3 className="font-heading font-semibold text-foreground">Details</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>
                <span className="text-foreground font-medium">Request ID:</span>{" "}
                {request.requestId}
              </div>
              <div>
                <span className="text-foreground font-medium">File:</span>{" "}
                {request.file?.name}
              </div>
            </div>
          </motion.div>

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
          </div>
        </div>
      </section>
    </Layout>
  );
}

