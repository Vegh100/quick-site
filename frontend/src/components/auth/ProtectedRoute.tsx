import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Wraps routes that require authentication.
 * Redirects to /bejelentkezes if not authenticated.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/bejelentkezes" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/**
 * Wraps routes that require a specific role.
 * Redirects to the correct app if the user has a different role.
 */
export function RequireRole({ role }: { role: "CUSTOMER" | "PROVIDER" }) {
  const { user } = useAuth();

  if (user && user.role !== role) {
    // Redirect to the correct app for the user's role
    const redirectTo = user.role === "PROVIDER" ? "/szolgaltato" : "/ugyfel";
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
