import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart-context";
import {
  defaultOptionSelection,
  firstAvailableColorId,
  formatEGP,
  hasDiscount,
  imagesForSelection,
  missingRequiredOptions,
  priceWithOptions,
  selectedOptions,
  type OptionSelection,
} from "@/lib/catalog-format";
import ColorPicker from "@/components/catalog/ColorPicker";
import OptionPicker from "@/components/catalog/OptionPicker";
import type { BrandId, Product } from "@/lib/brand-catalog";

type QuickAddProductDialogProps = {
  brand: BrandId;
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kept for older call sites; the dialog no longer takes an accent. */
  accentClassName?: string;
};

export default function QuickAddProductDialog({ brand, product, open, onOpenChange }: QuickAddProductDialogProps) {
  const { addProductToCart } = useCart();
  const navigate = useNavigate();
  const [primaryColorId, setPrimaryColorId] = useState("");
  const [secondaryColorId, setSecondaryColorId] = useState("");
  const [optionSelection, setOptionSelection] = useState<OptionSelection>({});

  useEffect(() => {
    if (!product) return;
    setPrimaryColorId(firstAvailableColorId(product.primaryColors));
    setSecondaryColorId(firstAvailableColorId(product.secondaryColors));
    setOptionSelection(defaultOptionSelection(product));
  }, [product]);

  const options = useMemo(() => (product ? selectedOptions(product, optionSelection) : []), [product, optionSelection]);
  const unitPrice = useMemo(() => (product ? priceWithOptions(product, options) : 0), [product, options]);
  const selectedPrimary = useMemo(
    () => product?.primaryColors.find((c) => c.id === primaryColorId) || null,
    [product, primaryColorId]
  );
  const selectedSecondary = useMemo(
    () => product?.secondaryColors.find((c) => c.id === secondaryColorId) || null,
    [product, secondaryColorId]
  );
  const hasSecondaryColors = (product?.secondaryColors.length || 0) > 0;
  const missing = product ? missingRequiredOptions(product, optionSelection) : [];
  const colourOut =
    Boolean(product?.primaryColors.length) && (!selectedPrimary || Boolean(selectedPrimary.outOfStock)) ||
    (hasSecondaryColors && (!selectedSecondary || Boolean(selectedSecondary.outOfStock)));
  const blocked = colourOut ? "This colour is out of stock right now" : missing.length ? `Choose ${missing.map((g) => g.name.toLowerCase()).join(" and ")}` : "";
  const thumb = product ? imagesForSelection(product, primaryColorId, options.map((o) => o.valueId))[0] : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto p-0">
        {product ? (
          <>
            <div className="flex gap-4 border-b border-border p-5 pr-12">
              <div className="h-20 w-20 shrink-0 bg-card">{thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}</div>
              <DialogHeader className="min-w-0 space-y-1 text-left">
                <DialogTitle className="text-2xl font-bold leading-tight">{product.name}</DialogTitle>
                <DialogDescription className="text-base text-foreground">
                  {formatEGP(unitPrice)}
                  {hasDiscount(product) && !options.some((o) => o.priceDelta) ? (
                    <span className="ml-2 text-sm text-muted-foreground line-through">{formatEGP(product.basePrice)}</span>
                  ) : null}
                </DialogDescription>
                {product.isBundle && product.bundleItems?.length ? (
                  <p className="text-sm text-muted-foreground">
                    Bundle: {product.bundleItems.map((item) => `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`).join(", ")}
                  </p>
                ) : null}
              </DialogHeader>
            </div>

            <div className="space-y-6 p-5">
              {product.primaryColors.length ? (
                <ColorPicker
                  legend={hasSecondaryColors ? "Main colour" : "Colour"}
                  colors={product.primaryColors}
                  value={primaryColorId}
                  onChange={setPrimaryColorId}
                />
              ) : null}
              {hasSecondaryColors ? (
                <ColorPicker legend="Accent colour" colors={product.secondaryColors} value={secondaryColorId} onChange={setSecondaryColorId} />
              ) : null}
              {(product.optionGroups || []).map((group) => (
                <OptionPicker
                  key={group.id}
                  group={group}
                  value={optionSelection[group.id] || ""}
                  onChange={(valueId) => setOptionSelection((prev) => ({ ...prev, [group.id]: valueId }))}
                />
              ))}

              {blocked ? <p className="text-sm text-ink" role="status">{blocked}.</p> : null}
              <button
                type="button"
                disabled={Boolean(blocked)}
                onClick={() => {
                  addProductToCart({
                    brand,
                    productId: product.id,
                    productName: product.name,
                    isBundle: product.isBundle,
                    bundleItems: product.bundleItems,
                    qty: 1,
                    primaryColorId,
                    secondaryColorId,
                    primaryColorName: selectedPrimary?.name,
                    secondaryColorName: selectedSecondary?.name,
                    ledsEnabled: false,
                    options,
                    unitPrice,
                  });
                  onOpenChange(false);
                  toast.success(`Added ${product.name}`, {
                    description: [selectedPrimary?.name, selectedSecondary?.name, ...options.map((o) => o.valueLabel)].filter(Boolean).join(" / "),
                    action: { label: "View cart", onClick: () => navigate("/product-cart") },
                  });
                }}
                className="btn-primary w-full"
              >
                Add to cart · {formatEGP(unitPrice)}
              </button>
              <p className="text-sm text-muted-foreground">Printed to order in about 48 hours. Cash on delivery or InstaPay.</p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
