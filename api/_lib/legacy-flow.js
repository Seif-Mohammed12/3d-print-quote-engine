// The site's original STL upload / quote / multi-file checkout flow, replaced by 3D Print OS.
// Its endpoints accept anonymous uploads and send email, so they stay off unless the owner
// deliberately turns the old flow back on with LEGACY_QUOTE_FLOW_ENABLED=true.

export function isLegacyQuoteFlowEnabled(env = process.env) {
  return String(env.LEGACY_QUOTE_FLOW_ENABLED || "").trim().toLowerCase() === "true";
}

export const LEGACY_FLOW_DISABLED_MESSAGE =
  "This quote flow has been retired. Message us on WhatsApp (+20 109 922 8486) for a custom print.";

/** Response for a retired endpoint, or null when the legacy flow is enabled. */
export function legacyFlowDisabledResponse(env = process.env) {
  if (isLegacyQuoteFlowEnabled(env)) return null;
  return {
    statusCode: 410,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ error: LEGACY_FLOW_DISABLED_MESSAGE, code: "LEGACY_FLOW_DISABLED" }),
  };
}
