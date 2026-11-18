import { useAuth } from "@/lib/auth-context";

export type AdminRole = "viewer" | "manager" | "admin";

const RANK: Record<AdminRole, number> = { viewer: 1, manager: 2, admin: 3 };

/**
 * What the signed-in admin can do, for showing or hiding controls. The server checks the role
 * again on every request, so this is presentation only.
 */
export function useAdminPermissions() {
  const { adminRole } = useAuth();
  const role = (adminRole || "viewer") as AdminRole;
  return {
    role,
    canWrite: RANK[role] >= RANK.manager,
    isFullAdmin: role === "admin",
  };
}

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  viewer: "Can see orders, catalogue and insights. Can't change anything.",
  manager: "Can edit the catalogue and update orders. Can't delete orders.",
  admin: "Full access, including deleting orders.",
};
