import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = (location.state as any)?.from || "/admin";

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-md">
          <div className="glass-card p-6 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Admin Login</h1>
            {!isSupabaseConfigured ? (
              <p className="text-sm text-destructive">Supabase is not configured. Add Supabase env vars first.</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!supabase) return;
                setLoading(true);
                setError("");
                const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
                if (authError) {
                  setError(authError.message);
                  setLoading(false);
                  return;
                }
                navigate(nextPath, { replace: true });
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
                disabled={!isSupabaseConfigured || loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}

