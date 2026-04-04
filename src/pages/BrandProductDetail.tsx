import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { brandCatalog, type BrandId } from "@/lib/brand-catalog";
import Layout from "@/components/Layout";
import { type ProductOrderDraft } from "@/lib/product-order";
import { useCart } from "@/lib/cart-context";
import { getUnitPrice } from "@/lib/product-order";
import { useQuery } from "@tanstack/react-query";
import { fetchProductByBrandAndId, mapDbProductToLegacyProduct } from "@/lib/products-api";
import { cacheProducts } from "@/lib/runtime-product-cache";

const imageSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 22 : -22,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -22 : 22,
    opacity: 0,
    scale: 0.985,
  }),
};

const brandCopy: Record<BrandId, { name: string; subtitle: string }> = {
  pforge: {
    name: "Pforge",
    subtitle: "Gaming stands and desk accessories.",
  },
  printique: {
    name: "Printique",
    subtitle: "Decor & objects for modern spaces.",
  },
};

export default function BrandProductDetail({ brand }: { brand: BrandId }) {
  const navigate = useNavigate();
  const { addProductToCart } = useCart();
  const params = useParams();
  const productId = params.productId || "";

  const { data: liveProduct } = useQuery({
    queryKey: ["brand-product", brand, productId],
    queryFn: () => fetchProductByBrandAndId(brand, productId),
    retry: 1,
  });

  const product = useMemo(() => {
    if (liveProduct) return mapDbProductToLegacyProduct(liveProduct);
    return brandCatalog[brand].products.find((p) => p.id === productId) || null;
  }, [brand, productId, liveProduct]);

  if (product) {
    cacheProducts(brand, [product]);
  }

  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>("");
  const [selectedSecondaryId, setSelectedSecondaryId] = useState<string>("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (!product) return;
    const firstPrimary = product.primaryColors[0]?.id ?? "";
    const firstSecondary = product.secondaryColors[0]?.id ?? "";
    setSelectedPrimaryId((prev) =>
      prev && product.primaryColors.some((c) => c.id === prev) ? prev : firstPrimary
    );
    setSelectedSecondaryId((prev) =>
      prev && product.secondaryColors.some((c) => c.id === prev) ? prev : firstSecondary
    );
  }, [product]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [productId]);

  if (!product) {
    return (
      <Layout>
        <div className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Product not found
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Try going back to the brand page.
            </p>
            <Link
              to={`/${brand}`}
              className="text-primary underline hover:text-primary/90"
            >
              Back to {brandCopy[brand].name}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const handleRequest = () => {
    const selectedPrimary = product.primaryColors.find((c) => c.id === selectedPrimaryId);
    const selectedSecondary = product.secondaryColors.find((c) => c.id === selectedSecondaryId);
    const effectiveBasePrice =
      product.discount?.enabled && product.discount.price > 0 ? product.discount.price : product.basePrice;
    const total = effectiveBasePrice;

    // Prefill the contact form so users don't have to type everything again.
    sessionStorage.setItem(
      "contactMessage",
      `Hello! I want to request:\n- Brand: ${brandCopy[brand].name}\n- Product: ${product.name}\n- Primary color: ${selectedPrimary?.name || "Not selected"}\n- Secondary color: ${selectedSecondary?.name || "Not selected"}\n- Estimated total: EGP${total}\n\nMy message:`
    );

    navigate("/contact");
  };

  const images = product.images || [];
  const currentImage = images[activeImageIdx] || images[0];
  const effectiveBasePrice =
    product.discount?.enabled && product.discount.price > 0 ? product.discount.price : product.basePrice;
  const totalPrice = effectiveBasePrice;
  const selectedPrimary = product.primaryColors.find((c) => c.id === selectedPrimaryId);
  const selectedSecondary = product.secondaryColors.find((c) => c.id === selectedSecondaryId);
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    if (!hasMultipleImages) return;
    setSlideDirection(1);
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (!hasMultipleImages) return;
    setSlideDirection(-1);
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Layout>
      <LayoutPad brand={brand}>
        <section className="section-padding">
          <div className="container mx-auto max-w-6xl space-y-8">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className={[
                  "group inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                  brand === "pforge"
                    ? "border-cyan-300/35 bg-slate-900/70 text-cyan-100 hover:border-cyan-200/70 hover:shadow-[0_0_22px_-10px_rgba(56,189,248,0.7)]"
                    : "border-blue-300/35 bg-slate-900/70 text-blue-100 hover:border-amber-200/60 hover:shadow-[0_0_22px_-10px_rgba(59,130,246,0.7)]",
                ].join(" ")}
              >
                <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              </button>
              <div className="hidden md:block text-xs text-muted-foreground">
                {brandCopy[brand].subtitle}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 text-center md:text-left"
            >
              <div className="text-xs font-semibold tracking-[0.35em] uppercase text-primary/90">
                {brandCopy[brand].name}
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">{product.short}</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="glass-card p-4 overflow-hidden">
                  {currentImage ? (
                    <div className="relative h-[420px]">
                      <AnimatePresence initial={false}>
                        <motion.img
                          key={`${activeImageIdx}-${currentImage}`}
                          custom={slideDirection}
                          variants={imageSlideVariants}
                          src={currentImage}
                          alt={product.name}
                          className="absolute inset-0 m-auto h-full w-full object-contain rounded-xl"
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.24, ease: "easeOut" }}
                        />
                      </AnimatePresence>
                      {hasMultipleImages && (
                        <>
                          <button
                            type="button"
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/70 transition-colors"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/70 transition-colors"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
                      Add photos for this variant to show them here.
                    </div>
                  )}
                </div>

                {hasMultipleImages && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {images.map((src, idx) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`h-16 w-16 flex-none rounded-lg border ${idx === activeImageIdx
                          ? "border-primary/60 ring-2 ring-primary/30"
                          : "border-border/60 hover:border-primary/40"
                          } bg-secondary/30`}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <img src={src} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="flex items-end gap-3">
                        <div className="text-3xl font-heading font-bold neon-text">EGP{totalPrice}</div>
                        {product.discount?.enabled && product.discount.price > 0 && (
                          <div className="text-sm text-muted-foreground line-through mb-1">
                            EGP{product.basePrice}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading font-semibold text-foreground">Choose primary color</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {product.primaryColors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setSelectedPrimaryId(color.id)}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${color.id === selectedPrimaryId
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/60 hover:border-primary/40"
                            }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          <span className="sr-only">{color.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Primary selected:{" "}
                      <span className="font-semibold text-foreground">
                        {selectedPrimary?.name || "Not selected"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading font-semibold text-foreground">Choose secondary color</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {product.secondaryColors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setSelectedSecondaryId(color.id)}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${color.id === selectedSecondaryId
                            ? "border-primary/60 bg-primary/10"
                            : "border-border/60 hover:border-primary/40"
                            }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          <span className="sr-only">{color.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Secondary selected:{" "}
                      <span className="font-semibold text-foreground">
                        {selectedSecondary?.name || "Not selected"}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const unitPrice = getUnitPrice(product, false);

                      addProductToCart({
                        brand,
                        productId: product.id,
                        qty: 1,
                        primaryColorId: selectedPrimaryId,
                        secondaryColorId: selectedSecondaryId,
                        ledsEnabled: false,
                        unitPrice,
                      });

                      // Keep draft for a smooth "Buy now" experience too.
                      const draft: ProductOrderDraft = {
                        brand,
                        productId: product.id,
                        primaryColorId: selectedPrimaryId,
                        secondaryColorId: selectedSecondaryId,
                        ledsEnabled: false,
                        qty: 1,
                      };
                      sessionStorage.setItem("productOrderDraft", JSON.stringify(draft));
                    }}
                    className="w-full mt-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300"
                  >
                    Add to cart
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const draft: ProductOrderDraft = {
                        brand,
                        productId: product.id,
                        primaryColorId: selectedPrimaryId,
                        secondaryColorId: selectedSecondaryId,
                        ledsEnabled: false,
                        qty: 1,
                      };
                      sessionStorage.setItem("productOrderDraft", JSON.stringify(draft));
                      navigate("/product-checkout");
                    }}
                    className="w-full mt-3 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-all duration-300"
                  >
                    Buy now
                  </button>
                </div>

              </div>
            </div>

            {product.description?.trim() ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35 }}
                className={[
                  "glass-card p-6 md:p-8 border max-w-4xl mx-auto mt-2",
                  brand === "pforge"
                    ? "border-cyan-400/25 shadow-[0_0_40px_-20px_rgba(56,189,248,0.35)]"
                    : "border-blue-400/20 shadow-[0_0_40px_-20px_rgba(59,130,246,0.35)]",
                ].join(" ")}
              >
                <h2
                  className={[
                    "font-heading text-xl md:text-2xl font-semibold text-foreground mb-4",
                    brand === "pforge" ? "text-cyan-100" : "text-slate-50",
                  ].join(" ")}
                >
                  About this product
                </h2>
                <div
                  className={[
                    "text-sm md:text-base leading-relaxed text-muted-foreground space-y-4",
                    brand === "pforge" ? "[&_strong]:text-cyan-100/95" : "[&_strong]:text-amber-100/90",
                  ].join(" ")}
                >
                  {product.description
                    .split(/\n\n+/)
                    .map((block) => block.trim())
                    .filter(Boolean)
                    .map((block, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {block}
                      </p>
                    ))}
                </div>
              </motion.div>
            ) : null}
          </div>
        </section>
      </LayoutPad>
    </Layout>
  );
}

function LayoutPad({ brand, children }: { brand: BrandId; children: ReactNode }) {
  // Keep current page layout consistent; the Layout component already provides the dark base.
  // This wrapper only adds brand-specific background accents.
  return (
    <div className="relative">
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-16 -z-10 h-80",
          brand === "pforge"
            ? "bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.25),_transparent_65%)]"
            : "bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.25),_transparent_65%)]",
        ].join(" ")}
      />
      {children}
    </div>
  );
}

