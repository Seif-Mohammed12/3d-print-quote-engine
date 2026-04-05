import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const TermsOfService = () => (
  <Layout>
    <section className="section-padding">
      <div className="container mx-auto max-w-4xl space-y-8">
        <SectionHeading
          title="Terms of Service"
          subtitle="The terms that govern your use of 3D Print It services."
        />

        <div className="glass-card p-6 md:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>Last updated: April 5, 2026</p>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using our website and services, you agree to these Terms of Service.
              If you do not agree, do not use the service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">2. Services</h2>
            <p>
              3D Print It provides quote requests, custom 3D printing, and product ordering services.
              Service availability, pricing, and timelines may change without notice.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">3. Account Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for
              activity under your account.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">4. Orders and Payments</h2>
            <p>
              You agree to provide accurate order and payment details. We reserve the right to refuse,
              cancel, or limit orders in cases of errors, misuse, or suspicious activity.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">5. User Content and Files</h2>
            <p>
              You confirm you have rights to any design files or content you submit. You grant us the
              necessary permission to use submitted files solely for quotation and manufacturing purposes.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">6. Intellectual Property</h2>
            <p>
              Website content, branding, and service materials are owned by or licensed to 3D Print It
              unless otherwise stated.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, 3D Print It is not liable for indirect, incidental,
              special, or consequential damages related to use of the service.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">8. Termination</h2>
            <p>
              We may suspend or terminate access to services when these terms are violated or when required
              for legal, security, or operational reasons.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after changes means
              you accept the updated terms.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              For questions about these terms, contact 3d.print.ittt@gmail.com.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default TermsOfService;
