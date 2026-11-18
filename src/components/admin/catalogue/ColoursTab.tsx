import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteColor, adminReorderColors, adminUpsertColor } from "@/lib/products-api";
import { errorMessage } from "@/lib/admin/api";
import { saveLibraryColour } from "@/lib/admin/colours";
import { moveItem, slugify, type AdminProductColor, type LibraryColor } from "@/lib/admin/catalogue";
import { useCatalogueCache } from "@/components/admin/catalogue/useCatalogue";
import { cn } from "@/lib/utils";

type Role = "primary" | "secondary";

const ROLE_COPY: Record<Role, { title: string; hint: string }> = {
  primary: { title: "Main colours", hint: "The colour the customer picks first. One-colour products only use this." },
  secondary: { title: "Accent colours", hint: "Optional second colour for two-tone prints. Leave empty for single-colour products." },
};

function Swatch({ hex, className }: { hex: string; className?: string }) {
  return <span className={cn("h-5 w-5 shrink-0 border border-white/20", className)} style={{ backgroundColor: hex }} aria-hidden="true" />;
}

export default function ColoursTab({
  productId,
  colours,
  library,
  libraryFlags,
  readOnly,
}: {
  productId: string;
  colours: AdminProductColor[];
  library: LibraryColor[];
  libraryFlags: boolean;
  readOnly: boolean;
}) {
  const cache = useCatalogueCache();
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<{ role: Role; name: string; hex: string }>({ role: "primary", name: "", hex: "#888888" });

  const byRole = (role: Role) => colours.filter((c) => c.role === role).sort((a, b) => a.sort_order - b.sort_order);
  const libraryById = useMemo(() => new Map(library.map((l) => [l.color_id, l])), [library]);

  const setProductColours = (rows: AdminProductColor[]) =>
    cache.update((prev) => ({ ...prev, colors: [...prev.colors.filter((c) => c.product_id !== productId), ...rows] }));

  async function add(role: Role, entry: { colorId: string; name: string; hex: string }, saveToLibrary: boolean) {
    const group = byRole(role);
    if (group.some((c) => c.color_id === entry.colorId)) {
      toast.message(`${entry.name} is already a ${role === "primary" ? "main" : "accent"} colour`);
      return;
    }
    setBusy(true);
    try {
      const res = await adminUpsertColor({ productId, role, ...entry, sortOrder: group.length, saveToLibrary });
      setProductColours([...colours, res.color as unknown as AdminProductColor]);
      if (saveToLibrary && !libraryById.has(entry.colorId)) await cache.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add colour"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(colour: AdminProductColor) {
    const rest = byRole(colour.role).filter((c) => c.id !== colour.id).map((c, i) => ({ ...c, sort_order: i }));
    const before = colours;
    setProductColours([...colours.filter((c) => c.role !== colour.role), ...rest]);
    setBusy(true);
    try {
      await adminDeleteColor(colour.id);
      if (rest.length) await adminReorderColors(rest.map((c) => c.id));
    } catch (err) {
      setProductColours(before);
      toast.error(errorMessage(err, "Couldn't remove colour"));
    } finally {
      setBusy(false);
    }
  }

  async function move(role: Role, index: number, delta: number) {
    const group = byRole(role);
    const to = index + delta;
    if (to < 0 || to >= group.length) return;
    const reordered = moveItem(group, index, to).map((c, i) => ({ ...c, sort_order: i }));
    const before = colours;
    setProductColours([...colours.filter((c) => c.role !== role), ...reordered]);
    try {
      await adminReorderColors(reordered.map((c) => c.id));
    } catch (err) {
      setProductColours(before);
      toast.error(errorMessage(err, "Couldn't reorder colours"));
    }
  }

  async function saveToLibrary(colour: AdminProductColor) {
    setBusy(true);
    try {
      await saveLibraryColour({ colorId: colour.color_id, name: colour.name, hex: colour.hex });
      await cache.refresh();
      toast.success(`${colour.name} saved to the colour library`);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save to library"));
    } finally {
      setBusy(false);
    }
  }

  const pickable = library.filter((l) => !l.is_archived);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Changes on this tab save straight away.</p>
      {(["primary", "secondary"] as Role[]).map((role) => {
        const group = byRole(role);
        const assigned = new Set(group.map((c) => c.color_id));
        return (
          <section key={role} aria-labelledby={`colours-${role}`}>
            <h3 id={`colours-${role}`} className="text-sm font-semibold">
              {ROLE_COPY[role].title} <span className="num font-normal text-muted-foreground">({group.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground">{ROLE_COPY[role].hint}</p>
            {group.length ? (
              <ul className="mt-2 divide-y divide-border border border-border">
                {group.map((c, i) => {
                  const lib = libraryById.get(c.color_id);
                  return (
                    <li key={c.id} className="flex items-center gap-2 px-2 py-1.5">
                      <Swatch hex={c.hex} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {lib?.out_of_stock ? <span className="text-xs text-amber-300">Out of stock</span> : null}
                      {!lib ? <span className="text-xs text-muted-foreground">One-off</span> : null}
                      <span className="num hidden text-xs text-muted-foreground sm:inline">{c.hex}</span>
                      {!readOnly ? (
                        <>
                          {!lib ? (
                            <button type="button" className="adm-icon-btn" disabled={busy} onClick={() => saveToLibrary(c)} aria-label={`Save ${c.name} to the colour library`} title="Save to library">
                              <BookmarkPlus className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => move(role, i, -1)} aria-label={`Move ${c.name} up`}>
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" className="adm-icon-btn" disabled={i === group.length - 1} onClick={() => move(role, i, 1)} aria-label={`Move ${c.name} down`}>
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button type="button" className="adm-icon-btn hover:text-destructive" disabled={busy} onClick={() => remove(c)} aria-label={`Remove ${c.name}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {!readOnly ? (
              <div className="mt-2">
                <p className="mb-1 text-xs text-muted-foreground">Add from the library</p>
                {pickable.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pickable.map((l) => {
                      const on = assigned.has(l.color_id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          disabled={busy || on}
                          onClick={() => add(role, { colorId: l.color_id, name: l.name, hex: l.hex }, true)}
                          aria-label={on ? `${l.name} (added)` : `Add ${l.name}`}
                          className={cn(
                            "inline-flex h-9 items-center gap-2 border px-2 text-xs coarse:h-11",
                            on ? "border-foreground/60 text-muted-foreground" : "border-border hover:border-foreground"
                          )}
                        >
                          <Swatch hex={l.hex} className="h-4 w-4" />
                          {l.name}
                          {l.out_of_stock ? <span className="text-amber-300">· out</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">The library is empty. Add colours in Catalogue → Colours, or add a one-off below.</p>
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {!readOnly ? (
        <section aria-labelledby="colours-custom" className="border-t border-border pt-4">
          <h3 id="colours-custom" className="text-sm font-semibold">One-off colour</h3>
          <p className="text-xs text-muted-foreground">For a colour only this product uses. Save it to the library later with the bookmark button.</p>
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = custom.name.trim();
              if (!name) return toast.error("Give the colour a name");
              if (!/^#[0-9a-fA-F]{6}$/.test(custom.hex)) return toast.error("Hex must look like #1A2B3C");
              void add(custom.role, { colorId: `custom-${slugify(name) || "colour"}`, name, hex: custom.hex }, false).then(() =>
                setCustom((c) => ({ ...c, name: "" }))
              );
            }}
          >
            <div>
              <label htmlFor="custom-role" className="adm-label">Role</label>
              <select id="custom-role" className="adm-input w-32" value={custom.role} onChange={(e) => setCustom({ ...custom, role: e.target.value as Role })}>
                <option value="primary">Main</option>
                <option value="secondary">Accent</option>
              </select>
            </div>
            <div className="min-w-40 flex-1">
              <label htmlFor="custom-name" className="adm-label">Name</label>
              <input id="custom-name" className="adm-input" maxLength={60} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="custom-hex" className="adm-label">Colour</label>
              <div className="flex">
                <input
                  type="color"
                  aria-label="Pick colour"
                  value={/^#[0-9a-fA-F]{6}$/.test(custom.hex) ? custom.hex : "#888888"}
                  onChange={(e) => setCustom({ ...custom, hex: e.target.value })}
                  className="h-10 w-10 cursor-pointer border border-input bg-background p-1 coarse:h-11"
                />
                <input id="custom-hex" className="adm-input num w-28" value={custom.hex} onChange={(e) => setCustom({ ...custom, hex: e.target.value.trim() })} />
              </div>
            </div>
            <button type="submit" className="adm-btn" disabled={busy}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add
            </button>
          </form>
        </section>
      ) : null}
      {!libraryFlags ? (
        <p className="text-xs text-muted-foreground">Out-of-stock and archive flags for library colours need the admin workspace migration.</p>
      ) : null}
    </div>
  );
}
