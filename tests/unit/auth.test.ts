import { describe, it, expect } from "vitest";
import { Role, MemberStatus } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import {
  getMemberStatus,
  isMemberActive,
  canAccessAdmin,
  canAccessDesk,
  canAccessCheckin,
  getDefaultRoute,
  getStaffNavRoutes,
} from "@/lib/auth";

describe("auth helpers", () => {
  it("marks subscription as active when end date is in the future", () => {
    const end = addDays(new Date(), 10);
    expect(getMemberStatus(end)).toBe(MemberStatus.ACTIVE);
    expect(isMemberActive(end)).toBe(true);
  });

  it("marks subscription as expired when end date is in the past", () => {
    const end = subDays(new Date(), 1);
    expect(getMemberStatus(end)).toBe(MemberStatus.EXPIRED);
    expect(isMemberActive(end)).toBe(false);
  });

  it("treats subscription ending today as still active", () => {
    const end = new Date();
    expect(getMemberStatus(end)).toBe(MemberStatus.ACTIVE);
  });

  it("restricts admin routes to ADMIN role", () => {
    expect(canAccessAdmin(Role.ADMIN)).toBe(true);
    expect(canAccessAdmin(Role.STAFF)).toBe(false);
  });

  it("allows check-in for admin and staff", () => {
    expect(canAccessCheckin(Role.ADMIN)).toBe(true);
    expect(canAccessCheckin(Role.STAFF)).toBe(true);
    expect(canAccessDesk(Role.STAFF)).toBe(true);
  });

  it("returns staff nav routes for desk users", () => {
    const routes = getStaffNavRoutes();
    expect(routes.map((item) => item.href)).toEqual([
      "/scan",
      "/manual",
      "/members",
      "/today",
      "/account",
    ]);
  });

  it("returns role-specific default routes", () => {
    expect(getDefaultRoute(Role.ADMIN)).toBe("/dashboard");
    expect(getDefaultRoute(Role.STAFF)).toBe("/scan");
  });
});
