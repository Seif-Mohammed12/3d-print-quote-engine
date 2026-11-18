import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/orders-api";
import { AdminApiError, errorMessage, isSetupMissing } from "@/lib/admin/api";
import {
  bulkDeleteOrders,
  bulkUpdateOrderStatus,
  fetchAdminOrders,
  updateAdminOrder,
  type AdminOrder,
  type AdminOrdersPayload,
  type OrderPatch,
} from "@/lib/admin/orders";
import { STATUS_LABEL } from "@/lib/admin/status";

export const ADMIN_ORDERS_KEY = ["admin-orders"] as const;

export function useAdminOrders() {
  return useQuery({ queryKey: ADMIN_ORDERS_KEY, queryFn: fetchAdminOrders, staleTime: 30_000, refetchOnWindowFocus: true });
}

/**
 * Order edits with an optimistic local update. Rollback is reliable (we hold the previous row),
 * so status changes offer Undo. Each order tracks its own pending state; a second edit to the
 * same order waits until the first one lands, so the conflict check always has a fresh timestamp.
 */
export function useOrderMutations() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const setRow = (id: string, updater: (o: AdminOrder) => AdminOrder) =>
    qc.setQueryData<AdminOrdersPayload>(ADMIN_ORDERS_KEY, (prev) =>
      prev ? { ...prev, orders: prev.orders.map((o) => (o.id === id ? updater(o) : o)) } : prev
    );

  const getRow = (id: string) => qc.getQueryData<AdminOrdersPayload>(ADMIN_ORDERS_KEY)?.orders.find((o) => o.id === id);

  async function patchOrder(order: AdminOrder, patch: OrderPatch, opts: { quiet?: boolean; label?: string } = {}) {
    if (pending[order.id]) {
      toast.message(`Still saving ${order.order_code}…`);
      return false;
    }
    const before = getRow(order.id) || order;
    setPending((p) => ({ ...p, [order.id]: true }));
    setRow(order.id, (o) => ({ ...o, ...patch }));
    try {
      const res = await updateAdminOrder(order.id, patch, before.updated_at);
      setRow(order.id, (o) => ({ ...o, ...res.order, order_items: o.order_items }));
      if (!opts.quiet) toast.success(opts.label || `${order.order_code} saved`);
      return true;
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "CONFLICT" && err.data?.order) {
        const latest = err.data.order as AdminOrder;
        setRow(order.id, (o) => ({ ...o, ...latest, order_items: o.order_items }));
        toast.error(err.message);
      } else {
        setRow(order.id, () => before);
        toast.error(isSetupMissing(err) ? errorMessage(err) : `${order.order_code}: ${errorMessage(err, "update failed")}`);
      }
      return false;
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[order.id];
        return next;
      });
    }
  }

  async function changeStatus(order: AdminOrder, status: OrderStatus) {
    if (order.status === status) return;
    const previous = order.status;
    const ok = await patchOrder(order, { status }, { quiet: true });
    if (!ok) return;
    toast.success(`${order.order_code} → ${STATUS_LABEL[status]}`, {
      action: {
        label: "Undo",
        onClick: () => {
          const latest = getRow(order.id);
          if (latest) void patchOrder(latest, { status: previous }, { label: `${order.order_code} back to ${STATUS_LABEL[previous]}` });
        },
      },
    });
  }

  async function bulkStatus(ids: string[], status: OrderStatus) {
    const res = await bulkUpdateOrderStatus(ids, status);
    for (const row of res.updated) setRow(row.id, (o) => ({ ...o, status: row.status, updated_at: row.updated_at }));
    if (res.failed.length) toast.error(`${res.failed.length} order(s) not updated: ${res.failed[0].error}`);
    if (res.updated.length) toast.success(`${res.updated.length} order(s) set to ${STATUS_LABEL[status]}`);
    return res;
  }

  async function bulkDelete(ids: string[]) {
    const res = await bulkDeleteOrders(ids);
    const gone = new Set([...res.deleted.map((r) => r.id), ...res.missing]);
    qc.setQueryData<AdminOrdersPayload>(ADMIN_ORDERS_KEY, (prev) => (prev ? { ...prev, orders: prev.orders.filter((o) => !gone.has(o.id)) } : prev));
    toast.success(`Deleted ${res.deleted.length} order${res.deleted.length === 1 ? "" : "s"}`);
    return res;
  }

  return { pending, patchOrder, changeStatus, bulkStatus, bulkDelete };
}
