import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { WelcomeScreen } from "./components/onboarding/WelcomeScreen";
import { CustomerOnboardingFlow } from "./components/onboarding/CustomerOnboardingFlow";
import { ProviderOnboardingFlow } from "./components/provider/ProviderOnboardingFlow";
import { CustomerApp } from "./components/customer/CustomerApp";
import { ProviderApp } from "./components/provider/ProviderApp";
import { LoginScreen } from "./components/auth/LoginScreen";
import { InviteAcceptPage } from "./components/auth/InviteAcceptPage";
import {
  ProtectedRoute,
  GuestRoute,
  RequireRole,
} from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { Loader2 } from "lucide-react";

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
      <Routes>
        {/* Guest-only routes — authenticated users are redirected to dashboard */}
        <Route element={<GuestRoute />}>
          <Route path="/" element={<WelcomeScreen />} />
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

        {/* Public invite acceptance page */}
        <Route path="/meghivas/:token" element={<InviteAcceptPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          {/* Customer routes */}
          <Route
            path="/ugyfel/bemutatkozas"
            element={<CustomerOnboardingFlow />}
          />
          <Route element={<RequireRole role="CUSTOMER" />}>
            <Route path="/ugyfel" element={<CustomerApp />} />
            <Route
              path="/ugyfel/szolgaltato/:providerId"
              element={<CustomerApp />}
            />
            <Route
              path="/ugyfel/foglalas/:bookingId"
              element={<CustomerApp />}
            />
            <Route path="/ugyfel/:tab" element={<CustomerApp />} />
          </Route>

          {/* Provider routes */}
          <Route
            path="/szolgaltato/bemutatkozas"
            element={<ProviderOnboardingFlow />}
          />
          <Route element={<RequireRole role="PROVIDER" />}>
            <Route path="/szolgaltato" element={<ProviderApp />} />
            <Route
              path="/szolgaltato/foglalas/:bookingId"
              element={<ProviderApp />}
            />
            <Route path="/szolgaltato/:tab" element={<ProviderApp />} />
          </Route>
        </Route>

        {/* Catch-all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}
