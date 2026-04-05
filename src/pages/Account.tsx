import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/lib/auth-context";
import { listMyOrders } from "@/lib/orders-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Account() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

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
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile?.full_name, profile?.phone, user?.user_metadata?.full_name]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!supabase || !user?.id) throw new Error("Not authenticated");

      const payload = {
        id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
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
            <h3 className="font-heading text-xl font-semibold text-foreground">Quick actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/orders" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">View order history</Link>
              <Link to="/quote" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">New quote</Link>
              <Link to="/product-cart" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Product cart</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
