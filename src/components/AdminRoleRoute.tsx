import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function AdminRoleRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">Checking admin access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
