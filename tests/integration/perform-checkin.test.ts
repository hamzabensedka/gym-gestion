import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { performCheckin } from "@/lib/checkin";
import { resetTestDatabase } from "../helpers/db";

const prisma = new PrismaClient();

describe("performCheckin integration", () => {
  let gymId: string;
  let activeMemberId: string;
  let expiredMemberId: string;

  beforeAll(async () => {
    resetTestDatabase();
    const gym = await prisma.gym.findFirst({ select: { id: true } });
    if (!gym) throw new Error("Seed failed: no gym");
    gymId = gym.id;

    const active = await prisma.member.findFirst({
      where: { gymId, fullName: "Ahmed Ben Ali" },
      select: { id: true },
    });
    const expired = await prisma.member.findFirst({
      where: { gymId, fullName: "Sara Trabelsi" },
      select: { id: true },
    });
    if (!active || !expired) throw new Error("Seed failed: members missing");
    activeMemberId = active.id;
    expiredMemberId = expired.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("grants check-in for active member", async () => {
    const before = await prisma.checkin.count({
      where: { memberId: activeMemberId },
    });

    const result = await performCheckin(gymId, activeMemberId);
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("GRANTED");
    expect(result.memberName).toBe("Ahmed Ben Ali");

    const after = await prisma.checkin.count({
      where: { memberId: activeMemberId },
    });
    expect(after).toBe(before + 1);
  });

  it("denies check-in for expired member", async () => {
    const before = await prisma.checkin.count({
      where: { memberId: expiredMemberId },
    });

    const result = await performCheckin(gymId, expiredMemberId);
    expect(result.success).toBe(false);
    expect(result.outcome).toBe("EXPIRED");

    const after = await prisma.checkin.count({
      where: { memberId: expiredMemberId },
    });
    expect(after).toBe(before);
  });

  it("returns NOT_FOUND for unknown member id", async () => {
    const result = await performCheckin(gymId, "nonexistent-member-id");
    expect(result.success).toBe(false);
    expect(result.outcome).toBe("NOT_FOUND");
  });
});
