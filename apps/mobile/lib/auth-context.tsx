import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Role, type RoleValue } from "@gym/shared/auth";
import {
  apiFetch,
  clearAuth,
  getAuthKind,
  loadStoredAuth,
  persistAuth,
  setUnauthorizedHandler,
} from "./api";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  gymId: string;
  gymName: string;
};

export type MemberUser = {
  id: string;
  fullName: string;
  email: string | null;
  gymName: string;
  gymId: string;
};

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "staff"; user: StaffUser }
  | { status: "member"; user: MemberUser };

type AuthContextValue = {
  state: AuthState;
  loginStaff: (email: string, password: string) => Promise<void>;
  loginMember: (email: string, password: string) => Promise<void>;
  setPasswordFromInvite: (token: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refreshProfile = useCallback(async () => {
    const kind = getAuthKind();
    if (kind === "staff") {
      const user = await apiFetch<StaffUser>("/auth/staff/me");
      setState({ status: "staff", user });
    } else if (kind === "member") {
      const data = await apiFetch<{
        id: string;
        fullName: string;
        email: string | null;
        gymName: string;
        gymId: string;
      }>("/auth/member/me");
      setState({
        status: "member",
        user: {
          id: data.id,
          fullName: data.fullName,
          email: data.email,
          gymName: data.gymName,
          gymId: data.gymId,
        },
      });
    } else {
      setState({ status: "guest" });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "guest" }));
    (async () => {
      await loadStoredAuth();
      try {
        await refreshProfile();
      } catch {
        await clearAuth();
        setState({ status: "guest" });
      }
    })();
  }, [refreshProfile]);

  const loginStaff = useCallback(async (email: string, password: string) => {
    const { API_URL } = await import("./api");
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error(`Cannot reach API at ${API_URL}. Is the API running (npm run dev:api)?`);
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Erreur de connexion");
    await persistAuth("staff", {
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
    });
    setState({ status: "staff", user: json.data.user });
  }, []);

  const loginMember = useCallback(async (email: string, password: string) => {
    const { API_URL } = await import("./api");
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/member/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error(`Cannot reach API at ${API_URL}. Is the API running (npm run dev:api)?`);
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Erreur de connexion");
    await persistAuth("member", {
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
    });
    const m = json.data.member;
    setState({
      status: "member",
      user: {
        id: m.id,
        fullName: m.name,
        email: m.email,
        gymName: m.gymName,
        gymId: m.gymId,
      },
    });
  }, []);

  const setPasswordFromInvite = useCallback(
    async (token: string, password: string, confirmPassword: string) => {
      const { API_URL } = await import("./api");
      const res = await fetch(`${API_URL}/auth/member/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erreur");
      await persistAuth("member", {
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
      });
      const m = json.data.member;
      setState({
        status: "member",
        user: {
          id: m.id,
          fullName: m.name,
          email: m.email,
          gymName: m.gymName,
          gymId: m.gymId,
        },
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const kind = getAuthKind();
      if (kind === "staff") await apiFetch("/auth/staff/logout", { method: "POST", body: "{}" });
      if (kind === "member") await apiFetch("/auth/member/logout", { method: "POST", body: "{}" });
    } catch {
      /* ignore */
    }
    await clearAuth();
    setState({ status: "guest" });
  }, []);

  const value = useMemo(
    () => ({ state, loginStaff, loginMember, setPasswordFromInvite, logout, refreshProfile }),
    [state, loginStaff, loginMember, setPasswordFromInvite, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
