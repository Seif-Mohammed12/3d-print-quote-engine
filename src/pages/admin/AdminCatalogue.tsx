import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Plus, RefreshCw, Search, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, ReadOnlyNotice, SetupNotice, SkeletonRows } from "@/components/admin/ui";
import ProductList, { type ProductRowData } from "@/components/admin/catalogue/ProductList";
import ProductEditor from "@/components/admin/catalogue/ProductEditor";
import { useCatalogueCache, useCatalogueQuery } from "@/components/admin/catalogue/useCatalogue";
import { useAdminPermissions } from "@/lib/admin/roles";
import { errorMessage } from "@/lib/admin/api";
import { applyColourToProducts } from "@/lib/admin/colours";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";
import {
  bulkProducts,
  createDraftProduct,
  deleteProduct,
  duplicateProduct,
  moveItem,
  reorderProducts,
  type AdminProduct,
  type BulkAction,
} from "@/lib/admin/catalogue";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "published" | "draft" | "out";
const VIEW_KEY = "admin-catalogue-view";

function readView(): "list" | "grid" {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export default function AdminCatalogue() {
  const { data, isPending, error, refetch, isRefetching } = useCatalogueQuery();
  const cache = useCatalogueCache();
  const { canWrite } = useAdminPermissions();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const category = params.get("category") || "all";
  const [view, setView] = useState<"list" | "grid">(readView);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<AdminProduct[] | null>(null);
  const [colourDialog, setColourDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);

  const openId = params.get("product");
  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* per-viewer convenience only */
    }
  }, [view]);

  const products = useMemo(() => (data?.products ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [data]);

  const rows: ProductRowData[] = useMemo(() => {
    if (!data) return [];
    const coverBy = new Map<string, string>();
    data.images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((i) => {
        if (!coverBy.has(i.product_id)) coverBy.set(i.product_id, i.image_url);
      });
    const published = products.filter((p) => p.is_published);
    return products.map((p) => {
      const idx = published.findIndex((x) => x.id === p.id);
      return {
        ...p,
        cover: coverBy.get(p.id),
        colours: data.colors.filter((c) => c.product_id === p.id && c.role === "primary").sort((a, b) => a.sort_order - b.sort_order).map((c) => c.hex),
        catalogueNo: idx >= 0 ? `3DP-${String(idx + 1).padStart(3, "0")}` : "Draft",
      };
    });
  }, [data, products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (q && !`${p.name} ${p.slug} ${p.short}`.toLowerCase().includes(q)) return false;
      if (status === "published" && !p.is_published) return false;
      if (status === "draft" && p.is_published) return false;
      if (status === "out" && p.in_stock) return false;
      if (category === "none" && p.category_id) return false;
      if (category !== "all" && category !== "none" && p.category_id !== category) return false;
      return true;
    });
  }, [rows, search, status, category]);

  const filtered = Boolean(search.trim()) || status !== "all" || category !== "all";

  // Drop selections that are no longer visible.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(visible.map((v) => v.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  async function newProduct() {
    if (creating.current) return;
    creating.current = true;
    try {
      const catId = category !== "all" && category !== "none" && data?.setup.categories ? category : undefined;
      const res = await createDraftProduct("Untitled product", catId ? { categoryId: catId } : {});
      cache.upsertProduct(res.product);
      setParam("product", res.product.id);
      toast.success("Draft created", { description: "It stays hidden from the shop until you publish it." });
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't create product"));
    } finally {
      creating.current = false;
    }
  }

  // ?new=1 (from the command palette) starts a draft once.
  useEffect(() => {
    if (params.get("new") === "1" && canWrite && data) {
      setParam("new", null);
      void newProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, canWrite, data]);

  async function duplicate(p: AdminProduct) {
    try {
      const res = await duplicateProduct(p.id);
      await cache.refresh();
      setParam("product", res.product.id);
      if (res.warnings.length) toast.warning(`Copied with ${res.warnings.length} problem(s)`, { description: res.warnings[0] });
      else toast.success(`Copied as “${res.product.name}”`, { description: "The copy is a draft." });
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't duplicate"));
    }
  }

  async function persistOrder(next: AdminProduct[]) {
    const before = data?.products ?? [];
    const numbered = next.map((p, i) => ({ ...p, sort_order: i }));
    cache.update((prev) => ({ ...prev, products: numbered }));
    try {
      await reorderProducts(numbered.map((p) => p.id));
    } catch (err) {
      cache.update((prev) => ({ ...prev, products: before }));
      toast.error(errorMessage(err, "Couldn't save the new order"));
    }
  }

  const onMove = (fromId: string, toId: string) => {
    const from = products.findIndex((p) => p.id === fromId);
    const to = products.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    void persistOrder(moveItem(products, from, to));
  };
  const onMoveBy = (id: string, delta: number) => {
    const from = products.findIndex((p) => p.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= products.length) return;
    void persistOrder(moveItem(products, from, to));
  };

  async function runBulk(action: BulkAction, categoryId?: string | null) {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await bulkProducts(ids, action, categoryId);
      if (action === "delete") {
        cache.update((prev) => ({ ...prev, products: prev.products.filter((p) => !res.done.includes(p.id)) }));
      } else {
        const patch: Partial<AdminProduct> =
          action === "publish" ? { is_published: true }
          : action === "unpublish" ? { is_published: false }
          : action === "in_stock" ? { in_stock: true }
          : action === "out_of_stock" ? { in_stock: false }
          : { category_id: categoryId ?? null };
        cache.update((prev) => ({ ...prev, products: prev.products.map((p) => (res.done.includes(p.id) ? { ...p, ...patch } : p)) }));
      }
      if (res.done.length) toast.success(`${res.done.length} product(s) updated`);
      if (res.failed.length) toast.error(`${res.failed.length} not changed: ${res.failed[0].error}`);
      setSelected(new Set(res.failed.map((f) => f.id)));
    } catch (err) {
      toast.error(errorMessage(err, "Bulk action failed"));
    } finally {
      setBusy(false);
    }
  }

  const openProduct = rows.find((r) => r.id === openId);

  return (
    <AdminShell
      title="Catalogue"
      wide
      description="Products as the shop shows them. Drafts stay hidden until published."
      actions={
        <>
          <button type="button" className="adm-btn" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} aria-hidden="true" /> Refresh
          </button>
          {canWrite ? (
            <button type="button" className="adm-btn-primary" onClick={newProduct}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New product
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {!canWrite ? <ReadOnlyNotice /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}
        {data && (!data.setup.categories || !data.setup.options || !data.setup.colourLibrary) ? (
          <SetupNotice title="Some catalogue features are waiting on a database update" migration={WORKSPACE_MIGRATION}>
            Missing: {[!data.setup.categories && "categories", !data.setup.options && "product options", !data.setup.colourLibrary && "colour stock flags"].filter(Boolean).join(", ")}.
            Everything else works now.
          </SetupNotice>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search name or slug"
              className="adm-input pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {data?.setup.categories ? (
            <select aria-label="Category" className="adm-input w-auto" value={category} onChange={(e) => setParam("category", e.target.value === "all" ? null : e.target.value)}>
              <option value="all">All categories</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">No category</option>
            </select>
          ) : null}
          <select aria-label="Status" className="adm-input w-auto" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="out">Marked out of stock</option>
          </select>
          {filtered ? (
            <button
              type="button"
              className="adm-btn-ghost"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setParam("category", null);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Clear
            </button>
          ) : null}
          <span className="flex-1" />
          <div role="group" aria-label="View" className="flex border border-border">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("adm-icon-btn h-10 w-10", view === "list" && "bg-accent text-foreground")} aria-label="List view">
              <List className="h-4 w-4" />
            </button>
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={cn("adm-icon-btn h-10 w-10", view === "grid" && "bg-accent text-foreground")} aria-label="Shop grid view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isPending ? "Loading…" : `${visible.length} of ${rows.length} products`}
          {canWrite && !isPending ? (filtered ? " · clear search and filters to reorder" : " · drag the handle, or focus it and use arrow keys, to reorder the shop") : ""}
        </p>

        {selected.size > 0 && canWrite ? (
          <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border border-ink/50 bg-card px-3 py-2 lg:top-2" role="region" aria-label="Bulk actions">
            <span className="num text-sm font-semibold">{selected.size} selected</span>
            <button type="button" className="adm-btn h-9" disabled={busy} onClick={() => runBulk("publish")}>Publish</button>
            <button type="button" className="adm-btn h-9" disabled={busy} onClick={() => runBulk("unpublish")}>Move to drafts</button>
            <button type="button" className="adm-btn h-9" disabled={busy} onClick={() => runBulk("out_of_stock")}>Mark out of stock</button>
            <button type="button" className="adm-btn h-9" disabled={busy} onClick={() => runBulk("in_stock")}>Mark in stock</button>
            {data?.setup.categories ? (
              <select
                aria-label="Set category for selected"
                className="adm-input h-9 w-auto"
                disabled={busy}
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  void runBulk("set_category", e.target.value === "none" ? null : e.target.value);
                }}
              >
                <option value="">Set category…</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="none">No category</option>
              </select>
            ) : null}
            <button type="button" className="adm-btn h-9" disabled={busy} onClick={() => setColourDialog(true)}>Apply colour…</button>
            <button type="button" className="adm-btn-danger h-9" disabled={busy} onClick={() => setConfirmDelete(products.filter((p) => selected.has(p.id)))}>Delete…</button>
            <span className="flex-1" />
            <button type="button" className="adm-btn-ghost h-9" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        ) : null}

        {isPending ? (
          <div className="border border-border bg-card"><SkeletonRows rows={6} /></div>
        ) : !data ? null : rows.length === 0 ? (
          <div className="border border-border bg-card">
            <EmptyState title="No products yet" action={canWrite ? <button className="adm-btn-primary" onClick={newProduct}>Create the first product</button> : undefined}>
              New products start as drafts.
            </EmptyState>
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-border bg-card"><EmptyState title="No products match">Try another search or filter.</EmptyState></div>
        ) : (
          <ProductList
            rows={visible}
            view={view}
            categories={data.categories}
            categoriesEnabled={data.setup.categories}
            canWrite={canWrite}
            canReorder={!filtered}
            selected={selected}
            onToggleSelect={(id) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAll={() => setSelected((prev) => (visible.every((v) => prev.has(v.id)) ? new Set() : new Set(visible.map((v) => v.id))))}
            onOpen={(id) => setParam("product", id)}
            onDuplicate={duplicate}
            onDelete={(p) => setConfirmDelete([p])}
            onMove={onMove}
            onMoveBy={onMoveBy}
          />
        )}
      </div>

      {data ? (
        <ProductEditor
          productId={openId}
          data={data}
          catalogueNo={openProduct?.catalogueNo || "Draft"}
          canWrite={canWrite}
          onClose={() => setParam("product", null)}
        />
      ) : null}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.length === 1 ? `Delete “${confirmDelete[0].name}”?` : `Delete ${confirmDelete?.length} products?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their photos, colours and options are deleted too. Past orders keep their item names. This can't be undone; move a product to
              drafts instead if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const list = confirmDelete || [];
                setConfirmDelete(null);
                if (list.length === 1 && !selected.has(list[0].id)) {
                  try {
                    await deleteProduct(list[0].id);
                    cache.update((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== list[0].id) }));
                    if (openId === list[0].id) setParam("product", null);
                    toast.success(`Deleted ${list[0].name}`);
                  } catch (err) {
                    toast.error(errorMessage(err, "Couldn't delete"));
                  }
                } else {
                  await runBulk("delete");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {data ? (
        <ApplyColourDialog
          open={colourDialog}
          onOpenChange={setColourDialog}
          library={data.colorLibrary.filter((c) => !c.is_archived)}
          count={selected.size}
          onApply={async (colorId, role) => {
            try {
              const res = await applyColourToProducts(colorId, role, [...selected]);
              await cache.refresh();
              toast.success(`Added to ${res.added.length} product(s)${res.skipped.length ? `, ${res.skipped.length} already had it` : ""}`);
              setColourDialog(false);
            } catch (err) {
              toast.error(errorMessage(err, "Couldn't apply colour"));
            }
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function ApplyColourDialog({
  open,
  onOpenChange,
  library,
  count,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  library: Array<{ id: string; color_id: string; name: string; hex: string }>;
  count: number;
  onApply: (colorId: string, role: "primary" | "secondary") => Promise<void>;
}) {
  const [colorId, setColorId] = useState("");
  const [role, setRole] = useState<"primary" | "secondary">("primary");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply a colour to {count} product(s)</DialogTitle>
          <DialogDescription>Adds a library colour to each selected product. Products that already have it are left as they are.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <fieldset>
            <legend className="adm-label">Colour</legend>
            <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
              {library.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={colorId === c.color_id}
                  onClick={() => setColorId(c.color_id)}
                  className={cn("inline-flex h-9 items-center gap-2 border px-2 text-xs coarse:h-11", colorId === c.color_id ? "border-foreground bg-accent" : "border-border")}
                >
                  <span className="h-4 w-4 border border-white/20" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                  {c.name}
                </button>
              ))}
              {!library.length ? <p className="text-sm text-muted-foreground">The colour library is empty.</p> : null}
            </div>
          </fieldset>
          <div>
            <label htmlFor="apply-role" className="adm-label">As</label>
            <select id="apply-role" className="adm-input" value={role} onChange={(e) => setRole(e.target.value as "primary" | "secondary")}>
              <option value="primary">Main colour</option>
              <option value="secondary">Accent colour</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="adm-btn" onClick={() => onOpenChange(false)}>Cancel</button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={!colorId || busy}
              onClick={async () => {
                setBusy(true);
                await onApply(colorId, role);
                setBusy(false);
              }}
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
