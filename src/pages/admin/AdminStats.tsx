import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { DollarSign, Package, Droplet, Plus, Edit2, Trash2, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import AdminNav from "@/components/admin/AdminNav";

interface StatOrder {
  id: string;
  order_code: string;
  order_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  revenue: number;
  weight_grams: number;
  notes?: string;
  order_type: string;
  is_completed: boolean;
}

interface Metrics {
  totalSales: number;
  totalRevenue: number;
  totalWeight: number;
}

interface MonthlyData {
  month: string;
  sales: number;
  revenue: number;
  weight: number;
}

export default function AdminStats() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    totalWeight: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [orders, setOrders] = useState<StatOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [formData, setFormData] = useState({
    orderCode: "",
    orderDate: new Date().toISOString().split("T")[0],
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    revenue: "",
    weightGrams: "",
    notes: "",
  });

  const [editData, setEditData] = useState({
    weightGrams: "",
    revenue: "",
    notes: "",
  });

  // Fetch stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/admin-stats-list`
        );
        const data = await response.json();

        if (data.success) {
          setMetrics(data.metrics);
          setMonthlyData(data.monthlyData || []);
          setOrders(data.orders || []);
        } else {
          toast.error("Failed to load statistics");
        }
      } catch (error) {
        console.error("Load stats error:", error);
        toast.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderCode || !formData.customerName || !formData.revenue || formData.weightGrams === "") {
      toast.error("Please fill in all required fields");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/admin-stats-add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderCode: formData.orderCode,
            orderDate: formData.orderDate,
            customerName: formData.customerName,
            customerEmail: formData.customerEmail || undefined,
            customerPhone: formData.customerPhone || undefined,
            revenue: parseFloat(formData.revenue),
            weightGrams: parseFloat(formData.weightGrams),
            notes: formData.notes || undefined,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Order added to statistics");
        setOrders([data.stat, ...orders]);
        setMetrics({
          totalSales: metrics.totalSales + 1,
          totalRevenue: metrics.totalRevenue + parseFloat(formData.revenue),
          totalWeight: metrics.totalWeight + parseFloat(formData.weightGrams),
        });
        setFormData({
          orderCode: "",
          orderDate: new Date().toISOString().split("T")[0],
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          revenue: "",
          weightGrams: "",
          notes: "",
        });
        setShowAddForm(false);
      } else {
        toast.error(data.error || "Failed to add order");
      }
    } catch (error) {
      console.error("Add order error:", error);
      toast.error("Failed to add order to statistics");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateOrder = async (orderId: string) => {
    const updates: Record<string, any> = {};
    if (editData.weightGrams) updates.weightGrams = parseFloat(editData.weightGrams);
    if (editData.revenue) updates.revenue = parseFloat(editData.revenue);
    if (editData.notes) updates.notes = editData.notes;

    if (Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/admin-stats-update?id=${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Order updated");
        setOrders(orders.map((o) => (o.id === orderId ? data.stat : o)));
        setEditingId(null);
        setEditData({ weightGrams: "", revenue: "", notes: "" });
      } else {
        toast.error("Failed to update order");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update order");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Delete this order from statistics?")) return;

    setBusy(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/admin-stats-delete?id=${orderId}`,
        { method: "DELETE" }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Order removed from statistics");
        setOrders(orders.filter((o) => o.id !== orderId));
        setEditingId(null);
      } else {
        toast.error("Failed to delete order");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete order");
    } finally {
      setBusy(false);
    }
  };

  const avgRevenuePerOrder = metrics.totalSales > 0 ? (metrics.totalRevenue / metrics.totalSales).toFixed(2) : 0;
  const avgWeightPerOrder = metrics.totalSales > 0 ? (metrics.totalWeight / metrics.totalSales).toFixed(2) : 0;

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-7xl space-y-8">
          <AdminNav />
          {/* Page Title */}
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Sales Statistics</h1>
            <p className="text-muted-foreground mt-2">Track revenue, orders, and filament usage</p>
          </div>

          {!loading && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-heading text-3xl font-bold text-foreground">{metrics.totalSales}</p>
                  <p className="text-xs text-muted-foreground">Completed orders</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-6 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-heading text-3xl font-bold text-foreground">
                    EGP{metrics.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">All-time</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-6 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Filament Used</p>
                    <Droplet className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-heading text-3xl font-bold text-foreground">
                    {(metrics.totalWeight / 1000).toFixed(2)} kg
                  </p>
                  <p className="text-xs text-muted-foreground">{Math.round(metrics.totalWeight)} grams</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-6 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Avg per Order</p>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-heading text-3xl font-bold text-foreground">EGP{avgRevenuePerOrder}</p>
                  <p className="text-xs text-muted-foreground">{avgWeightPerOrder}g avg weight</p>
                </motion.div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <h3 className="font-semibold text-foreground mb-4">Revenue by Month</h3>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                        <YAxis stroke="var(--color-muted-foreground)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </motion.div>

                {/* Weight Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-6"
                >
                  <h3 className="font-semibold text-foreground mb-4">Filament Used by Month</h3>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                        <YAxis stroke="var(--color-muted-foreground)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-secondary)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="weight" fill="var(--color-primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </motion.div>
              </div>

              {/* Add Order Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Manual Order
                  </h3>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showAddForm ? "Cancel" : "Add Order"}
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Order Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.orderCode}
                        onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="ORD-001"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Order Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.orderDate}
                        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="John Doe"
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="john@example.com"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="+20 1XX XXX XXXX"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Revenue (EGP) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.revenue}
                        onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Weight (grams) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.weightGrams}
                        onChange={(e) => setFormData({ ...formData, weightGrams: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                        placeholder="250"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm resize-none"
                        placeholder="Optional notes..."
                        rows={2}
                        maxLength={500}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="md:col-span-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all disabled:opacity-50"
                    >
                      {busy ? "Adding..." : "Add to Statistics"}
                    </button>
                  </form>
                )}
              </motion.div>

              {/* Orders List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-4"
              >
                <h3 className="font-semibold text-foreground">Orders ({orders.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground">Order Code</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Weight (g)</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground text-sm">
                            No orders yet
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="p-3">
                              <span className="font-medium text-foreground">{order.order_code}</span>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(order.order_date).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="text-foreground">{order.customer_name}</div>
                              {order.customer_email && <div className="text-xs text-muted-foreground">{order.customer_email}</div>}
                            </td>
                            <td className="p-3 text-right font-medium text-foreground">EGP{order.revenue.toFixed(2)}</td>
                            <td className="p-3 text-right font-medium text-foreground">{order.weight_grams.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingId(order.id);
                                    setEditData({
                                      weightGrams: order.weight_grams.toString(),
                                      revenue: order.revenue.toString(),
                                      notes: order.notes || "",
                                    });
                                  }}
                                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Edit Modal */}
              {editingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 max-w-md w-full space-y-4"
                  >
                    <h3 className="font-semibold text-foreground text-lg">Edit Order</h3>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Revenue (EGP)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.revenue}
                        onChange={(e) => setEditData({ ...editData, revenue: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Weight (grams)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.weightGrams}
                        onChange={(e) => setEditData({ ...editData, weightGrams: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Notes</label>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm resize-none"
                        rows={2}
                        maxLength={500}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateOrder(editingId)}
                        disabled={busy}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all disabled:opacity-50"
                      >
                        {busy ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
