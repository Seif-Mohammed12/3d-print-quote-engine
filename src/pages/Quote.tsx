import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const Quote = () => (
  <Layout>
    <section className="frame pb-20 pt-8 md:pb-28 md:pt-14">
      <div className="border-y border-border py-10 md:py-16">
        <div className="max-w-3xl">
          <SectionHeading
            title="Price your file"
            subtitle="Our instant quoting tool is coming soon."
          />

          <div className="grid gap-8 border-t border-border pt-6 md:grid-cols-[minmax(0,200px)_1fr] md:gap-10">
            <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="h-2 w-2 bg-ink" aria-hidden="true" />
              Coming soon
            </p>
            <div className="max-w-[52ch]">
              <p className="text-lg leading-relaxed">
                We&apos;re putting the finishing touches on a faster way to price your print.
              </p>
              <p className="mt-4 text-muted-foreground">
                Need a quote before then? Send us your STL, sketch, or idea on WhatsApp and we&apos;ll take it from there.
              </p>
              <a href="https://wa.me/201099228486" className="btn-primary mt-7" rel="noopener">
                WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default Quote;
