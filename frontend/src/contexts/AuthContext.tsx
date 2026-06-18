import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { googleLogout } from "@react-oauth/google";
import { authApi } from "../lib/api-services";
import type { User, LoginInput, RegisterInput, UserRole } from "../lib/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<User>;
  register: (data: RegisterInput) => Promise<User>;
  googleAuth: (credential: string, role?: UserRole) => Promise<{ user: User; isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount (with timeout to prevent infinite loading)
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    authApi
      .me()
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => {
        clearTimeout(timeout);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // Listen for forced logouts (401)
  useEffect(() => {
    const handler = () => {
      googleLogout();
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [queryClient]);

  const login = useCallback(async (data: LoginInput) => {
    const res = await authApi.login(data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (data: RegisterInput) => {
    const res = await authApi.register(data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const googleAuth = useCallback(async (credential: string, role?: UserRole) => {
    const res = await authApi.googleAuth(credential, role);
    setUser(res.data.user);
    return { user: res.data.user, isNewUser: !!res.data.isNewUser };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    googleLogout();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleAuth,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
