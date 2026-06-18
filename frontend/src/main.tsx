import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function redirectToCanonicalLocalhostOrigin() {
  if (!import.meta.env.DEV) return false;
  if (!["127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)) return false;

  const nextUrl = new URL(window.location.href);
  nextUrl.hostname = "localhost";
  window.location.replace(nextUrl.toString());
  return true;
}

if (!redirectToCanonicalLocalhostOrigin()) {
  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>,
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
