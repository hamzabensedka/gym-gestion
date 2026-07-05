import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_URL = "http://localhost:4000/v1";

/** Dev machine IP from Metro (e.g. "192.168.1.128:8081" → "192.168.1.128"). */
function getDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(":")[0] ?? null;
}

function resolveApiUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl ??
    DEFAULT_API_URL;

  const isLocal =
    configured.includes("localhost") || configured.includes("127.0.0.1");

  if (!isLocal || Platform.OS === "web") {
    return configured;
  }

  const devHost = getDevHost();
  if (devHost) {
    return configured.replace(/localhost|127\.0\.0\.1/, devHost);
  }

  // Android emulator: host machine is reachable at 10.0.2.2
  if (Platform.OS === "android") {
    return configured.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
  }

  return configured;
}

export const API_URL = resolveApiUrl();

export type ApiError = { code: string; message: string };

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type AuthKind = "staff" | "member" | null;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let authKind: AuthKind = null;
let onUnauthorized: (() => void) | null = null;

const STAFF_REFRESH_KEY = "gym_staff_refresh";
const MEMBER_REFRESH_KEY = "gym_member_refresh";
const AUTH_KIND_KEY = "gym_auth_kind";

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function loadStoredAuth() {
  const SecureStore = await import("expo-secure-store");
  authKind = (await SecureStore.getItemAsync(AUTH_KIND_KEY)) as AuthKind;
  if (authKind === "staff") {
    refreshToken = await SecureStore.getItemAsync(STAFF_REFRESH_KEY);
  } else if (authKind === "member") {
    refreshToken = await SecureStore.getItemAsync(MEMBER_REFRESH_KEY);
  }
}

export async function persistAuth(
  kind: "staff" | "member",
  tokens: { accessToken: string; refreshToken: string },
) {
  const SecureStore = await import("expo-secure-store");
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  authKind = kind;
  await SecureStore.setItemAsync(AUTH_KIND_KEY, kind);
  const key = kind === "staff" ? STAFF_REFRESH_KEY : MEMBER_REFRESH_KEY;
  await SecureStore.setItemAsync(key, tokens.refreshToken);
}

export async function clearAuth() {
  const SecureStore = await import("expo-secure-store");
  accessToken = null;
  refreshToken = null;
  authKind = null;
  await SecureStore.deleteItemAsync(AUTH_KIND_KEY);
  await SecureStore.deleteItemAsync(STAFF_REFRESH_KEY);
  await SecureStore.deleteItemAsync(MEMBER_REFRESH_KEY);
}

export function getAuthKind() {
  return authKind;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken || !authKind) return false;
  const path = authKind === "staff" ? "/auth/staff/refresh" : "/auth/member/refresh";
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  accessToken = json.data.accessToken;
  refreshToken = json.data.refreshToken;
  const SecureStore = await import("expo-secure-store");
  const key = authKind === "staff" ? STAFF_REFRESH_KEY : MEMBER_REFRESH_KEY;
  if (refreshToken) await SecureStore.setItemAsync(key, refreshToken);
  return true;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && refreshToken) {
    const ok = await refreshAccessToken();
    if (ok) return apiFetch(path, options, false);
    await clearAuth();
    onUnauthorized?.();
    throw new ApiClientError(401, "UNAUTHORIZED", "Session expirée");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = json.error ?? { code: "ERROR", message: "Erreur réseau" };
    throw new ApiClientError(res.status, err.code, err.message);
  }

  return json.data as T;
}

export async function apiText(path: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new ApiClientError(res.status, "ERROR", "Export failed");
  return res.text();
}
