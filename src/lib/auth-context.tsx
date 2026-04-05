import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { claimGuestOrders } from "@/lib/orders-api";

type AdminRole = "viewer" | "manager" | "admin";

// Debug mode tracking
let isDebugMode = false;
let roleSourceRef: { current: 'cache' | 'api' | 'db' | 'email' | 'timeout-provisional' | 'none' | null } = { current: null };
let roleResolutionStartRef: { current: number | null } = { current: null };
let debugMessagesRef: { current: string[] } = { current: [] };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleResolved: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string; role?: AdminRole | null }>;
  signInWithProvider: (provider: "google") => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<AdminRole | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const ADMIN_ROLE_CACHE_KEY = "3d-print-it-admin-role-cache";
const ADMIN_ROLE_CACHE_RECHECK_KEY = "3d-print-it-admin-role-cache-recheck";
const ADMIN_ROLE_CACHE_MS = 10 * 60 * 1000;
const ADMIN_ROLE_RECHECK_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

type AdminRoleCache = {
  userId: string;
  role: AdminRole;
  expiresAt: number;
};

function readAdminRoleCache(userId: string): AdminRole | null {
  try {
    const raw = localStorage.getItem(ADMIN_ROLE_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as AdminRoleCache;
    if (!cached || cached.userId !== userId) return null;
    if (Date.now() > cached.expiresAt) return null;
    return cached.role;
  } catch {
    return null;
  }
}

function shouldRecheckAdminRole(userId: string): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_ROLE_CACHE_RECHECK_KEY);
    if (!raw) return false;
    
    const recheck = JSON.parse(raw) as { userId: string; recheckAt: number; reason: string };
    if (!recheck || recheck.userId !== userId) return false;
    
    const shouldRecheck = Date.now() > recheck.recheckAt;
    if (shouldRecheck) {
      logDebugMessage('Cache', 'Cache needs recheck (threshold expired)', { userId, reason: recheck.reason });
    }
    return shouldRecheck;
  } catch {
    return false;
  }
}

function markCacheForRecheck(userId: string, reason: string) {
  try {
    const recheck = {
      userId,
      recheckAt: Date.now() + ADMIN_ROLE_RECHECK_THRESHOLD_MS,
      reason,
    };
    localStorage.setItem(ADMIN_ROLE_CACHE_RECHECK_KEY, JSON.stringify(recheck));
    logDebugMessage('Cache', 'Cache marked for recheck', { userId, reason, recheckAt: new Date(recheck.recheckAt).toISOString() });
  } catch {
    // Ignore storage failures
  }
}

function clearCacheRecheck(userId: string) {
  try {
    const raw = localStorage.getItem(ADMIN_ROLE_CACHE_RECHECK_KEY);
    if (raw) {
      const recheck = JSON.parse(raw) as { userId: string };
      if (recheck.userId === userId) {
        localStorage.removeItem(ADMIN_ROLE_CACHE_RECHECK_KEY);
        logDebugMessage('Cache', 'Cache recheck flag cleared', { userId });
      }
    }
  } catch {
    // Ignore storage failures
  }
}

function writeAdminRoleCache(userId: string, role: AdminRole | null) {
  try {
    if (!role) {
      localStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
      clearCacheRecheck(userId);
      return;
    }

    const cached: AdminRoleCache = {
      userId,
      role,
      expiresAt: Date.now() + ADMIN_ROLE_CACHE_MS,
    };
    localStorage.setItem(ADMIN_ROLE_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage failures.
  }
}

async function fetchAdminRoleAttempt(userId: string): Promise<{ role: AdminRole | null; hadError: boolean }> {
  if (!supabase || !userId) return { role: null, hadError: true };
  
  logDebugMessage('DB', 'Querying admin_users table', { userId });
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logDebugMessage('DB', 'DB query error', { error: String(error) });
    return { role: null, hadError: true };
  }
  
  if (!data?.role) {
    logDebugMessage('DB', 'No admin row in DB', { userId });
    return { role: null, hadError: false };
  }
  
  const role = data.role as AdminRole;
  logDebugMessage('DB', 'DB query returned role', { role });
  if (role) roleSourceRef.current = 'db';
  
  return { role, hadError: false };
}

async function fetchAdminRoleFromToken(token: string): Promise<AdminRole | null> {
  try {
    logDebugMessage('API', 'Calling /api/user-role endpoint with token');
    const response = await fetch("/api/user-role", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      logDebugMessage('API', 'API call failed', { status: response.status });
      return null;
    }
    
    const role = (data?.role as AdminRole | null) || null;
    logDebugMessage('API', 'API returned role', { role });
    if (role) roleSourceRef.current = 'api';
    
    return role;
  } catch (err) {
    logDebugMessage('API', 'API call error', { error: String(err) });
    return null;
  }
}

async function resolveAdminRoleWithRetry(
  userId: string,
  token?: string | null,
  retries = 3,
  delayMs = 200
): Promise<AdminRole | null> {
  roleResolutionStartRef.current = Date.now();
  logDebugMessage('Resolve', 'Starting admin role resolution', { userId, hasToken: Boolean(token), retries, delayMs });
  
  for (let attempt = 0; attempt < retries; attempt += 1) {
    logDebugMessage('Resolve', `Attempt ${attempt + 1}/${retries}`);
    
    if (token) {
      const roleFromApi = await fetchAdminRoleFromToken(token);
      if (roleFromApi) {
        logDebugMessage('Resolve', 'Role resolved from API', { role: roleFromApi });
        return roleFromApi;
      }
    }

    const result = await fetchAdminRoleAttempt(userId);
    if (result.role) {
      logDebugMessage('Resolve', 'Role resolved from DB', { role: result.role });
      return result.role;
    }

    // If user simply has no admin row, don't keep retrying.
    if (!result.hadError) {
      logDebugMessage('Resolve', 'No admin row found, stopping retries');
      roleSourceRef.current = 'none';
      return null;
    }

    if (attempt < retries - 1) {
      logDebugMessage('Resolve', `Retrying after ${delayMs}ms`);
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  logDebugMessage('Resolve', 'All retries exhausted, returning null');
  return null;
}

async function resolveAdminRoleWithTimeout(userId: string, token?: string | null, timeoutMs = 1500): Promise<AdminRole | null> {
  logDebugMessage('Timeout', 'Starting role resolution with timeout', { userId, timeoutMs });
  
  const result = await Promise.race([
    resolveAdminRoleWithRetry(userId, token),
    new Promise<AdminRole | null>((resolve) => {
      window.setTimeout(() => {
        logDebugMessage('Timeout', 'Timeout expired, returning null');
        roleSourceRef.current = 'timeout-provisional';
        resolve(null);
      }, timeoutMs);
    }),
  ]);
  
  logDebugMessage('Timeout', 'Timeout resolution completed', { result });
  return result;
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

function getPasswordResetRedirectTo() {
  const fallback = `${window.location.origin}/reset-password`;
  const configured = (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined)?.trim();

  if (!configured) return fallback;

  const isProductionHost = !["localhost", "127.0.0.1"].includes(window.location.hostname);
  const configuredIsLocal = configured.includes("localhost") || configured.includes("127.0.0.1");
  if (isProductionHost && configuredIsLocal) return fallback;

  try {
    const url = new URL(configured);
    url.pathname = "/reset-password";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

// Debug utilities
function initializeDebugMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    isDebugMode = params.has('debug') && params.get('debug') === 'auth';
  } catch {
    isDebugMode = false;
  }
}

function logDebugMessage(category: string, message: string, data?: Record<string, unknown>) {
  if (!isDebugMode) return;
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  const fullMessage = `[AUTH-DEBUG ${timestamp}] ${category}: ${message}${dataStr}`;
  
  console.log(fullMessage);
  if (debugMessagesRef.current.length < 100) {
    debugMessagesRef.current.push(fullMessage);
  }
}

function dumpAuthState(userId?: string | null, currentAdminRole?: AdminRole | null, roleResolved?: boolean) {
  try {
    const cachedRaw = localStorage.getItem(ADMIN_ROLE_CACHE_KEY);
    let cachedRoleExpiry: string | null = null;
    
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as AdminRoleCache;
      const timeUntilExpiry = parsed.expiresAt - Date.now();
      cachedRoleExpiry = timeUntilExpiry > 0 ? `${Math.round(timeUntilExpiry / 1000)}s remaining` : 'expired';
    }
    
    const state = {
      userId: userId || null,
      adminRole: currentAdminRole || null,
      roleResolved: roleResolved ?? false,
      roleSource: roleSourceRef.current,
      cachedRoleExpiry,
      resolutionDurationMs: roleResolutionStartRef.current ? Date.now() - roleResolutionStartRef.current : null,
    };
    
    console.log('[AUTH-STATE-DUMP]', state);
    console.log('[AUTH-DEBUG-MESSAGES]', debugMessagesRef.current.slice(-20));
    
    return state;
  } catch (err) {
    console.error('Error dumping auth state:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleResolved, setRoleResolved] = useState(false);
  const latestUserIdRef = useRef<string | null>(null);
  const latestAdminRoleRef = useRef<AdminRole | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  
  // Initialize debug mode on mount
  useEffect(() => {
    initializeDebugMode();
    logDebugMessage('Init', 'Debug mode initialized', { isDebugMode });
  }, []);

  // Listen for cross-tab cache changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ADMIN_ROLE_CACHE_KEY && latestUserIdRef.current) {
        logDebugMessage('CrossTab', 'Admin role cache changed in another tab, invalidating local cache');
        // Clear local state and re-resolve to get the updated role
        setAdminRole(null);
        setRoleResolved(false);
        // Mark as needing recheck
        markCacheForRecheck(latestUserIdRef.current, 'cross-tab-sync');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    latestUserIdRef.current = user?.id || null;
    latestAdminRoleRef.current = adminRole;
    
    // Dump auth state when it changes (debug mode only)
    if (isDebugMode && user?.id) {
      dumpAuthState(user.id, adminRole, roleResolved);
    }
  }, [user?.id, adminRole, roleResolved]);

  const refreshRole = async () => {
    if (!user?.id) {
      setAdminRole(null);
      setRoleResolved(true);
      return null;
    }
    const role = await resolveAdminRoleWithRetry(user.id);
    setAdminRole(role);
    setRoleResolved(true);
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
      const nextToken = nextSession?.access_token || null;
      const tokenChanged = lastTokenRef.current !== nextToken && lastTokenRef.current !== null;
      
      logDebugMessage('Session', 'applySession called', { previousUserId, nextUserId, hasSession: Boolean(nextSession), tokenChanged });
      
      // Detect token refresh and mark cache for recheck
      if (tokenChanged && nextUserId && lastTokenRef.current) {
        logDebugMessage('Session', 'Token refreshed, marking cache for recheck', { nextUserId });
        markCacheForRecheck(nextUserId, 'token-refresh');
      }
      lastTokenRef.current = nextToken;
      
      const cachedRole = nextUserId ? readAdminRoleCache(nextUserId) : null;
      const needsRecheck = nextUserId ? shouldRecheckAdminRole(nextUserId) : false;
      
      logDebugMessage('Session', 'Cache read', { nextUserId, cachedRole, needsRecheck });

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextUserId) {
        logDebugMessage('Session', 'No user ID, clearing auth state');
        setAdminRole(null);
        setRoleResolved(true);
        return;
      }

      if (previousUserId !== nextUserId) {
        logDebugMessage('Session', 'User ID changed, setting cached role', { cachedRole });
        setAdminRole(cachedRole);
      }

      // Use cache only if it exists AND doesn't need rechecking
      const useCache = Boolean(cachedRole && !needsRecheck);
      setRoleResolved(useCache);
      
      if (needsRecheck) {
        logDebugMessage('Session', 'Cache marked for recheck, forcing role re-resolution', { nextUserId });
      }

      void claimGuestOrders().catch(() => {
        // Non-blocking: user can still proceed even if claim fails.
      });

      const role = await resolveAdminRoleWithTimeout(nextUserId, nextSession?.access_token || null, 1500);
      if (!mounted) return;

      if (role) {
        logDebugMessage('Session', 'Role resolved, caching', { role });
        setAdminRole(role);
        writeAdminRoleCache(nextUserId, role);
        clearCacheRecheck(nextUserId); // Clear recheck flag after successful resolution
        roleSourceRef.current = 'cache';
        setRoleResolved(true);
        return;
      }

      // If role lookup temporarily fails for the same user, keep the previous admin role
      // to avoid dropping admin UI access during token refresh churn.
      if (!cachedRole && (previousUserId !== nextUserId || !latestAdminRoleRef.current)) {
        setAdminRole(null);
      }
      setRoleResolved(true);

      if (!cachedRole) {
        void resolveAdminRoleWithRetry(nextUserId, nextSession?.access_token || null, 5, 250).then((resolvedRole) => {
          if (!mounted || !resolvedRole) return;
          setAdminRole(resolvedRole);
          setRoleResolved(true);
          writeAdminRoleCache(nextUserId, resolvedRole);
        });
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
      roleResolved,
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
        logDebugMessage('SignIn', 'Attempting password sign-in', { email });
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          logDebugMessage('SignIn', 'Sign-in failed', { error: error.message });
          return { error: error.message };
        }

        const userId = data?.user?.id || null;
        const token = data?.session?.access_token || null;
        logDebugMessage('SignIn', 'Sign-in successful, resolving role', { userId, hasToken: Boolean(token) });
        
        const role = userId ? await resolveAdminRoleWithTimeout(userId, token, 1500) : null;
        logDebugMessage('SignIn', 'Role resolved on sign-in', { role, userId });
        
        setAdminRole(role);
        setRoleResolved(Boolean(!userId || role));
        if (userId && role) writeAdminRoleCache(userId, role);

        if (userId && !role) {
          logDebugMessage('SignIn', 'Starting background role resolution');
          // Complete a slower role resolution in background so admin state can still settle soon after navigation.
          void resolveAdminRoleWithRetry(userId, token, 5, 250).then((resolvedRole) => {
            if (resolvedRole) {
              logDebugMessage('SignIn', 'Background role resolution succeeded', { resolvedRole });
              setAdminRole(resolvedRole);
              writeAdminRoleCache(userId, resolvedRole);
            }
            setRoleResolved(true);
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
      requestPasswordReset: async (email: string) => {
        if (!supabase) return { error: "Supabase is not configured." };

        const redirectTo = getPasswordResetRedirectTo();
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) return { error: error.message };

        return {};
      },
      updatePassword: async (newPassword: string) => {
        if (!supabase) return { error: "Supabase is not configured." };

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { error: error.message };

        return {};
      },
      signOut: async () => {
        setSession(null);
        setUser(null);
        setAdminRole(null);
        setRoleResolved(true);
        clearStoredSupabaseTokens();

        if (!supabase) {
          try {
            localStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
          } catch {
            // Ignore storage failures.
          }
          return;
        }

        try {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) clearStoredSupabaseTokens();
        } catch {
          clearStoredSupabaseTokens();
        }

        try {
          localStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
          localStorage.removeItem(ADMIN_ROLE_CACHE_RECHECK_KEY);
        } catch {
          // Ignore storage failures.
        }
      },
      refreshRole,
    }),
    [adminRole, loading, roleResolved, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
