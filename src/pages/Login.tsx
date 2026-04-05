import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPassword, signInWithProvider } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = (location.state as { from?: string } | null)?.from;

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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                  required
                />
              </div>
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
