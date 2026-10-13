import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import AdminNav from "@/components/admin/AdminNav";
import { supabase } from "@/lib/supabase";
import {
  adminDeleteColor,
  adminDeleteImage,
  adminDeleteProduct,
  adminFetchCatalog,
  adminReorderColors,
  adminReorderImages,
  adminReorderProducts,
  adminUploadImages,
  adminUpsertColor,
  adminUpsertProduct,
  adminSetBundleItems,
} from "@/lib/products-api";

type Brand = "pforge" | "printique";
type ProductRow = {
  id: string;
  brand: Brand;
  slug: string;
  name: string;
  short: string;
  description: string;
  grams: number | null;
  base_price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  stock_qty: number;
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
  is_bundle?: boolean;
};
type ImageRow = { id: string; product_id: string; image_url: string; sort_order: number };
type ColorRow = {
  id: string;
  product_id: string;
  role: "primary" | "secondary";
  color_id: string;
  name: string;
  hex: string;
  sort_order: number;
};
type ColorLibraryRow = {
  id: string;
  color_id: string;
  name: string;
  hex: string;
  sort_order: number;
};
type BundleItemRow = {
  id: string;
  bundle_product_id: string;
  component_product_id: string;
  qty: number;
  sort_order: number;
};

function reindexSortOrder<T extends { sort_order: number }>(rows: T[]): T[] {
  return rows.map((row, idx) => ({ ...row, sort_order: idx }));
}

function swapRows<T>(rows: T[], from: number, to: number): T[] {
  const next = [...rows];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function toMoneyInput(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "0.00";
  return Number(value).toFixed(2);
}

const emptyProduct = {
  id: "",
  brand: "pforge" as Brand,
  slug: "",
  name: "",
  short: "",
  description: "",
  grams: 0,
  basePrice: 0,
  discountEnabled: false,
  discountPrice: 0,
  stockQty: 0,
  inStock: true,
  isPublished: false,
  sortOrder: 0,
  isBundle: false,
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [bundleItems, setBundleItems] = useState<BundleItemRow[]>([]);
  const [colorLibrary, setColorLibrary] = useState<ColorLibraryRow[]>([]);
  const [colorLibraryPick, setColorLibraryPick] = useState("");
  const [gridBrand, setGridBrand] = useState<Brand>("pforge");
  const [dragProductId, setDragProductId] = useState<string | null>(null);
  const [bundleDraftItems, setBundleDraftItems] = useState<Array<{ key: string; productId: string; qty: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState(emptyProduct);
  const [colorDraft, setColorDraft] = useState({ role: "primary" as "primary" | "secondary", colorId: "", name: "", hex: "#000000" });
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [colorBusy, setColorBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetchCatalog();
      setProducts(data.products || []);
      setImages(data.images || []);
      setColors(data.colors || []);
      setColorLibrary(data.colorLibrary || []);
      setBundleItems(data.bundleItems || []);
      if (!selectedProductId && data.products?.length) setSelectedProductId(data.products[0].id);
    } catch (err: any) {
      setError(err.message || "Failed to load admin catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const selectedImages = useMemo(
    () => images.filter((i) => i.product_id === selectedProductId).sort((a, b) => a.sort_order - b.sort_order),
    [images, selectedProductId]
  );
  const selectedColors = useMemo(
    () => colors.filter((c) => c.product_id === selectedProductId).sort((a, b) => a.sort_order - b.sort_order),
    [colors, selectedProductId]
  );
  const selectedBundleItems = useMemo(
    () =>
      bundleItems
        .filter((bi) => bi.bundle_product_id === selectedProductId)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [bundleItems, selectedProductId]
  );
  const productImageByProductId = useMemo(() => {
    const map = new Map<string, string>();
    images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((img) => {
        if (!map.has(img.product_id)) map.set(img.product_id, img.image_url);
      });
    return map;
  }, [images]);
  const gridProducts = useMemo(
    () =>
      products
        .filter((p) => p.brand === gridBrand)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [products, gridBrand]
  );
  const bundleComponentOptions = useMemo(() => {
    if (!selectedProductId) return [];
    return products
      .filter((p) => p.id !== selectedProductId && p.brand === form.brand)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [products, selectedProductId, form.brand]);

  useEffect(() => {
    if (!selectedProductId || !form.isBundle) {
      setBundleDraftItems([]);
      return;
    }
    const seeded = selectedBundleItems.map((bi) => ({
      key: bi.id,
      productId: bi.component_product_id,
      qty: Number(bi.qty || 1),
    }));
    setBundleDraftItems(seeded.length ? seeded : [{ key: `tmp-${Date.now()}`, productId: "", qty: 1 }]);
  }, [selectedProductId, form.isBundle, selectedBundleItems]);

  useEffect(() => {
    if (!selectedProduct) {
      setForm(emptyProduct);
      return;
    }
    setForm({
      id: selectedProduct.id,
      brand: selectedProduct.brand,
      slug: selectedProduct.slug || "",
      name: selectedProduct.name || "",
      short: selectedProduct.short || "",
      description: selectedProduct.description || "",
      grams: Number(selectedProduct.grams || 0),
      basePrice: Number(selectedProduct.base_price || 0),
      discountEnabled: Boolean(selectedProduct.discount_enabled),
      discountPrice: Number(selectedProduct.discount_price || 0),
      stockQty: Number(selectedProduct.stock_qty || 0),
      inStock: Boolean(selectedProduct.in_stock),
      isPublished: Boolean(selectedProduct.is_published),
      sortOrder: Number(selectedProduct.sort_order || 0),
      isBundle: Boolean(selectedProduct.is_bundle),
    });
  }, [selectedProductId, selectedProduct]);

  const colorDraftHex = useMemo(() => {
    const candidate = (colorDraft.hex || "").trim();
    const validShort = /^#([0-9a-fA-F]{3})$/.test(candidate);
    const validLong = /^#([0-9a-fA-F]{6})$/.test(candidate);
    return validShort || validLong ? candidate : "#000000";
  }, [colorDraft.hex]);

  const setProductImages = (productId: string, rows: ImageRow[]) => {
    setImages((prev) => [...prev.filter((img) => img.product_id !== productId), ...rows]);
  };

  const setProductColors = (productId: string, rows: ColorRow[]) => {
    setColors((prev) => [...prev.filter((color) => color.product_id !== productId), ...rows]);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/stats"
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Statistics
              </Link>
              <Link
                to="/admin/orders"
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Orders
              </Link>
              <button
                className="rounded-lg border border-border px-4 py-2 text-sm"
                onClick={() => load()}
              >
                Refresh
              </button>
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={async () => {
                  await supabase?.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Products</h2>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs"
                    onClick={() => {
                      setSelectedProductId("");
                      setForm({ ...emptyProduct, isBundle: false });
                    }}
                  >
                    + New product
                  </button>
                  <button
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs"
                    onClick={() => {
                      setSelectedProductId("");
                      setForm({ ...emptyProduct, isBundle: true });
                    }}
                  >
                    + New bundle
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 ${
                      p.id === selectedProductId ? "border-primary bg-primary/10" : "border-border bg-secondary/20"
                    }`}
                  >
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand.toUpperCase()} • {p.is_published ? "Published" : "Draft"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-4 space-y-3 lg:col-span-2">
              <h2 className="font-semibold">Product Editor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Product Name</label>
                  <input className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="DualSense Display Stand"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={100} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL id)</label>
                  <input className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="dualsense-display-stand"
                    value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Brand</label>
                  <select className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                    value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value as Brand })}>
                    <option value="pforge">Pforge</option>
                    <option value="printique">Printique</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Card Hook (outside)</label>
                  <input className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="Clean desk, hero setup."
                    value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} maxLength={200} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is the short line shown on product cards.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Product Weight (grams)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                    placeholder="180"
                    value={form.grams}
                    onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used for stats and estimating filament usage per product.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Base Price (EGP)</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="550"
                    value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: parseFloat(e.target.value || "0") })} min={0.01} step={0.01} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount Price (EGP)</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="480"
                    value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: parseFloat(e.target.value || "0") })} min={0.01} step={0.01} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Display Order</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="0"
                    value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} min={0} step={1} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lower number shows first on the brand page.
                  </p>
                </div>
              </div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">About This Product Description (inside)</label>
              <textarea className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm min-h-24" placeholder="Detailed description shown in About this product on the product details page."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={5000} />

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.discountEnabled} onChange={(e) => setForm({ ...form, discountEnabled: e.target.checked })} /> Discount enabled</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isBundle} onChange={(e) => setForm({ ...form, isBundle: e.target.checked })} /> This is a bundle</label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminUpsertProduct({
                        id: form.id || undefined,
                        brand: form.brand,
                        slug: form.slug,
                        name: form.name,
                        short: form.short,
                        description: form.description,
                        grams: form.grams,
                        basePrice: form.basePrice,
                        discountEnabled: form.discountEnabled,
                        discountPrice: form.discountPrice,
                        stockQty: form.stockQty,
                        inStock: form.inStock,
                        isPublished: form.isPublished,
                        sortOrder: form.sortOrder,
                        isBundle: form.isBundle,
                      });
                      await load();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save product
                </button>
                {form.id ? (
                  <button
                    className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive"
                    onClick={async () => {
                      if (!confirm("Delete this product?")) return;
                      setBusy(true);
                      try {
                        await adminDeleteProduct(form.id);
                        setSelectedProductId("");
                        await load();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete product
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Storefront Grid Editor</h2>
              <select
                className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                value={gridBrand}
                onChange={(e) => setGridBrand(e.target.value as Brand)}
              >
                <option value="pforge">Pforge</option>
                <option value="printique">Printique</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag cards to reorder how products appear on the brand page.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gridProducts.map((p) => {
                const img = productImageByProductId.get(p.id);
                const livePrice = p.discount_enabled && p.discount_price ? p.discount_price : p.base_price;
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragProductId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async () => {
                      if (!dragProductId || dragProductId === p.id) return;
                      const from = gridProducts.findIndex((x) => x.id === dragProductId);
                      const to = gridProducts.findIndex((x) => x.id === p.id);
                      if (from < 0 || to < 0) return;
                      const reordered = reindexSortOrder(swapRows(gridProducts, from, to));
                      const otherBrand = products.filter((x) => x.brand !== gridBrand);
                      setProducts([...otherBrand, ...reordered]);
                      setBusy(true);
                      try {
                        await adminReorderProducts(reordered.map((x) => x.id));
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Failed to reorder products");
                        await load();
                      } finally {
                        setBusy(false);
                        setDragProductId(null);
                      }
                    }}
                    className={`rounded-xl border p-3 bg-secondary/20 cursor-move ${
                      p.id === dragProductId ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/20 mb-2">
                      {img ? (
                        <img src={img} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">No image</div>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.short}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">EGP {toMoneyInput(livePrice)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedProductId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-4 space-y-3">
                <h2 className="font-semibold">Images</h2>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Add images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={mediaBusy}
                    className="block w-full max-w-md text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
                    onChange={async (e) => {
                      const list = e.target.files;
                      if (!list?.length) return;
                      const files = Array.from(list).filter((f) => f.size > 0);
                      e.target.value = "";
                      if (!files.length) return;
                      setMediaBusy(true);
                      setError("");
                      try {
                        const uploaded = await adminUploadImages(selectedProductId, files);
                        const newRows = uploaded
                          .map((entry: any) => entry?.image)
                          .filter(Boolean) as ImageRow[];
                        if (newRows.length) {
                          const merged = reindexSortOrder([...selectedImages, ...newRows]);
                          setProductImages(selectedProductId, merged);
                        }
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Upload failed");
                        await load();
                      } finally {
                        setMediaBusy(false);
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  You can select several files at once; they are appended in the order chosen. Use Up/Down to reorder after upload.
                </p>
                <div className="space-y-2">
                  {selectedImages.map((img, idx) => (
                    <div key={img.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <img src={img.image_url} alt="Product" className="h-12 w-12 object-cover rounded" />
                      <div className="flex-1 text-xs truncate">{img.image_url}</div>
                      <button className="text-xs px-2 py-1 rounded border"
                        disabled={mediaBusy}
                        onClick={async () => {
                          if (idx === 0) return;
                          const reordered = reindexSortOrder(swapRows(selectedImages, idx, idx - 1));
                          setProductImages(selectedProductId, reordered);
                          setMediaBusy(true);
                          try {
                            await adminReorderImages(reordered.map((i) => i.id));
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : "Failed to reorder images");
                            await load();
                          } finally {
                            setMediaBusy(false);
                          }
                        }}>Up</button>
                      <button className="text-xs px-2 py-1 rounded border"
                        disabled={mediaBusy}
                        onClick={async () => {
                          if (idx === selectedImages.length - 1) return;
                          const reordered = reindexSortOrder(swapRows(selectedImages, idx, idx + 1));
                          setProductImages(selectedProductId, reordered);
                          setMediaBusy(true);
                          try {
                            await adminReorderImages(reordered.map((i) => i.id));
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : "Failed to reorder images");
                            await load();
                          } finally {
                            setMediaBusy(false);
                          }
                        }}>Down</button>
                      <button className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive"
                        disabled={mediaBusy}
                        onClick={async () => {
                          const remaining = reindexSortOrder(selectedImages.filter((i) => i.id !== img.id));
                          setProductImages(selectedProductId, remaining);
                          setMediaBusy(true);
                          try {
                            await adminDeleteImage(img.id);
                            if (remaining.length) {
                              await adminReorderImages(remaining.map((i) => i.id));
                            }
                          } catch (err: unknown) {
                            setError(err instanceof Error ? err.message : "Failed to remove image");
                            await load();
                          } finally {
                            setMediaBusy(false);
                          }
                        }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <h2 className="font-semibold">Colors</h2>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Color library</label>
                  <select
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                    value={colorLibraryPick}
                    onChange={(e) => {
                      const v = e.target.value;
                      setColorLibraryPick(v);
                      if (!v) return;
                      const entry = colorLibrary.find((c) => c.color_id === v);
                      if (entry) {
                        setColorDraft((d) => ({
                          ...d,
                          colorId: entry.color_id,
                          name: entry.name,
                          hex: entry.hex,
                        }));
                      }
                    }}
                  >
                    <option value="">Custom — type id, name, and hex below</option>
                    {colorLibrary
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                      .map((c) => (
                        <option key={c.id} value={c.color_id}>
                          {c.name} · {c.color_id} · {c.hex}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a saved swatch to fill the fields, or enter a new color manually. New colors are saved to the library when you add them to the product.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                    value={colorDraft.role} onChange={(e) => setColorDraft({ ...colorDraft, role: e.target.value as "primary" | "secondary" })}>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                  <input className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="color id"
                    value={colorDraft.colorId} onChange={(e) => { setColorLibraryPick(""); setColorDraft({ ...colorDraft, colorId: e.target.value }); }} />
                  <input className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="name"
                    value={colorDraft.name} onChange={(e) => { setColorLibraryPick(""); setColorDraft({ ...colorDraft, name: e.target.value }); }} />
                  <input className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="#hex"
                    value={colorDraft.hex} onChange={(e) => { setColorLibraryPick(""); setColorDraft({ ...colorDraft, hex: e.target.value }); }} />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Preview</span>
                  <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: colorDraftHex }} />
                  <span className="text-xs text-foreground">{colorDraftHex}</span>
                </div>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  disabled={colorBusy}
                  onClick={async () => {
                    setColorBusy(true);
                    try {
                      const res = await adminUpsertColor({
                        productId: selectedProductId,
                        role: colorDraft.role,
                        colorId: colorDraft.colorId,
                        name: colorDraft.name,
                        hex: colorDraft.hex,
                        sortOrder: selectedColors.length,
                      });
                      const inserted = res?.color as ColorRow | undefined;
                      if (inserted) {
                        const sameRole = selectedColors.filter((c) => c.role === inserted.role);
                        const otherRole = selectedColors.filter((c) => c.role !== inserted.role);
                        const nextRole = reindexSortOrder([...sameRole, inserted]);
                        setProductColors(selectedProductId, [...otherRole, ...nextRole]);
                      }
                      setColorLibraryPick("");
                      setColorDraft({ role: colorDraft.role, colorId: "", name: "", hex: "#000000" });
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : "Failed to add color");
                      await load();
                    } finally {
                      setColorBusy(false);
                    }
                  }}
                >
                  Add color
                </button>
                <div className="space-y-2">
                  {selectedColors.map((color, idx) => (
                    <div key={color.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <span className="h-5 w-5 rounded-full border border-border" style={{ background: color.hex }} />
                      <span className="text-xs">{color.role}</span>
                      <span className="text-xs">{color.name}</span>
                      <span className="text-xs text-muted-foreground">{color.hex}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button className="text-xs px-2 py-1 rounded border"
                          disabled={colorBusy}
                          onClick={async () => {
                            const group = selectedColors.filter((c) => c.role === color.role);
                            const groupIdx = group.findIndex((c) => c.id === color.id);
                            if (groupIdx <= 0) return;
                            const reorderedRole = reindexSortOrder(swapRows(group, groupIdx, groupIdx - 1));
                            const otherRole = selectedColors.filter((c) => c.role !== color.role);
                            setProductColors(selectedProductId, [...otherRole, ...reorderedRole]);
                            setColorBusy(true);
                            try {
                              await adminReorderColors(reorderedRole.map((c) => c.id));
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : "Failed to reorder colors");
                              await load();
                            } finally {
                              setColorBusy(false);
                            }
                          }}>Up</button>
                        <button className="text-xs px-2 py-1 rounded border"
                          disabled={colorBusy}
                          onClick={async () => {
                            const group = selectedColors.filter((c) => c.role === color.role);
                            const groupIdx = group.findIndex((c) => c.id === color.id);
                            if (groupIdx < 0 || groupIdx >= group.length - 1) return;
                            const reorderedRole = reindexSortOrder(swapRows(group, groupIdx, groupIdx + 1));
                            const otherRole = selectedColors.filter((c) => c.role !== color.role);
                            setProductColors(selectedProductId, [...otherRole, ...reorderedRole]);
                            setColorBusy(true);
                            try {
                              await adminReorderColors(reorderedRole.map((c) => c.id));
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : "Failed to reorder colors");
                              await load();
                            } finally {
                              setColorBusy(false);
                            }
                          }}>Down</button>
                        <button className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive"
                          disabled={colorBusy}
                          onClick={async () => {
                            const roleGroup = selectedColors.filter((c) => c.role === color.role && c.id !== color.id);
                            const otherRole = selectedColors.filter((c) => c.role !== color.role);
                            const nextRole = reindexSortOrder(roleGroup);
                            setProductColors(selectedProductId, [...otherRole, ...nextRole]);
                            setColorBusy(true);
                            try {
                              await adminDeleteColor(color.id);
                              if (nextRole.length) {
                                await adminReorderColors(nextRole.map((c) => c.id));
                              }
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : "Failed to remove color");
                              await load();
                            } finally {
                              setColorBusy(false);
                            }
                          }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {selectedProductId && form.isBundle ? (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Bundle contents</h2>
                <button
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                  onClick={() =>
                    setBundleDraftItems((prev) => [
                      ...prev,
                      { key: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`, productId: "", qty: 1 },
                    ])
                  }
                >
                  + Add item
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose which products are included in this bundle and how many of each.
              </p>

              {!form.id ? (
                <p className="text-sm text-muted-foreground">
                  Save the bundle product first, then add items.
                </p>
              ) : null}

              <div className="space-y-2">
                {bundleDraftItems.map((it, idx) => (
                  <div key={it.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border border-border p-2">
                    <div className="md:col-span-7">
                      <select
                        className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                        value={it.productId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBundleDraftItems((prev) =>
                            prev.map((x) => (x.key === it.key ? { ...x, productId: v } : x))
                          );
                        }}
                      >
                        <option value="">Select product</option>
                        {bundleComponentOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                        value={it.qty}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value || 1));
                          setBundleDraftItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, qty } : x)));
                        }}
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-end gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded border"
                        disabled={idx === 0}
                        onClick={() => {
                          setBundleDraftItems((prev) => {
                            if (idx <= 0) return prev;
                            const next = [...prev];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            return next;
                          });
                        }}
                      >
                        Up
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border"
                        disabled={idx === bundleDraftItems.length - 1}
                        onClick={() => {
                          setBundleDraftItems((prev) => {
                            if (idx >= prev.length - 1) return prev;
                            const next = [...prev];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            return next;
                          });
                        }}
                      >
                        Down
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive"
                        onClick={() => setBundleDraftItems((prev) => prev.filter((x) => x.key !== it.key))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  disabled={busy || !form.id}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const items = bundleDraftItems
                        .map((it) => ({ productId: it.productId, qty: Math.max(1, Number(it.qty || 1)) }))
                        .filter((it) => Boolean(it.productId));
                      const res = await adminSetBundleItems({
                        bundleProductId: selectedProductId,
                        items,
                      });
                      const rows = (res?.items || []) as BundleItemRow[];
                      setBundleItems((prev) => [
                        ...prev.filter((bi) => bi.bundle_product_id !== selectedProductId),
                        ...rows,
                      ]);
                      await load();
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : "Failed to save bundle contents");
                      await load();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save bundle contents
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
          <AdminNav />

