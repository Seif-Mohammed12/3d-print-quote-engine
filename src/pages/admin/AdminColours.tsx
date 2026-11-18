import { useMemo, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, ReadOnlyNotice, SetupNotice, SkeletonRows } from "@/components/admin/ui";
import InlineCell from "@/components/admin/catalogue/InlineCell";
import { useCatalogueCache, useCatalogueQuery } from "@/components/admin/catalogue/useCatalogue";
import { useAdminPermissions } from "@/lib/admin/roles";
import { errorMessage } from "@/lib/admin/api";
import { isValidHex, reorderLibraryColours, saveLibraryColour } from "@/lib/admin/colours";
import { moveItem, type LibraryColor } from "@/lib/admin/catalogue";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";
import { cn } from "@/lib/utils";

function HexEditor({ colour, disabled, onSave }: { colour: LibraryColor; disabled: boolean; onSave: (hex: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(colour.hex);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setHex(colour.hex);
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        className="flex h-9 items-center gap-2 border border-transparent px-1.5 hover:border-border disabled:hover:border-transparent coarse:h-11"
        aria-label={`${colour.name} colour ${colour.hex}. Edit`}
      >
        <span className="h-6 w-6 border border-white/20" style={{ backgroundColor: colour.hex }} aria-hidden="true" />
        <span className="num text-xs text-muted-foreground">{colour.hex}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div className="flex items-center gap-2">
          <input type="color" aria-label="Pick colour" value={isValidHex(hex) ? hex : "#888888"} onChange={(e) => setHex(e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer border border-input bg-background p-1" />
          <input aria-label="Hex" className="adm-input num" value={hex} onChange={(e) => setHex(e.target.value.trim())} />
        </div>
        <p className="text-xs text-muted-foreground">Updates the swatch on every product using {colour.name}.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="adm-btn h-9" onClick={() => setOpen(false)}>Cancel</button>
          <button
            type="button"
            className="adm-btn-primary h-9"
            disabled={!isValidHex(hex) || hex.toUpperCase() === colour.hex.toUpperCase()}
            onClick={async () => {
              if (await onSave(hex)) setOpen(false);
            }}
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminColours() {
  const { data, isPending, error, refetch, isRefetching } = useCatalogueQuery();
  const cache = useCatalogueCache();
  const { canWrite } = useAdminPermissions();
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState({ name: "", hex: "#888888" });
  const [busy, setBusy] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const flags = Boolean(data?.setup.colourLibrary);
  const library = useMemo(() => (data?.colorLibrary ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)), [data]);
  const shown = library.filter((c) => showArchived || !c.is_archived);

  const usage = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; role: string }>>();
    if (!data) return map;
    const names = new Map(data.products.map((p) => [p.id, p.name]));
    for (const c of data.colors) {
      const list = map.get(c.color_id) || [];
      if (!list.some((x) => x.id === c.product_id && x.role === c.role)) list.push({ id: c.product_id, name: names.get(c.product_id) || "Unknown", role: c.role });
      map.set(c.color_id, list);
    }
    return map;
  }, [data]);

  const setLibrary = (rows: LibraryColor[]) => cache.update((prev) => ({ ...prev, colorLibrary: rows }));

  async function save(colour: LibraryColor, patch: { name?: string; hex?: string; outOfStock?: boolean; isArchived?: boolean }, message: string) {
    const before = data?.colorLibrary ?? [];
    setBusy(colour.id);
    setLibrary(
      before.map((c) =>
        c.id === colour.id
          ? {
              ...c,
              ...(patch.name ? { name: patch.name } : {}),
              ...(patch.hex ? { hex: patch.hex } : {}),
              ...("outOfStock" in patch ? { out_of_stock: patch.outOfStock } : {}),
              ...("isArchived" in patch ? { is_archived: patch.isArchived } : {}),
            }
          : c
      )
    );
    try {
      const res = await saveLibraryColour({ id: colour.id, name: patch.name ?? colour.name, hex: patch.hex ?? colour.hex, ...("outOfStock" in patch ? { outOfStock: patch.outOfStock } : {}), ...("isArchived" in patch ? { isArchived: patch.isArchived } : {}) });
      // Products keep a copy of name and hex; refresh to show the propagated values.
      if (patch.name || patch.hex) await cache.refresh();
      else setLibrary((cache.get()?.colorLibrary ?? []).map((c) => (c.id === colour.id ? res.colour : c)));
      toast.success(message, { description: res.productsUpdated ? `${res.productsUpdated} product colour(s) updated` : undefined });
      return true;
    } catch (err) {
      setLibrary(before);
      toast.error(errorMessage(err, "Couldn't save colour"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function reorder(next: LibraryColor[]) {
    const before = data?.colorLibrary ?? [];
    const numbered = next.map((c, i) => ({ ...c, sort_order: i }));
    const hidden = before.filter((c) => !numbered.some((n) => n.id === c.id)).map((c, i) => ({ ...c, sort_order: numbered.length + i }));
    setLibrary([...numbered, ...hidden]);
    try {
      await reorderLibraryColours([...numbered, ...hidden].map((c) => c.id));
    } catch (err) {
      setLibrary(before);
      toast.error(errorMessage(err, "Couldn't reorder"));
    }
  }

  const onDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const from = shown.findIndex((c) => c.id === dragId);
    const to = shown.findIndex((c) => c.id === targetId);
    setDragId(null);
    if (from >= 0 && to >= 0) void reorder(moveItem(shown, from, to));
  };

  return (
    <AdminShell title="Colours" description="The filament colour library. Products pick their colours from here.">
      <div className="max-w-4xl space-y-4">
        {!canWrite ? <ReadOnlyNotice /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}
        {data && !flags ? (
          <SetupNotice title="Out-of-stock and archive need a database update" migration={WORKSPACE_MIGRATION}>
            Adding, renaming, recolouring and reordering work now.
          </SetupNotice>
        ) : null}

        {canWrite ? (
          <form
            className="flex flex-wrap items-end gap-2 border border-border bg-card p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const name = adding.name.trim();
              if (!name) return toast.error("Give the colour a name");
              if (!isValidHex(adding.hex)) return toast.error("Hex must look like #1A2B3C");
              setBusy("new");
              try {
                await saveLibraryColour({ name, hex: adding.hex });
                await cache.refresh();
                setAdding({ name: "", hex: adding.hex });
                toast.success(`${name} added to the library`);
              } catch (err) {
                toast.error(errorMessage(err, "Couldn't add colour"));
              } finally {
                setBusy(null);
              }
            }}
          >
            <div className="min-w-48 flex-1">
              <label htmlFor="new-colour-name" className="adm-label">New colour name</label>
              <input id="new-colour-name" className="adm-input" maxLength={60} placeholder="e.g. Matte Sand" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="new-colour-hex" className="adm-label">Colour</label>
              <div className="flex">
                <input type="color" aria-label="Pick colour" value={isValidHex(adding.hex) ? adding.hex : "#888888"} onChange={(e) => setAdding({ ...adding, hex: e.target.value.toUpperCase() })} className="h-10 w-10 cursor-pointer border border-input bg-background p-1 coarse:h-11" />
                <input id="new-colour-hex" className="adm-input num w-28" value={adding.hex} onChange={(e) => setAdding({ ...adding, hex: e.target.value.trim() })} />
              </div>
            </div>
            <button type="submit" className="adm-btn-primary" disabled={busy === "new"}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add colour
            </button>
          </form>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Renaming keeps the colour's id, so products and photo tags stay linked. Drag or use the arrows to set the order shown in pickers.
          </p>
          {flags ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} /> Show archived
            </label>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-border bg-card">
          {isPending ? (
            <SkeletonRows rows={5} />
          ) : shown.length === 0 ? (
            <EmptyState title="No colours in the library">Add the filament colours you print with.</EmptyState>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="adm-th w-10"><span className="sr-only">Order</span></th>
                  <th className="adm-th w-40">Swatch</th>
                  <th className="adm-th">Name</th>
                  <th className="adm-th">Used by</th>
                  {flags ? <th className="adm-th w-32">Out of stock</th> : null}
                  {flags ? <th className="adm-th w-28">Archived</th> : null}
                  <th className="adm-th w-20"><span className="sr-only">Move</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((c, i) => {
                  const used = usage.get(c.color_id) || [];
                  return (
                    <tr
                      key={c.id}
                      draggable={canWrite}
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(e, c.id)}
                      className={cn(dragId === c.id && "opacity-40", c.is_archived && "text-muted-foreground")}
                    >
                      <td className="px-1 text-muted-foreground">{canWrite ? <GripVertical className="mx-auto h-4 w-4 cursor-grab" aria-hidden="true" /> : null}</td>
                      <td className="adm-td">
                        <HexEditor colour={c} disabled={!canWrite || busy === c.id} onSave={(hex) => save(c, { hex: hex.toUpperCase() }, `${c.name} recoloured`)} />
                      </td>
                      <td className="adm-td">
                        <InlineCell label="Colour name" value={c.name} disabled={!canWrite} saving={busy === c.id} onCommit={(v) => save(c, { name: String(v) }, "Renamed")} />
                        <p className="num px-2 text-[11px] text-muted-foreground">id: {c.color_id}</p>
                      </td>
                      <td className="adm-td">
                        {used.length ? (
                          <details>
                            <summary className="cursor-pointer text-sm">
                              {new Set(used.map((u) => u.id)).size} product{new Set(used.map((u) => u.id)).size === 1 ? "" : "s"}
                            </summary>
                            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {used.map((u) => (
                                <li key={`${u.id}-${u.role}`}>
                                  <Link to={`/admin/catalogue?product=${u.id}`} className="hover:text-foreground hover:underline">
                                    {u.name}
                                  </Link>{" "}
                                  ({u.role === "primary" ? "main" : "accent"})
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not used</span>
                        )}
                      </td>
                      {flags ? (
                        <td className="adm-td">
                          <label className="inline-flex items-center gap-2">
                            <Switch
                              checked={Boolean(c.out_of_stock)}
                              disabled={!canWrite || busy === c.id}
                              onCheckedChange={(checked) => save(c, { outOfStock: checked }, checked ? `${c.name} is out of stock everywhere` : `${c.name} is back in stock`)}
                              aria-label={`${c.name} out of stock`}
                            />
                            {c.out_of_stock ? <span className="text-xs text-amber-300">Out</span> : null}
                          </label>
                        </td>
                      ) : null}
                      {flags ? (
                        <td className="adm-td">
                          <Switch
                            checked={Boolean(c.is_archived)}
                            disabled={!canWrite || busy === c.id}
                            onCheckedChange={(checked) => save(c, { isArchived: checked }, checked ? `${c.name} archived` : `${c.name} restored`)}
                            aria-label={`${c.name} archived`}
                          />
                        </td>
                      ) : null}
                      <td className="px-1">
                        {canWrite ? (
                          <div className="flex">
                            <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => reorder(moveItem(shown, i, i - 1))} aria-label={`Move ${c.name} up`}>
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" className="adm-icon-btn" disabled={i === shown.length - 1} onClick={() => reorder(moveItem(shown, i, i + 1))} aria-label={`Move ${c.name} down`}>
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {flags ? (
          <p className="text-xs text-muted-foreground">
            Out of stock: the shop shows the colour as unavailable on every product that uses it, and checkout refuses it. Archived: hidden from
            the colour pickers here; products that already use it keep it.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}
