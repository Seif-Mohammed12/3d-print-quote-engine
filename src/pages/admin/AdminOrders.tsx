import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { listAdminOrders, updateAdminOrderStatus, deleteAdminOrder, deleteAllAdminOrders, type OrderStatus } from "@/lib/orders-api";
import { toast } from "sonner";
import AdminNav from "@/components/admin/AdminNav";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];

export default function AdminOrders() {
  type DeleteDialogState =
    | { mode: "single"; order: any }
    | { mode: "all" }
    | null;

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: listAdminOrders,
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteOrder = async (orderId: string, orderCode?: string) => {
    setIsDeleting(true);
    try {
      await deleteAdminOrder(orderId);
      toast.success(`Deleted ${orderCode || "order"}`);
      setDeleteDialog(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAllAdminOrders();
      toast.success(`Deleted ${result?.count ?? 0} orders`);
      setDeleteDialog(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Delete all failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl space-y-6">
          <AdminNav />
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Orders</h1>
            <div className="flex items-center gap-2">
              {orders.length > 0 ? (
                <button
                  className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDialog({ mode: "all" })}
                >
                  Delete All
                </button>
              ) : null}
              <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={() => refetch()}>
                Refresh
              </button>
            </div>
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
                    <th className="text-center p-4">Actions</th>
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
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <button
                            className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteDialog({ mode: "single", order })}
                            title="Delete order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <AlertDialog
            open={Boolean(deleteDialog)}
            onOpenChange={(open) => {
              if (!open && !isDeleting) setDeleteDialog(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deleteDialog?.mode === "all" ? "Delete all orders?" : "Delete this order?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDialog?.mode === "all"
                    ? "This will permanently delete all orders and their related items/history. This action cannot be undone."
                    : `This will permanently delete order ${deleteDialog?.mode === "single" ? deleteDialog.order.order_code : ""} and related records. This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting || !deleteDialog}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!deleteDialog) return;
                    if (deleteDialog.mode === "all") {
                      void handleDeleteAll();
                      return;
                    }
                    void handleDeleteOrder(deleteDialog.order.id, deleteDialog.order.order_code);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </Layout>
  );
}
