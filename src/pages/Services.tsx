import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Layout from "@/components/Layout";
import PhotoPending from "@/components/catalog/PhotoPending";

const routes = [
  {
    to: "/quote",
    title: "You have an STL",
    body: "Upload it, pick PLA or PETG, a quality and an infill. The price is calculated from the actual volume of your model, in about a minute.",
    action: "Price my file",
  },
  {
    to: "/contact",
    title: "You have an idea, not a file",
    body: "Send a sketch, a photo or measurements. We model it with you, then print it.",
    action: "Ask for design help",
  },
  {
    to: "/contact",
    title: "You need a lot of them",
    body: "Volume runs for events, shops, teams and giveaways. Tell us the part and the quantity and we'll quote the batch.",
    action: "Ask about volume",
  },
];

const materials = [
  { name: "PLA", use: "Desk gear, decor, display pieces", traits: "Crisp detail, matte finish, widest colour range", available: true },
  { name: "PETG", use: "Parts that get handled or sit in the sun", traits: "Tougher, more heat and impact resistant", available: true },
  { name: "ABS", use: "", traits: "Not offered yet", available: false },
  { name: "TPU", use: "", traits: "Not offered yet", available: false },
];

const quality = [
  { name: "Draft", layer: "0.3 mm", note: "Fast and cheapest. Visible layers." },
  { name: "Standard", layer: "0.2 mm", note: "The balance of detail and print time." },
  { name: "High", layer: "0.12 mm", note: "Smoother curves, longer print." },
];

const Services = () => (
  <Layout>
    <section className="frame pt-8 md:pt-14">
      <div className="grid gap-6 md:grid-cols-12 md:items-end">
        <h1 className="text-[40px] font-bold leading-[0.95] tracking-[-0.035em] md:col-span-7 md:text-[72px]">
          Custom prints, from your file or your idea.
        </h1>
        <p className="max-w-md text-muted-foreground md:col-span-5 md:justify-self-end md:text-lg">
          Same printers and the same 48-hour turnaround as the shop. You bring the design, or we make it with you.
        </p>
      </div>
    </section>

    {/* Three ways in, as one ruled list */}
    <section className="frame mt-10 md:mt-16" aria-label="Ways to order a custom print">
      <ol className="ruled border-y border-border">
        {routes.map((route) => (
          <li key={route.to}>
            <Link to={route.to} className="group grid gap-3 py-6 md:grid-cols-12 md:items-baseline md:gap-6 md:py-8">
              <span className="text-2xl font-bold tracking-[-0.025em] md:col-span-5 md:text-3xl">{route.title}</span>
              <span className="max-w-xl text-muted-foreground md:col-span-5">{route.body}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold group-hover:text-ink md:col-span-2 md:justify-self-end">
                {route.action} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>

    {/* Materials and quality: dense reference tables */}
    <section className="frame mt-20 grid gap-12 md:mt-28 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-7">
        <h2 className="text-[28px] font-bold tracking-[-0.03em] md:text-4xl">Materials</h2>
        <table className="mt-5 w-full border-y border-border text-left text-[15px]">
          <thead className="text-sm text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-3 pr-4 font-normal">Material</th>
              <th scope="col" className="py-3 pr-4 font-normal">Good for</th>
              <th scope="col" className="hidden py-3 font-normal sm:table-cell">Why</th>
            </tr>
          </thead>
          <tbody className="ruled">
            {materials.map((m) => (
              <tr key={m.name} className={m.available ? "" : "text-muted-foreground"}>
                <th scope="row" className="py-3 pr-4 text-lg font-bold">{m.name}</th>
                <td className="py-3 pr-4">{m.available ? m.use : "Not offered yet"}</td>
                <td className="hidden py-3 sm:table-cell">{m.available ? m.traits : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:col-span-5">
        <h2 className="text-[28px] font-bold tracking-[-0.03em] md:text-4xl">Quality</h2>
        <dl className="ruled mt-5 border-y border-border text-[15px]">
          {quality.map((q) => (
            <div key={q.name} className="grid grid-cols-[96px_72px_1fr] gap-3 py-3">
              <dt className="font-semibold">{q.name}</dt>
              <dd className="text-muted-foreground">{q.layer}</dd>
              <dd className="text-muted-foreground">{q.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">Infill from 5% to 100%. Under five hours of print time costs nothing extra.</p>
      </div>
    </section>

    <section className="frame mb-20 mt-20 grid gap-8 md:mb-28 md:mt-28 md:grid-cols-12 md:gap-10">
      <div className="aspect-[4/3] md:col-span-6">
        {/* PHOTO PLACEHOLDER: shot list #11 */}
        <PhotoPending shot="Shot 11: a customer's custom print next to their sketch or the STL on a laptop screen." />
      </div>
      <div className="md:col-span-5 md:col-start-8 md:self-center">
        <h2 className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em] md:text-4xl">Not sure it can be printed?</h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Send it anyway. If a part needs changing to print well, we'll tell you why and suggest a fix.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/quote" className="btn-primary">Price my file</Link>
          <a href="https://wa.me/201099228486" className="btn-secondary" rel="noopener">WhatsApp us</a>
        </div>
      </div>
    </section>
  </Layout>
);

export default Services;
