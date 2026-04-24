import Layout from "@/components/Layout";
import { useProducts } from "@/hooks/use-brand-products";
import { useCart } from "@/lib/cart-context";
import { getUnitPrice, type ProductOrderDraft } from "@/lib/product-order";
import { cacheProducts } from "@/lib/runtime-product-cache";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

const brandLabel: Record<string, string> = {
  pforge: "Gaming & Setup",
  printique: "Home & Decor",
};

export default function ProductDetail() {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const { addProductToCart } = useCart();
  const { data: products, isPending } = useProducts();
  const product = useMemo(
    () => (products || []).find((entry) => entry.id === productId) || null,
    [products, productId]
  );

  useEffect(() => {
    if (product?.brand) {
      cacheProducts(product.brand, [product]);
    }
  }, [product]);

  const [selectedPrimaryId, setSelectedPrimaryId] = useState("");
  const [selectedSecondaryId, setSelectedSecondaryId] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (!product) return;
    setSelectedPrimaryId((prev) =>
      prev && product.primaryColors.some((color) => color.id === prev) ? prev : product.primaryColors[0]?.id || ""
    );
    setSelectedSecondaryId((prev) =>
      prev && product.secondaryColors.some((color) => color.id === prev) ? prev : product.secondaryColors[0]?.id || ""
    );
  }, [product]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [productId]);

  if (isPending && !product) {
    return (
      <Layout>
        <div className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <h1 className="font-heading text-2xl font-bold text-foreground">Loading product...</h1>
            <p className="mt-2 text-sm text-muted-foreground">Fetching product details.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="section-padding">
          <div className="container mx-auto max-w-3xl">
            <h1 className="font-heading text-2xl font-bold text-foreground">Product not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">Try going back to the main products page.</p>
            <Link to="/products" className="text-primary underline hover:text-primary/90">
              Back to products
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const images = product.images || [];
  const currentImage = images[activeImageIdx] || images[0];
  const effectiveBasePrice =
    product.discount?.enabled && product.discount.price > 0 ? product.discount.price : product.basePrice;
  const selectedPrimary = product.primaryColors.find((color) => color.id === selectedPrimaryId);
  const selectedSecondary = product.secondaryColors.find((color) => color.id === selectedSecondaryId);
  const hasSecondaryColors = product.secondaryColors.length > 0;
  const hasMultipleImages = images.length > 1;

  const persistDraft = () => {
    const draft: ProductOrderDraft = {
      brand: product.brand || "pforge",
      productId: product.id,
      productName: product.name,
      isBundle: product.isBundle,
      bundleItems: product.bundleItems,
      primaryColorId: selectedPrimaryId,
      secondaryColorId: selectedSecondaryId,
      ledsEnabled: false,
      qty: 1,
    };
    sessionStorage.setItem("productOrderDraft", JSON.stringify(draft));
  };

  return (
    <Layout>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 h-80 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.25),_transparent_65%)]" />
        <section className="section-padding">
          <div className="container mx-auto max-w-6xl space-y-8">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-300/35 bg-slate-900/70 text-blue-100 transition-all hover:border-blue-200/70 hover:shadow-[0_0_22px_-10px_rgba(59,130,246,0.7)]"
              >
                <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              </button>
              <div className="hidden text-xs text-muted-foreground md:block">
                {brandLabel[product.brand || ""] || "Product"}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 text-center md:text-left"
            >
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase md:justify-start">
                <div className="tracking-[0.35em] text-primary/90">
                  {brandLabel[product.brand || ""] || "Products"}
                </div>
                {product.isBundle ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 tracking-[0.2em] text-primary">
                    Bundle
                  </span>
                ) : null}
              </div>
              <h1 className="font-heading text-4xl font-bold text-foreground md:text-5xl">{product.name}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{product.short}</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="glass-card overflow-hidden p-4">
                  {currentImage ? (
                    <div className="relative h-[420px]">
                      <AnimatePresence initial={false}>
                        <motion.img
                          key={`${activeImageIdx}-${currentImage}`}
                          custom={slideDirection}
                          variants={imageSlideVariants}
                          src={currentImage}
                          alt={product.name}
                          className="absolute inset-0 m-auto h-full w-full rounded-xl object-contain"
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.24, ease: "easeOut" }}
                        />
                      </AnimatePresence>
                      {hasMultipleImages ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection(-1);
                              setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition-colors hover:bg-black/70"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection(1);
                              setActiveImageIdx((prev) => (prev + 1) % images.length);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition-colors hover:bg-black/70"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                      Add photos for this product to show them here.
                    </div>
                  )}
                </div>

                {hasMultipleImages ? (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {images.map((src, idx) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`h-16 w-16 flex-none rounded-lg border bg-secondary/30 ${
                          idx === activeImageIdx ? "border-primary/60 ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <img src={src} alt={`${product.name} ${idx + 1}`} className="h-full w-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="flex items-end gap-3">
                        <div className="font-heading text-3xl font-bold neon-text">EGP{effectiveBasePrice}</div>
                        {product.discount?.enabled && product.discount.price > 0 ? (
                          <div className="mb-1 text-sm text-muted-foreground line-through">EGP{product.basePrice}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h3 className="font-heading font-semibold text-foreground">Choose primary color</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.primaryColors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setSelectedPrimaryId(color.id)}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            color.id === selectedPrimaryId ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-primary/40"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          <span className="sr-only">{color.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Primary selected: <span className="font-semibold text-foreground">{selectedPrimary?.name || "Not selected"}</span>
                    </p>
                  </div>

                  {hasSecondaryColors ? (
                    <div className="mt-6 space-y-3">
                      <h3 className="font-heading font-semibold text-foreground">Choose secondary color</h3>
                      <div className="flex flex-wrap gap-3">
                        {product.secondaryColors.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setSelectedSecondaryId(color.id)}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              color.id === selectedSecondaryId ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-primary/40"
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            <span className="sr-only">{color.name}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Secondary selected: <span className="font-semibold text-foreground">{selectedSecondary?.name || "Not selected"}</span>
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      addProductToCart({
                        brand: product.brand || "pforge",
                        productId: product.id,
                        productName: product.name,
                        isBundle: product.isBundle,
                        bundleItems: product.bundleItems,
                        qty: 1,
                        primaryColorId: selectedPrimaryId,
                        secondaryColorId: selectedSecondaryId,
                        ledsEnabled: false,
                        unitPrice: getUnitPrice(product, false),
                      });
                      persistDraft();
                    }}
                    className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)]"
                  >
                    Add to cart
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      persistDraft();
                      navigate("/product-checkout");
                    }}
                    className="mt-3 w-full rounded-lg border border-border py-3 font-semibold text-foreground transition-all duration-300 hover:bg-secondary"
                  >
                    Buy now
                  </button>
                </div>

                {product.isBundle && product.bundleItems?.length ? (
                  <div className="glass-card p-6">
                    <h3 className="font-heading font-semibold text-foreground">Bundle contents</h3>
                    <div className="mt-4 space-y-3">
                      {product.bundleItems.map((item) => (
                        <div
                          key={`${item.productId}-${item.qty}`}
                          className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-secondary/20 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Included in this bundle</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-primary">x{item.qty}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {product.description?.trim() ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35 }}
                className="mx-auto mt-2 max-w-4xl border border-blue-400/20 p-6 shadow-[0_0_40px_-20px_rgba(59,130,246,0.35)] glass-card md:p-8"
              >
                <h2 className="mb-4 font-heading text-xl font-semibold text-slate-50 md:text-2xl">About this product</h2>
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base [&_strong]:text-amber-100/90">
                  {product.description
                    .split(/\n\n+/)
                    .map((block) => block.trim())
                    .filter(Boolean)
                    .map((block, index) => (
                      <p key={index} className="whitespace-pre-line">
                        {block}
                      </p>
                    ))}
                </div>
              </motion.div>
            ) : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
