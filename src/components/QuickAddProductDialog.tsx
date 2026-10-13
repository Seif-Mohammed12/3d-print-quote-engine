import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUnitPrice } from "@/lib/product-order";
import { useCart } from "@/lib/cart-context";
import { formatEGP, hasDiscount } from "@/lib/catalog-format";
import ColorPicker from "@/components/catalog/ColorPicker";
import PhotoPending from "@/components/catalog/PhotoPending";
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

  useEffect(() => {
    if (!product) return;
    setPrimaryColorId(product.primaryColors[0]?.id || "");
    setSecondaryColorId(product.secondaryColors[0]?.id || "");
  }, [product]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return getUnitPrice(product, false);
  }, [product]);
  const selectedPrimary = useMemo(
    () => product?.primaryColors.find((c) => c.id === primaryColorId) || null,
    [product, primaryColorId]
  );
  const selectedSecondary = useMemo(
    () => product?.secondaryColors.find((c) => c.id === secondaryColorId) || null,
    [product, secondaryColorId]
  );
  const hasSecondaryColors = (product?.secondaryColors.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto p-0">
        {product ? (
          <>
            <div className="flex gap-4 border-b border-border p-5 pr-12">
              <div className="h-20 w-20 shrink-0 bg-black">
                {product.images[0] ? (
                  <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PhotoPending compact />
                )}
              </div>
              <DialogHeader className="min-w-0 space-y-1 text-left">
                <DialogTitle className="text-2xl font-bold leading-tight">{product.name}</DialogTitle>
                <DialogDescription className="text-base text-foreground">
                  {formatEGP(unitPrice)}
                  {hasDiscount(product) ? (
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
              <ColorPicker
                legend={hasSecondaryColors ? "Main colour" : "Colour"}
                colors={product.primaryColors}
                value={primaryColorId}
                onChange={setPrimaryColorId}
              />
              {hasSecondaryColors ? (
                <ColorPicker
                  legend="Accent colour"
                  colors={product.secondaryColors}
                  value={secondaryColorId}
                  onChange={setSecondaryColorId}
                />
              ) : null}

              <button
                type="button"
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
                    unitPrice,
                  });
                  onOpenChange(false);
                  toast.success(`Added ${product.name}`, {
                    description: [selectedPrimary?.name, selectedSecondary?.name].filter(Boolean).join(" / "),
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
