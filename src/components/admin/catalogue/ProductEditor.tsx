import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import DetailsTab from "@/components/admin/catalogue/DetailsTab";
import ColoursTab from "@/components/admin/catalogue/ColoursTab";
import MediaTab from "@/components/admin/catalogue/MediaTab";
import OptionsTab from "@/components/admin/catalogue/OptionsTab";
import BundleTab from "@/components/admin/catalogue/BundleTab";
import StorefrontPreview from "@/components/admin/catalogue/StorefrontPreview";
import { useCatalogueCache } from "@/components/admin/catalogue/useCatalogue";
import { errorMessage } from "@/lib/admin/api";
import { draftFromProduct, saveProduct, type AdminCatalogue, type ProductDraft } from "@/lib/admin/catalogue";

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export default function ProductEditor({
  productId,
  data,
  catalogueNo,
  canWrite,
  onClose,
}: {
  productId: string | null;
  data: AdminCatalogue;
  catalogueNo: string;
  canWrite: boolean;
  onClose: () => void;
}) {
  const cache = useCatalogueCache();
  const product = data.products.find((p) => p.id === productId) || null;
  const [draft, setDraft] = useState<ProductDraft | null>(product ? draftFromProduct(product) : null);
  const [slugTouched, setSlugTouched] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const [confirmClose, setConfirmClose] = useState(false);
  const [optionsDirty, setOptionsDirty] = useState(false);
  const [bundleDirty, setBundleDirty] = useState(false);

  // Load the product when the selection changes (not on every cache refresh, so edits survive).
  useEffect(() => {
    const p = data.products.find((x) => x.id === productId);
    setDraft(p ? draftFromProduct(p) : null);
    // A brand-new draft gets its slug from the name until the slug is edited by hand.
    setSlugTouched(Boolean(p && !(p.name === "Untitled product" || p.slug.startsWith("untitled-product"))));
    setTab("details");
    setOptionsDirty(false);
    setBundleDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const saved = useMemo(() => (product ? draftFromProduct(product) : null), [product]);
  const detailsDirty = Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved));
  const anyDirty = detailsDirty || optionsDirty || bundleDirty;

  const images = data.images.filter((i) => i.product_id === productId);
  const colours = data.colors.filter((c) => c.product_id === productId);
  const groups = data.optionGroups.filter((g) => g.product_id === productId);
  const groupIds = new Set(groups.map((g) => g.id));
  const values = data.optionValues.filter((v) => groupIds.has(v.group_id));
  const bundleItems = data.bundleItems.filter((b) => b.bundle_product_id === productId);
  const cover = images.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  const primaryHexes = colours.filter((c) => c.role === "primary").sort((a, b) => a.sort_order - b.sort_order).map((c) => c.hex);
  const categoryName = data.categories.find((c) => c.id === draft?.categoryId)?.name;

  const save = useCallback(async () => {
    if (!draft || !canWrite || saving) return;
    if (!draft.name.trim()) return toast.error("Give the product a name");
    if (draft.discountEnabled && (!(Number(draft.discountPrice) > 0) || Number(draft.discountPrice) >= draft.basePrice)) {
      return toast.error("Sale price must be above 0 and below the regular price");
    }
    setSaving(true);
    try {
      const res = await saveProduct(draft, { includeCategory: data.setup.categories });
      cache.upsertProduct(res.product);
      setDraft(draftFromProduct(res.product));
      setSlugTouched(true);
      toast.success(res.product.is_published ? "Saved" : "Saved as draft", { description: res.product.name });
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  }, [draft, canWrite, saving, data.setup.categories, cache]);

  // Cmd/Ctrl+S saves the details while the editor is open.
  useEffect(() => {
    if (!productId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (detailsDirty) void save();
        else if (optionsDirty || bundleDirty) toast.message("Use the Save button on the Options or Bundle tab");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [productId, detailsDirty, optionsDirty, bundleDirty, save]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!anyDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const requestClose = () => {
    if (anyDirty) setConfirmClose(true);
    else onClose();
  };

  const shortcut = isMac() ? "⌘S" : "Ctrl+S";
  const open = Boolean(productId && product && draft);

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && requestClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[min(1100px,100vw)]">
          {product && draft ? (
            <>
              <div className="border-b border-border px-5 pb-3 pt-4 pr-12">
                <SheetTitle className="truncate text-lg">{draft.name || "Untitled product"}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-x-3 text-xs">
                  <span className="num">{catalogueNo}</span>
                  <span className={product.is_published ? "text-emerald-300" : "text-amber-300"}>
                    {product.is_published ? "Published" : "Draft"}
                  </span>
                  {product.is_published ? (
                    <a href={`/products/${product.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-foreground">
                      View in shop <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </SheetDescription>
              </div>

              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 px-3">
                    {[
                      ["details", "Details", detailsDirty],
                      ["options", "Options", optionsDirty],
                      ["colours", "Colours", false],
                      ["media", "Media", false],
                      ...(draft.isBundle || product.is_bundle ? [["bundle", "Bundle", bundleDirty]] : []),
                    ].map(([value, label, dirty]) => (
                      <TabsTrigger
                        key={value as string}
                        value={value as string}
                        className="h-11 rounded-none border-b-2 border-transparent px-3 text-sm data-[state=active]:border-ink data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        {label as string}
                        {dirty ? <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-300" aria-label="unsaved" /> : null}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <TabsContent value="details" className="mt-0">
                      <DetailsTab
                        draft={draft}
                        onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                        slugTouched={slugTouched}
                        onSlugTouched={() => setSlugTouched(true)}
                        categories={data.categories}
                        categoriesEnabled={data.setup.categories}
                        readOnly={!canWrite}
                      />
                    </TabsContent>
                    <TabsContent value="options" className="mt-0" forceMount hidden={tab !== "options"}>
                      <OptionsTab
                        productId={product.id}
                        groups={groups}
                        values={values}
                        images={images}
                        enabled={data.setup.options}
                        readOnly={!canWrite}
                        basePrice={draft.basePrice}
                        onDirtyChange={setOptionsDirty}
                      />
                    </TabsContent>
                    <TabsContent value="colours" className="mt-0">
                      <ColoursTab productId={product.id} colours={colours} library={data.colorLibrary} libraryFlags={data.setup.colourLibrary} readOnly={!canWrite} />
                    </TabsContent>
                    <TabsContent value="media" className="mt-0">
                      <MediaTab
                        productId={product.id}
                        images={images}
                        colours={colours}
                        optionGroups={groups}
                        optionValues={values}
                        optionsEnabled={data.setup.options}
                        readOnly={!canWrite}
                      />
                    </TabsContent>
                    {draft.isBundle || product.is_bundle ? (
                      <TabsContent value="bundle" className="mt-0" forceMount hidden={tab !== "bundle"}>
                        <BundleTab
                          product={product}
                          items={bundleItems}
                          products={data.products}
                          readOnly={!canWrite}
                          savedAsBundle={Boolean(product.is_bundle)}
                          onDirtyChange={setBundleDirty}
                        />
                      </TabsContent>
                    ) : null}
                  </div>
                </Tabs>

                <aside className="hidden w-[300px] shrink-0 border-l border-border bg-background p-5 lg:block" aria-label="Preview">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Shop card preview</p>
                  <StorefrontPreview
                    name={draft.name}
                    short={draft.short}
                    categoryLabel={categoryName}
                    basePrice={draft.basePrice}
                    salePrice={draft.discountPrice}
                    saleOn={draft.discountEnabled}
                    image={cover}
                    colours={primaryHexes}
                    catalogueNo={catalogueNo}
                    isBundle={draft.isBundle}
                    isPublished={draft.isPublished}
                    outOfStock={!draft.inStock}
                  />
                </aside>
              </div>

              {canWrite ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground" aria-live="polite">
                    {detailsDirty ? (
                      <span className="text-amber-300">Unsaved changes to details</span>
                    ) : (
                      "Details saved"
                    )}
                    {!draft.isPublished ? " · stays a draft until you switch on “Visible in the shop”" : ""}
                  </p>
                  <button type="button" className="adm-btn" disabled={!detailsDirty || saving} onClick={() => saved && setDraft(saved)}>
                    Discard
                  </button>
                  <button type="button" className="adm-btn-primary" disabled={!detailsDirty || saving} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save"} <kbd className="hidden font-sans text-[11px] opacity-70 sm:inline">{shortcut}</kbd>
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes{[detailsDirty && "details", optionsDirty && "options", bundleDirty && "bundle contents"].filter(Boolean).length ? ` to ${[detailsDirty && "details", optionsDirty && "options", bundleDirty && "bundle contents"].filter(Boolean).join(", ")}` : ""}. They'll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onClose();
              }}
            >
              Discard and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
