import { describe, expect, it } from "vitest";
import { MemberStatus } from "@prisma/client";
import {
  isMemberAllowedForDoor,
  buildAccessExportCsv,
} from "@gym/shared/access-export";

const base = {
  fullName: "Ahmed",
  phone: "+21620000000",
  badgeNumber: "1001",
  status: MemberStatus.ACTIVE,
  subscriptionEnd: new Date("2030-01-01"),
  frozenAt: null as Date | null,
};

describe("access-export", () => {
  it("allows active member with badge and future end", () => {
    expect(isMemberAllowedForDoor(base)).toBe(true);
  });

  it("blocks expired, frozen, or missing badge", () => {
    expect(
      isMemberAllowedForDoor({ ...base, status: MemberStatus.EXPIRED }),
    ).toBe(false);
    expect(
      isMemberAllowedForDoor({ ...base, status: MemberStatus.FROZEN }),
    ).toBe(false);
    expect(isMemberAllowedForDoor({ ...base, badgeNumber: null })).toBe(false);
    expect(
      isMemberAllowedForDoor({
        ...base,
        subscriptionEnd: new Date("2020-01-01"),
      }),
    ).toBe(false);
  });

  it("builds csv with allowed flag", () => {
    const csv = buildAccessExportCsv([
      base,
      { ...base, fullName: "Sara", badgeNumber: "1002", status: MemberStatus.EXPIRED },
    ]);
    expect(csv).toContain("badgeNumber,fullName,phone,allowed,subscriptionEnd");
    expect(csv).toContain("1001");
    expect(csv).toMatch(/1001.*,1,/);
    expect(csv).toMatch(/1002.*,0,/);
  });
});
