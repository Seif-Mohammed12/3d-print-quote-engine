import { json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin-auth.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = admin.supabase;

  const { data: stats, error } = await supabase
    .from("admin_order_stats")
    .select("id, order_code, order_date, customer_name, customer_email, customer_phone, revenue, weight_grams, notes, order_type, is_completed, is_active")
    .eq("is_active", true)
    .eq("is_completed", true)
    .order("order_date", { ascending: false });

  if (error) return json(500, { error: error.message });

  const activeStats = stats || [];
  const totalSales = activeStats.length;
  const totalRevenue = activeStats.reduce((sum, stat) => sum + Number(stat.revenue || 0), 0);
  const totalWeight = activeStats.reduce((sum, stat) => sum + Number(stat.weight_grams || 0), 0);

  const monthlyMap = new Map();
  for (const stat of activeStats) {
    const date = new Date(stat.order_date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = monthlyMap.get(month) || { month, sales: 0, revenue: 0, weight: 0 };
    current.sales += 1;
    current.revenue += Number(stat.revenue || 0);
    current.weight += Number(stat.weight_grams || 0);
    monthlyMap.set(month, current);
  }

  return json(200, {
    success: true,
    metrics: {
      totalSales,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalWeight: Number(totalWeight.toFixed(2)),
    },
    monthlyData: [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    orders: activeStats,
  });
};
