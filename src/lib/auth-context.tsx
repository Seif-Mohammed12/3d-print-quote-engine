import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { claimGuestOrders } from "@/lib/orders-api";

type AdminRole = "viewer" | "manager" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string; role?: AdminRole | null }>;
  signInWithProvider: (provider: "google") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<AdminRole | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAdminRoleAttempt(userId: string): Promise<{ role: AdminRole | null; hadError: boolean }> {
  if (!supabase || !userId) return { role: null, hadError: true };
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { role: null, hadError: true };
  if (!data?.role) return { role: null, hadError: false };
  return { role: data.role as AdminRole, hadError: false };
}

async function fetchAdminRoleFromToken(token: string): Promise<AdminRole | null> {
  try {
    const response = await fetch("/api/user-role", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return (data?.role as AdminRole | null) || null;
  } catch {
    return null;
  }
}

async function resolveAdminRoleWithRetry(
  userId: string,
  token?: string | null,
  retries = 3,
  delayMs = 200
): Promise<AdminRole | null> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (token) {
      const roleFromApi = await fetchAdminRoleFromToken(token);
      if (roleFromApi) return roleFromApi;
    }

    const result = await fetchAdminRoleAttempt(userId);
    if (result.role) return result.role;

    // If user simply has no admin row, don't keep retrying.
    if (!result.hadError) return null;

    if (attempt < retries - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return null;
}

async function resolveAdminRoleWithTimeout(userId: string, token?: string | null, timeoutMs = 1500): Promise<AdminRole | null> {
  return Promise.race([
    resolveAdminRoleWithRetry(userId, token),
    new Promise<AdminRole | null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

function clearStoredSupabaseTokens() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  }

  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      sessionStorage.removeItem(key);
    }
  }
}

function getOAuthRedirectTo() {
  const fallback = `${window.location.origin}/auth/callback`;
  const configured = (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined)?.trim();

  if (!configured) return fallback;

  const isProductionHost = !["localhost", "127.0.0.1"].includes(window.location.hostname);
  const configuredIsLocal = configured.includes("localhost") || configured.includes("127.0.0.1");

  // Prevent production builds from accidentally redirecting users to local dev callback URLs.
  if (isProductionHost && configuredIsLocal) return fallback;

  return configured;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);
  const latestUserIdRef = useRef<string | null>(null);
  const latestAdminRoleRef = useRef<AdminRole | null>(null);

  useEffect(() => {
    latestUserIdRef.current = user?.id || null;
    latestAdminRoleRef.current = adminRole;
  }, [user?.id, adminRole]);

  const refreshRole = async () => {
    if (!user?.id) {
      setAdminRole(null);
      return null;
    }
    const role = await resolveAdminRoleWithRetry(user.id);
    setAdminRole(role);
    return role;
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;

      const previousUserId = latestUserIdRef.current;
      const nextUserId = nextSession?.user?.id || null;

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextUserId) {
        setAdminRole(null);
        return;
      }

      if (previousUserId !== nextUserId) {
        setAdminRole(null);
      }

      try {
        await claimGuestOrders();
      } catch {
        // Non-blocking: user can still proceed even if claim fails.
      }

      const role = await resolveAdminRoleWithRetry(nextUserId, nextSession?.access_token || null);
      if (!mounted) return;

      if (role) {
        setAdminRole(role);
        return;
      }

      // If role lookup temporarily fails for the same user, keep the previous admin role
      // to avoid dropping admin UI access during token refresh churn.
      if (previousUserId !== nextUserId || !latestAdminRoleRef.current) {
        setAdminRole(null);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session ?? null))
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await applySession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(adminRole),
      adminRole,
      signUpWithPassword: async (email: string, password: string, fullName: string) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) return { error: error.message };

        if (data.user?.id) {
          await supabase.from("customer_profiles").upsert({
            id: data.user.id,
            full_name: fullName,
          });
        }

        return {};
      },
      signInWithPassword: async (email: string, password: string) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

        const userId = data?.user?.id || null;
        const token = data?.session?.access_token || null;
        const role = userId ? await resolveAdminRoleWithTimeout(userId, token, 1500) : null;
        setAdminRole(role);

        if (userId && !role) {
          // Complete a slower role resolution in background so admin state can still settle soon after navigation.
          void resolveAdminRoleWithRetry(userId, token, 5, 250).then((resolvedRole) => {
            if (resolvedRole) setAdminRole(resolvedRole);
          });
        }

        return { role };
      },
      signInWithProvider: async (provider: "google") => {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = getOAuthRedirectTo();
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) {
          const isUnsupportedProvider =
            error.message?.toLowerCase().includes("unsupported provider") ||
            error.message?.toLowerCase().includes("provider is not enabled");

          if (isUnsupportedProvider) {
            return {
              error: `Google sign-in is not enabled in Supabase yet. Enable it in Authentication > Providers, then add ${window.location.origin}/auth/callback as an allowed redirect URL.`,
            };
          }

          return { error: error.message };
        }
        return {};
      },
      signOut: async () => {
        setSession(null);
        setUser(null);
        setAdminRole(null);

        if (!supabase) {
          clearStoredSupabaseTokens();
          return;
        }

        try {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) clearStoredSupabaseTokens();
        } catch {
          clearStoredSupabaseTokens();
        }
      },
      refreshRole,
    }),
    [adminRole, loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
