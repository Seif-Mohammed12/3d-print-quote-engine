// Validation for admin order edits. Only these fields can be changed from the admin, and each
// is checked here: status against the table's allowed values, production fields by type.

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];
export const PRODUCTION_FIELDS = [
  "due_date",
  "print_minutes",
  "filament_grams",
  "filament_material",
  "production_colour",
  "printer_name",
];
const MATERIALS = ["PLA", "PETG"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanString(value, max) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const v = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return v ? v.slice(0, max) : null;
}

/** Returns { value: row } with only allowed, validated columns, or { error }. */
export function validateOrderPatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { error: "patch must be an object" };
  const row = {};

  if ("status" in patch) {
    if (!ORDER_STATUSES.includes(patch.status)) return { error: "Invalid status" };
    row.status = patch.status;
  }
  if ("admin_notes" in patch) {
    const v = cleanString(patch.admin_notes, 4000);
    if (v === undefined) return { error: "Notes must be text" };
    row.admin_notes = v;
  }
  if ("due_date" in patch) {
    const v = patch.due_date;
    if (v == null || v === "") row.due_date = null;
    else if (typeof v !== "string" || !DATE_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
      return { error: "Due date must be YYYY-MM-DD" };
    } else row.due_date = v;
  }
  if ("print_minutes" in patch) {
    const v = patch.print_minutes;
    if (v == null || v === "") row.print_minutes = null;
    else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 100000) return { error: "Print time must be whole minutes" };
      row.print_minutes = n;
    }
  }
  if ("filament_grams" in patch) {
    const v = patch.filament_grams;
    if (v == null || v === "") row.filament_grams = null;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1000000) return { error: "Filament must be grams (0 or more)" };
      row.filament_grams = Math.round(n * 100) / 100;
    }
  }
  if ("filament_material" in patch) {
    const v = patch.filament_material;
    if (v == null || v === "") row.filament_material = null;
    else if (!MATERIALS.includes(v)) return { error: "Material must be PLA or PETG" };
    else row.filament_material = v;
  }
  if ("production_colour" in patch) {
    const v = cleanString(patch.production_colour, 100);
    if (v === undefined) return { error: "Colour must be text" };
    row.production_colour = v;
  }
  if ("printer_name" in patch) {
    const v = cleanString(patch.printer_name, 100);
    if (v === undefined) return { error: "Printer must be text" };
    row.printer_name = v;
  }

  if (!Object.keys(row).length) return { error: "Nothing to update" };
  return { value: row };
}

export function touchesProductionFields(row) {
  return PRODUCTION_FIELDS.some((f) => f in row);
}
