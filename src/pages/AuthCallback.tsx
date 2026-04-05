import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
      const authFlowType = searchParams.get("type") || hashParams.get("type");

      if (!supabase) {
        if (!cancelled) navigate("/account", { replace: true });
        return;
      }

      const session = await supabase?.auth.getSession();
      const user = session?.data?.session?.user;

      if (authFlowType === "recovery") {
        if (!cancelled) {
          navigate("/reset-password", { replace: true });
          return;
        }
      }

      if (user?.id) {
        await supabase?.from("customer_profiles").upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          phone: user.phone || user.user_metadata?.phone || null,
        });

        const { data: adminData } = await supabase
          .from("admin_users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          navigate(adminData?.id ? "/admin" : "/account", { replace: true });
          return;
        }
      }
      if (!cancelled) navigate("/account", { replace: true });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-xl">
          <div className="glass-card p-8 text-center">
            <h1 className="font-heading text-2xl font-bold text-foreground">Signing you in...</h1>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we finish authentication.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
