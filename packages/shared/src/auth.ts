import { endOfDay, isAfter, startOfDay } from "date-fns";

/** Mirrors Prisma Role enum */
export const Role = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

/** Mirrors Prisma MemberStatus enum */
export const MemberStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  FROZEN: "FROZEN",
} as const;

export type MemberStatusValue = (typeof MemberStatus)[keyof typeof MemberStatus];

export type SessionUser = {
  userId: string;
  gymId: string;
  gymName?: string;
  role: RoleValue;
  name: string;
  email: string;
};

export function getMemberStatus(subscriptionEnd: Date): MemberStatusValue {
  const today = startOfDay(new Date());
  const end = endOfDay(subscriptionEnd);
  return isAfter(end, today) ? MemberStatus.ACTIVE : MemberStatus.EXPIRED;
}

export function isMemberActive(subscriptionEnd: Date): boolean {
  return getMemberStatus(subscriptionEnd) === MemberStatus.ACTIVE;
}

/**
 * Permission matrix (STAFF vs ADMIN):
 * - Check-in / search, GET members, renew, payment, resend invite, QR, today, account: STAFF + ADMIN
 * - Create / delete / freeze member, dashboard, attendance, staff, gym settings, export: ADMIN only
 */
export function canAccessAdmin(role: RoleValue): boolean {
  return role === Role.ADMIN;
}

/** Desk operations: members read, renew, pay, today summary, own account. */
export function canAccessDesk(role: RoleValue): boolean {
  return role === Role.ADMIN || role === Role.STAFF;
}

/** @deprecated Use canAccessDesk — same permission set. */
export function canAccessCheckin(role: RoleValue): boolean {
  return canAccessDesk(role);
}

export type StaffNavRoute = {
  href: string;
  labelKey: "nav.scan" | "nav.manual" | "nav.members" | "nav.today" | "nav.account";
};

export function getStaffNavRoutes(): StaffNavRoute[] {
  return [
    { href: "/scan", labelKey: "nav.scan" },
    { href: "/manual", labelKey: "nav.manual" },
    { href: "/members", labelKey: "nav.members" },
    { href: "/today", labelKey: "nav.today" },
    { href: "/account", labelKey: "nav.account" },
  ];
}

export function getDefaultRoute(role: RoleValue): string {
  return role === Role.ADMIN ? "/dashboard" : "/scan";
}
