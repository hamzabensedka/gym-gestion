"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  BookingError,
  cancelBooking,
  cancelClassSession,
  createClass,
  createSession,
  deleteClass,
  deleteSession,
  generateWeekSessions,
  isBookingError,
  updateClass,
  updateSession,
  type BookingErrorCode,
} from "@/lib/class-booking";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/gym-features";
import { requireSession } from "@/lib/session";

type ActionResult = { ok: true } | { error: BookingErrorCode };

async function requireClassesDesk() {
  const session = await requireSession();
  if (session.role !== Role.ADMIN && session.role !== Role.STAFF) {
    return { error: "FEATURE_LOCKED" as const, session: null };
  }
  try {
    await assertFeature(session.gymId, "class_booking");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return { error: "FEATURE_LOCKED" as const, session: null };
    }
    throw error;
  }
  return { error: null, session };
}

function revalidateClasses() {
  revalidatePath("/classes");
}

function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function requiredString(formData: FormData, key: string): string {
  const value = formString(formData, key);
  if (value == null || !value.trim()) {
    throw new BookingError("VALIDATION");
  }
  return value.trim();
}

function parseDateValue(value: string): Date {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (ymd) {
    const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (Number.isNaN(date.getTime())) {
      throw new BookingError("VALIDATION");
    }
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BookingError("VALIDATION");
  }
  return date;
}

function parseOptionalDate(formData: FormData, key: string): Date | undefined {
  const value = formString(formData, key);
  if (value == null || !value.trim()) return undefined;
  return parseDateValue(value.trim());
}

function parseOptionalCapacity(formData: FormData, key: string): number | undefined {
  const value = formString(formData, key);
  if (value == null || value === "") return undefined;
  const capacity = Number(value);
  if (!Number.isFinite(capacity)) {
    throw new BookingError("VALIDATION");
  }
  return capacity;
}

function parseOptionalCoach(formData: FormData): string | null | undefined {
  if (!formData.has("coachName")) return undefined;
  const value = formString(formData, "coachName");
  if (value == null || !value.trim()) return null;
  return value;
}

function parseOptionalActive(formData: FormData): boolean | undefined {
  const value = formString(formData, "active");
  if (value == null || value === "") return undefined;
  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new BookingError("VALIDATION");
}

function parseOptionalStatus(
  formData: FormData,
): "SCHEDULED" | "CANCELLED" | undefined {
  const value = formString(formData, "status");
  if (value == null || value === "") return undefined;
  if (value === "SCHEDULED" || value === "CANCELLED") return value;
  throw new BookingError("VALIDATION");
}

function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }
  const minutes = Number(value);
  if (!Number.isInteger(minutes)) {
    throw new BookingError("VALIDATION");
  }
  return minutes;
}

function parseSlotRow(row: {
  weekday?: unknown;
  startMinutes?: unknown;
  endMinutes?: unknown;
  start?: unknown;
  end?: unknown;
}): { weekday: number; startMinutes: number; endMinutes: number } {
  const weekday = Number(row.weekday);
  if (!Number.isInteger(weekday)) {
    throw new BookingError("VALIDATION");
  }
  const startRaw =
    typeof row.startMinutes === "number"
      ? row.startMinutes
      : timeToMinutes(String(row.start ?? row.startMinutes ?? ""));
  const endRaw =
    typeof row.endMinutes === "number"
      ? row.endMinutes
      : timeToMinutes(String(row.end ?? row.endMinutes ?? ""));
  return { weekday, startMinutes: startRaw, endMinutes: endRaw };
}

function parseSlots(
  formData: FormData,
): Array<{ weekday: number; startMinutes: number; endMinutes: number }> {
  const json = formString(formData, "slots");
  if (json && json.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new BookingError("VALIDATION");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BookingError("VALIDATION");
    }
    return parsed.map((slot) => {
      if (!slot || typeof slot !== "object") {
        throw new BookingError("VALIDATION");
      }
      return parseSlotRow(slot as Record<string, unknown>);
    });
  }

  const weekdays = formData.getAll("weekday");
  const starts = formData.getAll("start");
  const ends = formData.getAll("end");
  if (weekdays.length === 0) {
    throw new BookingError("VALIDATION");
  }
  return weekdays.map((weekday, index) =>
    parseSlotRow({
      weekday,
      start: starts[index],
      end: ends[index],
    }),
  );
}

async function runDesk(
  fn: (gymId: string) => Promise<void>,
): Promise<ActionResult> {
  const gate = await requireClassesDesk();
  if (gate.error || !gate.session) {
    return { error: gate.error ?? "FEATURE_LOCKED" };
  }
  try {
    await fn(gate.session.gymId);
  } catch (error) {
    if (isBookingError(error)) {
      return { error: error.code };
    }
    throw error;
  }
  revalidateClasses();
  return { ok: true };
}

export async function createClassAction(formData: FormData): Promise<ActionResult> {
  return runDesk(async (gymId) => {
    const name = requiredString(formData, "name");
    const defaultCapacity = Number(formData.get("defaultCapacity"));
    if (!Number.isFinite(defaultCapacity)) {
      throw new BookingError("VALIDATION");
    }
    await createClass(prisma, { gymId, name, defaultCapacity });
  });
}

export async function updateClassAction(formData: FormData): Promise<ActionResult> {
  return runDesk(async (gymId) => {
    const classId = requiredString(formData, "classId");
    const name = formString(formData, "name") ?? undefined;
    const defaultCapacity = parseOptionalCapacity(formData, "defaultCapacity");
    const active = parseOptionalActive(formData);
    await updateClass(prisma, {
      gymId,
      classId,
      name: name !== undefined ? name : undefined,
      defaultCapacity,
      active,
    });
  });
}

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  if (!classId) return { error: "VALIDATION" };
  return runDesk(async (gymId) => {
    await deleteClass(prisma, { gymId, classId });
  });
}

export async function generateWeekAction(formData: FormData): Promise<ActionResult> {
  return runDesk(async (gymId) => {
    const classId = requiredString(formData, "classId");
    const weekStart = parseDateValue(requiredString(formData, "weekStart"));
    const slots = parseSlots(formData);
    await generateWeekSessions(prisma, {
      gymId,
      classId,
      weekStart,
      slots,
      capacity: parseOptionalCapacity(formData, "capacity"),
      coachName: parseOptionalCoach(formData),
    });
  });
}

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  return runDesk(async (gymId) => {
    const classId = requiredString(formData, "classId");
    const startsAt = parseDateValue(requiredString(formData, "startsAt"));
    const endsAt = parseDateValue(requiredString(formData, "endsAt"));
    await createSession(prisma, {
      gymId,
      classId,
      startsAt,
      endsAt,
      capacity: parseOptionalCapacity(formData, "capacity"),
      coachName: parseOptionalCoach(formData),
    });
  });
}

export async function updateSessionAction(formData: FormData): Promise<ActionResult> {
  return runDesk(async (gymId) => {
    const sessionId = requiredString(formData, "sessionId");
    await updateSession(prisma, {
      gymId,
      sessionId,
      startsAt: parseOptionalDate(formData, "startsAt"),
      endsAt: parseOptionalDate(formData, "endsAt"),
      capacity: parseOptionalCapacity(formData, "capacity"),
      coachName: parseOptionalCoach(formData),
      status: parseOptionalStatus(formData),
    });
  });
}

export async function deleteSessionAction(sessionId: string): Promise<ActionResult> {
  if (!sessionId) return { error: "VALIDATION" };
  return runDesk(async (gymId) => {
    await deleteSession(prisma, { gymId, sessionId });
  });
}

export async function cancelSessionAction(sessionId: string): Promise<ActionResult> {
  if (!sessionId) return { error: "VALIDATION" };
  return runDesk(async (gymId) => {
    await cancelClassSession(prisma, { gymId, sessionId, now: new Date() });
  });
}

export async function deskCancelBookingAction(
  sessionId: string,
  memberId: string,
): Promise<ActionResult> {
  if (!sessionId || !memberId) return { error: "VALIDATION" };
  return runDesk(async (gymId) => {
    await cancelBooking(prisma, {
      gymId,
      sessionId,
      memberId,
      now: new Date(),
      actor: "desk",
    });
  });
}
