import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireAdmin } from "./_lib/admin-auth.js";
import { hasColumn, hasTable } from "./_lib/schema.js";
import { isLegacyQuoteFlowEnabled } from "./_lib/legacy-flow.js";
import { isResendConfigured } from "./_lib/resend.js";

/**
 * Which parts of the admin workspace migration have been applied, and a few on/off switches
 * (viewer and up). Only booleans are returned: no keys, addresses or other configuration values.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const admin = await requireAdmin(event);
  if (!admin.ok) return admin.response;

  const supabase = getSupabaseAdmin() || admin.supabase;
  const check = async (fn) => {
    try {
      return await fn();
    } catch {
      return null;
    }
  };

  const [categories, productCategory, optionGroups, optionValues, imageOption, colourFlags, orderProduction] = await Promise.all([
    check(() => hasTable(supabase, "product_categories")),
    check(() => hasColumn(supabase, "products", "category_id")),
    check(() => hasTable(supabase, "product_option_groups")),
    check(() => hasTable(supabase, "product_option_values")),
    check(() => hasColumn(supabase, "product_images", "option_value_id")),
    check(() => hasColumn(supabase, "color_library", "out_of_stock")),
    check(() => hasColumn(supabase, "orders", "due_date")),
  ]);

  return json(200, {
    role: admin.role,
    schema: {
      categories: Boolean(categories && productCategory),
      options: Boolean(optionGroups && optionValues && imageOption),
      colourFlags: Boolean(colourFlags),
      orderProduction: Boolean(orderProduction),
    },
    switches: {
      legacyQuoteFlow: isLegacyQuoteFlowEnabled(),
      orderEmails: isResendConfigured(),
      serviceRoleKey: Boolean(getSupabaseAdmin()),
    },
  });
};
