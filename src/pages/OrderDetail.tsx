import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import CancelOrderDialog from "@/components/CancelOrderDialog";
import { supabase } from "@/lib/supabase";
import { cancelMyOrder, CUSTOMER_CANCELLABLE_STATUSES } from "@/lib/orders-api";
import { toast } from "sonner";

function MetadataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right break-words max-w-[60%]">{value}</span>
    </div>
  );
}

function extractItemData(item: any) {
  const data = item?.item_data || {};
  return {
    primaryColor: data.primaryColor || data.primaryColorId || data.primary_color || null,
    secondaryColor: data.secondaryColor || data.secondaryColorId || data.secondary_color || null,
    productId: data.productId || data.product_id || null,
    brand: data.brand || null,
    qty: data.qty ?? item.qty ?? null,
    unitPrice: data.unitPrice ?? item.unit_price ?? null,
    subtotal: data.subtotal ?? item.subtotal ?? null,
    discount: data.discount || null,
    notes: data.notes || data.note || null,
  };
}

async function getOrderById(orderId: string) {
  const { data: order, error: orderError } = await supabase
    ?.from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle()!;

  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Order not found");

  const { data: items, error: itemsError } = await supabase
    ?.from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })!;

  if (itemsError) throw new Error(itemsError.message);

  const { data: history, error: historyError } = await supabase
    ?.from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })!;

  if (historyError) throw new Error(historyError.message);

  return { order, items: items || [], history: history || [] };
}

export default function OrderDetail() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrderById(orderId),
    enabled: Boolean(orderId),
  });

  useEffect(() => {
    const channel = supabase
      ?.channel(`order-live-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => {
        refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history", filter: `order_id=eq.${orderId}` }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [orderId, refetch]);

  const totals = useMemo(() => data?.order?.totals || {}, [data?.order?.totals]);
  const shipping = useMemo(() => data?.order?.shipping || {}, [data?.order?.shipping]);
  const payment = useMemo(() => data?.order?.payment || {}, [data?.order?.payment]);
  const metadata = useMemo(() => data?.order?.metadata || {}, [data?.order?.metadata]);
  const canCancel = useMemo(
    () => Boolean(data?.order?.status && CUSTOMER_CANCELLABLE_STATUSES.includes(data.order.status)),
    [data?.order?.status]
  );

  const cancelOrder = useMutation({
    mutationFn: async () => cancelMyOrder(orderId),
    onSuccess: async () => {
      toast.success("Order cancelled successfully");
      await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Unable to cancel this order");
    },
  });

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <SectionHeading title="Order Details" subtitle="Live status and full order breakdown." />
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Back
            </button>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Loading order...</p> : null}
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

          {data ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Order</p>
                  <h2 className="font-heading text-2xl font-semibold text-foreground">{data.order.order_code}</h2>
                  <p className="text-sm text-muted-foreground">Status: <span className="text-foreground font-semibold">{data.order.status}</span></p>
                  <p className="text-sm text-muted-foreground">Placed: {new Date(data.order.created_at).toLocaleString()}</p>
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={cancelOrder.isPending}
                      className="mt-2 rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                    >
                      {cancelOrder.isPending ? "Cancelling..." : "Cancel this order"}
                    </button>
                  ) : null}
                </div>

                <div className="glass-card p-6 space-y-4">
                  <h3 className="font-heading text-lg font-semibold text-foreground">Order Info</h3>
                  <div className="space-y-2">
                    <MetadataRow label="Customer" value={data.order.customer_name} />
                    <MetadataRow label="Email" value={data.order.customer_email} />
                    <MetadataRow label="Phone" value={data.order.customer_phone} />
                    <MetadataRow label="Notes" value={data.order.customer_notes} />
                    <MetadataRow label="Order type" value={data.order.order_type} />
                    <MetadataRow label="Payment method" value={payment?.method} />
                    <MetadataRow label="Shipping method" value={shipping?.method} />
                    <MetadataRow label="Shipping provider" value={shipping?.provider} />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Items</h3>
                  <div className="space-y-3">
                    {data.items.map((item: any) => (
                      <div key={item.id} className="rounded-lg border border-border p-4">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Qty {item.qty} • {item.brand || "custom"}</p>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <MetadataRow label="Product ID" value={extractItemData(item).productId} />
                          <MetadataRow label="Primary color" value={extractItemData(item).primaryColor} />
                          <MetadataRow label="Secondary color" value={extractItemData(item).secondaryColor} />
                          {data.order.order_type !== "quote" && (
                            <>
                              <MetadataRow label="Unit price" value={extractItemData(item).unitPrice != null ? `EGP${Number(extractItemData(item).unitPrice).toFixed(0)}` : null} />
                              <MetadataRow label="Subtotal" value={extractItemData(item).subtotal != null ? `EGP${Number(extractItemData(item).subtotal).toFixed(0)}` : null} />
                            </>
                          )}
                          <MetadataRow label="Discount" value={extractItemData(item).discount ? "Applied" : null} />
                          <MetadataRow label="Item notes" value={extractItemData(item).notes} />
                        </div>
                        {data.order.order_type !== "quote" && item.subtotal != null ? (
                          <p className="text-sm text-primary font-semibold mt-1">EGP{Number(item.subtotal).toFixed(0)}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Submission Metadata</h3>
                  <div className="space-y-2">
                    <MetadataRow label="Brand" value={metadata?.brand} />
                    <MetadataRow label="Product file" value={metadata?.file?.name} />
                    <MetadataRow label="Material" value={metadata?.settings?.material} />
                    <MetadataRow label="Quality" value={metadata?.settings?.quality} />
                    <MetadataRow label="Infill" value={metadata?.settings?.infill != null ? `${metadata.settings.infill}%` : null} />
                    {data.order.order_type !== "quote" && (
                      <MetadataRow label="Estimate" value={metadata?.estimate?.totalPrice != null ? `EGP${Number(metadata.estimate.totalPrice).toFixed(0)}` : null} />
                    )}
                    <MetadataRow label="Address" value={shipping?.address ? [shipping.address.line1, shipping.address.line2, shipping.address.city, shipping.address.governorate].filter(Boolean).join(", ") : null} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {data.order.order_type !== "quote" && (
                  <div className="glass-card p-6 space-y-2">
                    <h3 className="font-heading text-lg font-semibold text-foreground">Totals</h3>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">EGP{Number(totals.subtotal || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="text-foreground">EGP{Number(totals.shipping || 0).toFixed(0)}</span></div>
                    <div className="flex justify-between text-base font-semibold"><span className="text-foreground">Total</span><span className="text-primary">EGP{Number(totals.total || 0).toFixed(0)}</span></div>
                  </div>
                )}

                <div className="glass-card p-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Status timeline</h3>
                  <div className="space-y-3">
                    {data.history.map((entry: any) => (
                      <div key={entry.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{entry.new_status}</p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                        {entry.note ? <p className="text-xs text-muted-foreground mt-1">{entry.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <CancelOrderDialog
            open={cancelDialogOpen}
            orderCode={data?.order?.order_code}
            isPending={cancelOrder.isPending}
            onOpenChange={(open) => {
              if (!open && !cancelOrder.isPending) setCancelDialogOpen(false);
            }}
            onConfirm={() => cancelOrder.mutate()}
          />
        </div>
      </section>
    </Layout>
  );
}
