import { describe, it, expect, beforeAll } from "vitest";
import { MemberInviteStatus, PaymentMethod } from "@prisma/client";
import { format, subDays, subMonths } from "date-fns";
import { getDashboardData } from "@/lib/dashboard";
import { createPayment } from "@/lib/payments";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";

describe("dashboard trends integration", () => {
  let gymId: string;
  let adminId: string;
  let memberId: string;

  beforeAll(async () => {
    resetTestDatabase();
    gymId = await findGymId();

    const prisma = await getPrisma();
    const admin = await prisma.user.findFirst({
      where: { gymId, email: "admin@gym.local" },
      select: { id: true },
    });
    adminId = admin!.id;

    const now = new Date();

    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Trend Test Member",
        phone: `+21658${Date.now().toString().slice(-7)}`,
        email: `trend.${Date.now()}@member.gym.local`,
        passwordHash: "hash",
        inviteStatus: MemberInviteStatus.ACTIVE,
        emailVerifiedAt: now,
        subscriptionStart: subDays(now, 45),
        subscriptionEnd: subDays(now, -30),
        monthlyFee: 80,
      },
    });
    memberId = member.id;

    await prisma.checkin.createMany({
      data: [
        { gymId, memberId, timestamp: subDays(now, 2) },
        { gymId, memberId, timestamp: subDays(now, 4) },
        { gymId, memberId, timestamp: subDays(now, 10) },
      ],
    });

    await prisma.$disconnect();
  }, 60000);

  it("returns week and month trend comparisons from seeded activity", async () => {
    const now = new Date();
    const thisMonth = format(now, "yyyy-MM-dd");
    const lastMonth = format(subMonths(now, 1), "yyyy-MM-dd");

    await createPayment(gymId, memberId, adminId, {
      amount: 120,
      method: PaymentMethod.CASH,
      paidAt: thisMonth,
    });
    await createPayment(gymId, memberId, adminId, {
      amount: 50,
      method: PaymentMethod.CASH,
      paidAt: lastMonth,
    });

    const data = await getDashboardData(gymId);

    expect(data.trends.checkinsWeek.current).toBeGreaterThanOrEqual(2);
    expect(data.trends.checkinsWeek.previous).toBeGreaterThanOrEqual(1);
    expect(data.trends.checkinsWeek.delta).toBe(
      data.trends.checkinsWeek.current - data.trends.checkinsWeek.previous,
    );

    expect(data.trends.collectedRevenueMonth.current).toBeGreaterThanOrEqual(120);
    expect(data.trends.collectedRevenueMonth.previous).toBeGreaterThanOrEqual(50);
    expect(data.trends.collectedRevenueMonth.delta).toBe(
      data.trends.collectedRevenueMonth.current - data.trends.collectedRevenueMonth.previous,
    );

    expect(data.trends.activeMembersMonth).toMatchObject({
      current: expect.any(Number),
      previous: expect.any(Number),
      delta: expect.any(Number),
    });
    expect(data.trends.expiredMembersMonth).toMatchObject({
      current: expect.any(Number),
      previous: expect.any(Number),
      delta: expect.any(Number),
    });
  });
});
