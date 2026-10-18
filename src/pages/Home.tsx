import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Layout from "@/components/Layout";
import Sleeve from "@/components/catalog/Sleeve";
import PhotoPending from "@/components/catalog/PhotoPending";
import CatalogueRow from "@/components/catalog/CatalogueRow";
import { useProducts } from "@/hooks/use-brand-products";
import { catalogueNo, categoryLabel, effectivePrice, firstColorHex, formatEGP, productHref } from "@/lib/catalog-format";

const commissions = [
  { to: "/quote", title: "Have an STL?", body: "Upload it and get a price in about a minute." },
  { to: "/contact", title: "Only have an idea?", body: "Send a sketch or a photo. We model it, then print it." },
  { to: "/contact?topic=volume", title: "Need 20 or more?", body: "Ask about volume runs for events, shops and teams." },
];

const terms = [
  { label: "Printed in", value: "About 48 hours" },
  { label: "Material", value: "PLA or PETG" },
  { label: "Pay", value: "Cash on delivery or InstaPay" },
  { label: "Get it", value: "Aramex or free pickup, New Cairo" },
];

const Home = () => {
  const { data: products, isPending, isError } = useProducts();

  // The shelf: photographed pieces to browse. Everything else is listed below it.
  const shelf = useMemo(() => (products ?? []).filter((p) => p.images.length > 0).slice(0, 6), [products]);
  const rest = useMemo(() => (products ?? []).filter((p) => !shelf.some((s) => s.id === p.id)), [products, shelf]);

  return (
    <Layout>
      {/* Introduction: who we are and what we make, before anything is for sale */}
      <section className="frame pt-10 md:pt-20">
        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
          <h1 className="text-[44px] font-bold leading-[0.95] tracking-[-0.04em] md:col-span-8 md:text-[88px]">
            One layer at a time.
          </h1>
          <div className="md:col-span-4 md:pb-3">
            <p className="max-w-sm text-muted-foreground md:text-lg">
              We bring ideas to life on our printers in New Cairo: our own designs, or the one you send us.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6">
              <Link to="/products" className="group inline-flex min-h-11 items-center gap-1.5 font-semibold">
                Browse the shop <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link to="/quote" className="group inline-flex min-h-11 items-center gap-1.5 text-muted-foreground hover:text-foreground">
                Print your own file <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The shelf: a few pieces to look at, no buttons. Buying happens on each product's page. */}
      <section className="mt-10 md:mt-16" aria-labelledby="shelf-title">
        <div className="frame">
          <div className="flex items-center justify-between gap-4 border-b border-border">
          <h2 id="shelf-title" className="text-sm font-semibold text-muted-foreground">On the shelf</h2>
          <Link to="/products" className="link-quiet inline-flex min-h-11 shrink-0 items-center text-[15px] text-muted-foreground hover:text-foreground">
            See everything
          </Link>
          </div>
        </div>

        {isError ? (
          <p className="frame py-8 text-muted-foreground">
            The catalogue didn't load. Refresh, or <a href="https://wa.me/201099228486" className="link-quiet text-foreground" rel="noopener">message us on WhatsApp</a>.
          </p>
        ) : (
          <ul className="frame mt-5 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
            {isPending
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="w-[78%] flex-none md:w-auto" aria-hidden="true">
                    <div className="aspect-square animate-pulse bg-card" />
                    <div className="mt-3 h-5 w-2/3 animate-pulse bg-card" />
                  </li>
                ))
              : shelf.map((product, idx) => (
                  <li key={product.id} className="w-[78%] flex-none snap-start md:w-auto">
                    <Link to={productHref(product)} className="group block">
                      <Sleeve
                        src={product.images[0]}
                        alt=""
                        catalogueNo={catalogueNo(products, product.id)}
                        spineHex={firstColorHex(product)}
                        spineColors={product.primaryColors.map((c) => c.hex)}
                        loading={idx < 2 ? "eager" : "lazy"}
                      />
                      <span className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-lg font-semibold leading-tight tracking-[-0.01em] group-hover:underline group-hover:decoration-ink group-hover:decoration-2 group-hover:underline-offset-4">
                          {product.name}
                        </span>
                        <span className="shrink-0 text-[15px] text-muted-foreground">{formatEGP(effectivePrice(product))}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{categoryLabel[product.brand || ""] || "Product"}</span>
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </section>

      {/* Everything else on the shelf, as a ruled list */}
      {rest.length ? (
        <section className="frame mt-14 md:mt-20" aria-labelledby="more-title">
          <h2 id="more-title" className="border-b border-border pb-3 text-sm font-semibold text-muted-foreground">
            Also in the catalogue
          </h2>
          <div className="ruled border-b border-border">
            {rest.map((product) => (
              <CatalogueRow key={product.id} product={product} catalogueNo={catalogueNo(products, product.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Commissions: custom work, set denser and quieter than the shop */}
      <section className="mt-16 bg-card md:mt-24" aria-labelledby="custom-title">
        <div className="frame grid gap-8 py-12 md:grid-cols-12 md:py-16">
          <div className="md:col-span-4">
            <h2 id="custom-title" className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em] md:text-4xl">
              Print your own thing.
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground">Same printers, same 48 hours, your design.</p>
          </div>
          <ul className="ruled border-y border-border md:col-span-8">
            {commissions.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="group flex items-center justify-between gap-6 py-5">
                  <span>
                    <span className="block text-lg font-semibold tracking-[-0.01em]">{item.title}</span>
                    <span className="mt-0.5 block text-muted-foreground">{item.body}</span>
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-ink"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Terms of sale: one ruled table, no cards */}
      <section className="frame mt-12 md:mt-16" aria-label="How buying works">
        <dl className="grid grid-cols-2 border-y border-border md:grid-cols-4">
          {terms.map((term, i) => (
            <div
              key={term.label}
              className={`py-4 pr-4 ${i % 2 === 1 ? "border-l border-border pl-4" : ""} ${i >= 2 ? "border-t border-border md:border-t-0" : ""} ${
                i >= 1 ? "md:border-l md:pl-4" : ""
              }`}
            >
              <dt className="text-sm text-muted-foreground">{term.label}</dt>
              <dd className="mt-1 font-medium leading-snug">{term.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The maker: the widest gap on the page sits above this */}
      <section className="frame mb-20 mt-28 grid gap-8 md:mb-28 md:mt-40 md:grid-cols-12 md:gap-10" aria-labelledby="maker-title">
        <div className="aspect-[4/3] md:col-span-6">
          {/* PHOTO PLACEHOLDER: shot list #1 */}
          <PhotoPending shot="Shot 1: the founder at the printers in New Cairo, a print coming off the bed. Natural light, no staging." />
        </div>
        <div className="md:col-span-5 md:col-start-8 md:self-end">
          <h2 id="maker-title" className="text-[32px] font-bold leading-[1.02] tracking-[-0.03em] md:text-5xl">
            A small studio that designs what it prints.
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            We started in 2021 printing other
            people's files and now design our own desk gear and decor. Layer lines are part of the look, not a flaw we hide.
          </p>
          <p className="mt-5 text-[15px] text-muted-foreground">
            — <span className="text-foreground">[Founder name]</span> · last print off the bed: <span className="text-foreground">[date]</span>
          </p>
          <Link to="/about" className="link-quiet mt-4 inline-flex min-h-11 items-center text-[15px]">
            More about the studio
          </Link>
        </div>
      </section>

    </Layout>
  );
};

export default Home;
