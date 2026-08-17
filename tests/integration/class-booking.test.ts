import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Plan, PrismaClient } from "@prisma/client";
import { resetTestDatabase } from "../helpers/db";
import {
  BookingError,
  assertClassBookingEnabled,
  bookSession,
  cancelBooking,
  generateWeekSessions,
  updateSession,
  createClass,
  updateClass,
  deleteClass,
  deleteSession,
  cancelClassSession,
  listMemberSessions,
  createSession,
} from "@gym/shared/class-booking";

const prisma = new PrismaClient();

function isCode(error: unknown, code: string) {
  return error instanceof BookingError && error.code === code;
}

async function expectBookingCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`expected BookingError(${code}) but the call succeeded`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("expected BookingError")) {
      throw error;
    }
    expect(error).toBeInstanceOf(BookingError);
    expect((error as BookingError).code).toBe(code);
  }
}

describe("class booking integration", () => {
  let gymId: string;
  let otherGymId: string;
  let ahmedId: string;
  let raniaId: string;
  let saraId: string;
  let inesId: string;
  let sessionId: string;

  beforeAll(async () => {
    resetTestDatabase();
    const gym = await prisma.gym.findFirst({ select: { id: true } });
    if (!gym) throw new Error("seed gym missing");
    gymId = gym.id;
    const ahmed = await prisma.member.findFirst({ where: { gymId, fullName: "Ahmed Ben Ali" } });
    const rania = await prisma.member.findFirst({ where: { gymId, fullName: "Rania Saidi" } });
    const sara = await prisma.member.findFirst({ where: { gymId, fullName: "Sara Trabelsi" } });
    const ines = await prisma.member.findFirst({ where: { gymId, fullName: "Ines Jlassi" } });
    const session = await prisma.classSession.findFirst({
      where: { gymId, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    if (!ahmed || !rania || !sara || !ines || !session) throw new Error("seed fixtures missing");
    ahmedId = ahmed.id;
    raniaId = rania.id;
    saraId = sara.id;
    inesId = ines.id;
    sessionId = session.id;
    const other = await prisma.gym.create({
      data: { name: "Other Gym", plan: Plan.GROWTH },
    });
    otherGymId = other.id;
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects starter gym via assertClassBookingEnabled", async () => {
    await prisma.gym.update({ where: { id: gymId }, data: { plan: Plan.STARTER } });
    await expect(assertClassBookingEnabled(prisma, gymId)).rejects.toThrow("FEATURE_LOCKED");
    await prisma.gym.update({ where: { id: gymId }, data: { plan: Plan.PRO } });
  });

  it("books until capacity 1 then rejects the other member with SESSION_FULL under concurrency", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const cap1 = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        capacity: 1,
        status: "SCHEDULED",
      },
    });
    const now = new Date();
    const results = await Promise.allSettled([
      bookSession(prisma, { gymId, memberId: ahmedId, sessionId: cap1.id, now }),
      bookSession(prisma, { gymId, memberId: raniaId, sessionId: cap1.id, now }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(isCode(reason, "SESSION_FULL")).toBe(true);
    const booked = await prisma.booking.count({
      where: { sessionId: cap1.id, gymId, status: "BOOKED" },
    });
    expect(booked).toBe(1);
  });

  it("rejects a second BOOKED row for the same member+session", async () => {
    const now = new Date();
    await bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now });
    await expectBookingCode(
      bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now }),
      "ALREADY_BOOKED",
    );
  });

  it("cancel then re-book while a spot remains", async () => {
    const now = new Date();
    await cancelBooking(prisma, {
      gymId,
      sessionId,
      memberId: ahmedId,
      now,
      actor: "member",
    });
    const again = await bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now });
    expect(again.bookingId).toBeTruthy();
    const rows = await prisma.booking.findMany({ where: { sessionId, memberId: ahmedId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("BOOKED");
  });

  it("member cancel after start is SESSION_STARTED; desk cancel is allowed", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const started = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() - 60 * 1000),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        capacity: 8,
        status: "SCHEDULED",
      },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: started.id, memberId: raniaId, status: "BOOKED" },
    });
    await expectBookingCode(
      cancelBooking(prisma, {
        gymId,
        sessionId: started.id,
        memberId: raniaId,
        now: new Date(),
        actor: "member",
      }),
      "SESSION_STARTED",
    );
    const desk = await cancelBooking(prisma, {
      gymId,
      sessionId: started.id,
      memberId: raniaId,
      now: new Date(),
      actor: "desk",
    });
    expect(desk.remaining).toBe(8);
  });

  it("expired and frozen members cannot book; other gym cannot book this session", async () => {
    const now = new Date();
    await expectBookingCode(
      bookSession(prisma, { gymId, memberId: saraId, sessionId, now }),
      "MEMBER_NOT_ELIGIBLE",
    );
    await expectBookingCode(
      bookSession(prisma, { gymId, memberId: inesId, sessionId, now }),
      "MEMBER_NOT_ELIGIBLE",
    );
    await expectBookingCode(
      bookSession(prisma, {
        gymId: otherGymId,
        memberId: ahmedId,
        sessionId,
        now,
      }),
      "NOT_FOUND",
    );
  });

  it("generateWeekSessions skips an existing gymId+classId+startsAt row on the second run", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const weekStart = new Date("2026-09-07T00:00:00.000Z");
    const slots = [{ weekday: 1, startMinutes: 10 * 60, endMinutes: 11 * 60 }];
    const first = await generateWeekSessions(prisma, {
      gymId,
      classId: klass.id,
      weekStart,
      slots,
    });
    expect(first).toEqual({ created: 1, skipped: 0 });
    const second = await generateWeekSessions(prisma, {
      gymId,
      classId: klass.id,
      weekStart,
      slots,
    });
    expect(second).toEqual({ created: 0, skipped: 1 });
  });

  it("generateWeekSessions rejects an inactive class with VALIDATION and creates 0", async () => {
    const created = await createClass(prisma, {
      gymId,
      name: "Inactive Spin",
      defaultCapacity: 8,
    });
    await updateClass(prisma, { gymId, classId: created.id, active: false });
    const before = await prisma.classSession.count({
      where: { gymId, classId: created.id },
    });
    await expectBookingCode(
      generateWeekSessions(prisma, {
        gymId,
        classId: created.id,
        weekStart: new Date("2026-09-14T00:00:00.000Z"),
        slots: [{ weekday: 1, startMinutes: 10 * 60, endMinutes: 11 * 60 }],
      }),
      "VALIDATION",
    );
    const after = await prisma.classSession.count({
      where: { gymId, classId: created.id },
    });
    expect(after - before).toBe(0);
  });

  it("updateSession rejects capacity below the current BOOKED count", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const session = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        capacity: 8,
        status: "SCHEDULED",
      },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: session.id, memberId: ahmedId, status: "BOOKED" },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: session.id, memberId: raniaId, status: "BOOKED" },
    });
    await expectBookingCode(
      updateSession(prisma, { gymId, sessionId: session.id, capacity: 1 }),
      "CAPACITY_BELOW_BOOKINGS",
    );
  });

  it("deleteClass rejects when the class still has sessions", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    await expectBookingCode(deleteClass(prisma, { gymId, classId: klass.id }), "CLASS_HAS_SESSIONS");
  });

  it("deleteSession rejects when any booking row exists", async () => {
    await expectBookingCode(
      deleteSession(prisma, { gymId, sessionId }),
      "SESSION_HAS_BOOKINGS",
    );
  });

  it("cancelClassSession sets the session and BOOKED rows to CANCELLED", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const session = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        capacity: 8,
        status: "SCHEDULED",
      },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: session.id, memberId: ahmedId, status: "BOOKED" },
    });
    const now = new Date();
    await cancelClassSession(prisma, { gymId, sessionId: session.id, now });
    const updated = await prisma.classSession.findFirst({
      where: { id: session.id, gymId },
    });
    expect(updated?.status).toBe("CANCELLED");
    const bookings = await prisma.booking.findMany({
      where: { sessionId: session.id, gymId },
    });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.status).toBe("CANCELLED");
    expect(bookings[0]?.cancelledAt?.getTime()).toBe(now.getTime());
  });

  it("listMemberSessions omits CANCELLED sessions and other members' names", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const base = Date.now() + 8 * 24 * 60 * 60 * 1000;
    const scheduled = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(base),
        endsAt: new Date(base + 60 * 60 * 1000),
        capacity: 8,
        status: "SCHEDULED",
      },
    });
    const cancelled = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(base + 2 * 60 * 60 * 1000),
        endsAt: new Date(base + 3 * 60 * 60 * 1000),
        capacity: 8,
        status: "CANCELLED",
      },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: scheduled.id, memberId: raniaId, status: "BOOKED" },
    });
    const rows = await listMemberSessions(prisma, {
      gymId,
      memberId: ahmedId,
      from: new Date(base - 60 * 1000),
      to: new Date(base + 4 * 60 * 60 * 1000),
    });
    expect(rows.some((row) => row.id === cancelled.id)).toBe(false);
    const scheduledRow = rows.find((row) => row.id === scheduled.id);
    expect(scheduledRow).toBeTruthy();
    expect(scheduledRow?.remaining).toBe(7);
    expect(scheduledRow?.myBooking).toBeNull();
    expect(JSON.stringify(rows)).not.toContain("Rania");
  });

  it("createSession rejects endsAt <= startsAt with VALIDATION", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const startsAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    await expectBookingCode(
      createSession(prisma, {
        gymId,
        classId: klass.id,
        startsAt,
        endsAt: startsAt,
      }),
      "VALIDATION",
    );
  });
});
