import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type VerifyPhoneState = {
  initialPhone?: string;
  source?: "signup" | "google" | "account";
  nextPath?: string;
};

export default function VerifyPhone() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as VerifyPhoneState;
  const { startPhoneVerification, completePhoneVerification, isAdmin } = useAuth();

  const [phone, setPhone] = useState(state.initialPhone || "");
  const [code, setCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState("");

  const destination = useMemo(() => {
    if (state.nextPath) return state.nextPath;
    if (isAdmin) return "/admin";
    return "/account";
  }, [isAdmin, state.nextPath]);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-md">
          <div className="glass-card p-6 space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Verify mobile number</h1>
            <p className="text-sm text-muted-foreground">
              Enter your mobile number, request an SMS code, then verify to continue.
            </p>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Mobile number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                  placeholder="+1 555 123 4567"
                  required
                />
              </div>

              <button
                type="button"
                disabled={loadingSend || !phone.trim()}
                onClick={async () => {
                  setError("");
                  setLoadingSend(true);
                  const result = await startPhoneVerification(phone.trim());
                  setLoadingSend(false);

                  if (result.error) {
                    setError(result.error);
                    return;
                  }

                  setSmsSent(true);
                  toast.success("SMS code sent. Enter it below to verify.");
                }}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50"
              >
                {loadingSend ? "Sending SMS..." : smsSent ? "Re-send SMS code" : "Send SMS code"}
              </button>
            </div>

            {smsSent ? (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  setLoadingVerify(true);
                  const result = await completePhoneVerification(phone.trim(), code.trim());
                  setLoadingVerify(false);

                  if (result.error) {
                    setError(result.error);
                    return;
                  }

                  toast.success("Phone number verified.");
                  navigate(destination, { replace: true });
                }}
              >
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">SMS code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm"
                    placeholder="Enter code"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingVerify || !code.trim()}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {loadingVerify ? "Verifying..." : "Verify and continue"}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </Layout>
  );
}
