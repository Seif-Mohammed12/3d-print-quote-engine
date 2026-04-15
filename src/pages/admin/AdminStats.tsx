import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { DollarSign, Package, Droplet, Plus, Edit2, Trash2, Calendar, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import AdminNav from "@/components/admin/AdminNav";
import { getAccessToken } from "@/lib/auth-session";
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

type TimeGranularity = "day" | "week" | "month";

interface ChartPoint {
  label: string;
  sortKey: number;
  sales: number;
  revenue: number;
  weight: number;
}

function getUtcDateParts(input: string) {
  const date = new Date(input);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    week: getUtcWeekKey(date),
  };
}

function getUtcWeekKey(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildGranularityLabel(date: Date, granularity: TimeGranularity) {
  if (granularity === "day") return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (granularity === "week") {
    const parts = getUtcDateParts(date.toISOString());
    return `${parts.week}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function AdminStats() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    totalWeight: 0,
  });
  const [orders, setOrders] = useState<StatOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StatOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [granularity, setGranularity] = useState<TimeGranularity>("month");

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
        const token = await getAccessToken();
        if (!token) {
          throw new Error("You must be signed in to view statistics.");
        }

        const response = await fetch("/api/admin-stats-list", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || `Failed to load statistics (${response.status})`);
        }

        if (data.success) {
          setMetrics(data.metrics);
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
      const token = await getAccessToken();
      if (!token) {
        toast.error("You must be signed in to add statistics.");
        return;
      }

      const response = await fetch("/api/admin-stats-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to add order (${response.status})`);
      }

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
      const token = await getAccessToken();
      if (!token) {
        toast.error("You must be signed in to update statistics.");
        return;
      }

      const response = await fetch(`/api/admin-stats-update?id=${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to update order (${response.status})`);
      }

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
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("You must be signed in to delete statistics.");
        return;
      }

      const response = await fetch(`/api/admin-stats-delete?id=${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to delete order (${response.status})`);
      }

      if (data.success) {
        toast.success("Order removed from statistics");
        setOrders(orders.filter((o) => o.id !== orderId));
        setDeleteTarget(null);
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

  const chartData = useMemo<ChartPoint[]>(() => {
    const activeOrders = orders
      .filter((order) => order.is_completed)
      .slice()
      .sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());

    const buckets = new Map<string, ChartPoint>();

    for (const order of activeOrders) {
      const date = new Date(order.order_date);
      let key = "";
      let label = "";

      if (granularity === "day") {
        key = date.toISOString().slice(0, 10);
        label = buildGranularityLabel(date, "day");
      } else if (granularity === "week") {
        key = getUtcWeekKey(date);
        label = key;
      } else {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        label = buildGranularityLabel(date, "month");
      }

      const existing = buckets.get(key) || { label, sortKey: date.getTime(), sales: 0, revenue: 0, weight: 0 };
      existing.sales += 1;
      existing.revenue += Number(order.revenue || 0);
      existing.weight += Number(order.weight_grams || 0);
      existing.sortKey = Math.min(existing.sortKey, date.getTime());
      buckets.set(key, existing);
    }

    return [...buckets.entries()]
      .map(([key, value]) => ({
        ...value,
        sortKey: value.sortKey,
        label: granularity === "day" ? value.label : value.label,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [orders, granularity]);

  const chartEmptyMessage = granularity === "day"
    ? "No completed orders for daily view yet"
    : granularity === "week"
      ? "No completed orders for weekly view yet"
      : "No completed orders for monthly view yet";

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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 space-y-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Performance Trends</h3>
                    <p className="text-sm text-muted-foreground">Switch between day, week, and month to spot spikes and drops</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Group by</span>
                    <div className="relative">
                      <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value as TimeGranularity)}
                        className="appearance-none rounded-lg border border-border bg-secondary px-4 py-2 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </label>
                </div>

                {chartData.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-foreground">Revenue</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--secondary))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "10px",
                              color: "hsl(var(--foreground))",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value) => [`EGP${Number(value).toFixed(2)}`, "Revenue"]}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#22c55e" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm font-medium text-foreground">Filament Used</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--secondary))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "10px",
                              color: "hsl(var(--foreground))",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value) => [`${Number(value).toFixed(1)} g`, "Weight"]}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            name="Filament"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            dot={{ r: 3, fill: "#38bdf8" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{chartEmptyMessage}</p>
                )}
              </motion.div>

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
                                  onClick={() => setDeleteTarget(order)}
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

              <AlertDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                  if (!open && !busy) setDeleteTarget(null);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete statistics entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the order {deleteTarget?.order_code || ""} from the statistics page.
                      You can add it again later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={busy || !deleteTarget}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!deleteTarget) return;
                        void handleDeleteOrder(deleteTarget.id);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {busy ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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
