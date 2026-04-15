/**
 * Delete or deactivate an admin order stat
 * DELETE /api/admin-stats-delete/?id=<stat_id>
 */

import { supabaseAdmin } from "./_lib/supabase-admin.js";
import { verifyAdminAuth } from "./_lib/admin-auth.js";

export default async (req, res) => {
  if (req.method !== "DELETE") {
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

    // Soft delete by marking as inactive
    const { data: updatedStat, error: updateError } = await supabaseAdmin
      .from("admin_order_stats")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!updatedStat) {
      return res.status(404).json({ error: "Stat not found" });
    }

    res.json({
      success: true,
      message: "Statistic deactivated",
      stat: updatedStat,
    });
  } catch (error) {
    console.error("Delete stat error:", error);
    res.status(500).json({ error: "Failed to delete statistic" });
  }
};
