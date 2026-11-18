import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, Panel, SkeletonRows, Stat, StatusBadge } from "@/components/admin/ui";
import { useAdminOrders, useOrderMutations } from "@/lib/admin/use-orders";
import { useAdminPermissions } from "@/lib/admin/roles";
import { formatDueDate, formatOrderDate, isOverdue, orderTotal, shippingLabel, todayISO, type AdminOrder } from "@/lib/admin/orders";
import { ORDER_STATUSES, OPEN_STATUSES, STATUS_LABEL, STATUS_TONE } from "@/lib/admin/status";
import { formatEGP } from "@/lib/catalog-format";
import type { OrderStatus } from "@/lib/orders-api";
import { cn } from "@/lib/utils";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "completed",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm",
  confirmed: "Start printing",
  processing: "Mark shipped",
  shipped: "Mark completed",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Online revenue: totals of product orders that weren't cancelled, by order date. */
function revenueSince(orders: AdminOrder[], since: Date) {
  const list = orders.filter((o) => o.order_type === "product" && o.status !== "cancelled" && new Date(o.created_at) >= since);
  return { total: list.reduce((s, o) => s + orderTotal(o), 0), count: list.length };
}

function AttentionRow({ order, reason }: { order: AdminOrder; reason: string }) {
  const { canWrite } = useAdminPermissions();
  const { changeStatus, pending } = useOrderMutations();
  const next = NEXT[order.status];
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link to={`/admin/orders?order=${order.id}`} className="num font-semibold hover:underline">
            {order.order_code}
          </Link>
          <StatusBadge status={order.status} />
          <span className={cn("text-xs", reason.startsWith("Overdue") ? "font-semibold text-destructive" : "text-muted-foreground")}>{reason}</span>
        </div>
        <p className="mt-0.5 truncate text-muted-foreground">
          <span dir="auto">{order.customer_name}</span> · {shippingLabel(order)} · <span className="num">{formatEGP(orderTotal(order))}</span>
        </p>
      </div>
      {canWrite && next ? (
        <button
          type="button"
          className="adm-btn shrink-0"
          disabled={pending[order.id]}
          onClick={() => changeStatus(order, next)}
        >
          {pending[order.id] ? "Saving…" : NEXT_LABEL[order.status]}
        </button>
      ) : null}
    </li>
  );
}

export default function AdminToday() {
  const { data, isPending, error, refetch, isRefetching } = useAdminOrders();
  const orders = useMemo(() => data?.orders ?? [], [data]);
  const today = todayISO();

  const attention = useMemo(() => {
    const items: Array<{ order: AdminOrder; reason: string; rank: number }> = [];
    for (const o of orders) {
      if (o.status === "completed" || o.status === "cancelled") continue;
      if (isOverdue(o, today)) items.push({ order: o, reason: `Overdue since ${formatDueDate(o.due_date!)}`, rank: 0 });
      else if (o.due_date === today) items.push({ order: o, reason: "Due today", rank: 1 });
      else if (o.status === "pending") items.push({ order: o, reason: `Waiting for confirmation since ${formatOrderDate(o.created_at, true)}`, rank: 2 });
    }
    return items.sort((a, b) => a.rank - b.rank || a.order.created_at.localeCompare(b.order.created_at));
  }, [orders, today]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const now = new Date();
  const last7 = revenueSince(orders, startOfDay(new Date(now.getTime() - 6 * 86400000)));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = revenueSince(orders, monthStart);
  const monthName = now.toLocaleDateString("en-GB", { month: "long" });
  const upcoming = orders
    .filter((o) => o.due_date && o.due_date > today && OPEN_STATUSES.includes(o.status))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);

  return (
    <AdminShell
      title="Today"
      description={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      actions={
        <button type="button" className="adm-btn" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} aria-hidden="true" /> Refresh
        </button>
      }
    >
      {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Panel
            title={
              <span>
                Needs attention{" "}
                {!isPending ? <span className="num font-normal text-muted-foreground">({attention.length})</span> : null}
              </span>
            }
            action={
              <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                All orders <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          >
            {isPending ? (
              <SkeletonRows rows={3} />
            ) : attention.length === 0 ? (
              <EmptyState title="Nothing waiting on you">
                No pending orders{data?.productionFields ? ", nothing overdue and nothing due today" : ""}.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {attention.map(({ order, reason }) => (
                  <AttentionRow key={order.id} order={order} reason={reason} />
                ))}
              </ul>
            )}
            {!isPending && data && !data.productionFields ? (
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                Due dates aren't set up yet, so overdue orders can't be flagged. See Settings → Setup.
              </p>
            ) : null}
          </Panel>

          <Panel title="Orders by status">
            <ul className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6 [&>li]:border-b [&>li]:border-r [&>li]:border-border">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link to={`/admin/orders?status=${s}`} className="block px-4 py-3 hover:bg-accent/50">
                    <span className={cn("text-xs font-medium", STATUS_TONE[s].text)}>{STATUS_LABEL[s]}</span>
                    <span className="num mt-1 block text-2xl font-bold">{isPending ? "–" : counts[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Online revenue">
            <div className="grid grid-cols-2 divide-x divide-border">
              <Stat label="Last 7 days" value={isPending ? "–" : formatEGP(last7.total)} hint={isPending ? null : `${last7.count} orders`} />
              <Stat label={`${monthName} so far`} value={isPending ? "–" : formatEGP(thisMonth.total)} hint={isPending ? null : `${thisMonth.count} orders`} />
            </div>
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Order totals of website product orders placed in the period, excluding cancelled ones. Aramex fees are
              confirmed after ordering and aren't included. Offline sales are in Insights.
            </p>
          </Panel>

          {data?.productionFields ? (
            <Panel title="Due next">
              {upcoming.length === 0 ? (
                <EmptyState title="No upcoming due dates">Set a due date on an order to see it here.</EmptyState>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <Link to={`/admin/orders?order=${o.id}`} className="num font-medium hover:underline">
                        {o.order_code}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatDueDate(o.due_date!)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          <Panel title="Latest orders">
            {isPending ? (
              <SkeletonRows rows={3} />
            ) : orders.length === 0 ? (
              <EmptyState title="No orders yet">Orders placed on the website appear here.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/orders?order=${o.id}`} className="num font-medium hover:underline">
                        {o.order_code}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground" dir="auto">
                        {o.customer_name}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
