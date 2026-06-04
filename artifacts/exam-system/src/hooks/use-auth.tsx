import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { UserWithStudent } from "@workspace/api-client-react";
import { useGetMe, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: UserWithStudent | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>;
  register: ReturnType<typeof useRegister>;
  logout: () => void;
  setToken: (token: string | null, redirectTo?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("exam_auth_token");
    }
    return null;
  });

  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const setToken = async (newToken: string | null, redirectTo?: string) => {
    if (newToken) {
      localStorage.setItem("exam_auth_token", newToken);
      setTokenState(newToken);
      await refetch();
      if (redirectTo) setLocation(redirectTo);
    } else {
      localStorage.removeItem("exam_auth_token");
      setTokenState(null);
      queryClient.clear();
      setLocation("/login");
    }
  };

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setToken(null);
        toast({ title: "Logged out successfully" });
      }
    });
  };

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated: !!user,
        isLoading,
        login: loginMutation,
        register: registerMutation,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
