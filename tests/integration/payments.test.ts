import { describe, it, expect, beforeEach } from "vitest";
import { PaymentMethod } from "@prisma/client";
import {
  createPayment,
  listMemberPayments,
  listPayments,
  sumCollectedInRange,
} from "@/lib/payments";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

describe("payments integration", () => {
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

  async function createTestMember() {
    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Payment Test User",
        phone: `+21659${Date.now().toString().slice(-7)}`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 80,
      },
    });
    await prisma.$disconnect();
    return member;
  }

  it("creates payment scoped to gym and member", async () => {
    const member = await createTestMember();

    const payment = await createPayment(gymId, member.id, adminId, {
      amount: 80,
      method: PaymentMethod.CASH,
      paidAt: "2026-07-05",
      note: "Mensualité juillet",
    });

    expect(payment).not.toBeNull();
    expect(Number(payment!.amount)).toBe(80);
    expect(payment!.method).toBe(PaymentMethod.CASH);
    expect(payment!.note).toBe("Mensualité juillet");
    expect(payment!.recordedBy.name).toBe("Propriétaire");
  });

  it("rejects payment for member outside gym", async () => {
    const prisma = await getPrisma();
    const otherGym = await prisma.gym.create({
      data: { name: "Other Gym" },
    });
    const otherMember = await prisma.member.create({
      data: {
        gymId: otherGym.id,
        fullName: "Other Member",
        phone: `+21658${Date.now().toString().slice(-7)}`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 50,
      },
    });
    await prisma.$disconnect();

    const payment = await createPayment(gymId, otherMember.id, adminId, {
      amount: 50,
      method: PaymentMethod.CASH,
      paidAt: "2026-07-05",
    });

    expect(payment).toBeNull();
  });

  it("lists member payments in reverse chronological order", async () => {
    const member = await createTestMember();

    await createPayment(gymId, member.id, adminId, {
      amount: 50,
      method: PaymentMethod.CASH,
      paidAt: "2026-07-01",
    });
    await createPayment(gymId, member.id, adminId, {
      amount: 80,
      method: PaymentMethod.D17,
      paidAt: "2026-07-05",
    });

    const payments = await listMemberPayments(gymId, member.id);
    expect(payments).toHaveLength(2);
    expect(Number(payments![0].amount)).toBe(80);
    expect(Number(payments![1].amount)).toBe(50);
  });

  it("sums collected revenue in date range", async () => {
    const member = await createTestMember();
    const now = new Date();
    const thisMonthFrom = startOfMonth(now);
    const thisMonthTo = endOfMonth(now);
    const lastMonthFrom = startOfMonth(subMonths(now, 1));
    const lastMonthTo = endOfMonth(subMonths(now, 1));
    const thisMonthPaidAt = format(now, "yyyy-MM-dd");
    const lastMonthPaidAt = format(subMonths(now, 1), "yyyy-MM-dd");

    // Seed writes gym payments with paidAt relative to now; they often land
    // in the current calendar month. Assert deltas, not an empty month.
    const thisMonthBefore = await sumCollectedInRange(gymId, thisMonthFrom, thisMonthTo);
    const lastMonthBefore = await sumCollectedInRange(gymId, lastMonthFrom, lastMonthTo);

    await createPayment(gymId, member.id, adminId, {
      amount: 80,
      method: PaymentMethod.CASH,
      paidAt: thisMonthPaidAt,
    });
    await createPayment(gymId, member.id, adminId, {
      amount: 40,
      method: PaymentMethod.CARD,
      paidAt: lastMonthPaidAt,
    });

    const thisMonth = await sumCollectedInRange(gymId, thisMonthFrom, thisMonthTo);
    expect(thisMonth).toBe(thisMonthBefore + 80);

    const lastMonth = await sumCollectedInRange(gymId, lastMonthFrom, lastMonthTo);
    expect(lastMonth).toBe(lastMonthBefore + 40);

    const all = await listPayments(gymId);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
