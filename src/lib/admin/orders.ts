import type { OrderStatus } from "@/lib/orders-api";
import { adminFetch, adminPost } from "@/lib/admin/api";

export type SelectedOptionSnapshot = {
  groupId: string;
  group: string;
  valueId: string;
  value: string;
  priceDelta: number;
};

export type AdminOrderItem = {
  id: string;
  product_id: string | null;
  name: string;
  brand: string | null;
  qty: number;
  unit_price: number | null;
  subtotal: number | null;
  item_data: {
    primaryColor?: string;
    secondaryColor?: string;
    isBundle?: boolean;
    bundleItems?: Array<{ name: string; qty: number }>;
    options?: SelectedOptionSnapshot[];
    basePrice?: number;
    discount?: { oldPrice: number; newPrice: number } | null;
  } | null;
};

export type ShippingInfo = {
  method?: "pickup" | "aramex" | string;
  provider?: string;
  cost?: number;
  address?: { line1?: string; line2?: string; city?: string; governorate?: string } | null;
} | null;

/** Production fields added by 20261118_admin_workspace.sql. Undefined until it is run. */
export type ProductionFields = {
  due_date?: string | null;
  print_minutes?: number | null;
  filament_grams?: number | null;
  filament_material?: "PLA" | "PETG" | null;
  production_colour?: string | null;
  printer_name?: string | null;
};

export type AdminOrder = ProductionFields & {
  id: string;
  order_code: string;
  order_type: "product" | "quote";
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_notes: string | null;
  shipping: ShippingInfo;
  payment: { method?: "cod" | "instapay" | string } | null;
  totals: { subtotal?: number; shipping?: number; total?: number; currency?: string } | null;
  admin_notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  order_items?: AdminOrderItem[];
};

export type OrderHistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
};

export type AdminOrdersPayload = { orders: AdminOrder[]; productionFields: boolean };

export function fetchAdminOrders() {
  return adminFetch<AdminOrdersPayload>("/api/admin-orders-list");
}

export function fetchAdminOrder(id: string) {
  return adminFetch<{ order: AdminOrder; history: OrderHistoryEntry[]; productionFields: boolean }>(
    `/api/admin-orders-get?id=${encodeURIComponent(id)}`
  );
}

export type OrderPatch = ProductionFields & { status?: OrderStatus; admin_notes?: string | null };

/**
 * Update one order. `expectedUpdatedAt` is the `updated_at` the admin was looking at: if someone
 * else changed the order since, the server answers 409 CONFLICT instead of overwriting.
 */
export function updateAdminOrder(orderId: string, patch: OrderPatch, expectedUpdatedAt?: string) {
  return adminPost<{ order: AdminOrder }>("/api/admin-orders-update", { orderId, patch, expectedUpdatedAt });
}

export function bulkUpdateOrderStatus(orderIds: string[], status: OrderStatus) {
  return adminPost<{ updated: Array<{ id: string; updated_at: string; status: OrderStatus }>; failed: Array<{ id: string; error: string }> }>(
    "/api/admin-orders-bulk-update",
    { orderIds, status }
  );
}

export function orderTotal(order: Pick<AdminOrder, "totals">) {
  const n = Number(order.totals?.total);
  return Number.isFinite(n) ? n : 0;
}

/** Local calendar date "YYYY-MM-DD" (Cairo is the studio's time zone; the browser's is used). */
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Overdue only when a due date was set, it has passed, and the order is still open. */
export function isOverdue(order: Pick<AdminOrder, "due_date" | "status">, today = todayISO()) {
  if (!order.due_date) return false;
  if (order.status === "completed" || order.status === "cancelled") return false;
  return order.due_date < today;
}

export function formatOrderDate(iso: string, withTime = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatDueDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function shippingLabel(order: Pick<AdminOrder, "shipping">) {
  const method = order.shipping?.method;
  if (method === "pickup") return "Pickup";
  if (method === "aramex") return "Aramex";
  return method ? String(method) : "—";
}

export function paymentLabel(order: Pick<AdminOrder, "payment">) {
  const method = order.payment?.method;
  if (method === "cod") return "Cash on delivery";
  if (method === "instapay") return "InstaPay";
  return method ? String(method) : "—";
}

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value);
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV of the given orders, built in the browser from data the admin is already allowed to see. */
export function ordersToCsv(orders: AdminOrder[]) {
  const header = [
    "Order", "Created", "Status", "Customer", "Email", "Phone", "Shipping", "Address", "Payment",
    "Items", "Total (EGP)", "Due date", "Internal notes",
  ];
  const rows = orders.map((o) => {
    const a = o.shipping?.address;
    const address = a ? [a.line1, a.line2, a.city, a.governorate].filter(Boolean).join(", ") : "";
    const items = (o.order_items || [])
      .map((it) => {
        const opts = (it.item_data?.options || []).map((op) => `${op.group}: ${op.value}`);
        const colours = [it.item_data?.primaryColor, it.item_data?.secondaryColor].filter(Boolean);
        const extra = [...colours, ...opts].join(", ");
        return `${it.qty} x ${it.name}${extra ? ` (${extra})` : ""}`;
      })
      .join("; ");
    return [
      o.order_code, o.created_at, o.status, o.customer_name, o.customer_email, o.customer_phone,
      shippingLabel(o), address, paymentLabel(o), items, orderTotal(o), o.due_date || "", o.admin_notes || "",
    ].map(csvCell).join(",");
  });
  // BOM so Excel opens Arabic names as UTF-8.
  return "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
