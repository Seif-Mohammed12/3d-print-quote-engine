import { json } from "./http.js";

// Migrations are applied by hand in the Supabase SQL editor, so new code can run before its
// migration has. These helpers turn "missing table/column" errors into a clear setup message.

const MISSING_CODES = new Set(["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"]);

export function isMissingSchema(error) {
  if (!error) return false;
  if (MISSING_CODES.has(error.code)) return true;
  return /does not exist|schema cache|could not find/i.test(String(error.message || ""));
}

export const WORKSPACE_MIGRATION = "supabase/migrations/20261118_admin_workspace.sql";

export function setupRequired(what, migration = WORKSPACE_MIGRATION) {
  return json(409, {
    code: "SETUP_REQUIRED",
    error: `${what} isn't set up yet: run ${migration} in the Supabase SQL editor.`,
    migration,
  });
}

/** True when `column` exists on `table` (probes with a zero-row select). */
export async function hasColumn(supabase, table, column) {
  const { error } = await supabase.from(table).select(column).limit(0);
  if (!error) return true;
  if (isMissingSchema(error)) return false;
  throw new Error(error.message);
}

/** True when `table` exists. */
export async function hasTable(supabase, table) {
  const { error } = await supabase.from(table).select("*").limit(0);
  if (!error) return true;
  if (isMissingSchema(error)) return false;
  throw new Error(error.message);
}

/** Parse a JSON request body; returns { value } or { response } with a 400. */
export function parseJsonBody(event, maxBytes = 64 * 1024) {
  const raw = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8").toString("utf8");
  if (Buffer.byteLength(raw) > maxBytes) return { response: json(413, { error: "Request is too large." }) };
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { response: json(400, { error: "Request body must be a JSON object." }) };
    }
    return { value };
  } catch {
    return { response: json(400, { error: "Invalid JSON" }) };
  }
}
