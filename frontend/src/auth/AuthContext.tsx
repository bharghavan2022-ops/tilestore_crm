import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient, setOnAuthFailure } from "../lib/apiClient";
import { tokenStore } from "../lib/tokenStore";
import type { CurrentUser } from "../types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<CurrentUser> {
  const res = await apiClient.get<{ data: CurrentUser }>("/users/me");
  return res.data.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
  }, []);

  useEffect(() => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      setStatus("unauthenticated");
      return;
    }
    // Silent re-auth on load: exchange the persisted refresh token for a
    // fresh access token rather than forcing a login on every page reload.
    apiClient
      .post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken })
      .then(async (res) => {
        tokenStore.setAccessToken(res.data.accessToken);
        tokenStore.setRefreshToken(res.data.refreshToken);
        const me = await fetchMe();
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        tokenStore.clear();
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/login", {
      email,
      password,
    });
    tokenStore.setAccessToken(res.data.accessToken);
    tokenStore.setRefreshToken(res.data.refreshToken);
    const me = await fetchMe();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch {
        // Best-effort server-side revoke; clear local state regardless.
      }
    }
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
