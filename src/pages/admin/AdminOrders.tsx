import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Columns3, Download, RefreshCw, Rows3, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import AdminShell from "@/components/admin/AdminShell";
import OrderDrawer from "@/components/admin/orders/OrderDrawer";
import { EmptyState, ErrorState, ReadOnlyNotice, SkeletonRows, StatusBadge } from "@/components/admin/ui";
import { useAdminOrders, useOrderMutations } from "@/lib/admin/use-orders";
import { useAdminPermissions } from "@/lib/admin/roles";
import {
  downloadText,
  formatDueDate,
  formatOrderDate,
  isOverdue,
  orderTotal,
  ordersToCsv,
  shippingLabel,
  todayISO,
  type AdminOrder,
} from "@/lib/admin/orders";
import { ORDER_STATUSES, STATUS_LABEL, STATUS_TONE } from "@/lib/admin/status";
import { formatEGP } from "@/lib/catalog-format";
import type { OrderStatus } from "@/lib/orders-api";
import { cn } from "@/lib/utils";

const VIEW_KEY = "admin-orders-view";
type Filter = "all" | "open" | "overdue" | OrderStatus;

function itemsSummary(o: AdminOrder) {
  const items = o.order_items || [];
  if (!items.length) return "—";
  const first = `${items[0].qty} × ${items[0].name}`;
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
}

function StatusSelect({ order, disabled }: { order: AdminOrder; disabled?: boolean }) {
  const { changeStatus, pending } = useOrderMutations();
  return (
    <select
      aria-label={`Status of ${order.order_code}`}
      className={cn("adm-input h-9 w-36 font-medium coarse:h-11", STATUS_TONE[order.status].text)}
      value={order.status}
      disabled={disabled || pending[order.id]}
      onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
      onClick={(e) => e.stopPropagation()}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="text-foreground">
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function DueCell({ order }: { order: AdminOrder }) {
  if (!order.due_date) return <span className="text-muted-foreground">—</span>;
  const overdue = isOverdue(order);
  return <span className={cn("whitespace-nowrap", overdue && "font-semibold text-destructive")}>{overdue ? "Overdue · " : ""}{formatDueDate(order.due_date)}</span>;
}

function Board({ orders, canWrite, onOpen }: { orders: AdminOrder[]; canWrite: boolean; onOpen: (id: string) => void }) {
  const { changeStatus } = useOrderMutations();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);

  const onDrop = (e: DragEvent, status: OrderStatus) => {
    e.preventDefault();
    const order = orders.find((o) => o.id === dragId);
    setDragId(null);
    setOver(null);
    if (order && order.status !== status) void changeStatus(order, status);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="grid min-w-[1080px] grid-cols-6 gap-3">
        {ORDER_STATUSES.map((s) => {
          const list = orders.filter((o) => o.status === s);
          return (
            <section
              key={s}
              aria-label={`${STATUS_LABEL[s]}, ${list.length} orders`}
              onDragOver={(e) => {
                if (!canWrite) return;
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver((cur) => (cur === s ? null : cur))}
              onDrop={(e) => onDrop(e, s)}
              className={cn("flex min-h-40 flex-col border-t-2 bg-card", STATUS_TONE[s].border, over === s && "bg-accent/60")}
            >
              <h2 className="flex items-center justify-between px-3 py-2 text-xs font-semibold">
                <span className={STATUS_TONE[s].text}>{STATUS_LABEL[s]}</span>
                <span className="num text-muted-foreground">{list.length}</span>
              </h2>
              <ul className="flex-1 space-y-2 px-2 pb-2">
                {list.map((o) => (
                  <li
                    key={o.id}
                    draggable={canWrite}
                    onDragStart={() => setDragId(o.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn("border border-border bg-background p-2.5", dragId === o.id && "opacity-40")}
                  >
                    <button type="button" onClick={() => onOpen(o.id)} className="block w-full text-left">
                      <span className="num block whitespace-nowrap text-[13px] font-semibold">{o.order_code}</span>
                      <span className="block truncate text-xs" dir="auto">{o.customer_name}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{itemsSummary(o)}</span>
                      <span className="num mt-1 flex justify-between text-xs">
                        <span>{formatEGP(orderTotal(o))}</span>
                        <span className="text-muted-foreground">{shippingLabel(o)}</span>
                      </span>
                      {o.due_date ? <span className="mt-1 block text-xs"><DueCell order={o} /></span> : null}
                    </button>
                    {canWrite ? (
                      <div className="mt-2">
                        <StatusSelect order={o} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { data, isPending, error, refetch, isRefetching } = useAdminOrders();
  const { canWrite } = useAdminPermissions();
  const { bulkStatus } = useOrderMutations();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "board">(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "board" ? "board" : "table";
    } catch {
      return "table";
    }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const filter = (params.get("status") as Filter) || "all";
  const openId = params.get("order");
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

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const today = todayISO();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, open: 0, overdue: 0 };
    for (const o of orders) {
      c[o.status] = (c[o.status] || 0) + 1;
      if (o.status !== "completed" && o.status !== "cancelled") c.open += 1;
      if (isOverdue(o, today)) c.overdue += 1;
    }
    return c;
  }, [orders, today]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "open" && (o.status === "completed" || o.status === "cancelled")) return false;
      if (filter === "overdue" && !isOverdue(o, today)) return false;
      if (ORDER_STATUSES.includes(filter as OrderStatus) && view === "table" && o.status !== filter) return false;
      if (!q) return true;
      return [o.order_code, o.customer_name, o.customer_email, o.customer_phone || ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders, filter, search, today, view]);

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(visible.map((v) => v.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    ...(data?.productionFields ? [{ id: "overdue" as Filter, label: "Overdue" }] : []),
    ...ORDER_STATUSES.map((s) => ({ id: s as Filter, label: STATUS_LABEL[s] })),
  ];

  const exportRows = (rows: AdminOrder[], label: string) => {
    if (!rows.length) return toast.message("Nothing to export");
    downloadText(`orders-${label}-${today}.csv`, ordersToCsv(rows));
    toast.success(`Exported ${rows.length} order(s)`);
  };

  const allSelected = visible.length > 0 && visible.every((o) => selected.has(o.id));

  return (
    <AdminShell
      title="Orders"
      wide
      description="Website orders. Status changes save straight away and can be undone from the message that appears."
      actions={
        <>
          <button type="button" className="adm-btn" onClick={() => exportRows(visible, filter)} disabled={!visible.length}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </button>
          <button type="button" className="adm-btn" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} aria-hidden="true" /> Refresh
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!canWrite ? <ReadOnlyNotice /> : null}
        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}

        <div className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
          <div role="tablist" aria-label="Filter orders" className="flex gap-1">
            {filters.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam("status", f.id === "all" ? null : f.id)}
                  className={cn(
                    "relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm coarse:h-11",
                    active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                  <span className={cn("num text-xs", f.id === "overdue" && counts.overdue ? "text-destructive" : "text-muted-foreground")}>{isPending ? "" : counts[f.id] ?? 0}</span>
                  {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" aria-label="Search orders" placeholder="Order code, name, email or phone" className="adm-input pl-8" value={search} onChange={(e) => setSearch(e.target.value)} dir="auto" />
          </div>
          {search ? (
            <button type="button" className="adm-btn-ghost" onClick={() => setSearch("")}>
              <X className="h-4 w-4" aria-hidden="true" /> Clear
            </button>
          ) : null}
          <span className="flex-1" />
          <div role="group" aria-label="View" className="flex border border-border">
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")} className={cn("adm-icon-btn h-10 w-10", view === "table" && "bg-accent text-foreground")} aria-label="Table view">
              <Rows3 className="h-4 w-4" />
            </button>
            <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={cn("adm-icon-btn h-10 w-10", view === "board" && "bg-accent text-foreground")} aria-label="Board view">
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selected.size > 0 && view === "table" ? (
          <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border border-ink/50 bg-card px-3 py-2 lg:top-2" role="region" aria-label="Bulk actions">
            <span className="num text-sm font-semibold">{selected.size} selected</span>
            {canWrite ? (
              <select
                aria-label="Set status for selected orders"
                className="adm-input h-9 w-auto"
                value=""
                disabled={bulkBusy}
                onChange={async (e) => {
                  const status = e.target.value as OrderStatus;
                  if (!status) return;
                  setBulkBusy(true);
                  try {
                    const res = await bulkStatus([...selected], status);
                    setSelected(new Set(res.failed.map((f) => f.id)));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Bulk update failed");
                  } finally {
                    setBulkBusy(false);
                  }
                }}
              >
                <option value="">Set status…</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            ) : null}
            <button type="button" className="adm-btn h-9" onClick={() => exportRows(orders.filter((o) => selected.has(o.id)), "selected")}>
              <Download className="h-4 w-4" aria-hidden="true" /> Export selected
            </button>
            <span className="flex-1" />
            <button type="button" className="adm-btn-ghost h-9" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        ) : null}

        {isPending ? (
          <div className="border border-border bg-card"><SkeletonRows rows={6} /></div>
        ) : orders.length === 0 ? (
          <div className="border border-border bg-card"><EmptyState title="No orders yet">Orders placed on the website appear here.</EmptyState></div>
        ) : view === "board" ? (
          <>
            {canWrite ? <p className="text-xs text-muted-foreground">Drag a card to another column, or use its status menu.</p> : null}
            <Board orders={visible} canWrite={canWrite} onOpen={(id) => setParam("order", id)} />
          </>
        ) : visible.length === 0 ? (
          <div className="border border-border bg-card"><EmptyState title="No orders match">Try another filter or search.</EmptyState></div>
        ) : (
          <>
            {/* Phone: stacked rows with the status control in reach */}
            <ul className="divide-y divide-border border border-border bg-card md:hidden">
              {visible.map((o) => (
                <li key={o.id} className="flex items-start gap-3 px-3 py-3">
                  <Checkbox className="mt-1 h-5 w-5" checked={selected.has(o.id)} onCheckedChange={() => setSelected((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} aria-label={`Select ${o.order_code}`} />
                  <div className="min-w-0 flex-1">
                    <button type="button" className="block w-full text-left" onClick={() => setParam("order", o.id)}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="num font-semibold">{o.order_code}</span>
                        <span className="num text-sm">{formatEGP(orderTotal(o))}</span>
                      </span>
                      <span className="block truncate" dir="auto">{o.customer_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{itemsSummary(o)} · {shippingLabel(o)} · {formatOrderDate(o.created_at)}</span>
                      {o.due_date ? <span className="block text-xs"><DueCell order={o} /></span> : null}
                    </button>
                    <div className="mt-2">{canWrite ? <StatusSelect order={o} /> : <StatusBadge status={o.status} />}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto border border-border bg-card md:block">
              <table className="w-full min-w-[960px]">
                <thead className="border-b border-border">
                  <tr>
                    <th className="adm-th w-10">
                      <Checkbox checked={allSelected} onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(visible.map((o) => o.id)))} aria-label="Select all shown orders" />
                    </th>
                    <th className="adm-th">Order</th>
                    <th className="adm-th">Customer</th>
                    <th className="adm-th">Items</th>
                    <th className="adm-th">Delivery</th>
                    {data?.productionFields ? <th className="adm-th">Due</th> : null}
                    <th className="adm-th text-right">Total</th>
                    <th className="adm-th w-40">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((o) => (
                    <tr key={o.id} className={cn("hover:bg-accent/30", selected.has(o.id) && "bg-accent/40", isOverdue(o, today) && "shadow-[inset_3px_0_0_hsl(var(--destructive))]")}>
                      <td className="adm-td">
                        <Checkbox checked={selected.has(o.id)} onCheckedChange={() => setSelected((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} aria-label={`Select ${o.order_code}`} />
                      </td>
                      <td className="adm-td">
                        <button type="button" onClick={() => setParam("order", o.id)} className="num font-semibold hover:underline">{o.order_code}</button>
                        <p className="num text-xs text-muted-foreground">{formatOrderDate(o.created_at, true)}</p>
                      </td>
                      <td className="adm-td max-w-56">
                        <p className="truncate" dir="auto">{o.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground" dir="ltr">{o.customer_phone || o.customer_email}</p>
                      </td>
                      <td className="adm-td max-w-64"><p className="truncate">{itemsSummary(o)}</p></td>
                      <td className="adm-td">{shippingLabel(o)}</td>
                      {data?.productionFields ? <td className="adm-td"><DueCell order={o} /></td> : null}
                      <td className="adm-td num text-right">{formatEGP(orderTotal(o))}</td>
                      <td className="adm-td">{canWrite ? <StatusSelect order={o} /> : <StatusBadge status={o.status} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <OrderDrawer orderId={openId} onClose={() => setParam("order", null)} />
    </AdminShell>
  );
}
