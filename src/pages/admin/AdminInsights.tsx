import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/admin/AdminShell";
import { EmptyState, ErrorState, Panel, SkeletonRows } from "@/components/admin/ui";
import { useAdminOrders } from "@/lib/admin/use-orders";
import { adminFetch } from "@/lib/admin/api";
import { orderTotal, type AdminOrder } from "@/lib/admin/orders";
import { ORDER_STATUSES, STATUS_LABEL, STATUS_TONE } from "@/lib/admin/status";
import { formatEGP } from "@/lib/catalog-format";
import { cn } from "@/lib/utils";

type RangeId = "7d" | "30d" | "90d" | "365d" | "all";
const RANGES: Array<{ id: RangeId; label: string; days: number | null }> = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "365d", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null },
];

type OfflineSale = { id: string; order_date: string; revenue: number; order_type: "site" | "manual"; customer_name: string };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Revenue-counting orders: website product orders that weren't cancelled. */
function counted(orders: AdminOrder[]) {
  return orders.filter((o) => o.order_type === "product" && o.status !== "cancelled");
}

function summarise(orders: AdminOrder[]) {
  const list = counted(orders);
  const revenue = list.reduce((s, o) => s + orderTotal(o), 0);
  const items = list.reduce((s, o) => s + (o.order_items || []).reduce((n, it) => n + Number(it.qty || 0), 0), 0);
  return { revenue, count: list.length, aov: list.length ? revenue / list.length : 0, items };
}

function pctChange(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

function Kpi({ label, value, definition, change, compareLabel }: { label: string; value: string; definition: string; change: number | null; compareLabel: string | null }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      {change != null && compareLabel ? (
        <p className={cn("num text-xs", change >= 0 ? "text-emerald-300" : "text-amber-300")}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}% <span className="text-muted-foreground">vs {compareLabel}</span>
        </p>
      ) : null}
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{definition}</p>
    </div>
  );
}

/** Bar chart of revenue per bucket, with the numbers in a visually hidden table for screen readers. */
function RevenueBars({ buckets, label }: { buckets: Array<{ label: string; value: number }>; label: string }) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <figure>
      <div className="flex h-32 items-end gap-[2px]" aria-hidden="true">
        {buckets.map((b, i) => (
          <div key={i} className="group relative flex-1" title={`${b.label}: ${formatEGP(b.value)}`}>
            <div className={cn("w-full", b.value ? "bg-ink/80" : "bg-border")} style={{ height: `${Math.max(2, (b.value / max) * 128)}px` }} />
          </div>
        ))}
      </div>
      <div className="num mt-1 flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
      <figcaption className="mt-1 text-xs text-muted-foreground">{label}</figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {buckets.map((b, i) => (
            <tr key={i}><th scope="row">{b.label}</th><td>{formatEGP(b.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const UNAVAILABLE = [
  { name: "Margin per gram", why: "Needs filament cost per kg and the grams used on each order." },
  { name: "Quote conversion", why: "Quotes aren't connected to this admin yet." },
  { name: "Turnaround time", why: "Needs a reliable completed date per order; status history doesn't record who or why, and older orders predate it." },
  { name: "Printer utilisation", why: "Needs printer schedules and print times on every job." },
];

export default function AdminInsights() {
  const { data, isPending, error, refetch, isRefetching } = useAdminOrders();
  const offline = useQuery({
    queryKey: ["admin-offline-sales"],
    queryFn: () => adminFetch<{ orders: OfflineSale[] }>("/api/admin-stats-list"),
    staleTime: 60_000,
  });
  const [range, setRange] = useState<RangeId>("30d");
  const now = new Date();
  const days = RANGES.find((r) => r.id === range)!.days;
  const { start, prevStart } = useMemo(() => {
    if (!days) return { start: null, prevStart: null };
    const s = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
    return { start: s, prevStart: new Date(s.getTime() - days * 86400000) };
  }, [days]);

  const all = useMemo(() => data?.orders ?? [], [data]);
  const inRange = useMemo(() => all.filter((o) => !start || new Date(o.created_at) >= start), [all, start]);
  const inPrev = useMemo(
    () => (prevStart && start ? all.filter((o) => new Date(o.created_at) >= prevStart && new Date(o.created_at) < start) : []),
    [all, prevStart, start]
  );
  const firstOrder = all.length ? all.reduce((min, o) => (o.created_at < min ? o.created_at : min), all[0].created_at) : null;
  // Compare only when the shop already had orders for the whole previous period.
  const canCompare = Boolean(prevStart && firstOrder && new Date(firstOrder) <= prevStart && counted(inPrev).length > 0);
  const compareLabel = canCompare ? `previous ${RANGES.find((r) => r.id === range)!.label}` : null;

  const cur = summarise(inRange);
  const prev = summarise(inPrev);

  // Daily buckets up to 90 days, weekly beyond; only drawn with at least 14 days of history
  // and two buckets with sales, otherwise a chart says nothing.
  const buckets = useMemo(() => {
    const list = counted(inRange);
    if (!list.length) return null;
    const from = start || startOfDay(new Date(firstOrder!));
    const spanDays = Math.ceil((startOfDay(now).getTime() - from.getTime()) / 86400000) + 1;
    if (spanDays < 14) return null;
    const size = spanDays > 90 ? 7 : 1;
    const n = Math.ceil(spanDays / size);
    const out = Array.from({ length: n }, (_, i) => {
      const d = new Date(from.getTime() + i * size * 86400000);
      return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: 0 };
    });
    for (const o of list) {
      const idx = Math.floor((startOfDay(new Date(o.created_at)).getTime() - from.getTime()) / (size * 86400000));
      if (out[idx]) out[idx].value += orderTotal(o);
    }
    return out.filter((b) => b.value > 0).length >= 2 ? { out, size } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, range, firstOrder]);

  const statusCounts = useMemo(() => {
    const c = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    inRange.forEach((o) => (c[o.status] += 1));
    return c;
  }, [inRange]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of counted(inRange)) {
      for (const it of o.order_items || []) {
        const key = it.product_id || it.name;
        const row = m.get(key) || { name: it.name, qty: 0, revenue: 0 };
        row.qty += Number(it.qty || 0);
        row.revenue += Number(it.subtotal || 0);
        m.set(key, row);
      }
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8);
  }, [inRange]);

  const mix = useMemo(() => {
    const list = counted(inRange);
    const count = (fn: (o: AdminOrder) => boolean) => list.filter(fn).length;
    return {
      pickup: count((o) => o.shipping?.method === "pickup"),
      aramex: count((o) => o.shipping?.method === "aramex"),
      cod: count((o) => o.payment?.method === "cod"),
      instapay: count((o) => o.payment?.method === "instapay"),
      total: list.length,
    };
  }, [inRange]);

  const filament = useMemo(() => {
    const list = counted(inRange).filter((o) => o.status === "completed");
    const recorded = list.filter((o) => o.filament_grams != null);
    return { recorded: recorded.length, of: list.length, grams: recorded.reduce((s, o) => s + Number(o.filament_grams || 0), 0) };
  }, [inRange]);

  const offlineInRange = useMemo(() => {
    const rows = (offline.data?.orders ?? []).filter((r) => r.order_type === "manual" && (!start || new Date(r.order_date) >= start));
    return { count: rows.length, revenue: rows.reduce((s, r) => s + Number(r.revenue || 0), 0) };
  }, [offline.data, start]);

  const cancelled = inRange.filter((o) => o.status === "cancelled").length;
  const rangeText = start
    ? `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – today`
    : firstOrder
      ? `since the first order on ${new Date(firstOrder).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "all time";

  return (
    <AdminShell title="Insights" description="Calculated from website orders in Supabase. Offline sales are shown separately.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Date range" className="flex flex-wrap border border-border">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn("h-10 px-3 text-sm coarse:h-11", range === r.id ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="num text-xs text-muted-foreground">{rangeText} · by order date, your time zone</p>
        </div>

        {error ? <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} /> : null}

        <Panel title="Website sales">
          {isPending ? (
            <SkeletonRows rows={2} />
          ) : (
            <>
              <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
                <Kpi label="Revenue" value={formatEGP(cur.revenue)} definition="Sum of order totals, website product orders, not cancelled. Excludes Aramex fees." change={canCompare ? pctChange(cur.revenue, prev.revenue) : null} compareLabel={compareLabel} />
                <Kpi label="Orders" value={String(cur.count)} definition="Website product orders placed in the range, not cancelled." change={canCompare ? pctChange(cur.count, prev.count) : null} compareLabel={compareLabel} />
                <Kpi label="Average order" value={cur.count ? formatEGP(cur.aov) : "—"} definition="Revenue ÷ orders." change={canCompare && prev.count ? pctChange(cur.aov, prev.aov) : null} compareLabel={compareLabel} />
                <Kpi label="Items sold" value={String(cur.items)} definition="Sum of item quantities on those orders. A bundle counts as one." change={canCompare ? pctChange(cur.items, prev.items) : null} compareLabel={compareLabel} />
              </div>
              {!canCompare && range !== "all" ? (
                <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">No comparison: there isn't a full previous period of orders to compare with yet.</p>
              ) : null}
              <div className="border-t border-border px-4 py-4">
                {buckets ? (
                  <RevenueBars buckets={buckets.out} label={`Revenue per ${buckets.size === 7 ? "week" : "day"}, ${rangeText}`} />
                ) : (
                  <p className="text-xs text-muted-foreground">A revenue chart appears once the range covers at least 14 days with sales on at least two different {range === "365d" || range === "all" ? "weeks" : "days"}.</p>
                )}
              </div>
            </>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Orders by status">
            {isPending ? <SkeletonRows rows={3} /> : !inRange.length ? <EmptyState title="No orders in this range" /> : (
              <ul className="divide-y divide-border">
                {ORDER_STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-3 px-4 py-2">
                    <span className={cn("w-24 text-sm", STATUS_TONE[s].text)}>{STATUS_LABEL[s]}</span>
                    <div className="h-2 flex-1 bg-border" aria-hidden="true">
                      <div className={cn("h-2", STATUS_TONE[s].dot)} style={{ width: `${(statusCounts[s] / inRange.length) * 100}%` }} />
                    </div>
                    <span className="num w-10 text-right text-sm">{statusCounts[s]}</span>
                  </li>
                ))}
              </ul>
            )}
            {inRange.length ? (
              <p className="num border-t border-border px-4 py-2 text-xs text-muted-foreground">
                Cancelled: {cancelled} of {inRange.length} ({((cancelled / inRange.length) * 100).toFixed(0)}%). Counts every order placed in the range by its current status.
              </p>
            ) : null}
          </Panel>

          <Panel title="Top products">
            {isPending ? <SkeletonRows rows={3} /> : !topProducts.length ? <EmptyState title="No sales in this range" /> : (
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr><th className="adm-th">Product</th><th className="adm-th text-right">Qty</th><th className="adm-th text-right">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="adm-td">{p.name}</td>
                      <td className="adm-td num text-right">{p.qty}</td>
                      <td className="adm-td num text-right">{formatEGP(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Line totals from non-cancelled website orders, by quantity.</p>
          </Panel>

          <Panel title="Delivery and payment">
            {isPending ? <SkeletonRows rows={2} /> : !mix.total ? <EmptyState title="No orders in this range" /> : (
              <dl className="num grid grid-cols-2 divide-x divide-y divide-border text-sm">
                {[
                  ["Pickup", mix.pickup],
                  ["Aramex", mix.aramex],
                  ["Cash on delivery", mix.cod],
                  ["InstaPay", mix.instapay],
                ].map(([label, n]) => (
                  <div key={label as string} className="px-4 py-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-lg font-semibold">{n} <span className="text-xs font-normal text-muted-foreground">({Math.round(((n as number) / mix.total) * 100)}%)</span></dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Offline sales (entered by hand)">
            {offline.error ? (
              <div className="p-4"><ErrorState error={offline.error} onRetry={() => offline.refetch()} /></div>
            ) : offline.isPending ? <SkeletonRows rows={2} /> : (
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="px-4 py-3"><p className="text-xs text-muted-foreground">Revenue</p><p className="num text-2xl font-bold">{formatEGP(offlineInRange.revenue)}</p></div>
                <div className="px-4 py-3"><p className="text-xs text-muted-foreground">Sales</p><p className="num text-2xl font-bold">{offlineInRange.count}</p></div>
              </div>
            )}
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Manual entries only, kept apart from website figures and never added to them. <Link to="/admin/stats" className="underline">Manage offline sales</Link>
            </p>
          </Panel>
        </div>

        <Panel title="Not available yet">
          <ul className="divide-y divide-border">
            <li className="px-4 py-2.5 text-sm">
              <span className="font-medium">Filament used</span>
              {filament.recorded ? (
                <span className="num text-muted-foreground"> · {(filament.grams / 1000).toFixed(2)} kg recorded on {filament.recorded} of {filament.of} completed orders in this range. Not estimated for the rest.</span>
              ) : (
                <span className="text-muted-foreground"> · Record filament grams on orders (order drawer → Production) and totals appear here.</span>
              )}
            </li>
            {UNAVAILABLE.map((u) => (
              <li key={u.name} className="px-4 py-2.5 text-sm">
                <span className="font-medium">{u.name}</span> <span className="text-muted-foreground">· {u.why}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}
