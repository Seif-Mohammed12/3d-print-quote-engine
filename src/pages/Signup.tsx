import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const navigate = useNavigate();
  const { signUpWithPassword, signInWithProvider } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
                if (password !== confirmPassword) {
                  setError("Passwords do not match.");
                  return;
                }

                if (!phone.trim()) {
                  setError("Please enter your mobile phone number.");
                  return;
                }

                setLoading(true);
                setError("");
                const result = await signUpWithPassword(email, password, fullName, phone);
                if (result.error) {
                  setError(result.error);
                  setLoading(false);
                  return;
                }

                if (result.message) {
                  toast.success(result.message);
                }

                setLoading(false);

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
                <label className="text-sm text-muted-foreground mb-1 block">Mobile phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                  placeholder="0109928486 or +20109928486"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your mobile number in your usual format and we will save it to your profile.
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    minLength={6}
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
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 pr-10 text-sm"
                    required
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
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
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
              Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
