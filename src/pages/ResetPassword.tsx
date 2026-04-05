import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-md">
          <div className="glass-card p-6 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              Set a new password for your account. Use at least 8 characters.
            </p>

            {!isAuthenticated ? (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                Recovery session not found. Open the reset link from your email again, or request a new reset link from the
                <Link to="/login" className="ml-1 text-primary hover:underline">login page</Link>.
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");

                if (password.length < 8) {
                  setError("Password must be at least 8 characters.");
                  return;
                }

                if (password !== confirmPassword) {
                  setError("Passwords do not match.");
                  return;
                }

                setLoading(true);
                const result = await updatePassword(password);
                setLoading(false);

                if (result.error) {
                  setError(result.error);
                  return;
                }

                toast.success("Password updated. You can continue to your account.");
                navigate("/account", { replace: true });
              }}
            >
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 pr-10 text-sm"
                    required
                    minLength={8}
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
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 pr-10 text-sm"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isAuthenticated}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}
