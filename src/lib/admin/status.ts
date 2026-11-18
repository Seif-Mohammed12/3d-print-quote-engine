import type { OrderStatus } from "@/lib/orders-api";

/** Order statuses in workflow order. These are exactly the values the orders table allows. */
export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "completed", "cancelled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * One colour per status, used for the dot, the text and the board column rule. All text colours
 * pass WCAG AA (4.5:1) on the graphite background; the label is always shown next to the colour.
 */
export const STATUS_TONE: Record<OrderStatus, { text: string; dot: string; border: string }> = {
  pending: { text: "text-amber-300", dot: "bg-amber-300", border: "border-amber-300" },
  confirmed: { text: "text-sky-300", dot: "bg-sky-300", border: "border-sky-300" },
  processing: { text: "text-violet-300", dot: "bg-violet-300", border: "border-violet-300" },
  shipped: { text: "text-teal-300", dot: "bg-teal-300", border: "border-teal-300" },
  completed: { text: "text-emerald-300", dot: "bg-emerald-300", border: "border-emerald-300" },
  cancelled: { text: "text-zinc-400", dot: "bg-zinc-500", border: "border-zinc-500" },
};

/** Statuses where the order is still the studio's to act on. */
export const OPEN_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped"];

export function isOpenStatus(status: string) {
  return (OPEN_STATUSES as string[]).includes(status);
}
