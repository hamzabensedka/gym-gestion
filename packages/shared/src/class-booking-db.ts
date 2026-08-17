import { Prisma, type PrismaClient } from "@prisma/client";
import { assertPlanFeature } from "./gym-features";
import {
  BookingError,
  assertCapacity,
  assertClassName,
  assertCoachName,
  assertSessionAudience,
  decideMemberBookEligibility,
  endsAtFromWeekSlot,
  isSessionFull,
  remainingSpots,
  sessionVisibleToMember,
  startsAtFromWeekSlot,
  type SessionAudience,
} from "./class-booking";

export type MemberSessionRow = {
  id: string;
  className: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  remaining: number;
  coachName: string | null;
  audience: SessionAudience;
  myBooking: "BOOKED" | "CANCELLED" | null;
};

export type DeskSessionRow = MemberSessionRow & {
  classId: string;
  status: "SCHEDULED" | "CANCELLED";
  bookedCount: number;
};

export type ClassRow = {
  id: string;
  name: string;
  defaultCapacity: number;
  active: boolean;
};

export type RosterRow = {
  memberId: string;
  fullName: string;
  status: "BOOKED" | "CANCELLED";
  createdAt: Date;
  cancelledAt: Date | null;
};

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

      if (!sessionVisibleToMember(session.audience, member.gender)) {
        throw new BookingError("MEMBER_NOT_ELIGIBLE");
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

async function bookedCountBySession(
  db: PrismaClient,
  gymId: string,
  sessionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sessionIds.length === 0) {
    return counts;
  }
  const groups = await db.booking.groupBy({
    by: ["sessionId"],
    where: { gymId, sessionId: { in: sessionIds }, status: "BOOKED" },
    _count: { _all: true },
  });
  for (const group of groups) {
    counts.set(group.sessionId, group._count._all);
  }
  return counts;
}

export async function listClasses(db: PrismaClient, gymId: string): Promise<ClassRow[]> {
  return db.class.findMany({
    where: { gymId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, defaultCapacity: true, active: true },
  });
}

export async function createClass(
  db: PrismaClient,
  input: { gymId: string; name: string; defaultCapacity: number },
): Promise<{ id: string }> {
  const name = assertClassName(input.name);
  const defaultCapacity = assertCapacity(input.defaultCapacity);
  try {
    const created = await db.class.create({
      data: { gymId: input.gymId, name, defaultCapacity },
    });
    return { id: created.id };
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new BookingError("VALIDATION");
    }
    throw error;
  }
}

export async function updateClass(
  db: PrismaClient,
  input: { gymId: string; classId: string; name?: string; defaultCapacity?: number; active?: boolean },
): Promise<void> {
  const existing = await db.class.findFirst({
    where: { id: input.classId, gymId: input.gymId },
  });
  if (!existing) {
    throw new BookingError("NOT_FOUND");
  }
  const data: Prisma.ClassUpdateManyMutationInput = {};
  if (input.name !== undefined) {
    data.name = assertClassName(input.name);
  }
  if (input.defaultCapacity !== undefined) {
    data.defaultCapacity = assertCapacity(input.defaultCapacity);
  }
  if (input.active !== undefined) {
    data.active = input.active;
  }
  if (Object.keys(data).length === 0) {
    return;
  }
  try {
    await db.class.updateMany({
      where: { id: input.classId, gymId: input.gymId },
      data,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new BookingError("VALIDATION");
    }
    throw error;
  }
}

export async function deleteClass(
  db: PrismaClient,
  input: { gymId: string; classId: string },
): Promise<void> {
  const existing = await db.class.findFirst({
    where: { id: input.classId, gymId: input.gymId },
  });
  if (!existing) {
    throw new BookingError("NOT_FOUND");
  }
  const sessionCount = await db.classSession.count({
    where: { classId: input.classId, gymId: input.gymId },
  });
  if (sessionCount > 0) {
    throw new BookingError("CLASS_HAS_SESSIONS");
  }
  await db.class.deleteMany({
    where: { id: input.classId, gymId: input.gymId },
  });
}

export async function listDeskSessions(
  db: PrismaClient,
  input: { gymId: string; from: Date; to: Date },
): Promise<DeskSessionRow[]> {
  const sessions = await db.classSession.findMany({
    where: {
      gymId: input.gymId,
      startsAt: { gte: input.from, lt: input.to },
    },
    include: { class: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
  const counts = await bookedCountBySession(
    db,
    input.gymId,
    sessions.map((session) => session.id),
  );
  return sessions.map((session) => {
    const bookedCount = counts.get(session.id) ?? 0;
    return {
      id: session.id,
      classId: session.classId,
      className: session.class.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      remaining: remainingSpots(session.capacity, bookedCount),
      coachName: session.coachName,
      audience: session.audience,
      myBooking: null,
      status: session.status,
      bookedCount,
    };
  });
}

export async function listMemberSessions(
  db: PrismaClient,
  input: { gymId: string; memberId: string; from: Date; to: Date },
): Promise<MemberSessionRow[]> {
  const member = await db.member.findFirst({
    where: { id: input.memberId, gymId: input.gymId },
    select: { gender: true },
  });
  if (!member) {
    throw new BookingError("NOT_FOUND");
  }

  const sessions = await db.classSession.findMany({
    where: {
      gymId: input.gymId,
      status: "SCHEDULED",
      startsAt: { gte: input.from, lt: input.to },
    },
    include: { class: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
  const visible = sessions.filter((session) =>
    sessionVisibleToMember(session.audience, member.gender),
  );
  const sessionIds = visible.map((session) => session.id);
  const counts = await bookedCountBySession(db, input.gymId, sessionIds);
  const mine =
    sessionIds.length === 0
      ? []
      : await db.booking.findMany({
          where: { gymId: input.gymId, memberId: input.memberId, sessionId: { in: sessionIds } },
          select: { sessionId: true, status: true },
        });
  const myBookingBySession = new Map(mine.map((row) => [row.sessionId, row.status]));
  return visible.map((session) => {
    const bookedCount = counts.get(session.id) ?? 0;
    return {
      id: session.id,
      className: session.class.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      capacity: session.capacity,
      remaining: remainingSpots(session.capacity, bookedCount),
      coachName: session.coachName,
      audience: session.audience,
      myBooking: myBookingBySession.get(session.id) ?? null,
    };
  });
}

export async function createSession(
  db: PrismaClient,
  input: {
    gymId: string;
    classId: string;
    startsAt: Date;
    endsAt: Date;
    capacity?: number;
    coachName?: string | null;
    audience?: SessionAudience;
  },
): Promise<{ id: string }> {
  if (!(input.endsAt > input.startsAt)) {
    throw new BookingError("VALIDATION");
  }
  const klass = await db.class.findFirst({
    where: { id: input.classId, gymId: input.gymId },
  });
  if (!klass) {
    throw new BookingError("NOT_FOUND");
  }
  const capacity = assertCapacity(input.capacity ?? klass.defaultCapacity);
  const coachName = assertCoachName(input.coachName);
  const audience = assertSessionAudience(input.audience ?? "MIXED");
  try {
    const created = await db.classSession.create({
      data: {
        gymId: input.gymId,
        classId: input.classId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity,
        coachName,
        audience,
        status: "SCHEDULED",
      },
    });
    return { id: created.id };
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new BookingError("VALIDATION");
    }
    throw error;
  }
}

export async function cancelClassSession(
  db: PrismaClient,
  input: { gymId: string; sessionId: string; now: Date },
): Promise<void> {
  const session = await db.classSession.findFirst({
    where: { id: input.sessionId, gymId: input.gymId },
  });
  if (!session) {
    throw new BookingError("NOT_FOUND");
  }
  await db.$transaction(async (tx) => {
    await tx.classSession.updateMany({
      where: { id: input.sessionId, gymId: input.gymId },
      data: { status: "CANCELLED" },
    });
    await tx.booking.updateMany({
      where: { sessionId: input.sessionId, gymId: input.gymId, status: "BOOKED" },
      data: { status: "CANCELLED", cancelledAt: input.now },
    });
  });
}

export async function updateSession(
  db: PrismaClient,
  input: {
    gymId: string;
    sessionId: string;
    startsAt?: Date;
    endsAt?: Date;
    capacity?: number;
    coachName?: string | null;
    status?: "SCHEDULED" | "CANCELLED";
    audience?: "MIXED" | "LADIES" | "MEN";
  },
): Promise<void> {
  const session = await db.classSession.findFirst({
    where: { id: input.sessionId, gymId: input.gymId },
  });
  if (!session) {
    throw new BookingError("NOT_FOUND");
  }

  const startsAt = input.startsAt ?? session.startsAt;
  const endsAt = input.endsAt ?? session.endsAt;
  if (input.startsAt !== undefined || input.endsAt !== undefined) {
    if (!(endsAt > startsAt)) {
      throw new BookingError("VALIDATION");
    }
  }

  const data: Prisma.ClassSessionUpdateManyMutationInput = {};
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  const capacity = input.capacity !== undefined ? assertCapacity(input.capacity) : undefined;
  if (capacity !== undefined) data.capacity = capacity;
  if (input.coachName !== undefined) data.coachName = assertCoachName(input.coachName);
  if (input.status === "SCHEDULED") data.status = "SCHEDULED";
  if (input.audience !== undefined) data.audience = input.audience;

  const writeSession = async (client: Prisma.TransactionClient | PrismaClient) => {
    if (Object.keys(data).length === 0) {
      return;
    }
    try {
      await client.classSession.updateMany({
        where: { id: input.sessionId, gymId: input.gymId },
        data,
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new BookingError("VALIDATION");
      }
      throw error;
    }
  };

  if (capacity !== undefined) {
    await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "ClassSession" WHERE id = ${input.sessionId} AND "gymId" = ${input.gymId} FOR UPDATE`,
      );
      if (locked.length === 0) {
        throw new BookingError("NOT_FOUND");
      }
      const bookedCount = await tx.booking.count({
        where: { sessionId: input.sessionId, gymId: input.gymId, status: "BOOKED" },
      });
      if (capacity < bookedCount) {
        throw new BookingError("CAPACITY_BELOW_BOOKINGS");
      }
      await writeSession(tx);
    });
  } else {
    await writeSession(db);
  }

  if (input.status === "CANCELLED") {
    await cancelClassSession(db, {
      gymId: input.gymId,
      sessionId: input.sessionId,
      now: new Date(),
    });
  }
}

export async function deleteSession(
  db: PrismaClient,
  input: { gymId: string; sessionId: string },
): Promise<void> {
  const session = await db.classSession.findFirst({
    where: { id: input.sessionId, gymId: input.gymId },
  });
  if (!session) {
    throw new BookingError("NOT_FOUND");
  }
  const bookingCount = await db.booking.count({
    where: { sessionId: input.sessionId, gymId: input.gymId },
  });
  if (bookingCount > 0) {
    throw new BookingError("SESSION_HAS_BOOKINGS");
  }
  await db.classSession.deleteMany({
    where: { id: input.sessionId, gymId: input.gymId },
  });
}

export async function generateWeekSessions(
  db: PrismaClient,
  input: {
    gymId: string;
    classId: string;
    weekStart: Date;
    slots: Array<{ weekday: number; startMinutes: number; endMinutes: number }>;
    capacity?: number;
    coachName?: string | null;
    audience?: SessionAudience;
  },
): Promise<{ created: number; skipped: number }> {
  const klass = await db.class.findFirst({
    where: { id: input.classId, gymId: input.gymId },
  });
  if (!klass) {
    throw new BookingError("NOT_FOUND");
  }
  if (!klass.active) {
    throw new BookingError("VALIDATION");
  }
  for (const slot of input.slots) {
    if (slot.endMinutes <= slot.startMinutes) {
      throw new BookingError("VALIDATION");
    }
    startsAtFromWeekSlot(input.weekStart, slot.weekday, slot.startMinutes);
    endsAtFromWeekSlot(input.weekStart, slot.weekday, slot.endMinutes);
  }
  const capacity = assertCapacity(input.capacity ?? klass.defaultCapacity);
  const coachName = assertCoachName(input.coachName);
  const audience = assertSessionAudience(input.audience ?? "MIXED");
  let created = 0;
  let skipped = 0;
  for (const slot of input.slots) {
    const startsAt = startsAtFromWeekSlot(input.weekStart, slot.weekday, slot.startMinutes);
    const endsAt = endsAtFromWeekSlot(input.weekStart, slot.weekday, slot.endMinutes);
    const existing = await db.classSession.findFirst({
      where: { gymId: input.gymId, classId: input.classId, startsAt },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    try {
      await db.classSession.create({
        data: {
          gymId: input.gymId,
          classId: input.classId,
          startsAt,
          endsAt,
          capacity,
          coachName,
          audience,
          status: "SCHEDULED",
        },
      });
      created += 1;
    } catch (error) {
      if (isUniqueConflict(error)) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }
  return { created, skipped };
}

export async function listSessionRoster(
  db: PrismaClient,
  input: { gymId: string; sessionId: string },
): Promise<RosterRow[]> {
  const session = await db.classSession.findFirst({
    where: { id: input.sessionId, gymId: input.gymId },
  });
  if (!session) {
    throw new BookingError("NOT_FOUND");
  }
  const bookings = await db.booking.findMany({
    where: { gymId: input.gymId, sessionId: input.sessionId },
    include: { member: { select: { fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return bookings.map((booking) => ({
    memberId: booking.memberId,
    fullName: booking.member.fullName,
    status: booking.status,
    createdAt: booking.createdAt,
    cancelledAt: booking.cancelledAt,
  }));
}
