import { getAccessToken } from "@/lib/auth-session";

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";

export type UserOrderRow = {
  id: string;
  order_code: string;
  order_type: "quote" | "product";
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  totals: { total?: number; currency?: string } | null;
  created_at: string;
};

export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ["pending", "confirmed"];

export async function createOrderRecord(payload: Record<string, unknown>) {
  const token = await getAccessToken();
  const guestToken = getOrCreateGuestToken();

  const response = await fetch("/api/orders-create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...payload, guestToken }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Order create failed (${response.status})`);
  }
  return data;
}

export async function listMyOrders(): Promise<UserOrderRow[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const response = await fetch("/api/orders-list", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Failed to fetch orders (${response.status})`);
  return (data?.orders || []) as UserOrderRow[];
}

export async function claimGuestOrders() {
  const guestToken = localStorage.getItem("guest_order_token");
  if (!guestToken) return { updated: 0 };

  const token = await getAccessToken();
  if (!token) return { updated: 0 };

  const response = await fetch("/api/orders-claim-guest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ guestToken }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Failed to claim guest orders (${response.status})`);
  }

  if ((data?.updated || 0) > 0) {
    localStorage.removeItem("guest_order_token");
  }

  return { updated: Number(data?.updated || 0) };
}

export async function cancelMyOrder(orderId: string, reason?: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch("/api/orders-cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, reason: reason || null }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Failed to cancel order (${response.status})`);
  }

  return data;
}

export async function listAdminOrders() {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch("/api/admin-orders-list", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Failed to load admin orders (${response.status})`);
  return data?.orders || [];
}

export async function updateAdminOrderStatus(orderId: string, status: OrderStatus, adminNotes?: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch("/api/admin-orders-update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId, status, adminNotes }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Failed to update status (${response.status})`);
  return data;
}

export async function deleteAdminOrder(orderId: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`/api/admin-orders-delete?id=${orderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Failed to delete order (${response.status})`);
  return data;
}

export async function deleteAllAdminOrders() {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch("/api/admin-orders-delete?all=true", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Failed to delete all orders (${response.status})`);
  return data;
}

function getOrCreateGuestToken() {
  const key = "guest_order_token";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, token);
  return token;
}
