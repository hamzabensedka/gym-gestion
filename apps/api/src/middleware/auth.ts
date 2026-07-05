import type { Context, Next } from "hono";
import { Role } from "@prisma/client";
import {
  verifyMemberAccessToken,
  verifyStaffAccessToken,
  type MemberTokenPayload,
  type StaffTokenPayload,
} from "../services/tokens";

export type StaffAuth = StaffTokenPayload;
export type MemberAuth = MemberTokenPayload;

declare module "hono" {
  interface ContextVariableMap {
    staff: StaffAuth;
    member: MemberAuth;
  }
}

function extractBearer(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function requireStaff(c: Context, next: Next) {
  const token = extractBearer(c);
  if (!token) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Non autorisé" } }, 401);
  }
  const payload = await verifyStaffAccessToken(token);
  if (!payload) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session expirée" } }, 401);
  }
  c.set("staff", payload);
  await next();
}

export async function requireAdmin(c: Context, next: Next) {
  const token = extractBearer(c);
  if (!token) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Non autorisé" } }, 401);
  }
  const payload = await verifyStaffAccessToken(token);
  if (!payload) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session expirée" } }, 401);
  }
  if (payload.role !== Role.ADMIN) {
    return c.json({ error: { code: "FORBIDDEN", message: "Accès refusé" } }, 403);
  }
  c.set("staff", payload);
  await next();
}

export async function requireCheckinAccess(c: Context, next: Next) {
  return requireDeskAccess(c, next);
}

export async function requireDeskAccess(c: Context, next: Next) {
  const token = extractBearer(c);
  if (!token) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Non autorisé" } }, 401);
  }
  const payload = await verifyStaffAccessToken(token);
  if (!payload) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session expirée" } }, 401);
  }
  if (payload.role !== Role.ADMIN && payload.role !== Role.STAFF) {
    return c.json({ error: { code: "FORBIDDEN", message: "Accès refusé" } }, 403);
  }
  c.set("staff", payload);
  await next();
}

export async function requireMember(c: Context, next: Next) {
  const token = extractBearer(c);
  if (!token) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Non autorisé" } }, 401);
  }
  const payload = await verifyMemberAccessToken(token);
  if (!payload) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Session expirée" } }, 401);
  }
  c.set("member", payload);
  await next();
}
