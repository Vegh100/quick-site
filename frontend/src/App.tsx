import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { WelcomeScreen } from "./components/onboarding/WelcomeScreen";
import { LoginScreen } from "./components/auth/LoginScreen";
import { InviteAcceptPage } from "./components/auth/InviteAcceptPage";
import { ProtectedRoute, GuestRoute, RequireRole } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { SkipLink } from "./components/layout/SkipLink";
import { Loader2 } from "lucide-react";

const CustomerOnboardingFlow = lazy(() =>
  import("./components/onboarding/CustomerOnboardingFlow").then((m) => ({
    default: m.CustomerOnboardingFlow,
  })),
);
const ProviderOnboardingFlow = lazy(() =>
  import("./components/provider/ProviderOnboardingFlow").then((m) => ({
    default: m.ProviderOnboardingFlow,
  })),
);
const CustomerApp = lazy(() =>
  import("./components/customer/CustomerApp").then((m) => ({ default: m.CustomerApp })),
);
const PublicServiceDashboard = lazy(() =>
  import("./components/customer/PublicServiceDashboard").then((m) => ({
    default: m.PublicServiceDashboard,
  })),
);
const ProviderApp = lazy(() =>
  import("./components/provider/ProviderApp").then((m) => ({ default: m.ProviderApp })),
);

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SkipLink />
      <Routes>
        {/* Guest-only routes — authenticated users are redirected to dashboard */}
        <Route element={<GuestRoute />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageFallback />}>
                <PublicServiceDashboard />
              </Suspense>
            }
          />
          <Route path="/bejelentkezes" element={<LoginScreen mode="login" />} />
          <Route
            path="/regisztracio/ugyfel"
            element={<LoginScreen mode="register" role="CUSTOMER" />}
          />
          <Route
            path="/regisztracio/szolgaltato"
            element={<LoginScreen mode="register" role="PROVIDER" />}
          />
        </Route>

        {/* Public service ads — guests can browse, booking redirects to login */}
        <Route
          path="/szolgaltatasok"
          element={
            <Suspense fallback={<PageFallback />}>
              <PublicServiceDashboard />
            </Suspense>
          }
        />
        <Route path="/welcome" element={<WelcomeScreen />} />

        {/* Public invite acceptance page */}
        <Route path="/meghivas/:token" element={<InviteAcceptPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          {/* Customer routes */}
          <Route element={<RequireRole role="CUSTOMER" />}>
            <Route
              path="/ugyfel/bemutatkozas"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CustomerOnboardingFlow />
                </Suspense>
              }
            />
            <Route
              path="/ugyfel"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CustomerApp />
                </Suspense>
              }
            />
            <Route
              path="/ugyfel/szolgaltato/:providerId"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CustomerApp />
                </Suspense>
              }
            />
            <Route
              path="/ugyfel/foglalas/:bookingId"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CustomerApp />
                </Suspense>
              }
            />
            <Route
              path="/ugyfel/:tab"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CustomerApp />
                </Suspense>
              }
            />
          </Route>

          {/* Provider routes */}
          <Route element={<RequireRole role="PROVIDER" />}>
            <Route
              path="/szolgaltato/bemutatkozas"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProviderOnboardingFlow />
                </Suspense>
              }
            />
            <Route
              path="/szolgaltato"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProviderApp />
                </Suspense>
              }
            />
            <Route
              path="/szolgaltato/foglalas/:bookingId"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProviderApp />
                </Suspense>
              }
            />
            <Route
              path="/szolgaltato/:tab"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProviderApp />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Catch-all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}
