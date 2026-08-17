import { Hono } from "hono";
import type { Context } from "hono";
import {
  BookingError,
  bookSession,
  bookingErrorHttpStatus,
  cancelBooking,
  createClass,
  createSession,
  deleteClass,
  deleteSession,
  generateWeekSessions,
  isBookingError,
  listClasses,
  listDeskSessions,
  listMemberSessions,
  listSessionRoster,
  parseSessionRange,
  updateClass,
  updateSession,
  type DeskSessionRow,
  type MemberSessionRow,
  type RosterRow,
} from "@gym/shared/class-booking";
import { prisma } from "../db";
import {
  featureLockedResponse,
  isFeatureLockedError,
  requireGymFeature,
  requireMemberGymFeature,
} from "../lib/features";
import { requireDeskAccess } from "../middleware/auth";

function bookingErrorResponse(c: Context, error: unknown) {
  if (isFeatureLockedError(error)) return featureLockedResponse(c);
  if (isBookingError(error)) {
    return c.json(
      { error: { code: error.code, message: `classes.error.${error.code}` } },
      bookingErrorHttpStatus(error.code),
    );
  }
  throw error;
}

function parseIsoDate(value: unknown): Date {
  if (typeof value !== "string" || !value.trim()) {
    throw new BookingError("VALIDATION");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BookingError("VALIDATION");
  }
  return date;
}

function parseOptionalIsoDate(value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  return parseIsoDate(value);
}

function parseOptionalCapacity(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BookingError("VALIDATION");
  }
  return value;
}

function parseOptionalCoachName(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new BookingError("VALIDATION");
  }
  return value;
}

function parseWeekSlots(
  value: unknown,
): Array<{ weekday: number; startMinutes: number; endMinutes: number }> {
  if (!Array.isArray(value)) {
    throw new BookingError("VALIDATION");
  }
  return value.map((slot) => {
    if (!slot || typeof slot !== "object") {
      throw new BookingError("VALIDATION");
    }
    const row = slot as {
      weekday?: unknown;
      startMinutes?: unknown;
      endMinutes?: unknown;
    };
    if (
      typeof row.weekday !== "number" ||
      typeof row.startMinutes !== "number" ||
      typeof row.endMinutes !== "number"
    ) {
      throw new BookingError("VALIDATION");
    }
    return {
      weekday: row.weekday,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
    };
  });
}

function serializeMemberSession(row: MemberSessionRow) {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  };
}

function serializeDeskSession(row: DeskSessionRow) {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  };
}

function serializeRoster(row: RosterRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  };
}

export const classRoutes = new Hono();
classRoutes.use("*", requireDeskAccess);
classRoutes.use("*", requireGymFeature("class_booking"));

classRoutes.get("/", async (c) => {
  try {
    const staff = c.get("staff");
    const data = await listClasses(prisma, staff.gymId);
    return c.json({ data });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

classRoutes.post("/", async (c) => {
  try {
    const staff = c.get("staff");
    const body = await c.req.json();
    if (typeof body.name !== "string") {
      throw new BookingError("VALIDATION");
    }
    if (typeof body.defaultCapacity !== "number") {
      throw new BookingError("VALIDATION");
    }
    const created = await createClass(prisma, {
      gymId: staff.gymId,
      name: body.name,
      defaultCapacity: body.defaultCapacity,
    });
    return c.json({ data: created }, 201);
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

classRoutes.patch("/:id", async (c) => {
  try {
    const staff = c.get("staff");
    const classId = c.req.param("id");
    const body = await c.req.json();
    const patch: {
      name?: string;
      defaultCapacity?: number;
      active?: boolean;
    } = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        throw new BookingError("VALIDATION");
      }
      patch.name = body.name;
    }
    if (body.defaultCapacity !== undefined) {
      if (typeof body.defaultCapacity !== "number") {
        throw new BookingError("VALIDATION");
      }
      patch.defaultCapacity = body.defaultCapacity;
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        throw new BookingError("VALIDATION");
      }
      patch.active = body.active;
    }
    await updateClass(prisma, { gymId: staff.gymId, classId, ...patch });
    return c.json({ data: { ok: true } });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

classRoutes.delete("/:id", async (c) => {
  try {
    const staff = c.get("staff");
    await deleteClass(prisma, { gymId: staff.gymId, classId: c.req.param("id") });
    return c.json({ data: { ok: true } });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

export const sessionRoutes = new Hono();
sessionRoutes.use("*", requireDeskAccess);
sessionRoutes.use("*", requireGymFeature("class_booking"));

sessionRoutes.get("/", async (c) => {
  try {
    const staff = c.get("staff");
    const range = parseSessionRange(c.req.query("from") ?? "", c.req.query("to") ?? "");
    const rows = await listDeskSessions(prisma, {
      gymId: staff.gymId,
      from: range.from,
      to: range.to,
    });
    return c.json({ data: rows.map(serializeDeskSession) });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.post("/", async (c) => {
  try {
    const staff = c.get("staff");
    const body = await c.req.json();
    if (typeof body.classId !== "string" || !body.classId) {
      throw new BookingError("VALIDATION");
    }
    const created = await createSession(prisma, {
      gymId: staff.gymId,
      classId: body.classId,
      startsAt: parseIsoDate(body.startsAt),
      endsAt: parseIsoDate(body.endsAt),
      capacity: parseOptionalCapacity(body.capacity),
      coachName: parseOptionalCoachName(body.coachName),
    });
    return c.json({ data: created }, 201);
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.post("/generate-week", async (c) => {
  try {
    const staff = c.get("staff");
    const body = await c.req.json();
    if (typeof body.classId !== "string" || !body.classId) {
      throw new BookingError("VALIDATION");
    }
    const result = await generateWeekSessions(prisma, {
      gymId: staff.gymId,
      classId: body.classId,
      weekStart: parseIsoDate(body.weekStart),
      slots: parseWeekSlots(body.slots),
      capacity: parseOptionalCapacity(body.capacity),
      coachName: parseOptionalCoachName(body.coachName),
    });
    return c.json({ data: result });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.patch("/:id", async (c) => {
  try {
    const staff = c.get("staff");
    const body = await c.req.json();
    let status: "SCHEDULED" | "CANCELLED" | undefined;
    if (body.status !== undefined) {
      if (body.status !== "SCHEDULED" && body.status !== "CANCELLED") {
        throw new BookingError("VALIDATION");
      }
      status = body.status;
    }
    await updateSession(prisma, {
      gymId: staff.gymId,
      sessionId: c.req.param("id"),
      startsAt: parseOptionalIsoDate(body.startsAt),
      endsAt: parseOptionalIsoDate(body.endsAt),
      capacity: parseOptionalCapacity(body.capacity),
      coachName: parseOptionalCoachName(body.coachName),
      status,
    });
    return c.json({ data: { ok: true } });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.delete("/:id", async (c) => {
  try {
    const staff = c.get("staff");
    await deleteSession(prisma, {
      gymId: staff.gymId,
      sessionId: c.req.param("id"),
    });
    return c.json({ data: { ok: true } });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.get("/:id/bookings", async (c) => {
  try {
    const staff = c.get("staff");
    const rows = await listSessionRoster(prisma, {
      gymId: staff.gymId,
      sessionId: c.req.param("id"),
    });
    return c.json({ data: rows.map(serializeRoster) });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

sessionRoutes.post("/:id/bookings/:memberId/cancel", async (c) => {
  try {
    const staff = c.get("staff");
    const result = await cancelBooking(prisma, {
      gymId: staff.gymId,
      sessionId: c.req.param("id"),
      memberId: c.req.param("memberId"),
      now: new Date(),
      actor: "desk",
    });
    return c.json({ data: result });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

export const memberSessionRoutes = new Hono();
memberSessionRoutes.use("*", requireMemberGymFeature("class_booking"));

memberSessionRoutes.get("/", async (c) => {
  try {
    const member = c.get("member");
    const range = parseSessionRange(c.req.query("from") ?? "", c.req.query("to") ?? "");
    const rows = await listMemberSessions(prisma, {
      gymId: member.gymId,
      memberId: member.sub,
      from: range.from,
      to: range.to,
    });
    return c.json({ data: rows.map(serializeMemberSession) });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

memberSessionRoutes.post("/:id/book", async (c) => {
  try {
    const member = c.get("member");
    const result = await bookSession(prisma, {
      gymId: member.gymId,
      memberId: member.sub,
      sessionId: c.req.param("id"),
      now: new Date(),
    });
    return c.json({ data: result }, 201);
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});

memberSessionRoutes.post("/:id/cancel", async (c) => {
  try {
    const member = c.get("member");
    const result = await cancelBooking(prisma, {
      gymId: member.gymId,
      sessionId: c.req.param("id"),
      memberId: member.sub,
      now: new Date(),
      actor: "member",
    });
    return c.json({ data: result });
  } catch (error) {
    return bookingErrorResponse(c, error);
  }
});
