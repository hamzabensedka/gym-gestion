import type { BookingErrorCode } from "@/lib/class-booking";
import type { TranslationKey, Translator } from "@/lib/i18n";

export type ClassRowView = {
  id: string;
  name: string;
  defaultCapacity: number;
  active: boolean;
};

export type DeskSessionView = {
  id: string;
  classId: string;
  className: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  remaining: number;
  coachName: string | null;
  audience: "MIXED" | "LADIES" | "MEN";
  status: "SCHEDULED" | "CANCELLED";
  bookedCount: number;
};

export type RosterRowView = {
  memberId: string;
  fullName: string;
  status: "BOOKED" | "CANCELLED";
  createdAt: string;
  cancelledAt: string | null;
};

const ERROR_KEYS = {
  FEATURE_LOCKED: "classes.error.FEATURE_LOCKED",
  NOT_FOUND: "classes.error.NOT_FOUND",
  SESSION_FULL: "classes.error.SESSION_FULL",
  ALREADY_BOOKED: "classes.error.ALREADY_BOOKED",
  SESSION_STARTED: "classes.error.SESSION_STARTED",
  SESSION_CANCELLED: "classes.error.SESSION_CANCELLED",
  MEMBER_NOT_ELIGIBLE: "classes.error.MEMBER_NOT_ELIGIBLE",
  CAPACITY_BELOW_BOOKINGS: "classes.error.CAPACITY_BELOW_BOOKINGS",
  CLASS_HAS_SESSIONS: "classes.error.CLASS_HAS_SESSIONS",
  SESSION_HAS_BOOKINGS: "classes.error.SESSION_HAS_BOOKINGS",
  VALIDATION: "classes.error.VALIDATION",
} as const satisfies Record<BookingErrorCode, TranslationKey>;

export function translateClassError(t: Translator, code: string): string {
  const key = ERROR_KEYS[code as BookingErrorCode] ?? ERROR_KEYS.VALIDATION;
  return t(key);
}

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function weekdayKey(day: Weekday): TranslationKey {
  return `classes.weekday.${day}` as TranslationKey;
}
