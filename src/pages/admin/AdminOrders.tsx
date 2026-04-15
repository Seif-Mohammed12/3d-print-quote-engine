import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { listAdminOrders, updateAdminOrderStatus, type OrderStatus } from "@/lib/orders-api";
import { toast } from "sonner";
import AdminNav from "@/components/admin/AdminNav";

const statuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];

export default function AdminOrders() {
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: listAdminOrders,
  });

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl space-y-6">
          <AdminNav />
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Orders</h1>
            <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={() => refetch()}>
              Refresh
            </button>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

          {orders.length > 0 ? (
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4">Order</th>
                    <th className="text-left p-4">Customer</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-right p-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-border/60">
                      <td className="p-4 font-semibold text-foreground">{order.order_code}</td>
                      <td className="p-4">
                        <p className="text-foreground">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </td>
                      <td className="p-4 uppercase text-muted-foreground">{order.order_type}</td>
                      <td className="p-4">
                        <select
                          className="rounded-lg bg-secondary border border-border px-2 py-1"
                          value={order.status}
                          onChange={async (e) => {
                            const nextStatus = e.target.value as OrderStatus;
                            try {
                              await updateAdminOrderStatus(order.id, nextStatus, order.admin_notes || "");
                              toast.success(`Updated ${order.order_code} to ${nextStatus}`);
                              refetch();
                            } catch (err: any) {
                              toast.error(err?.message || "Status update failed");
                            }
                          }}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
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
