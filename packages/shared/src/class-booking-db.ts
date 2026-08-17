import { Prisma, type PrismaClient } from "@prisma/client";
import { assertPlanFeature } from "./gym-features";
import {
  BookingError,
  decideMemberBookEligibility,
  isSessionFull,
  remainingSpots,
} from "./class-booking";

export async function assertClassBookingEnabled(
  db: PrismaClient,
  gymId: string,
): Promise<void> {
  const gym = await db.gym.findFirst({
    where: { id: gymId },
    select: { plan: true },
  });
  if (!gym) {
    throw new BookingError("NOT_FOUND");
  }
  assertPlanFeature(gym.plan, "class_booking");
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function bookSession(
  db: PrismaClient,
  input: { gymId: string; memberId: string; sessionId: string; now: Date },
): Promise<{ bookingId: string; remaining: number }> {
  const { gymId, memberId, sessionId, now } = input;
  try {
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "ClassSession" WHERE id = ${sessionId} AND "gymId" = ${gymId} FOR UPDATE`,
      );
      if (locked.length === 0) {
        throw new BookingError("NOT_FOUND");
      }

      const session = await tx.classSession.findFirst({
        where: { id: sessionId, gymId },
      });
      const member = await tx.member.findFirst({
        where: { id: memberId, gymId },
      });
      if (!session || !member) {
        throw new BookingError("NOT_FOUND");
      }

      const eligibility = decideMemberBookEligibility({
        now,
        memberStatus: member.status,
        subscriptionEnd: member.subscriptionEnd,
        sessionStatus: session.status,
        startsAt: session.startsAt,
      });
      if (!eligibility.ok) {
        throw new BookingError(eligibility.code);
      }

      const existing = await tx.booking.findFirst({
        where: { sessionId, memberId, gymId },
      });
      if (existing?.status === "BOOKED") {
        throw new BookingError("ALREADY_BOOKED");
      }

      const bookedCount = await tx.booking.count({
        where: { sessionId, gymId, status: "BOOKED" },
      });
      if (isSessionFull(session.capacity, bookedCount)) {
        throw new BookingError("SESSION_FULL");
      }

      let bookingId: string;
      if (existing?.status === "CANCELLED") {
        await tx.booking.updateMany({
          where: { id: existing.id, gymId },
          data: { status: "BOOKED", cancelledAt: null },
        });
        bookingId = existing.id;
      } else {
        const created = await tx.booking.create({
          data: { gymId, sessionId, memberId, status: "BOOKED" },
        });
        bookingId = created.id;
      }

      return {
        bookingId,
        remaining: remainingSpots(session.capacity, bookedCount + 1),
      };
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new BookingError("ALREADY_BOOKED");
    }
    throw error;
  }
}

export async function cancelBooking(
  db: PrismaClient,
  input: {
    gymId: string;
    sessionId: string;
    memberId: string;
    now: Date;
    actor: "member" | "desk";
  },
): Promise<{ remaining: number }> {
  const { gymId, sessionId, memberId, now, actor } = input;
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM "ClassSession" WHERE id = ${sessionId} AND "gymId" = ${gymId} FOR UPDATE`,
    );
    if (locked.length === 0) {
      throw new BookingError("NOT_FOUND");
    }

    const session = await tx.classSession.findFirst({
      where: { id: sessionId, gymId },
    });
    if (!session) {
      throw new BookingError("NOT_FOUND");
    }

    const booking = await tx.booking.findFirst({
      where: { sessionId, memberId, gymId },
    });
    if (!booking || booking.status !== "BOOKED") {
      throw new BookingError("NOT_FOUND");
    }

    if (actor === "member" && now >= session.startsAt) {
      throw new BookingError("SESSION_STARTED");
    }

    await tx.booking.updateMany({
      where: { id: booking.id, gymId },
      data: { status: "CANCELLED", cancelledAt: now },
    });

    const bookedCountAfter = await tx.booking.count({
      where: { sessionId, gymId, status: "BOOKED" },
    });

    return { remaining: remainingSpots(session.capacity, bookedCountAfter) };
  });
}
