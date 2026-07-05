import { describe, it, expect, beforeEach } from "vitest";
import { PaymentMethod } from "@prisma/client";
import { getDashboardData } from "@/lib/dashboard";
import { createPayment } from "@/lib/payments";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";

describe("dashboard revenue", () => {
  let gymId: string;
  let adminId: string;

  beforeEach(async () => {
    resetTestDatabase();
    gymId = await findGymId();
    const prisma = await getPrisma();
    const admin = await prisma.user.findFirst({
      where: { gymId, email: "admin@gym.local" },
      select: { id: true },
    });
    adminId = admin!.id;
    await prisma.$disconnect();
  });

  it("uses recorded payments for collected revenue, not fee estimates alone", async () => {
    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Dashboard Revenue Test",
        phone: `+21657${Date.now().toString().slice(-7)}`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 999,
      },
    });
    await prisma.$disconnect();

    await createPayment(gymId, member.id, adminId, {
      amount: 75,
      method: PaymentMethod.CASH,
      paidAt: "2026-07-05",
    });

    const data = await getDashboardData(gymId);

    expect(data.collectedThisMonth).toBe(75);
    expect(data.collectedToday).toBe(75);
    expect(data.expectedMonthlyRevenue).toBeGreaterThan(75);
    expect(data.recentPayments).toHaveLength(1);
    expect(data.recentPayments[0]?.amount).toBe(75);
  });
});
