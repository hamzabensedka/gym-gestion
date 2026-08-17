export type BookingErrorCode =
  | "FEATURE_LOCKED"
  | "NOT_FOUND"
  | "SESSION_FULL"
  | "ALREADY_BOOKED"
  | "SESSION_STARTED"
  | "SESSION_CANCELLED"
  | "MEMBER_NOT_ELIGIBLE"
  | "CAPACITY_BELOW_BOOKINGS"
  | "CLASS_HAS_SESSIONS"
  | "SESSION_HAS_BOOKINGS"
  | "VALIDATION";

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  constructor(code: BookingErrorCode) {
    super(code);
    this.name = "BookingError";
    this.code = code;
  }
}

export function isBookingError(error: unknown): error is BookingError {
  return error instanceof BookingError;
}

export function remainingSpots(capacity: number, bookedCount: number): number {
  return Math.max(0, capacity - bookedCount);
}

export function isSessionFull(capacity: number, bookedCount: number): boolean {
  return remainingSpots(capacity, bookedCount) <= 0;
}

export function decideMemberBookEligibility(input: {
  now: Date;
  memberStatus: "ACTIVE" | "EXPIRED" | "FROZEN";
  subscriptionEnd: Date;
  sessionStatus: "SCHEDULED" | "CANCELLED";
  startsAt: Date;
}): { ok: true } | { ok: false; code: BookingErrorCode } {
  if (input.sessionStatus === "CANCELLED") {
    return { ok: false, code: "SESSION_CANCELLED" };
  }
  if (input.now >= input.startsAt) {
    return { ok: false, code: "SESSION_STARTED" };
  }
  if (input.memberStatus !== "ACTIVE" || input.subscriptionEnd < input.now) {
    return { ok: false, code: "MEMBER_NOT_ELIGIBLE" };
  }
  return { ok: true };
}

export function assertCapacity(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 200) {
    throw new BookingError("VALIDATION");
  }
  return value;
}

export function assertClassName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new BookingError("VALIDATION");
  }
  return trimmed;
}

export function assertCoachName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) {
    throw new BookingError("VALIDATION");
  }
  return trimmed;
}

const MAX_SESSION_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

export function parseSessionRange(fromIso: string, toIso: string): { from: Date; to: Date } {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new BookingError("VALIDATION");
  }
  if (to.getTime() - from.getTime() > MAX_SESSION_RANGE_MS) {
    throw new BookingError("VALIDATION");
  }
  return { from, to };
}

function assertWeekSlot(weekday: number, minutes: number): void {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new BookingError("VALIDATION");
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new BookingError("VALIDATION");
  }
}

function dateFromWeekSlot(weekStart: Date, weekday: number, minutes: number): Date {
  assertWeekSlot(weekday, minutes);
  return new Date(weekStart.getTime() + (weekday - 1) * 86400000 + minutes * 60000);
}

export function startsAtFromWeekSlot(
  weekStart: Date,
  weekday: number,
  startMinutes: number,
): Date {
  return dateFromWeekSlot(weekStart, weekday, startMinutes);
}

export function endsAtFromWeekSlot(
  weekStart: Date,
  weekday: number,
  endMinutes: number,
): Date {
  return dateFromWeekSlot(weekStart, weekday, endMinutes);
}

export function bookingErrorHttpStatus(code: BookingErrorCode): 403 | 404 | 409 | 422 {
  if (code === "FEATURE_LOCKED" || code === "MEMBER_NOT_ELIGIBLE") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "VALIDATION") return 422;
  return 409;
}

export { assertClassBookingEnabled, bookSession, cancelBooking } from "./class-booking-db";
