/**
 * Update an admin order stat
 * PUT /api/admin-stats-update/?id=<stat_id>
 * 
 * Body (all optional):
 * {
 *   weightGrams: number,
 *   revenue: number,
 *   notes: string,
 *   isCompleted: boolean
 * }
 */

import { supabaseAdmin } from "./_lib/supabase-admin.js";
import { verifyAdminAuth } from "./_lib/admin-auth.js";

export default async (req, res) => {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify admin access
    const adminCheck = await verifyAdminAuth(req);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Missing stat ID" });
    }

    const { weightGrams, revenue, notes, isCompleted } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (weightGrams !== undefined) updates.weight_grams = parseFloat(weightGrams);
    if (revenue !== undefined) updates.revenue = parseFloat(revenue);
    if (notes !== undefined) updates.notes = notes;
    if (isCompleted !== undefined) updates.is_completed = isCompleted;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Update stat
    const { data: updatedStat, error: updateError } = await supabaseAdmin
      .from("admin_order_stats")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!updatedStat) {
      return res.status(404).json({ error: "Stat not found" });
    }

    res.json({
      success: true,
      stat: updatedStat,
    });
  } catch (error) {
    console.error("Update stat error:", error);
    res.status(500).json({ error: "Failed to update statistic" });
  }
};
