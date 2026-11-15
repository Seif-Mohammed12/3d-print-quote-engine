import { json } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase-admin.js";
import { requireUser } from "./_lib/user-auth.js";
import { isValidGuestToken } from "./_lib/order-pricing.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(event);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return json(500, { error: "Server misconfigured: Supabase env vars are missing" });

  try {
    const body = JSON.parse(event.body || "{}");
    const guestToken = String(body?.guestToken || "").trim();

    if (!guestToken) {
      return json(400, { error: "Missing guest token" });
    }
    // Reject short or malformed tokens outright so the endpoint can't be used to guess them.
    if (!isValidGuestToken(guestToken)) {
      return json(200, { success: true, updated: 0 });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ user_id: auth.user.id, guest_token: null })
      .eq("guest_token", guestToken)
      .is("user_id", null)
      .select("id");

    if (error) return json(500, { error: error.message });

    return json(200, { success: true, updated: data?.length || 0 });
  } catch (error) {
    return json(500, { error: error?.message || "Failed to claim guest orders" });
  }
};
