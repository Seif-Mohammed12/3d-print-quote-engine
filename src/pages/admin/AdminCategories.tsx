import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, ReadOnlyNotice, SetupNotice, SkeletonRows } from "@/components/admin/ui";
import InlineCell from "@/components/admin/catalogue/InlineCell";
import { useCatalogueCache, useCatalogueQuery } from "@/components/admin/catalogue/useCatalogue";
import { useAdminPermissions } from "@/lib/admin/roles";
import { adminPost, errorMessage } from "@/lib/admin/api";
import { moveItem, type Category } from "@/lib/admin/catalogue";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";

export default function AdminCategories() {
  const { data, isPending, error, refetch, isRefetching } = useCatalogueQuery();
  const cache = useCatalogueCache();
  const { canWrite } = useAdminPermissions();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ category: Category; count: number } | null>(null);

  const categories = useMemo(() => (data?.categories ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [data]);
  const counts = useMemo(() => {
    const m = new Map<string, { total: number; live: number }>();
    for (const p of data?.products ?? []) {
      if (!p.category_id) continue;
      const c = m.get(p.category_id) || { total: 0, live: 0 };
      c.total += 1;
      if (p.is_published) c.live += 1;
      m.set(p.category_id, c);
    }
    return m;
  }, [data]);
  const uncategorised = (data?.products ?? []).filter((p) => !p.category_id).length;

  const setCategories = (rows: Category[]) => cache.update((prev) => ({ ...prev, categories: rows }));

  async function rename(cat: Category, newName: string) {
    try {
      const res = await adminPost<{ category: Category }>("/api/admin-categories-save", { id: cat.id, name: newName });
      setCategories(categories.map((c) => (c.id === cat.id ? res.category : c)));
      toast.success("Renamed", { description: `Shop link: /products?category=${res.category.slug}` });
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't rename"));
      return false;
    }
  }

  async function reorder(next: Category[]) {
    const before = categories;
    const numbered = next.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(numbered);
    try {
      await adminPost("/api/admin-categories-reorder", { ids: numbered.map((c) => c.id) });
    } catch (err) {
      setCategories(before);
      toast.error(errorMessage(err, "Couldn't reorder"));
    }
  }

  return (
    <AdminShell title="Categories" description="How the shop groups products. Shop filters follow this order.">
      <div className="max-w-3xl space-y-4">
        {!canWrite ? <ReadOnlyNotice /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}
        {data && !data.setup.categories ? (
          <SetupNotice title="Categories aren't set up yet" migration={WORKSPACE_MIGRATION}>
            The migration creates categories for the two existing shelves and links current products to them, so nothing in the shop moves.
          </SetupNotice>
        ) : null}

        {data?.setup.categories ? (
          <>
            {canWrite ? (
              <form
                className="flex flex-wrap items-end gap-2 border border-border bg-card p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!name.trim()) return toast.error("Give the category a name");
                  setBusy(true);
                  try {
                    const res = await adminPost<{ category: Category }>("/api/admin-categories-save", { name: name.trim() });
                    setCategories([...categories, res.category]);
                    setName("");
                    toast.success(`Added ${res.category.name}`);
                  } catch (err) {
                    toast.error(errorMessage(err, "Couldn't add category"));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="min-w-48 flex-1">
                  <label htmlFor="new-cat" className="adm-label">New category</label>
                  <input id="new-cat" className="adm-input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <button type="submit" className="adm-btn-primary" disabled={busy}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add
                </button>
              </form>
            ) : null}

            <div className="border border-border bg-card">
              {isPending ? (
                <SkeletonRows rows={3} />
              ) : categories.length === 0 ? (
                <EmptyState title="No categories">Products without a category still show under “All” in the shop.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {categories.map((c, i) => {
                    const n = counts.get(c.id) || { total: 0, live: 0 };
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 px-2 py-2">
                        <div className="min-w-0 flex-1 basis-48">
                          <InlineCell label="Category name" value={c.name} disabled={!canWrite} onCommit={(v) => rename(c, String(v))} className="font-medium" />
                          <p className="num px-2 text-xs text-muted-foreground">/products?category={c.slug}</p>
                        </div>
                        <Link to={`/admin/catalogue?category=${c.id}`} className="num px-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
                          {n.total} product{n.total === 1 ? "" : "s"} · {n.live} live
                        </Link>
                        {canWrite ? (
                          <div className="flex">
                            <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => reorder(moveItem(categories, i, i - 1))} aria-label={`Move ${c.name} up`}>
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" className="adm-icon-btn" disabled={i === categories.length - 1} onClick={() => reorder(moveItem(categories, i, i + 1))} aria-label={`Move ${c.name} down`}>
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button type="button" className="adm-icon-btn hover:text-destructive" onClick={() => setConfirm({ category: c, count: n.total })} aria-label={`Delete ${c.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {uncategorised} product{uncategorised === 1 ? "" : "s"} without a category.{" "}
              {uncategorised ? (
                <Link to="/admin/catalogue?category=none" className="underline">
                  Assign them
                </Link>
              ) : null}
            </p>
          </>
        ) : null}
      </div>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirm?.category.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.count
                ? `${confirm.count} product${confirm.count === 1 ? "" : "s"} will lose this category. They stay in the shop under “All” until you give them another one.`
                : "No products use this category."}{" "}
              Old links to /products?category={confirm?.category.slug} will show all products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirm) return;
                const { category, count } = confirm;
                setConfirm(null);
                try {
                  await adminPost("/api/admin-categories-delete", { id: category.id, expectedProductCount: count });
                  cache.update((prev) => ({
                    ...prev,
                    categories: prev.categories.filter((c) => c.id !== category.id),
                    products: prev.products.map((p) => (p.category_id === category.id ? { ...p, category_id: null } : p)),
                  }));
                  toast.success(`Deleted ${category.name}`);
                } catch (err) {
                  toast.error(errorMessage(err, "Couldn't delete"));
                  await cache.refresh();
                }
              }}
            >
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
