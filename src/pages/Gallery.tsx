import { useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useProducts } from "@/hooks/use-brand-products";
import { catalogueNo, productHref } from "@/lib/catalog-format";

const Gallery = () => {
  const { data: products, isPending } = useProducts();

  // Every photo in the catalogue, as one contact sheet
  const frames = useMemo(
    () =>
      (products ?? []).flatMap((product) =>
        product.images.map((src, i) => ({ key: `${product.id}-${i}`, src, product, i }))
      ),
    [products]
  );

  return (
    <Layout>
      <section className="frame pt-8 md:pt-14">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.035em] md:col-span-6 md:text-[72px]">Gallery</h1>
          <p className="max-w-md text-muted-foreground md:col-span-6 md:justify-self-end md:text-right">
            Every shot of every piece on the shelf. Tap a frame to open the product.
          </p>
        </div>
      </section>

      <section className="frame mb-20 mt-8 md:mb-28 md:mt-12" aria-busy={isPending}>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }).map((_, i) => <li key={i} className="aspect-square animate-pulse bg-card" aria-hidden="true" />)
            : frames.map((frame) => (
                <li key={frame.key}>
                  <Link to={productHref(frame.product)} className="group relative block aspect-square overflow-hidden bg-black">
                    <img
                      src={frame.src}
                      alt={`${frame.product.name}, photo ${frame.i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1.5 text-xs">
                      <span className="text-muted-foreground">{catalogueNo(products, frame.product.id)}</span> {frame.product.name}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </section>
    </Layout>
  );
};

export default Gallery;
