import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import CancelOrderDialog from "@/components/CancelOrderDialog";
import { useAuth } from "@/lib/auth-context";
import { cancelMyOrder, CUSTOMER_CANCELLABLE_STATUSES, listMyOrders } from "@/lib/orders-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const statusClass: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  processing: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  shipped: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export default function Account() {
  const { user, signOut, updatePassword } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["my-account-orders"],
    queryFn: listMyOrders,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: Boolean(user?.id && supabase),
    queryFn: async () => {
      if (!supabase || !user?.id) return null;
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("full_name, phone, address_line1, address_line2, city, governorate")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    setPhone(profile?.phone || "");
    setAddressLine1((profile as any)?.address_line1 || "");
    setAddressLine2((profile as any)?.address_line2 || "");
    setCity((profile as any)?.city || "");
    setGovernorate((profile as any)?.governorate || "");
  }, [profile, user?.user_metadata?.full_name]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!supabase || !user?.id) throw new Error("Not authenticated");

      const payload = {
        id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        governorate: governorate.trim() || null,
      };

      const { error } = await supabase.from("customer_profiles").upsert(payload);
      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || null,
        },
      });
    },
    onSuccess: () => toast.success("Profile updated"),
    onError: (error: any) => toast.error(error?.message || "Failed to update profile"),
  });

  const pendingCount = orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => cancelMyOrder(orderId),
    onSuccess: () => {
      toast.success("Order cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["my-account-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
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

  const changePassword = useMutation({
    mutationFn: async () => {
      const trimmedPassword = newPassword.trim();
      if (!trimmedPassword) throw new Error("Please enter a new password.");
      if (trimmedPassword.length < 8) throw new Error("Password must be at least 8 characters.");
      if (trimmedPassword !== confirmPassword.trim()) throw new Error("Passwords do not match.");

      const result = await updatePassword(trimmedPassword);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update password"),
  });

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-5xl space-y-6">
          <SectionHeading title="My Account" subtitle="Manage your profile and track every order." />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
              <h2 className="font-heading text-xl font-semibold text-foreground">{fullName || user?.user_metadata?.full_name || "Customer"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Sign out
              </button>
            </div>

            <div className="glass-card p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
              <p className="text-4xl font-heading font-bold text-foreground">{orders.length}</p>
              <p className="text-sm text-muted-foreground">Total orders placed</p>
            </div>

            <div className="glass-card p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">In progress</p>
              <p className="text-4xl font-heading font-bold text-primary">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending, confirmed, or processing</p>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-heading text-xl font-semibold text-foreground">Profile details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address line 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Governorate / State</label>
                <input
                  type="text"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saveProfile.isPending ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-xl font-semibold text-foreground">Order history</h3>
              <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">Open full page</Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-secondary/60 sticky top-0">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Order</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-3 font-semibold text-foreground">
                          <Link to={`/orders/${order.id}`} className="hover:underline">{order.order_code}</Link>
                        </td>
                        <td className="p-3 uppercase text-muted-foreground">{order.order_type}</td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[order.status] || ""}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {order.totals?.total != null ? `EGP${Number(order.totals.total).toFixed(0)}` : "-"}
                        </td>
                        <td className="p-3 text-right">
                          {CUSTOMER_CANCELLABLE_STATUSES.includes(order.status) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                              }}
                              disabled={cancelOrder.isPending && cancelingOrderId === order.id}
                              className="rounded-lg border border-rose-500/50 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                            >
                              {cancelOrder.isPending && cancelingOrderId === order.id ? "Cancelling..." : "Cancel"}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <CancelOrderDialog
            open={Boolean(selectedOrderId)}
            orderCode={selectedOrder?.order_code}
            isPending={cancelOrder.isPending}
            onOpenChange={(open) => {
              if (!open && !cancelOrder.isPending) setSelectedOrderId(null);
            }}
            onConfirm={confirmCancelSelectedOrder}
          />

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-heading text-xl font-semibold text-foreground">Change password</h3>
            <p className="text-sm text-muted-foreground">
              Use a strong password with at least 8 characters. This applies to email/password sign-in.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => changePassword.mutate()}
              disabled={changePassword.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {changePassword.isPending ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
