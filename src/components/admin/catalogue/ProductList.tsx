import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Copy, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sleeve from "@/components/catalog/Sleeve";
import InlineCell from "@/components/admin/catalogue/InlineCell";
import { useInlineProductEdit } from "@/components/admin/catalogue/useCatalogue";
import { effectiveProductPrice, type AdminProduct, type Category } from "@/lib/admin/catalogue";
import { formatEGP } from "@/lib/catalog-format";
import { cn } from "@/lib/utils";

export type ProductRowData = AdminProduct & {
  cover?: string;
  colours: string[];
  catalogueNo: string;
};

type ProductListProps = {
  rows: ProductRowData[];
  view: "list" | "grid";
  categories: Category[];
  categoriesEnabled: boolean;
  canWrite: boolean;
  canReorder: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
  onMove: (fromId: string, toId: string) => void;
  onMoveBy: (id: string, delta: number) => void;
};

function RowMenu({ product, onOpen, onDuplicate, onDelete, canWrite }: {
  product: AdminProduct;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canWrite: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="adm-icon-btn" aria-label={`More actions for ${product.name}`}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpen}>
          <Pencil className="mr-2 h-4 w-4" /> {canWrite ? "Edit" : "View"}
        </DropdownMenuItem>
        {canWrite ? (
          <>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate as draft
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete…
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Drag handle: drag with a mouse, or focus it and use the arrow keys. */
function Handle({ product, onMoveBy, disabled }: { product: AdminProduct; onMoveBy: (id: string, d: number) => void; disabled: boolean }) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMoveBy(product.id, -1);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onMoveBy(product.id, 1);
    }
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onKeyDown={onKeyDown}
      className="adm-icon-btn cursor-grab active:cursor-grabbing"
      aria-label={`Reorder ${product.name}. Use arrow up and down to move.`}
      title={disabled ? "Clear search and filters to reorder" : "Drag, or use arrow keys, to reorder"}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

export default function ProductList(props: ProductListProps) {
  const { rows, view, canWrite, canReorder, selected } = props;
  const { apply, isSaving } = useInlineProductEdit();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dragProps = (id: string) =>
    canReorder && canWrite
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            setDragId(id);
            e.dataTransfer.effectAllowed = "move";
          },
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            if (overId !== id) setOverId(id);
          },
          onDragEnd: () => {
            setDragId(null);
            setOverId(null);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            if (dragId && dragId !== id) props.onMove(dragId, id);
            setDragId(null);
            setOverId(null);
          },
        }
      : {};

  const categoryName = (id?: string | null) => props.categories.find((c) => c.id === id)?.name;

  if (view === "grid") {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {rows.map((p) => {
          const sale = p.discount_enabled && Number(p.discount_price) > 0;
          return (
            <li
              key={p.id}
              {...dragProps(p.id)}
              className={cn("relative", dragId === p.id && "opacity-40", overId === p.id && dragId !== p.id && "outline outline-2 outline-offset-4 outline-ink")}
            >
              <div className="absolute left-9 top-1.5 z-10 md:left-11">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => props.onToggleSelect(p.id)}
                  aria-label={`Select ${p.name}`}
                  className="h-5 w-5 border-foreground bg-background/80"
                />
              </div>
              <button type="button" onClick={() => props.onOpen(p.id)} className="block w-full text-left">
                <Sleeve src={p.cover} alt="" catalogueNo={p.catalogueNo} spineHex={p.colours[0] || "hsl(var(--rule))"} spineColors={p.colours} />
                <span className="mt-2 block truncate font-semibold">{p.name}</span>
              </button>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                <span className={p.is_published ? "text-emerald-300" : "text-amber-300"}>{p.is_published ? "Published" : "Draft"}</span>
                <span className="num">
                  {formatEGP(effectiveProductPrice(p))}
                  {sale ? <span className="ml-1 text-muted-foreground line-through">{formatEGP(p.base_price)}</span> : null}
                </span>
              </div>
              {canReorder && canWrite ? (
                <div className="mt-1 flex justify-end">
                  <Handle product={p} onMoveBy={props.onMoveBy} disabled={false} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[860px] border-collapse">
        <thead className="border-b border-border">
          <tr>
            <th className="adm-th w-10">
              <Checkbox checked={allSelected} onCheckedChange={props.onToggleAll} aria-label="Select all shown products" />
            </th>
            <th className="adm-th w-10"><span className="sr-only">Order</span></th>
            <th className="adm-th">Product</th>
            <th className="adm-th">Category</th>
            <th className="adm-th w-24">Visible</th>
            <th className="adm-th w-28 text-right">Price</th>
            <th className="adm-th w-28 text-right">Sale price</th>
            <th className="adm-th w-24 text-right" title="For your reference: the shop prints to order and doesn't limit sales by stock.">Stock</th>
            <th className="adm-th w-12"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr
              key={p.id}
              {...dragProps(p.id)}
              className={cn(
                "hover:bg-accent/30",
                selected.has(p.id) && "bg-accent/40",
                dragId === p.id && "opacity-40",
                overId === p.id && dragId !== p.id && "shadow-[inset_0_2px_0_hsl(var(--ink))]"
              )}
            >
              <td className="adm-td">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => props.onToggleSelect(p.id)} aria-label={`Select ${p.name}`} />
              </td>
              <td className="px-1">
                {canWrite ? <Handle product={p} onMoveBy={props.onMoveBy} disabled={!canReorder} /> : null}
              </td>
              <td className="adm-td">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => props.onOpen(p.id)} className="h-10 w-10 shrink-0 overflow-hidden bg-black" aria-label={`Open ${p.name}`}>
                    {p.cover ? <img src={p.cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <InlineCell
                      label="Name"
                      value={p.name}
                      disabled={!canWrite}
                      saving={isSaving(p.id, "name")}
                      onCommit={(v) => apply(p, { name: String(v) })}
                      className="font-medium"
                    />
                    <p className="num px-2 text-xs text-muted-foreground">
                      {p.catalogueNo}
                      {p.is_bundle ? " · Bundle" : ""} · /{p.slug}
                    </p>
                  </div>
                </div>
              </td>
              <td className="adm-td text-muted-foreground">
                {props.categoriesEnabled ? categoryName(p.category_id) || <span className="text-amber-300">None</span> : "—"}
              </td>
              <td className="adm-td">
                <label className="inline-flex items-center gap-2">
                  <Switch
                    checked={p.is_published}
                    disabled={!canWrite || isSaving(p.id, "is_published")}
                    onCheckedChange={(checked) =>
                      apply(p, { is_published: checked }, { message: checked ? "Published" : "Moved to drafts" })
                    }
                    aria-label={`${p.name} visible in the shop`}
                  />
                  <span className={cn("text-xs", p.is_published ? "text-emerald-300" : "text-amber-300")}>{p.is_published ? "Live" : "Draft"}</span>
                </label>
              </td>
              <td className="adm-td">
                <InlineCell
                  label="Price"
                  type="money"
                  align="right"
                  value={Number(p.base_price)}
                  display={formatEGP(Number(p.base_price))}
                  disabled={!canWrite}
                  saving={isSaving(p.id, "base_price")}
                  onCommit={(v) => apply(p, { base_price: Number(v) })}
                />
              </td>
              <td className="adm-td">
                <InlineCell
                  label="Sale price"
                  type="money"
                  align="right"
                  allowEmpty
                  value={p.discount_enabled && p.discount_price != null ? Number(p.discount_price) : null}
                  display={p.discount_enabled && p.discount_price != null ? formatEGP(Number(p.discount_price)) : undefined}
                  placeholder="No sale"
                  disabled={!canWrite}
                  saving={isSaving(p.id, "discount_price")}
                  onCommit={(v) =>
                    apply(p, v == null ? { discount_enabled: false, discount_price: null } : { discount_enabled: true, discount_price: Number(v) }, {
                      message: v == null ? "Sale removed" : "Sale price saved",
                    })
                  }
                />
              </td>
              <td className="adm-td">
                <InlineCell
                  label="Stock"
                  type="int"
                  align="right"
                  value={Number(p.stock_qty || 0)}
                  disabled={!canWrite}
                  saving={isSaving(p.id, "stock_qty")}
                  onCommit={(v) => apply(p, { stock_qty: Number(v) })}
                />
                {!p.in_stock ? <p className="px-2 text-right text-[11px] text-amber-300">Marked out</p> : null}
              </td>
              <td className="px-1">
                <RowMenu
                  product={p}
                  canWrite={canWrite}
                  onOpen={() => props.onOpen(p.id)}
                  onDuplicate={() => props.onDuplicate(p)}
                  onDelete={() => props.onDelete(p)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
