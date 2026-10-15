import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import Layout from "@/components/Layout";
import ColorPicker from "@/components/catalog/ColorPicker";
import { useCart } from "@/lib/cart-context";
import { getUnitPrice } from "@/lib/product-order";
import Sleeve from "@/components/catalog/Sleeve";
import PhotoPending from "@/components/catalog/PhotoPending";
import CatalogueRow from "@/components/catalog/CatalogueRow";
import { useProducts } from "@/hooks/use-brand-products";
import {
  catalogueNo,
  categoryLabel,
  categoryOrder,
  effectivePrice,
  firstColorHex,
  formatEGP,
  hasDiscount,
  productHref,
} from "@/lib/catalog-format";

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
  const { addProductToCart } = useCart();
  const navigate = useNavigate();
  const [colorId, setColorId] = useState("");

  const featured = useMemo(() => (products ?? []).find((p) => p.images.length > 0) ?? products?.[0], [products]);

  useEffect(() => {
    if (featured) setColorId((prev) => (featured.primaryColors.some((c) => c.id === prev) ? prev : featured.primaryColors[0]?.id || ""));
  }, [featured]);

  const grouped = useMemo(
    () =>
      categoryOrder
        .map((id) => ({ id, label: categoryLabel[id], items: (products ?? []).filter((p) => p.brand === id && p.id !== featured?.id) }))
        .filter((group) => group.items.length > 0),
    [products, featured]
  );

  const chosen = featured?.primaryColors.find((c) => c.id === colorId);

  const addFeatured = () => {
    if (!featured) return;
    const accent = featured.secondaryColors[0];
    addProductToCart({
      brand: featured.brand || "pforge",
      productId: featured.id,
      productName: featured.name,
      isBundle: featured.isBundle,
      bundleItems: featured.bundleItems,
      qty: 1,
      primaryColorId: colorId,
      secondaryColorId: accent?.id || "",
      primaryColorName: chosen?.name,
      secondaryColorName: accent?.name,
      ledsEnabled: false,
      unitPrice: getUnitPrice(featured, false),
    });
    toast.success(`Added ${featured.name}`, {
      description: [chosen?.name, accent?.name].filter(Boolean).join(" / "),
      action: { label: "View cart", onClick: () => navigate("/product-cart") },
    });
  };

  return (
    <Layout>
      {/* Featured release: the object, its name, its price and a working Add to cart, inside the first phone screen */}
      <section className="frame grid grid-cols-1 gap-5 pt-4 md:grid-cols-12 md:items-end md:gap-10 md:pt-10">
        <div className="min-w-0 md:col-span-7">
          {featured ? (
            <Link to={productHref(featured)} aria-label={`${featured.name}, view details`} className="block">
              <Sleeve
                src={featured.images[0]}
                alt={`${featured.name}, 3D printed`}
                catalogueNo={catalogueNo(products, featured.id)}
                spineHex={chosen?.hex || firstColorHex(featured)}
                spineLabel={chosen?.name}
                loading="eager"
              />
            </Link>
          ) : (
            <div className="aspect-square w-full animate-pulse bg-card" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 md:col-span-5 md:pb-2">
          {featured ? (
            <>
              <h1 className="text-[44px] font-bold leading-[0.92] tracking-[-0.04em] md:text-[88px]">{featured.name}</h1>
              <p className="mt-3 max-w-md text-muted-foreground">{featured.short}</p>

              <dl className="mt-5 grid grid-cols-3 border-y border-border text-sm">
                <div className="py-3 pr-3">
                  <dt className="text-muted-foreground">No.</dt>
                  <dd className="mt-0.5 font-medium text-ink">{catalogueNo(products, featured.id)}</dd>
                </div>
                <div className="border-l border-border px-3 py-3">
                  <dt className="text-muted-foreground">Material</dt>
                  <dd className="mt-0.5 font-medium">PLA or PETG</dd>
                </div>
                <div className="border-l border-border py-3 pl-3">
                  <dt className="text-muted-foreground">Printed in</dt>
                  <dd className="mt-0.5 font-medium">~48 h</dd>
                </div>
              </dl>

              {featured.primaryColors.length ? (
                <ColorPicker
                  compact
                  legend="Colour"
                  colors={featured.primaryColors}
                  value={colorId}
                  onChange={setColorId}
                  className="mt-4"
                />
              ) : null}

              <button type="button" onClick={addFeatured} className="btn-primary mt-4 w-full">
                Add to cart · {formatEGP(effectivePrice(featured))}
                {hasDiscount(featured) ? (
                  <span className="text-sm font-normal text-primary-foreground/60 line-through">{formatEGP(featured.basePrice)}</span>
                ) : null}
              </button>
            </>
          ) : isPending ? (
            <div className="space-y-3" aria-hidden="true">
              <div className="h-11 w-3/4 animate-pulse bg-card" />
              <div className="h-5 w-1/2 animate-pulse bg-card" />
              <div className="mt-6 h-12 w-full animate-pulse bg-card" />
            </div>
          ) : (
            <p className="text-muted-foreground">
              The catalogue didn't load. <Link to="/products" className="link-quiet text-foreground">Try the shop</Link> or message us on WhatsApp.
            </p>
          )}
        </div>
      </section>

      {/* The catalogue: every other release as a ruled list, grouped by shelf */}
      <section className="frame mt-16 md:mt-28" aria-labelledby="catalogue-title">
        <div className="flex items-end justify-between gap-4 border-b border-foreground pb-3">
          <h2 id="catalogue-title" className="text-[28px] font-bold leading-none tracking-[-0.03em] md:text-4xl">
            The catalogue
          </h2>
          <Link to="/products" className="link-quiet inline-flex min-h-11 shrink-0 items-center text-[15px] text-muted-foreground hover:text-foreground">
            Shop all
          </Link>
        </div>

        {isError ? (
          <p className="py-8 text-muted-foreground">Couldn't load the catalogue. Check your connection and refresh.</p>
        ) : isPending ? (
          <div className="ruled" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <div className="h-[72px] w-[72px] animate-pulse bg-card" />
                <div className="h-5 flex-1 animate-pulse bg-card" />
              </div>
            ))}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="mt-8 first:mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
              <div className="ruled mt-1 border-b border-border">
                {group.items.map((product) => (
                  <CatalogueRow key={product.id} product={product} catalogueNo={catalogueNo(products, product.id)} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

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
            3D Print It is a small studio in New Cairo. We started in 2021 printing other
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
