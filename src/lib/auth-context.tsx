import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  signInWithProvider: (provider: "google" | "apple") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<AdminRole | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAdminRole(userId: string): Promise<AdminRole | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.role) return null;
  return data.role as AdminRole;
}

async function fetchAdminRoleWithTimeout(userId: string, timeoutMs = 5000): Promise<AdminRole | null> {
  return Promise.race([
    fetchAdminRole(userId),
    new Promise<AdminRole | null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRole = async () => {
    if (!user?.id) {
      setAdminRole(null);
      return null;
    }
    const role = await fetchAdminRole(user.id);
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

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextSession?.user?.id) {
        setAdminRole(null);
        return;
      }

      try {
        await claimGuestOrders();
      } catch {
        // Non-blocking: user can still proceed even if claim fails.
      }

      const role = await fetchAdminRoleWithTimeout(nextSession.user.id);
      if (mounted) setAdminRole(role);
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

        const role = data?.user?.id ? await fetchAdminRoleWithTimeout(data.user.id) : null;
        setAdminRole(role);
        return { role };
      },
      signInWithProvider: async (provider: "google" | "apple") => {
        if (!supabase) return { error: "Supabase is not configured." };
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) {
          const isUnsupportedProvider =
            error.message?.toLowerCase().includes("unsupported provider") ||
            error.message?.toLowerCase().includes("provider is not enabled");

          if (isUnsupportedProvider) {
            const providerLabel = provider === "google" ? "Google" : "Apple";
            return {
              error: `${providerLabel} sign-in is not enabled in Supabase yet. Enable it in Authentication > Providers, then add ${window.location.origin}/auth/callback as an allowed redirect URL.`,
            };
          }

          return { error: error.message };
        }
        return {};
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
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
