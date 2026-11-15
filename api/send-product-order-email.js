import { json } from "./_lib/http.js";

/**
 * Retired. Product order emails are now sent by /api/orders-create from data the server has
 * validated and priced (see api/_lib/order-email.js).
 *
 * This endpoint used to accept any recipient and any order content without authentication,
 * which let anyone send branded email from the studio's domain. It is kept only so browsers
 * still running an older cached build finish checkout cleanly; it sends nothing.
 */
export const handler = async (event) => {
  const method = event?.httpMethod || "GET";
  if (method === "OPTIONS") return json(200, { ok: true });
  if (method !== "POST") return json(405, { error: "Method not allowed" });
  return json(200, { success: true, deprecated: true });
};
