import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

/** Helper: returns the dashboard path for a user's role */
function dashboardFor(role: string) {
  return role === "PROVIDER" || role === "EMPLOYEE" ? "/szolgaltato" : "/ugyfel";
}

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
 * Wraps routes that should only be visible to guests (not authenticated).
 * If the user IS authenticated, redirect them to their dashboard.
 */
export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return <Outlet />;
}

/**
 * Wraps routes that require a specific role.
 * Redirects to the correct app if the user has a different role.
 */
export function RequireRole({ role }: { role: "CUSTOMER" | "PROVIDER" }) {
  const { user } = useAuth();

  // EMPLOYEE users have access to PROVIDER routes
  const effectiveRole = user?.role === "EMPLOYEE" ? "PROVIDER" : user?.role;

  if (user && effectiveRole !== role) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  return <Outlet />;
}
