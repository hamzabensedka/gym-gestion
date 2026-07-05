import { MemberStatus, Role } from "@prisma/client";
import { endOfDay, isAfter, startOfDay } from "date-fns";

export type SessionUser = {
  userId: string;
  gymId: string;
  gymName?: string;
  role: Role;
  name: string;
  email: string;
};

export function getMemberStatus(subscriptionEnd: Date): MemberStatus {
  const today = startOfDay(new Date());
  const end = endOfDay(subscriptionEnd);
  return isAfter(end, today) ? MemberStatus.ACTIVE : MemberStatus.EXPIRED;
}

export function isMemberActive(subscriptionEnd: Date): boolean {
  return getMemberStatus(subscriptionEnd) === MemberStatus.ACTIVE;
}

export function canAccessAdmin(role: Role): boolean {
  return role === Role.ADMIN;
}

export function canAccessDesk(role: Role): boolean {
  return role === Role.ADMIN || role === Role.STAFF;
}

export function canAccessCheckin(role: Role): boolean {
  return canAccessDesk(role);
}

export function getDefaultRoute(role: Role): string {
  return role === Role.ADMIN ? "/dashboard" : "/scan";
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
