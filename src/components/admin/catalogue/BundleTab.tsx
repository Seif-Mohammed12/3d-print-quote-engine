import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminSetBundleItems } from "@/lib/products-api";
import { errorMessage } from "@/lib/admin/api";
import { moveItem, type AdminProduct, type BundleItem } from "@/lib/admin/catalogue";
import { useCatalogueCache } from "@/components/admin/catalogue/useCatalogue";

type Line = { key: string; productId: string; qty: number };

export default function BundleTab({
  product,
  items,
  products,
  readOnly,
  savedAsBundle,
  onDirtyChange,
}: {
  product: AdminProduct;
  items: BundleItem[];
  products: AdminProduct[];
  readOnly: boolean;
  /** The bundle switch must be saved before contents can be stored. */
  savedAsBundle: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const cache = useCatalogueCache();
  const initialJson = JSON.stringify(
    items.slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ key: i.id, productId: i.component_product_id, qty: i.qty }))
  );
  const initial = useMemo<Line[]>(() => JSON.parse(initialJson), [initialJson]);
  const [lines, setLines] = useState<Line[]>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(lines.map(({ productId, qty }) => ({ productId, qty }))) !== JSON.stringify(initial.map(({ productId, qty }) => ({ productId, qty })));

  useEffect(() => setLines(initial), [initial]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const choices = products.filter((p) => p.id !== product.id && !p.is_bundle).sort((a, b) => a.sort_order - b.sort_order);

  async function save() {
    const clean = lines.filter((l) => l.productId);
    const ids = clean.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) return toast.error("Each product can only appear once; raise its quantity instead.");
    setSaving(true);
    try {
      const res = await adminSetBundleItems({ bundleProductId: product.id, items: clean.map((l) => ({ productId: l.productId, qty: Math.max(1, l.qty) })) });
      cache.update((prev) => ({
        ...prev,
        bundleItems: [...prev.bundleItems.filter((b) => b.bundle_product_id !== product.id), ...((res.items || []) as unknown as BundleItem[])],
      }));
      toast.success("Bundle contents saved");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save bundle"));
    } finally {
      setSaving(false);
    }
  }

  if (!savedAsBundle) {
    return <p className="text-sm text-muted-foreground">Switch on “This is a bundle” on the Details tab and save, then choose what's inside here.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">What a customer gets in this bundle. The bundle's own price is set on the Details tab.</p>
      <fieldset disabled={readOnly || saving} className="space-y-2">
        {lines.map((l, i) => (
          <div key={l.key} className="flex flex-wrap items-center gap-2">
            <select
              aria-label={`Bundle item ${i + 1}`}
              className="adm-input min-w-48 flex-1"
              value={l.productId}
              onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, productId: e.target.value } : x)))}
            >
              <option value="">Choose a product</option>
              {choices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_published ? "" : " (draft)"}
                </option>
              ))}
            </select>
            <input
              aria-label={`Quantity of bundle item ${i + 1}`}
              type="number"
              min={1}
              step={1}
              className="adm-input num w-20"
              value={l.qty}
              onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, Math.trunc(Number(e.target.value) || 1)) } : x)))}
            />
            <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => setLines((ls) => moveItem(ls, i, i - 1))} aria-label="Move up">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" className="adm-icon-btn" disabled={i === lines.length - 1} onClick={() => setLines((ls) => moveItem(ls, i, i + 1))} aria-label="Move down">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" className="adm-icon-btn hover:text-destructive" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove item">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </fieldset>
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="adm-btn" onClick={() => setLines((ls) => [...ls, { key: `new-${Date.now()}`, productId: "", qty: 1 }])}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add item
          </button>
          <span className="flex-1" />
          {dirty ? <span className="text-xs text-amber-300">Unsaved bundle changes</span> : null}
          <button type="button" className="adm-btn-primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save contents"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
