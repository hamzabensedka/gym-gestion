import type { PaymentMethod } from "@prisma/client";
import { prisma } from "./db";

function parsePaidAt(value: string) {
  return new Date(`${value}T12:00:00`);
}

export type CreatePaymentInput = {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note?: string;
};

export type PaymentFilters = {
  from?: string;
  to?: string;
  method?: PaymentMethod;
};

const paymentSelect = {
  id: true,
  amount: true,
  method: true,
  paidAt: true,
  note: true,
  createdAt: true,
  recordedBy: { select: { id: true, name: true } },
} as const;

export async function listMemberPayments(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true },
  });
  if (!member) return null;

  return prisma.payment.findMany({
    where: { gymId, memberId },
    orderBy: { paidAt: "desc" },
    select: paymentSelect,
  });
}

export async function createPayment(
  gymId: string,
  memberId: string,
  recordedById: string,
  input: CreatePaymentInput,
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true },
  });
  if (!member) return null;

  return prisma.payment.create({
    data: {
      gymId,
      memberId,
      recordedById,
      amount: input.amount,
      method: input.method,
      paidAt: parsePaidAt(input.paidAt),
      note: input.note?.trim() || null,
    },
    select: paymentSelect,
  });
}

export async function listPayments(gymId: string, filters: PaymentFilters = {}) {
  const where: {
    gymId: string;
    paidAt?: { gte?: Date; lte?: Date };
    method?: PaymentMethod;
  } = { gymId };

  if (filters.from || filters.to) {
    where.paidAt = {};
    if (filters.from) where.paidAt.gte = parsePaidAt(filters.from);
    if (filters.to) where.paidAt.lte = new Date(`${filters.to}T23:59:59`);
  }
  if (filters.method) where.method = filters.method;

  return prisma.payment.findMany({
    where,
    orderBy: { paidAt: "desc" },
    select: {
      ...paymentSelect,
      member: { select: { id: true, fullName: true } },
    },
  });
}

export async function sumCollectedInRange(gymId: string, from: Date, to: Date) {
  const result = await prisma.payment.aggregate({
    where: { gymId, paidAt: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}
