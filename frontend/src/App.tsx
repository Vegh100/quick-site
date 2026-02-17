import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { WelcomeScreen } from "./components/onboarding/WelcomeScreen";
import { CustomerOnboardingFlow } from "./components/onboarding/CustomerOnboardingFlow";
import { ProviderOnboardingFlow } from "./components/provider/ProviderOnboardingFlow";
import { CustomerApp } from "./components/customer/CustomerApp";
import { ProviderApp } from "./components/provider/ProviderApp";
import { LoginScreen } from "./components/auth/LoginScreen";
import { Toaster } from "./components/ui/sonner";
import { Loader2 } from "lucide-react";

type ViewType =
  | "welcome"
  | "login"
  | "register"
  | "customer-onboarding"
  | "customer-app"
  | "provider-onboarding"
  | "provider-app";

export default function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [view, setView] = useState<ViewType>("welcome");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === "PROVIDER" && view !== "provider-onboarding") {
      return (
        <>
          <ProviderApp />
          <Toaster />
        </>
      );
    }
    if (user.role === "CUSTOMER" && view !== "customer-onboarding") {
      return (
        <>
          <CustomerApp initialCategory={selectedCategory} />
          <Toaster />
        </>
      );
    }
  }

  if (view === "login" || view === "register") {
    return (
      <>
        <LoginScreen
          mode={view}
          onSuccess={(loggedInUser) => {
            if (loggedInUser.role === "PROVIDER") {
              setView("provider-app");
            } else {
              setView("customer-app");
            }
          }}
          onSwitchMode={() => setView(view === "login" ? "register" : "login")}
          onBack={() => setView("welcome")}
        />
        <Toaster />
      </>
    );
  }

  if (view === "customer-onboarding") {
    return (
      <>
        <CustomerOnboardingFlow
          onComplete={() => setView("customer-app")}
          onBack={() => setView("welcome")}
        />
        <Toaster />
      </>
    );
  }

  if (view === "provider-onboarding") {
    return (
      <>
        <ProviderOnboardingFlow
          onComplete={() => setView("provider-app")}
          onBack={() => setView("welcome")}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <WelcomeScreen
        onCustomerApp={(category) => {
          setSelectedCategory(category);
          if (isAuthenticated) {
            setView("customer-app");
          } else {
            setView("login");
          }
        }}
        onCustomerOnboarding={() => {
          if (isAuthenticated) {
            setView("customer-onboarding");
          } else {
            setView("register");
          }
        }}
        onProviderOnboarding={() => {
          if (isAuthenticated) {
            setView("provider-onboarding");
          } else {
            setView("register");
          }
        }}
        onLogin={() => setView("login")}
        onRegister={() => setView("register")}
      />
      <Toaster />
    </>
  );
}
