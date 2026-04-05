import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import {
  adminDeleteColor,
  adminDeleteImage,
  adminDeleteProduct,
  adminFetchCatalog,
  adminReorderColors,
  adminReorderImages,
  adminUploadImages,
  adminUpsertColor,
  adminUpsertProduct,
} from "@/lib/products-api";

type Brand = "pforge" | "printique";
type ProductRow = {
  id: string;
  brand: Brand;
  slug: string;
  name: string;
  short: string;
  description: string;
  base_price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  stock_qty: number;
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
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

const emptyProduct = {
  id: "",
  brand: "pforge" as Brand,
  slug: "",
  name: "",
  short: "",
  description: "",
  basePrice: 0,
  discountEnabled: false,
  discountPrice: 0,
  stockQty: 0,
  inStock: true,
  isPublished: false,
  sortOrder: 0,
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [colorLibrary, setColorLibrary] = useState<ColorLibraryRow[]>([]);
  const [colorLibraryPick, setColorLibraryPick] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState(emptyProduct);
  const [colorDraft, setColorDraft] = useState({ role: "primary" as "primary" | "secondary", colorId: "", name: "", hex: "#000000" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetchCatalog();
      setProducts(data.products || []);
      setImages(data.images || []);
      setColors(data.colors || []);
      setColorLibrary(data.colorLibrary || []);
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
      basePrice: Number(selectedProduct.base_price || 0),
      discountEnabled: Boolean(selectedProduct.discount_enabled),
      discountPrice: Number(selectedProduct.discount_price || 0),
      stockQty: Number(selectedProduct.stock_qty || 0),
      inStock: Boolean(selectedProduct.in_stock),
      isPublished: Boolean(selectedProduct.is_published),
      sortOrder: Number(selectedProduct.sort_order || 0),
    });
  }, [selectedProductId, selectedProduct]);

  const colorDraftHex = useMemo(() => {
    const candidate = (colorDraft.hex || "").trim();
    const validShort = /^#([0-9a-fA-F]{3})$/.test(candidate);
    const validLong = /^#([0-9a-fA-F]{6})$/.test(candidate);
    return validShort || validLong ? candidate : "#000000";
  }, [colorDraft.hex]);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
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
                <button
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs"
                  onClick={() => {
                    setSelectedProductId("");
                    setForm({ ...emptyProduct });
                  }}
                >
                  + New
                </button>
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
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL id)</label>
                  <input className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="dualsense-display-stand"
                    value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
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
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Short Line</label>
                  <input className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="Clean desk, hero setup."
                    value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Base Price (EGP)</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="550"
                    value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount Price (EGP)</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="480"
                    value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Display Order</label>
                  <input type="number" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm" placeholder="0"
                    value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Lower number shows first on the brand page.
                  </p>
                </div>
              </div>
              <textarea className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm min-h-24" placeholder="Description"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.discountEnabled} onChange={(e) => setForm({ ...form, discountEnabled: e.target.checked })} /> Discount enabled</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
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
                        basePrice: form.basePrice,
                        discountEnabled: form.discountEnabled,
                        discountPrice: form.discountPrice,
                        stockQty: form.stockQty,
                        inStock: form.inStock,
                        isPublished: form.isPublished,
                        sortOrder: form.sortOrder,
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
                    disabled={busy}
                    className="block w-full max-w-md text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
                    onChange={async (e) => {
                      const list = e.target.files;
                      if (!list?.length) return;
                      const files = Array.from(list).filter((f) => f.size > 0);
                      e.target.value = "";
                      if (!files.length) return;
                      setBusy(true);
                      setError("");
                      try {
                        await adminUploadImages(selectedProductId, files);
                        await load();
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Upload failed");
                      } finally {
                        setBusy(false);
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
                        onClick={async () => {
                          if (idx === 0) return;
                          const ids = selectedImages.map((i) => i.id);
                          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                          await adminReorderImages(ids);
                          await load();
                        }}>Up</button>
                      <button className="text-xs px-2 py-1 rounded border"
                        onClick={async () => {
                          if (idx === selectedImages.length - 1) return;
                          const ids = selectedImages.map((i) => i.id);
                          [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                          await adminReorderImages(ids);
                          await load();
                        }}>Down</button>
                      <button className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive"
                        onClick={async () => {
                          await adminDeleteImage(img.id);
                          await load();
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
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminUpsertColor({
                        productId: selectedProductId,
                        role: colorDraft.role,
                        colorId: colorDraft.colorId,
                        name: colorDraft.name,
                        hex: colorDraft.hex,
                        sortOrder: selectedColors.length,
                      });
                      setColorLibraryPick("");
                      setColorDraft({ role: colorDraft.role, colorId: "", name: "", hex: "#000000" });
                      await load();
                    } finally {
                      setBusy(false);
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
                          onClick={async () => {
                            const group = selectedColors.filter((c) => c.role === color.role);
                            const groupIdx = group.findIndex((c) => c.id === color.id);
                            if (groupIdx <= 0) return;
                            const ids = [...group.map((c) => c.id)];
                            [ids[groupIdx - 1], ids[groupIdx]] = [ids[groupIdx], ids[groupIdx - 1]];
                            await adminReorderColors(ids);
                            await load();
                          }}>Up</button>
                        <button className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive"
                          onClick={async () => {
                            await adminDeleteColor(color.id);
                            await load();
                          }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}

