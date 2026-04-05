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
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                onClick={async () => {
                  const result = await signInWithProvider("google");
                  if (result.error) setError(result.error);
                }}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                onClick={async () => {
                  const result = await signInWithProvider("apple");
                  if (result.error) setError(result.error);
                }}
              >
                Continue with Apple
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
