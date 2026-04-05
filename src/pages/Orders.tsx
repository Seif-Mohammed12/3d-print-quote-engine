import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { listMyOrders } from "@/lib/orders-api";
import { supabase } from "@/lib/supabase";

const statusClass: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  processing: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  shipped: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export default function Orders() {
  const navigate = useNavigate();
  const { data: orders = [], refetch, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: listMyOrders,
  });

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
            <div className="glass-card p-6">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            </div>
          ) : null}

          {orders.length > 0 ? (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4">Order</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-right p-4">Total</th>
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
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[order.status] || ""}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right font-semibold text-foreground">
                        {order.totals?.total != null ? `EGP${Number(order.totals.total).toFixed(0)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
