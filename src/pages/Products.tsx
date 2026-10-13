import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import QuickAddProductDialog from "@/components/QuickAddProductDialog";
import Sleeve from "@/components/catalog/Sleeve";
import { useProducts } from "@/hooks/use-brand-products";
import type { Product } from "@/lib/brand-catalog";
import {
  catalogueNo,
  categoryLabel,
  categoryOrder,
  effectivePrice,
  firstColorHex,
  formatEGP,
  hasDiscount,
  productHref,
  shotFor,
} from "@/lib/catalog-format";

type Filter = "all" | (typeof categoryOrder)[number];

export default function Products() {
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { data: products, isPending, isError, refetch, isRefetching } = useProducts();

  const counts = useMemo(() => {
    const all = products ?? [];
    return {
      all: all.length,
      pforge: all.filter((p) => p.brand === "pforge").length,
      printique: all.filter((p) => p.brand === "printique").length,
    } as Record<Filter, number>;
  }, [products]);

  // Photographed releases first; products still waiting on a photo go to the end of their shelf.
  const visible = useMemo(() => {
    const list = (products ?? []).filter((p) => filter === "all" || p.brand === filter);
    return [...list].sort((a, b) => Number(b.images.length > 0) - Number(a.images.length > 0));
  }, [products, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...categoryOrder.map((id) => ({ id, label: categoryLabel[id] })),
  ];

  return (
    <Layout>
      <section className="frame pt-8 md:pt-14">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.035em] md:col-span-5 md:text-6xl">Shop</h1>
          <p className="max-w-lg text-muted-foreground md:col-span-7 md:justify-self-end md:text-right">
            Printed to order in PLA or PETG, in the colours you pick. About 48 hours, then Aramex or pickup. Pay on delivery or by InstaPay.
          </p>
        </div>
      </section>

      {/* Shelf filter, pinned under the bar on phones */}
      <div className="sticky top-14 z-30 mt-6 border-y border-border bg-background">
        <div className="frame flex gap-6 overflow-x-auto" role="tablist" aria-label="Filter by shelf">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`relative inline-flex min-h-12 shrink-0 items-center gap-1.5 text-[15px] transition-colors ${
                  active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="text-sm text-muted-foreground">{products ? counts[f.id] : ""}</span>
                {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className="frame pb-20 pt-6 md:pb-28 md:pt-10" aria-live="polite" aria-busy={isPending}>
        {isError ? (
          <div className="border border-border p-6">
            <p className="font-semibold">The catalogue didn't load.</p>
            <p className="mt-1 text-muted-foreground">Check your connection and try again, or message us on WhatsApp and we'll send the list.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => refetch()} disabled={isRefetching} className="btn-primary">
                {isRefetching ? "Trying again..." : "Try again"}
              </button>
              <a href="https://wa.me/201099228486" className="btn-secondary" rel="noopener">
                WhatsApp us
              </a>
            </div>
          </div>
        ) : isPending ? (
          <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square animate-pulse bg-card" />
                <div className="mt-4 h-6 w-2/3 animate-pulse bg-card" />
                <div className="mt-2 h-4 w-1/3 animate-pulse bg-card" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-border p-6">
            <p className="font-semibold">Nothing on this shelf yet.</p>
            <p className="mt-1 text-muted-foreground">
              New pieces land here first. In the meantime you can{" "}
              <Link to="/quote" className="link-quiet text-foreground">
                get your own file printed
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((product, idx) => {
              const no = catalogueNo(products, product.id);
              return (
                <li key={product.id} className="flex flex-col">
                  <Link to={productHref(product)} className="group block" aria-label={`${product.name}, ${formatEGP(effectivePrice(product))}`}>
                    <Sleeve
                      src={product.images[0]}
                      alt=""
                      catalogueNo={no}
                      spineHex={firstColorHex(product)}
                      shot={shotFor(product)}
                      loading={idx < 2 ? "eager" : "lazy"}
                    />
                  </Link>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold leading-tight tracking-[-0.015em]">
                        <Link to={productHref(product)} className="hover:underline hover:decoration-ink hover:decoration-2 hover:underline-offset-4">
                          {product.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {categoryLabel[product.brand || ""] || "Product"}
                        {product.isBundle ? <span className="text-ink"> · Bundle</span> : null}
                        {product.primaryColors.length > 1 ? ` · ${product.primaryColors.length} colours` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="block text-lg font-semibold">{formatEGP(effectivePrice(product))}</span>
                      {hasDiscount(product) ? (
                        <span className="block text-xs text-muted-foreground line-through">{formatEGP(product.basePrice)}</span>
                      ) : null}
                    </p>
                  </div>
                  {product.isBundle && product.bundleItems?.length ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Includes {product.bundleItems.map((item) => `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`).join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <button type="button" onClick={() => setQuickAddProduct(product)} className="btn-primary min-h-11 text-[15px]">
                      Add to cart
                    </button>
                    <Link to={productHref(product)} className="btn-secondary min-h-11 px-4 text-[15px]">
                      Details
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <QuickAddProductDialog
        brand={quickAddProduct?.brand || "pforge"}
        product={quickAddProduct}
        open={Boolean(quickAddProduct)}
        onOpenChange={(open) => {
          if (!open) setQuickAddProduct(null);
        }}
      />
    </Layout>
  );
}
