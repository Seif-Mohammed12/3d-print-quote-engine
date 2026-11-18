import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/admin/api";
import {
  ADMIN_CATALOG_KEY,
  fetchAdminCatalogue,
  patchProduct,
  type AdminCatalogue,
  type AdminProduct,
  type InlineFields,
} from "@/lib/admin/catalogue";

export function useCatalogueQuery() {
  return useQuery({ queryKey: ADMIN_CATALOG_KEY, queryFn: fetchAdminCatalogue, staleTime: 60_000 });
}

/** Local cache helpers for the admin catalogue. */
export function useCatalogueCache() {
  const qc = useQueryClient();
  const update = useCallback(
    (updater: (prev: AdminCatalogue) => AdminCatalogue) =>
      qc.setQueryData<AdminCatalogue>(ADMIN_CATALOG_KEY, (prev) => (prev ? updater(prev) : prev)),
    [qc]
  );
  const get = useCallback(() => qc.getQueryData<AdminCatalogue>(ADMIN_CATALOG_KEY), [qc]);
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ADMIN_CATALOG_KEY }), [qc]);
  const upsertProduct = useCallback(
    (product: AdminProduct) =>
      update((prev) => {
        const exists = prev.products.some((p) => p.id === product.id);
        return {
          ...prev,
          products: exists ? prev.products.map((p) => (p.id === product.id ? { ...p, ...product } : p)) : [...prev.products, product],
        };
      }),
    [update]
  );
  return { update, get, refresh, upsertProduct };
}

const LABELS: Partial<Record<keyof InlineFields, string>> = {
  name: "Name",
  base_price: "Price",
  discount_price: "Sale price",
  discount_enabled: "Sale",
  stock_qty: "Stock",
  in_stock: "Stock status",
  is_published: "Visibility",
  category_id: "Category",
};

/**
 * Inline edits: the row changes at once, the server confirms, and a failure puts the old
 * values back. Rollback is reliable here (one row, values we hold), so success toasts offer Undo.
 * Saving state is tracked per product and field.
 */
export function useInlineProductEdit() {
  const cache = useCatalogueCache();
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const key = (id: string, fields: InlineFields) => `${id}:${Object.keys(fields).sort().join(",")}`;

  const apply = useCallback(
    async (product: AdminProduct, fields: InlineFields, opts: { undoable?: boolean; message?: string } = {}) => {
      const k = key(product.id, fields);
      const before = cache.get()?.products.find((p) => p.id === product.id) || product;
      const previous = Object.fromEntries(Object.keys(fields).map((f) => [f, before[f as keyof AdminProduct]])) as InlineFields;
      setSaving((s) => ({ ...s, [k]: true }));
      cache.upsertProduct({ ...before, ...fields } as AdminProduct);
      try {
        const res = await patchProduct(product.id, fields);
        cache.upsertProduct(res.product);
        const label = opts.message || `${LABELS[Object.keys(fields)[0] as keyof InlineFields] || "Change"} saved`;
        if (opts.undoable !== false) {
          toast.success(label, {
            description: res.product.name,
            action: {
              label: "Undo",
              onClick: async () => {
                try {
                  const back = await patchProduct(product.id, previous);
                  cache.upsertProduct(back.product);
                  toast.success("Undone");
                } catch (err) {
                  toast.error(errorMessage(err, "Couldn't undo"));
                }
              },
            },
          });
        }
        return true;
      } catch (err) {
        cache.upsertProduct(before);
        toast.error(`${product.name}: ${errorMessage(err, "not saved")}`);
        return false;
      } finally {
        setSaving((s) => {
          const next = { ...s };
          delete next[k];
          return next;
        });
      }
    },
    [cache]
  );

  const isSaving = (id: string, ...fields: Array<keyof InlineFields>) =>
    Object.keys(saving).some((k) => k.startsWith(`${id}:`) && fields.some((f) => k.split(":")[1].split(",").includes(f)));

  return { apply, isSaving };
}
