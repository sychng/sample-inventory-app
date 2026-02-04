import React, { createContext, useContext, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

type User = {
  id: string;
  email: string;
};

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authed"; user: User }
  | { status: "anon"; user: null };

type AuthContextType = {
  state: AuthState;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });

  const refresh = async () => {
    try {
      const user = await api.get<User>("/api/auth/me");
      setState({ status: "authed", user });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setState({ status: "anon", user: null });
      } else {
        console.error(e);
        setState({ status: "anon", user: null });
      }
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    await api.post("/api/auth/login", { email, password });
    await refresh();
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setState({ status: "anon", user: null });
  };

  return (
    <AuthContext.Provider value={{ state, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
