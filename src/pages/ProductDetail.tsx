import Layout from "@/components/Layout";
import Sleeve from "@/components/catalog/Sleeve";
import ColorPicker from "@/components/catalog/ColorPicker";
import CatalogueRow from "@/components/catalog/CatalogueRow";
import { useProducts } from "@/hooks/use-brand-products";
import { useCart } from "@/lib/cart-context";
import { getUnitPrice, type ProductOrderDraft } from "@/lib/product-order";
import { cacheProducts } from "@/lib/runtime-product-cache";
import {
  catalogueNo,
  categoryLabel,
  effectivePrice,
  formatEGP,
  hasDiscount,
  shotFor,
} from "@/lib/catalog-format";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const { addProductToCart } = useCart();
  const { data: products, isPending } = useProducts();
  const product = useMemo(
    () => (products || []).find((entry) => entry.id === productId || entry.slug === productId) || null,
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
  const [justAdded, setJustAdded] = useState(false);
  const touchStartX = useRef<number | null>(null);

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

  useEffect(() => {
    if (product) document.title = `${product.name} · 3D Print It`;
    return () => {
      document.title = "3D Print It";
    };
  }, [product]);

  if (isPending && !product) {
    return (
      <Layout>
        <div className="frame grid gap-6 pt-4 md:grid-cols-12 md:gap-10 md:pt-10" aria-busy="true" aria-label="Loading product">
          <div className="aspect-square animate-pulse bg-card md:col-span-7" />
          <div className="space-y-3 md:col-span-5">
            <div className="h-11 w-3/4 animate-pulse bg-card" />
            <div className="h-5 w-1/2 animate-pulse bg-card" />
            <div className="mt-8 h-12 w-full animate-pulse bg-card" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    const suggestions = (products || []).filter((p) => p.images.length > 0).slice(0, 3);
    return (
      <Layout>
        <section className="frame pb-20 pt-10 md:pb-28 md:pt-16">
          <h1 className="text-[36px] font-bold leading-none tracking-[-0.03em] md:text-5xl">That one isn't on the shelf.</h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            The link may be old or the piece was retired. Here's what's printing now, or{" "}
            <a href="https://wa.me/201099228486" className="link-quiet text-foreground" rel="noopener">
              ask us on WhatsApp
            </a>{" "}
            and we'll find it.
          </p>
          {suggestions.length ? (
            <div className="ruled mt-10 border-y border-border">
              {suggestions.map((p) => (
                <CatalogueRow key={p.id} product={p} catalogueNo={catalogueNo(products, p.id)} />
              ))}
            </div>
          ) : null}
          <Link to="/products" className="btn-secondary mt-8">
            Back to the shop
          </Link>
        </section>
      </Layout>
    );
  }

  const images = product.images || [];
  const currentImage = images[activeImageIdx] || images[0];
  const price = getUnitPrice(product, false);
  const selectedPrimary = product.primaryColors.find((color) => color.id === selectedPrimaryId);
  const selectedSecondary = product.secondaryColors.find((color) => color.id === selectedSecondaryId);
  const hasSecondaryColors = product.secondaryColors.length > 0;
  const hasMultipleImages = images.length > 1;
  const no = catalogueNo(products, product.id);
  const colourSummary = [selectedPrimary?.name, hasSecondaryColors ? selectedSecondary?.name : null].filter(Boolean).join(" / ");

  const step = (dir: 1 | -1) => setActiveImageIdx((prev) => (prev + dir + images.length) % images.length);

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

  const addToCart = () => {
    if (justAdded) return;
    addProductToCart({
      brand: product.brand || "pforge",
      productId: product.id,
      productName: product.name,
      isBundle: product.isBundle,
      bundleItems: product.bundleItems,
      qty: 1,
      primaryColorId: selectedPrimaryId,
      secondaryColorId: selectedSecondaryId,
      primaryColorName: selectedPrimary?.name,
      secondaryColorName: selectedSecondary?.name,
      ledsEnabled: false,
      unitPrice: price,
    });
    persistDraft();
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
    toast.success(`Added ${product.name}`, {
      description: colourSummary,
      action: { label: "View cart", onClick: () => navigate("/product-cart") },
    });
  };

  const buyNow = () => {
    persistDraft();
    navigate("/product-checkout");
  };

  const description = product.description?.trim()
    ? product.description
        .split(/\n\n+/)
        .map((block) => block.trim())
        .filter(Boolean)
    : [];

  return (
    <Layout>
      <div className="frame flex h-12 items-center justify-between text-[15px]">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/products"))}
          className="inline-flex min-h-11 items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <span className="text-muted-foreground">
          {categoryLabel[product.brand || ""] || "Product"} · {no}
        </span>
      </div>

      <section className="frame grid gap-6 pb-28 md:grid-cols-12 md:gap-10 md:pb-24">
        {/* Gallery */}
        <div className="md:col-span-7">
          <div
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || !hasMultipleImages) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
              touchStartX.current = null;
            }}
          >
            <Sleeve
              src={currentImage}
              alt={`${product.name}, photo ${activeImageIdx + 1} of ${Math.max(images.length, 1)}`}
              catalogueNo={no}
              spineHex={selectedPrimary?.hex || "#2A2A2D"}
              spineLabel={selectedPrimary?.name}
              shot={shotFor(product)}
              loading="eager"
            >
              {hasMultipleImages ? (
                <div className="absolute bottom-3 right-3 flex items-center bg-background/90 text-sm">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="inline-flex h-11 w-11 items-center justify-center hover:text-ink"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-10 text-center" aria-live="polite">
                    {activeImageIdx + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="inline-flex h-11 w-11 items-center justify-center hover:text-ink"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
            </Sleeve>
          </div>

          {hasMultipleImages ? (
            <div className="mt-3 flex gap-2 overflow-x-auto p-1">
              {images.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  aria-label={`Show photo ${idx + 1}`}
                  aria-current={idx === activeImageIdx}
                  className={`h-16 w-16 flex-none overflow-hidden bg-black md:h-20 md:w-20 ${
                    idx === activeImageIdx ? "outline outline-2 outline-offset-2 outline-foreground" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Release notes and buy box */}
        <div className="md:col-span-5">
          <div className="md:sticky md:top-20">
            <h1 className="text-[40px] font-bold leading-[0.95] tracking-[-0.035em] md:text-[56px]">
              {product.name}
              {product.isBundle ? <span className="ml-3 align-middle text-base font-semibold tracking-normal text-ink">Bundle</span> : null}
            </h1>
            {product.short ? <p className="mt-3 text-muted-foreground">{product.short}</p> : null}

            <p className="mt-5">
              <span className="text-[28px] font-bold tracking-[-0.02em]">{formatEGP(price)}</span>
              {hasDiscount(product) ? (
                <span className="ml-3 text-muted-foreground line-through">{formatEGP(product.basePrice)}</span>
              ) : null}
            </p>

            <div className="mt-6 space-y-6">
              {product.primaryColors.length ? (
                <ColorPicker
                  legend={hasSecondaryColors ? "Main colour" : "Colour"}
                  colors={product.primaryColors}
                  value={selectedPrimaryId}
                  onChange={setSelectedPrimaryId}
                />
              ) : null}
              {hasSecondaryColors ? (
                <ColorPicker
                  legend="Accent colour"
                  colors={product.secondaryColors}
                  value={selectedSecondaryId}
                  onChange={setSelectedSecondaryId}
                />
              ) : null}
            </div>

            <div className="mt-6 hidden gap-2 md:grid md:grid-cols-[1fr_auto]">
              <button type="button" onClick={addToCart} className="btn-primary">
                {justAdded ? "Added" : `Add to cart · ${formatEGP(price)}`}
              </button>
              <button type="button" onClick={buyNow} className="btn-secondary">
                Buy now
              </button>
            </div>
            <button type="button" onClick={buyNow} className="btn-secondary mt-4 w-full md:hidden">
              Buy now
            </button>

            {/* Terms of sale, right where the decision happens */}
            <dl className="ruled mt-8 border-y border-border text-[15px]">
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">Printed</dt>
                <dd>To order in PLA or PETG, in about 48 hours</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">Pay</dt>
                <dd>Cash on delivery or InstaPay</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>Aramex, cost confirmed after you order, or free pickup in New Cairo</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">Questions</dt>
                <dd>
                  <a href="https://wa.me/201099228486" className="link-quiet" rel="noopener">
                    WhatsApp us
                  </a>{" "}
                  about sizes, colours or a custom version
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Liner notes */}
        {description.length || (product.isBundle && product.bundleItems?.length) ? (
          <div className="grid gap-10 border-t border-border pt-10 md:col-span-12 md:mt-10 md:grid-cols-12 md:pt-14">
            {description.length ? (
              <div className="md:col-span-7">
                <h2 className="text-2xl font-bold tracking-[-0.02em]">About this piece</h2>
                <div className="mt-4 max-w-[65ch] space-y-4 text-[17px] leading-relaxed text-muted-foreground">
                  {description.map((block, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {block}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            {product.isBundle && product.bundleItems?.length ? (
              <div className="md:col-span-5">
                <h2 className="text-2xl font-bold tracking-[-0.02em]">In the bundle</h2>
                <ul className="ruled mt-4 border-y border-border">
                  {product.bundleItems.map((item) => (
                    <li key={`${item.productId}-${item.qty}`} className="flex items-center justify-between py-3">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">x{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Phone buy bar: price, chosen colour and Add to cart in thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="frame flex h-[72px] items-center gap-4">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{formatEGP(effectivePrice(product))}</p>
            <p className="truncate text-sm text-muted-foreground">{colourSummary || "Pick a colour"}</p>
          </div>
          <button type="button" onClick={addToCart} className="btn-primary min-h-12 flex-1">
            {justAdded ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
