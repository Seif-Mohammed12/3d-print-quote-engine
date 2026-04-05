import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const RefundPolicy = () => (
  <Layout>
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl space-y-8">
        <SectionHeading
          title="Refund Policy"
          subtitle="How refunds and replacements are handled at 3D Print It."
        />

        <div className="glass-card p-6 md:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>Last updated: April 5, 2026</p>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">1. Custom Items</h2>
            <p>
              Custom-made items are non-refundable. Refunds are not provided for custom products unless
              the delivered item is defective.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">2. Defective Items</h2>
            <p>
              If your custom item arrives defective, contact us within 7 days of delivery with your order
              code, photos, and a brief description of the issue. We will review and, if approved, offer a
              replacement, store credit, or refund at our discretion.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">3. Non-Custom Products</h2>
            <p>
              For non-custom catalog items, requests are evaluated case by case based on product condition,
              delivery status, and applicable consumer protection requirements.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">4. How to Request Support</h2>
            <p>
              Email 3d.print.ittt@gmail.com with your order details and the reason for your request.
              We aim to respond as quickly as possible.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default RefundPolicy;
