import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPassword, signInWithProvider, requestPasswordReset, isAuthenticated, isAdmin, adminRole } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);

  useEffect(() => {
    const key = "password-reset-cooldown-until";
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const until = Number(raw);
    if (!Number.isFinite(until)) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setResetCooldownSeconds(remaining);
      if (remaining <= 0) {
        localStorage.removeItem(key);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextPath = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (!isAuthenticated) return;

    if (nextPath) {
      navigate(nextPath, { replace: true });
      return;
    }

    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate("/account", { replace: true });
    }, adminRole === null ? 1200 : 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [adminRole, isAdmin, isAuthenticated, navigate, nextPath]);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-md">
          <div className="glass-card p-6 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">Access your account and track all your orders.</p>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                const result = await signInWithPassword(email, password);
                if (result.error) {
                  setError(result.error);
                  setLoading(false);
                  return;
                }
                if (nextPath) {
                  navigate(nextPath, { replace: true });
                  return;
                }

                navigate(result.role ? "/admin" : "/account", { replace: true });
              }}
            >
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword((prev) => !prev);
                    setError("");
                    if (!forgotEmail) setForgotEmail(email);
                  }}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {showForgotPassword ? (
                <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Enter your account email and we will send a secure password reset link.
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    We now send reset links directly to the in-app reset page. Your email app may still choose whether the link opens in the same tab or a new tab.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
                    placeholder="you@example.com"
                    required
                  />
                  <button
                    type="button"
                    disabled={resetLoading || !forgotEmail || resetCooldownSeconds > 0}
                    onClick={async () => {
                      if (resetCooldownSeconds > 0) return;

                      setResetLoading(true);
                      setError("");
                      const result = await requestPasswordReset(forgotEmail.trim());
                      setResetLoading(false);

                      if (result.error) {
                        setError(result.error);

                        // Back off locally if provider reports rate limiting.
                        if (result.error.toLowerCase().includes("too many") || result.error.toLowerCase().includes("wait")) {
                          const until = Date.now() + 60_000;
                          localStorage.setItem("password-reset-cooldown-until", String(until));
                          setResetCooldownSeconds(60);
                        }
                        return;
                      }

                      const until = Date.now() + 60_000;
                      localStorage.setItem("password-reset-cooldown-until", String(until));
                      setResetCooldownSeconds(60);

                      toast.success("Password reset email sent. Check your inbox.");
                      setShowForgotPassword(false);
                    }}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50"
                  >
                    {resetLoading
                      ? "Sending reset link..."
                      : resetCooldownSeconds > 0
                        ? `Try again in ${resetCooldownSeconds}s`
                        : "Send reset link"}
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary inline-flex items-center justify-center gap-2"
                onClick={async () => {
                  const result = await signInWithProvider("google");
                  if (result.error) setError(result.error);
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.26-.96 2.32-2.04 3.02l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.49 0-.7-.06-1.38-.18-2.03H12z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.3-2.56c-.92.62-2.1.99-3.31.99-2.55 0-4.72-1.72-5.49-4.03H3.11v2.64A9.99 9.99 0 0 0 12 22z" />
                  <path fill="#4A90E2" d="M6.51 13.96A5.98 5.98 0 0 1 6.2 12c0-.68.12-1.33.31-1.96V7.4H3.11A10 10 0 0 0 2 12c0 1.62.39 3.15 1.11 4.6l3.4-2.64z" />
                  <path fill="#FBBC05" d="M12 5.99c1.47 0 2.79.51 3.82 1.5l2.86-2.86C16.95 2.99 14.69 2 12 2A9.99 9.99 0 0 0 3.11 7.4l3.4 2.64c.77-2.31 2.94-4.05 5.49-4.05z" />
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              No account? <Link to="/signup" className="text-primary hover:underline">Sign up here</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
