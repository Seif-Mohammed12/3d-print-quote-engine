import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUnitPrice } from "@/lib/product-order";
import { useCart } from "@/lib/cart-context";
import type { BrandId, Product } from "@/lib/brand-catalog";

type QuickAddProductDialogProps = {
  brand: BrandId;
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accentClassName?: string;
};

export default function QuickAddProductDialog({
  brand,
  product,
  open,
  onOpenChange,
  accentClassName,
}: QuickAddProductDialogProps) {
  const { addProductToCart } = useCart();
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
      <DialogContent className="max-w-xl border-slate-800 bg-slate-950 text-slate-100">
        {product ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">{product.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {product.isBundle ? "Choose colors for the bundle and add it to your cart." : "Choose colors and add this item to your cart."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                {product.isBundle ? (
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Bundle</p>
                ) : null}
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Price</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className={["text-2xl font-heading font-bold", accentClassName || "text-primary"].join(" ")}>
                    EGP{unitPrice}
                  </p>
                  {product.discount?.enabled && product.discount.price > 0 ? (
                    <p className="text-sm text-slate-500 line-through">EGP{product.basePrice}</p>
                  ) : null}
                </div>
                {product.isBundle && product.bundleItems?.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Includes</p>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {product.bundleItems.map((item) => (
                        <li key={`${item.productId}-${item.qty}`}>
                          {item.name}
                          {item.qty > 1 ? ` x${item.qty}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-200">Primary color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.primaryColors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setPrimaryColorId(color.id)}
                      className={[
                        "h-9 w-9 rounded-full border-2 transition-all",
                        color.id === primaryColorId
                          ? "border-white/70 ring-2 ring-white/25"
                          : "border-slate-600 hover:border-slate-400",
                      ].join(" ")}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      <span className="sr-only">{color.name}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Selected:{" "}
                  <span className={["font-semibold", accentClassName || "text-primary"].join(" ")}>
                    {selectedPrimary?.name || "Not selected"}
                  </span>
                </p>
              </div>

              {hasSecondaryColors ? (
                <div>
                  <p className="text-sm font-semibold text-slate-200">Secondary color</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.secondaryColors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSecondaryColorId(color.id)}
                        className={[
                          "h-9 w-9 rounded-full border-2 transition-all",
                          color.id === secondaryColorId
                            ? "border-white/70 ring-2 ring-white/25"
                            : "border-slate-600 hover:border-slate-400",
                        ].join(" ")}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        <span className="sr-only">{color.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Selected:{" "}
                    <span className={["font-semibold", accentClassName || "text-primary"].join(" ")}>
                      {selectedSecondary?.name || "Not selected"}
                    </span>
                  </p>
                </div>
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
                }}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
              >
                Add to cart
              </button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
