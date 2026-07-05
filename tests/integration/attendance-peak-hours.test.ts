import { describe, it, expect, beforeAll } from "vitest";
import { MemberInviteStatus } from "@prisma/client";
import { setHours, subDays } from "date-fns";
import { getAttendanceData } from "@/lib/attendance";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";

describe("attendance peak hours integration", () => {
  let gymId: string;
  let memberId: string;

  beforeAll(async () => {
    resetTestDatabase();
    gymId = await findGymId();

    const prisma = await getPrisma();
    const now = new Date();

    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Peak Hours Member",
        phone: `+21659${Date.now().toString().slice(-7)}`,
        email: `peak.${Date.now()}@member.gym.local`,
        passwordHash: "hash",
        inviteStatus: MemberInviteStatus.ACTIVE,
        emailVerifiedAt: now,
        subscriptionStart: subDays(now, 10),
        subscriptionEnd: subDays(now, -20),
        monthlyFee: 80,
      },
    });
    memberId = member.id;

    await prisma.checkin.deleteMany({ where: { gymId } });
    await prisma.checkin.createMany({
      data: [
        { gymId, memberId, timestamp: setHours(subDays(now, 1), 9) },
        { gymId, memberId, timestamp: setHours(subDays(now, 2), 9) },
        { gymId, memberId, timestamp: setHours(subDays(now, 3), 17) },
      ],
    });

    await prisma.$disconnect();
  }, 60000);

  it("returns peakHours and busiestHour in attendance payload", async () => {
    const data = await getAttendanceData(gymId);

    expect(data.peakHours).toHaveLength(24);
    expect(data.peakHours[9].count).toBeGreaterThanOrEqual(2);
    expect(data.peakHours[17].count).toBeGreaterThanOrEqual(1);
    expect(data.busiestHour).toBe(9);
  });
});
