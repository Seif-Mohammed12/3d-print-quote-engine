/**
 * Fetch admin statistics with monthly breakdown
 * GET /api/admin-stats
 * 
 * Returns:
 * - Total sales (completed orders count)
 * - Total revenue (all-time and by month)
 * - Total weight used (all-time and by month)
 * - Monthly breakdown for charting
 */

import { supabaseAdmin } from "./_lib/supabase-admin.js";
import { verifyAdminAuth } from "./_lib/admin-auth.js";

export default async (req, res) => {
  try {
    // Verify admin access
    const adminCheck = await verifyAdminAuth(req);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;

    // Build date filters
    let dateFilter = {};
    if (startDate) {
      dateFilter = {
        ...dateFilter,
        order_date: { gte: new Date(startDate).toISOString() },
      };
    }
    if (endDate) {
      dateFilter = {
        ...dateFilter,
        order_date: { lte: new Date(endDate).toISOString() },
      };
    }

    // Fetch active stats
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("admin_order_stats")
      .select("*")
      .eq("is_active", true)
      .eq("is_completed", true)
      .order("order_date", { ascending: false });

    if (statsError) throw statsError;

    // Calculate totals
    const totalSales = stats.length;
    const totalRevenue = stats.reduce((sum, s) => sum + (parseFloat(s.revenue) || 0), 0);
    const totalWeight = stats.reduce((sum, s) => sum + (parseFloat(s.weight_grams) || 0), 0);

    // Group by month for charts
    const monthlyData = {};
    stats.forEach((stat) => {
      const date = new Date(stat.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          sales: 0,
          revenue: 0,
          weight: 0,
        };
      }

      monthlyData[monthKey].sales += 1;
      monthlyData[monthKey].revenue += parseFloat(stat.revenue) || 0;
      monthlyData[monthKey].weight += parseFloat(stat.weight_grams) || 0;
    });

    // Convert to sorted array
    const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      metrics: {
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalWeight: parseFloat(totalWeight.toFixed(2)),
      },
      monthlyData: chartData,
      orders: stats,
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
