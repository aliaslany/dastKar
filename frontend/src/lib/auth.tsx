import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "./api";

type User = { id: string; email: string; displayName: string; isSeller: boolean };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api.get<{ user: any }>("/auth/me");
      setUser({
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.display_name,
        isSeller: !!data.user.is_seller,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (localStorage.getItem("dastkar_token")) refresh();
    else setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; user: any }>("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const data = await api.post<{ token: string; user: any }>("/auth/register", { email, password, displayName });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
