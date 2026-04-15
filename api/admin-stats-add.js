/**
 * Add a manual order to statistics
 * POST /api/admin-stats-add
 * 
 * Body:
 * {
 *   orderCode: string (unique),
 *   orderDate: ISO string,
 *   customerName: string,
 *   customerEmail: string (optional),
 *   customerPhone: string (optional),
 *   revenue: number,
 *   weightGrams: number,
 *   notes: string (optional)
 * }
 */

import { supabaseAdmin } from "./_lib/supabase-admin.js";
import { verifyAdminAuth } from "./_lib/admin-auth.js";

export default async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify admin access
    const adminCheck = await verifyAdminAuth(req);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const {
      orderCode,
      orderDate,
      customerName,
      customerEmail,
      customerPhone,
      revenue,
      weightGrams,
      notes,
    } = req.body;

    // Validate required fields
    if (!orderCode || !orderDate || !customerName || revenue === undefined || weightGrams === undefined) {
      return res.status(400).json({
        error: "Missing required fields: orderCode, orderDate, customerName, revenue, weightGrams",
      });
    }

    // Check if order code already exists
    const { data: existing } = await supabaseAdmin
      .from("admin_order_stats")
      .select("id")
      .eq("order_code", orderCode)
      .single();

    if (existing) {
      return res.status(409).json({ error: "Order code already exists" });
    }

    // Insert new stat
    const { data: newStat, error: insertError } = await supabaseAdmin
      .from("admin_order_stats")
      .insert({
        order_code: orderCode,
        order_date: new Date(orderDate).toISOString(),
        order_type: "manual",
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        revenue: parseFloat(revenue),
        weight_grams: parseFloat(weightGrams),
        item_count: 1,
        notes: notes || null,
        is_active: true,
        is_completed: true,
        created_by: adminCheck.userId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({
      success: true,
      stat: newStat,
    });
  } catch (error) {
    console.error("Add stat error:", error);
    res.status(500).json({ error: "Failed to add order to statistics" });
  }
};
