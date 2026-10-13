import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const PrivacyPolicy = () => (
  <Layout>
    <section className="pb-20 pt-8 md:pb-28 md:pt-14">
      <div className="frame">
        <SectionHeading
          title="Privacy Policy"
          subtitle="How 3D Print It collects, uses, and protects your information."
        />

        <div className="ruled max-w-[68ch] border-t border-border text-[16px] leading-relaxed text-muted-foreground [&>*]:py-5">
          <p>Last updated: April 5, 2026</p>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">1. Information We Collect</h2>
            <p>
              We may collect personal information you provide directly, including your name, email address,
              phone number, shipping details, uploaded files for print requests, and order details.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">2. How We Use Information</h2>
            <p>
              We use your information to process orders, provide customer support, send order updates,
              improve our services, and maintain account security.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">3. Account and Authentication Data</h2>
            <p>
              Authentication is handled through our identity providers. We store only the account information
              required to support login, order history, and account-related features.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">4. Order Files and Content</h2>
            <p>
              Files you upload for quotes or manufacturing are used solely to evaluate and produce your order,
              unless required otherwise by law.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">5. Sharing of Information</h2>
            <p>
              We do not sell personal information. We may share data with trusted service providers only when
              necessary to operate the service (for example, payments, logistics, or email delivery).
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">6. Data Retention</h2>
            <p>
              We retain data for as long as needed to deliver services, comply with legal obligations,
              resolve disputes, and enforce agreements.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">7. Security</h2>
            <p>
              We apply reasonable technical and organizational safeguards to protect personal data,
              but no method of transmission or storage is completely secure.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">8. Your Rights</h2>
            <p>
              You may request access, correction, or deletion of your personal information, subject to legal
              and operational requirements.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">9. Contact</h2>
            <p>
              For privacy requests or questions, contact us at 3d.print.ittt@gmail.com.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default PrivacyPolicy;
