import { getAccessToken } from "@/lib/auth-session";

/** Error from an admin API call. `status` is the HTTP status; `code` the server's error code, if any. */
export class AdminApiError extends Error {
  status: number;
  code?: string;
  data?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Calls an admin function with the signed-in user's token. Every /api/admin-* function checks the
 * token and the caller's role on the server; nothing here is an authorization decision.
 */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new AdminApiError("You're signed out. Sign in again to continue.", 401);

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` } });
  } catch {
    throw new AdminApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }

  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (!contentType.includes("application/json")) {
    throw new AdminApiError(
      `Admin API isn't answering (${res.status}). Locally, run \`netlify dev\` so /api functions work.`,
      res.status
    );
  }
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new AdminApiError("Admin API returned invalid JSON.", res.status);
  }
  if (!res.ok) {
    throw new AdminApiError(String(data.error || `Request failed (${res.status})`), res.status, data.code as string | undefined, data);
  }
  return data as T;
}

export function adminPost<T>(path: string, body: unknown) {
  return adminFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function errorMessage(err: unknown, fallback = "Something went wrong") {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** True when the error says a migration hasn't been run yet. */
export function isSetupMissing(err: unknown) {
  return err instanceof AdminApiError && err.code === "SETUP_REQUIRED";
}
