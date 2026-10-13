import { Link } from "react-router-dom";
import type { Product } from "@/lib/brand-catalog";
import { effectivePrice, firstColorHex, formatEGP, hasDiscount, productHref } from "@/lib/catalog-format";
import PhotoPending from "./PhotoPending";

type CatalogueRowProps = {
  product: Product;
  catalogueNo: string;
};

/** One release in the ruled catalogue: number, sleeve thumbnail, title, colours, price. */
export default function CatalogueRow({ product, catalogueNo }: CatalogueRowProps) {
  const price = effectivePrice(product);
  return (
    <Link
      to={productHref(product)}
      className="group grid grid-cols-[72px_1fr_auto] items-center gap-4 py-4 md:grid-cols-[88px_96px_1fr_140px_120px] md:gap-6"
    >
      <span className="hidden text-sm text-ink md:block">{catalogueNo}</span>
      <span className="relative flex aspect-square w-[72px] overflow-hidden bg-black md:w-24">
        <span className="flex w-1.5 shrink-0 flex-col" aria-hidden="true">
          {(product.primaryColors.length ? product.primaryColors.map((c) => c.hex) : [firstColorHex(product)]).map((hex, i) => (
            <span key={`${hex}-${i}`} className="flex-1" style={{ background: hex }} />
          ))}
        </span>
        {product.images[0] ? (
          <img src={product.images[0]} alt="" loading="lazy" decoding="async" className="h-full min-w-0 flex-1 object-cover" />
        ) : (
          <PhotoPending compact className="border-0" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-ink md:hidden">{catalogueNo}</span>
        <span className="block text-lg font-semibold leading-tight tracking-[-0.01em] group-hover:underline group-hover:decoration-ink group-hover:decoration-2 group-hover:underline-offset-4">
          {product.name}
          {product.isBundle ? <span className="ml-2 text-sm font-normal text-ink">Bundle</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{product.short}</span>
      </span>
      <span className="hidden text-sm text-muted-foreground md:block">
        {product.primaryColors.length} {product.primaryColors.length === 1 ? "colour" : "colours"}
        {product.images.length === 0 ? <span className="block text-xs">Photo coming</span> : null}
      </span>
      <span className="text-right">
        <span className="block font-semibold">{formatEGP(price)}</span>
        {hasDiscount(product) ? (
          <span className="block text-xs text-muted-foreground line-through">{formatEGP(product.basePrice)}</span>
        ) : null}
      </span>
    </Link>
  );
}
