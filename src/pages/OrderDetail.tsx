import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/lib/supabase";

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
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Items</h3>
                  <div className="space-y-3">
                    {data.items.map((item: any) => (
                      <div key={item.id} className="rounded-lg border border-border p-4">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Qty {item.qty} • {item.brand || "custom"}</p>
                        {item.subtotal != null ? (
                          <p className="text-sm text-primary font-semibold mt-1">EGP{Number(item.subtotal).toFixed(0)}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6 space-y-2">
                  <h3 className="font-heading text-lg font-semibold text-foreground">Totals</h3>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">EGP{Number(totals.subtotal || 0).toFixed(0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="text-foreground">EGP{Number(totals.shipping || 0).toFixed(0)}</span></div>
                  <div className="flex justify-between text-base font-semibold"><span className="text-foreground">Total</span><span className="text-primary">EGP{Number(totals.total || 0).toFixed(0)}</span></div>
                </div>

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
        </div>
      </section>
    </Layout>
  );
}
