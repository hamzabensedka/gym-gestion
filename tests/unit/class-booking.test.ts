import { describe, expect, it } from "vitest";
import {
  remainingSpots,
  isSessionFull,
  decideMemberBookEligibility,
  assertCapacity,
  parseSessionRange,
  startsAtFromWeekSlot,
  bookingErrorHttpStatus,
  BookingError,
  sessionVisibleToMember,
} from "@gym/shared/class-booking";

describe("remainingSpots / isSessionFull", () => {
  it("returns capacity minus booked", () => {
    expect(remainingSpots(12, 3)).toBe(9);
  });
  it("is full at remaining 0, not at remaining 1", () => {
    expect(isSessionFull(1, 1)).toBe(true);
    expect(isSessionFull(1, 0)).toBe(false);
    expect(remainingSpots(1, 0)).toBe(1);
  });
});

describe("decideMemberBookEligibility", () => {
  const startsAt = new Date("2026-08-20T10:00:00.000Z");
  const base = {
    now: new Date("2026-08-20T09:00:00.000Z"),
    memberStatus: "ACTIVE" as const,
    subscriptionEnd: new Date("2026-08-31T00:00:00.000Z"),
    sessionStatus: "SCHEDULED" as const,
    startsAt,
  };

  it("allows active member before start", () => {
    expect(decideMemberBookEligibility(base)).toEqual({ ok: true });
  });
  it("rejects frozen", () => {
    expect(decideMemberBookEligibility({ ...base, memberStatus: "FROZEN" })).toEqual({
      ok: false,
      code: "MEMBER_NOT_ELIGIBLE",
    });
  });
  it("rejects expired status", () => {
    expect(decideMemberBookEligibility({ ...base, memberStatus: "EXPIRED" })).toEqual({
      ok: false,
      code: "MEMBER_NOT_ELIGIBLE",
    });
  });
  it("rejects subscriptionEnd before now", () => {
    expect(
      decideMemberBookEligibility({
        ...base,
        subscriptionEnd: new Date("2026-08-19T00:00:00.000Z"),
      }),
    ).toEqual({ ok: false, code: "MEMBER_NOT_ELIGIBLE" });
  });
  it("allows subscriptionEnd equal to now", () => {
    expect(
      decideMemberBookEligibility({
        ...base,
        now: new Date("2026-08-31T00:00:00.000Z"),
        startsAt: new Date("2026-08-31T10:00:00.000Z"),
        subscriptionEnd: new Date("2026-08-31T00:00:00.000Z"),
      }),
    ).toEqual({ ok: true });
  });
  it("rejects cancelled session", () => {
    expect(
      decideMemberBookEligibility({ ...base, sessionStatus: "CANCELLED" }),
    ).toEqual({ ok: false, code: "SESSION_CANCELLED" });
  });
  it("rejects when now >= startsAt", () => {
    expect(decideMemberBookEligibility({ ...base, now: startsAt })).toEqual({
      ok: false,
      code: "SESSION_STARTED",
    });
  });
});

describe("validators", () => {
  it("assertCapacity accepts 1 and 200", () => {
    expect(assertCapacity(1)).toBe(1);
    expect(assertCapacity(200)).toBe(200);
  });
  it("assertCapacity rejects 0 and 201", () => {
    expect(() => assertCapacity(0)).toThrow(BookingError);
    expect(() => assertCapacity(201)).toThrow(BookingError);
  });
  it("parseSessionRange rejects spans over 31 days", () => {
    expect(() =>
      parseSessionRange("2026-08-01T00:00:00.000Z", "2026-09-02T00:00:00.000Z"),
    ).toThrow(BookingError);
  });
  it("parseSessionRange allows exactly 31 days", () => {
    const range = parseSessionRange(
      "2026-08-01T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
    );
    expect(range.from.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
  it("startsAtFromWeekSlot uses Monday=1", () => {
    const monday = new Date("2026-08-17T00:00:00.000Z");
    const wed = startsAtFromWeekSlot(monday, 3, 10 * 60);
    expect(wed.toISOString()).toBe("2026-08-19T10:00:00.000Z");
  });
});

describe("bookingErrorHttpStatus", () => {
  it("maps locked and eligibility to 403", () => {
    expect(bookingErrorHttpStatus("FEATURE_LOCKED")).toBe(403);
    expect(bookingErrorHttpStatus("MEMBER_NOT_ELIGIBLE")).toBe(403);
  });
  it("maps not found to 404 and validation to 422", () => {
    expect(bookingErrorHttpStatus("NOT_FOUND")).toBe(404);
    expect(bookingErrorHttpStatus("VALIDATION")).toBe(422);
  });
  it("maps full and already booked to 409", () => {
    expect(bookingErrorHttpStatus("SESSION_FULL")).toBe(409);
    expect(bookingErrorHttpStatus("ALREADY_BOOKED")).toBe(409);
  });
});

describe("sessionVisibleToMember", () => {
  it("shows mixed sessions to everyone", () => {
    expect(sessionVisibleToMember("MIXED", "MALE")).toBe(true);
    expect(sessionVisibleToMember("MIXED", "FEMALE")).toBe(true);
    expect(sessionVisibleToMember("MIXED", null)).toBe(true);
  });

  it("hides ladies sessions from men", () => {
    expect(sessionVisibleToMember("LADIES", "MALE")).toBe(false);
    expect(sessionVisibleToMember("LADIES", "FEMALE")).toBe(true);
  });

  it("hides men sessions from women", () => {
    expect(sessionVisibleToMember("MEN", "FEMALE")).toBe(false);
    expect(sessionVisibleToMember("MEN", "MALE")).toBe(true);
  });

  it("hides gendered sessions when member gender is unknown", () => {
    expect(sessionVisibleToMember("LADIES", null)).toBe(false);
    expect(sessionVisibleToMember("MEN", undefined)).toBe(false);
  });
});
