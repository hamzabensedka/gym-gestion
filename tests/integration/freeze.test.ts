import { describe, it, expect, beforeAll } from "vitest";
import { MemberStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { performCheckin } from "@/lib/checkin";
import { freezeMember, unfreezeMember } from "@/lib/freeze";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";

describe("subscription freeze integration", () => {
  let gymId: string;

  beforeAll(async () => {
    resetTestDatabase();
    gymId = await findGymId();
  }, 60000);

  async function createActiveMember() {
    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Freeze Test User",
        phone: `+21660${Date.now().toString().slice(-7)}`,
        subscriptionStart: subDays(new Date(), 10),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 80,
      },
    });
    await prisma.$disconnect();
    return member;
  }

  it("denies check-in for frozen member", async () => {
    const member = await createActiveMember();
    const freezeResult = await freezeMember(gymId, member.id);
    expect(freezeResult).toEqual({ ok: true });

    const checkin = await performCheckin(gymId, member.id);
    expect(checkin.success).toBe(false);
    expect(checkin.outcome).toBe("FROZEN");
  });

  it("extends subscription by frozen days on unfreeze", async () => {
    const prisma = await getPrisma();
    const member = await createActiveMember();
    const originalEnd = member.subscriptionEnd;

    await prisma.member.update({
      where: { id: member.id },
      data: {
        status: MemberStatus.FROZEN,
        frozenAt: subDays(new Date(), 5),
      },
    });
    await prisma.$disconnect();

    const result = await unfreezeMember(gymId, member.id);
    expect(result.ok).toBe(true);
    expect(result.extendedDays).toBe(5);

    const prisma2 = await getPrisma();
    const updated = await prisma2.member.findUnique({ where: { id: member.id } });
    expect(updated?.status).not.toBe(MemberStatus.FROZEN);
    expect(updated?.frozenAt).toBeNull();
    expect(updated!.subscriptionEnd.getTime()).toBeGreaterThan(originalEnd.getTime());
    await prisma2.$disconnect();
  });

  it("does not overwrite frozen status during sync", async () => {
    const member = await createActiveMember();
    await freezeMember(gymId, member.id);

    const prisma = await getPrisma();
    await prisma.member.update({
      where: { id: member.id },
      data: { subscriptionEnd: subDays(new Date(), 1) },
    });

    const { syncMemberStatuses } = await import("@/lib/checkin");
    await syncMemberStatuses(gymId);

    const updated = await prisma.member.findUnique({ where: { id: member.id } });
    expect(updated?.status).toBe(MemberStatus.FROZEN);
    await prisma.$disconnect();
  });
});
