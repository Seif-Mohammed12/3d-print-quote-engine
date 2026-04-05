import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";

export default function Signup() {
  const navigate = useNavigate();
  const { signUpWithPassword, signInWithProvider } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-md">
          <div className="glass-card p-6 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Create account</h1>
            <p className="text-sm text-muted-foreground">Sign up to view full order history and live status updates.</p>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError("");
                const result = await signUpWithPassword(email, password, fullName);
                if (result.error) {
                  setError(result.error);
                  setLoading(false);
                  return;
                }
                navigate("/account", { replace: true });
              }}
            >
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                  required
                />
              </div>
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
                  minLength={6}
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
                {loading ? "Creating account..." : "Create account"}
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
              Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
