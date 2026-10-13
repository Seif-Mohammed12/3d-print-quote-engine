import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import CancelOrderDialog from "@/components/CancelOrderDialog";
import { cancelMyOrder, CUSTOMER_CANCELLABLE_STATUSES, listMyOrders } from "@/lib/orders-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const statusClass: Record<string, string> = {
  pending: "border-rule text-muted-foreground",
  confirmed: "border-rule text-foreground",
  processing: "border-ink/60 text-ink",
  shipped: "border-ink text-ink",
  completed: "border-success/60 text-success",
  cancelled: "border-destructive/60 text-destructive",
};

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const { data: orders = [], refetch, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: listMyOrders,
  });

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => cancelMyOrder(orderId),
    onSuccess: () => {
      toast.success("Order cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      setSelectedOrderId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Unable to cancel this order");
    },
  });

  async function confirmCancelSelectedOrder() {
    if (!selectedOrderId) return;
    try {
      setCancelingOrderId(selectedOrderId);
      await cancelOrder.mutateAsync(selectedOrderId);
    } finally {
      setCancelingOrderId(null);
    }
  }

  useEffect(() => {
    const channel = supabase
      ?.channel("orders-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl space-y-6">
          <SectionHeading title="Order History" subtitle="Track all your previous and current orders with live status updates." />

          {isLoading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

          {!isLoading && orders.length === 0 ? (
            <div className="panel p-6">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            </div>
          ) : null}

          {orders.length > 0 ? (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4">Order</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-right p-4">Total</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/60 hover:bg-secondary/40 cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="p-4 font-semibold text-foreground">{order.order_code}</td>
                      <td className="p-4 uppercase text-muted-foreground">{order.order_type}</td>
                      <td className="p-4">
                        <span className={`inline-flex border px-2 py-0.5 text-xs font-semibold ${statusClass[order.status] || ""}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right font-semibold text-foreground">
                        {order.totals?.total != null ? `${Number(order.totals.total).toFixed(0)} EGP` : "-"}
                      </td>
                      <td className="p-4 text-right">
                        {CUSTOMER_CANCELLABLE_STATUSES.includes(order.status) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(order.id);
                            }}
                            disabled={cancelOrder.isPending && cancelingOrderId === order.id}
                            className="rounded-lg border border-destructive/60 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                          >
                            {cancelOrder.isPending && cancelingOrderId === order.id ? "Cancelling..." : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <CancelOrderDialog
            open={Boolean(selectedOrderId)}
            orderCode={selectedOrder?.order_code}
            isPending={cancelOrder.isPending}
            onOpenChange={(open) => {
              if (!open && !cancelOrder.isPending) setSelectedOrderId(null);
            }}
            onConfirm={confirmCancelSelectedOrder}
          />
        </div>
      </section>
    </Layout>
  );
}
