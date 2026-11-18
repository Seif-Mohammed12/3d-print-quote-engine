import Sleeve from "@/components/catalog/Sleeve";
import { formatEGP } from "@/lib/catalog-format";

type StorefrontPreviewProps = {
  name: string;
  short?: string;
  categoryLabel?: string;
  basePrice: number;
  salePrice: number | null;
  saleOn: boolean;
  image?: string;
  colours: string[];
  catalogueNo: string;
  isBundle?: boolean;
  isPublished: boolean;
  outOfStock?: boolean;
};

/** The product's card as the shop shows it, redrawn live from the editor's unsaved values. */
export default function StorefrontPreview(props: StorefrontPreviewProps) {
  const sale = props.saleOn && props.salePrice != null && props.salePrice > 0 && props.salePrice < props.basePrice;
  const price = sale ? (props.salePrice as number) : props.basePrice;
  return (
    <figure aria-label="Shop card preview" className="w-full max-w-[280px]">
      <Sleeve
        src={props.image}
        alt=""
        catalogueNo={props.catalogueNo}
        spineHex={props.colours[0] || "hsl(var(--rule))"}
        spineColors={props.colours}
      />
      <figcaption className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">{props.name || "Untitled product"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {props.categoryLabel || "No category"}
            {props.isBundle ? <span className="text-ink"> · Bundle</span> : null}
            {props.colours.length > 1 ? ` · ${props.colours.length} colours` : ""}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="num block font-semibold">{formatEGP(price)}</span>
          {sale ? <span className="num block text-xs text-muted-foreground line-through">{formatEGP(props.basePrice)}</span> : null}
        </p>
      </figcaption>
      {props.short ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{props.short}</p> : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {props.isPublished ? "Visible in the shop" : "Draft: not visible in the shop"}
        {props.outOfStock ? " · marked out of stock" : ""}
      </p>
    </figure>
  );
}
