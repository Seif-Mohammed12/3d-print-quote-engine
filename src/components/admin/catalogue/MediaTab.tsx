import { useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
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
import { adminDeleteImage, adminReorderImages, adminSetImageColor, adminUploadImage } from "@/lib/products-api";
import { errorMessage } from "@/lib/admin/api";
import { setImageOptionValue } from "@/lib/admin/options";
import { moveItem, type AdminImage, type AdminProductColor, type OptionGroup, type OptionValue } from "@/lib/admin/catalogue";
import { useCatalogueCache } from "@/components/admin/catalogue/useCatalogue";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const MAX_BYTES = 8 * 1024 * 1024;

export default function MediaTab({
  productId,
  images,
  colours,
  optionGroups,
  optionValues,
  optionsEnabled,
  readOnly,
}: {
  productId: string;
  images: AdminImage[];
  colours: AdminProductColor[];
  optionGroups: OptionGroup[];
  optionValues: OptionValue[];
  optionsEnabled: boolean;
  readOnly: boolean;
}) {
  const cache = useCatalogueCache();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminImage | null>(null);

  const sorted = images.slice().sort((a, b) => a.sort_order - b.sort_order);
  const primaryColours = colours.filter((c) => c.role === "primary").sort((a, b) => a.sort_order - b.sort_order);
  const twoTone = colours.some((c) => c.role === "secondary");
  const valuesByGroup = optionGroups.map((g) => ({ group: g, values: optionValues.filter((v) => v.group_id === g.id) }));

  const setImages = (rows: AdminImage[]) =>
    cache.update((prev) => ({ ...prev, images: [...prev.images.filter((i) => i.product_id !== productId), ...rows] }));

  async function upload(files: File[]) {
    const ok = files.filter((f) => f.size > 0 && f.size <= MAX_BYTES);
    const tooBig = files.length - ok.length;
    if (tooBig) toast.error(`${tooBig} file(s) skipped: photos must be under 8 MB.`);
    if (!ok.length) return;
    setUploading({ done: 0, total: ok.length });
    let current = sorted;
    // One at a time, so the server assigns sort order without races.
    for (const [i, file] of ok.entries()) {
      try {
        const res = await adminUploadImage(productId, file);
        if (res?.image) {
          current = [...current, res.image as AdminImage];
          setImages(current);
        }
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err, "upload failed")}`);
      }
      setUploading({ done: i + 1, total: ok.length });
    }
    setUploading(null);
    // Normalise order (server numbers new photos after the last one).
    const ids = current.map((img) => img.id);
    if (ids.length) {
      setImages(current.map((img, idx) => ({ ...img, sort_order: idx })));
      await adminReorderImages(ids).catch(() => undefined);
    }
  }

  async function reorder(next: AdminImage[]) {
    const before = sorted;
    const numbered = next.map((img, i) => ({ ...img, sort_order: i }));
    setImages(numbered);
    try {
      await adminReorderImages(numbered.map((i) => i.id));
    } catch (err) {
      setImages(before);
      toast.error(errorMessage(err, "Couldn't reorder photos"));
    }
  }

  async function tagColour(img: AdminImage, colorId: string | null) {
    const before = sorted;
    setImages(sorted.map((r) => (r.id === img.id ? { ...r, color_id: colorId } : r)));
    setBusyId(img.id);
    try {
      await adminSetImageColor(img.id, colorId);
    } catch (err) {
      setImages(before);
      toast.error(errorMessage(err, "Couldn't tag photo"));
    } finally {
      setBusyId(null);
    }
  }

  async function tagOption(img: AdminImage, valueId: string | null) {
    const before = sorted;
    setImages(sorted.map((r) => (r.id === img.id ? { ...r, option_value_id: valueId } : r)));
    setBusyId(img.id);
    try {
      await setImageOptionValue(img.id, valueId);
    } catch (err) {
      setImages(before);
      toast.error(errorMessage(err, "Couldn't link photo to option"));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(img: AdminImage) {
    const before = sorted;
    const rest = sorted.filter((i) => i.id !== img.id).map((r, i) => ({ ...r, sort_order: i }));
    setImages(rest);
    try {
      await adminDeleteImage(img.id);
      if (rest.length) await adminReorderImages(rest.map((i) => i.id));
      toast.success("Photo deleted");
    } catch (err) {
      setImages(before);
      toast.error(errorMessage(err, "Couldn't delete photo"));
    }
  }

  const onDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const from = sorted.findIndex((i) => i.id === dragId);
    const to = sorted.findIndex((i) => i.id === targetId);
    setDragId(null);
    if (from >= 0 && to >= 0) void reorder(moveItem(sorted, from, to));
  };

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            void upload(Array.from(e.dataTransfer.files));
          }}
          className="flex flex-wrap items-center gap-3 border border-dashed border-rule px-4 py-4"
        >
          <button type="button" className="adm-btn" disabled={Boolean(uploading)} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Add photos"}
          </button>
          <p className="text-xs text-muted-foreground">Or drop files here. JPEG, PNG, WebP, AVIF or GIF, up to 8 MB each.</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              void upload(files);
            }}
          />
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet. The first photo is the cover on shop cards.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            The first photo is the cover. Drag to reorder, or use the arrows.
            {twoTone
              ? " Colour tags only switch photos on single-colour products, so this two-tone product shows every photo."
              : " Tag a photo with the colour it shows and the shop switches to it when that colour is picked; leave general shots on Any colour."}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sorted.map((img, idx) => (
              <li
                key={img.id}
                draggable={!readOnly}
                onDragStart={() => setDragId(img.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, img.id)}
                className={cn("border border-border bg-background", dragId === img.id && "opacity-40")}
              >
                <div className="relative aspect-square bg-black">
                  <img src={img.image_url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                  {idx === 0 ? <span className="absolute left-1.5 top-1.5 bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold">Cover</span> : null}
                  {busyId === img.id ? <Loader2 className="absolute right-1.5 top-1.5 h-4 w-4 animate-spin" aria-label="Saving" /> : null}
                </div>
                <div className="space-y-1.5 p-2">
                  {primaryColours.length ? (
                    <select
                      aria-label={`Colour shown in photo ${idx + 1}`}
                      className="adm-input h-8 text-xs coarse:h-10"
                      disabled={readOnly}
                      value={img.color_id ?? ""}
                      onChange={(e) => tagColour(img, e.target.value || null)}
                    >
                      <option value="">Any colour</option>
                      {primaryColours.map((c) => (
                        <option key={c.id} value={c.color_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {optionsEnabled && valuesByGroup.some((g) => g.values.length) ? (
                    <select
                      aria-label={`Option shown in photo ${idx + 1}`}
                      className="adm-input h-8 text-xs coarse:h-10"
                      disabled={readOnly}
                      value={img.option_value_id ?? ""}
                      onChange={(e) => tagOption(img, e.target.value || null)}
                    >
                      <option value="">Any option</option>
                      {valuesByGroup.map(({ group, values }) =>
                        values.length ? (
                          <optgroup key={group.id} label={group.name}>
                            {values.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null
                      )}
                    </select>
                  ) : null}
                  {!readOnly ? (
                    <div className="flex items-center justify-between">
                      <div className="flex">
                        <button type="button" className="adm-icon-btn h-8 w-8" disabled={idx === 0} onClick={() => reorder(moveItem(sorted, idx, idx - 1))} aria-label={`Move photo ${idx + 1} earlier`}>
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <button type="button" className="adm-icon-btn h-8 w-8" disabled={idx === sorted.length - 1} onClick={() => reorder(moveItem(sorted, idx, idx + 1))} aria-label={`Move photo ${idx + 1} later`}>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button type="button" className="adm-icon-btn h-8 w-8" disabled={idx === 0} onClick={() => reorder(moveItem(sorted, idx, 0))} aria-label={`Make photo ${idx + 1} the cover`} title="Make cover">
                          <Star className="h-4 w-4" />
                        </button>
                      </div>
                      <button type="button" className="adm-icon-btn h-8 w-8 hover:text-destructive" onClick={() => setConfirmDelete(img)} aria-label={`Delete photo ${idx + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>The file is removed from storage. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) void remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
