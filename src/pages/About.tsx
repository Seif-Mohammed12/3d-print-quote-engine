import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PhotoPending from "@/components/catalog/PhotoPending";

const timeline = [
  { year: "2021", text: "Started in New Cairo printing other people's files: parts, gifts, school projects." },
  { year: "Now", text: "Designing our own desk gear and decor, still printing custom work alongside it." },
];

const habits = [
  { title: "Printed to order", text: "Nothing sits in a warehouse. Your piece is printed in the colours you pick, in about 48 hours." },
  { title: "Honest materials", text: "PLA and PETG only, because that's what we print well. If something needs a material we don't run, we'll say so." },
  { title: "Layer lines on purpose", text: "FDM printing leaves fine lines. Our designs use them as texture instead of pretending they aren't there." },
];

const About = () => (
  <Layout>
    <section className="frame pt-8 md:pt-14">
      <h1 className="max-w-4xl text-[40px] font-bold leading-[0.95] tracking-[-0.035em] md:text-[72px]">
        A small studio in New Cairo that designs what it prints.
      </h1>
    </section>

    <section className="frame mt-10 grid gap-8 md:mt-16 md:grid-cols-12 md:gap-10">
      <div className="aspect-[4/5] md:col-span-5">
        {/* PHOTO PLACEHOLDER: shot list #12 */}
        <PhotoPending shot="Shot 12: portrait of the founder at the desk with a part in hand, printers soft in the background." />
      </div>
      <div className="md:col-span-6 md:col-start-7">
        <div className="max-w-[60ch] space-y-5 text-[17px] leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">3D Print It</span> is run by <span className="text-foreground">[Founder name]</span>. It began in
            2021 as a print-on-demand service: people sent files, we printed them.
          </p>
          <p>
            Somewhere along the way we started designing our own pieces, mostly for the desk we sit at all day: headphone stands, controller
            docks, phone mounts, then vases and wall panels for the rest of the room.
          </p>
          <p>Custom printing never stopped. Send a file or an idea and it goes on the same printers.</p>
        </div>

        <dl className="ruled mt-10 border-y border-border">
          {timeline.map((row) => (
            <div key={row.year} className="grid grid-cols-[80px_1fr] gap-4 py-4">
              <dt className="font-bold">{row.year}</dt>
              <dd className="text-muted-foreground">{row.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>

    <section className="mt-20 bg-card md:mt-28" aria-labelledby="habits-title">
      <div className="frame grid gap-6 py-12 md:grid-cols-12 md:gap-10 md:py-16">
        <h2 id="habits-title" className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em] md:col-span-4 md:text-4xl">
          How we work
        </h2>
        <dl className="ruled border-y border-border md:col-span-8">
          {habits.map((h) => (
            <div key={h.title} className="grid gap-1 py-5 sm:grid-cols-[200px_1fr] sm:gap-6">
              <dt className="text-lg font-semibold tracking-[-0.01em]">{h.title}</dt>
              <dd className="text-muted-foreground">{h.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>

    <section className="frame mb-20 mt-16 flex flex-col gap-4 md:mb-28 md:flex-row md:items-center md:justify-between">
      <p className="text-2xl font-bold tracking-[-0.02em] md:text-3xl">See what's on the shelf.</p>
      <div className="flex gap-3">
        <Link to="/products" className="btn-primary">Shop</Link>
        <Link to="/services" className="btn-secondary">Custom prints</Link>
      </div>
    </section>
  </Layout>
);

export default About;
