import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("vendstock_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("vendstock_token")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("vendstock_user", JSON.stringify(res.data));
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("vendstock_token");
          localStorage.removeItem("vendstock_user");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { user: u, token: t } = res.data;
    setUser(u);
    setToken(t);
    localStorage.setItem("vendstock_token", t);
    localStorage.setItem("vendstock_user", JSON.stringify(u));
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.post("/auth/register", { email, password, name });
      const { user: u, token: t } = res.data;
      setUser(u);
      setToken(t);
      localStorage.setItem("vendstock_token", t);
      localStorage.setItem("vendstock_user", JSON.stringify(u));
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("vendstock_token");
    localStorage.removeItem("vendstock_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
