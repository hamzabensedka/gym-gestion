import { describe, expect, it } from "vitest";
import { MemberStatus } from "@gym/shared/auth";
import { addDays, subDays } from "date-fns";
import {
  KIOSK_IDLE_MS,
  KIOSK_RESULT_MS,
  decideCheckinOutcome,
  parseMemberIdFromQr,
  resolveCheckinToken,
} from "@gym/shared/checkin";

describe("parseMemberIdFromQr", () => {
  it("returns raw string when not JSON", () => {
    expect(parseMemberIdFromQr("member-id-123")).toBe("member-id-123");
  });

  it("treats a numeric badge code as a raw string, not JSON", () => {
    expect(parseMemberIdFromQr("1001")).toBe("1001");
  });

  it("parses memberId from JSON payload", () => {
    expect(parseMemberIdFromQr('{"memberId":"abc123"}')).toBe("abc123");
  });

  it("parses id field as fallback", () => {
    expect(parseMemberIdFromQr('{"id":"xyz"}')).toBe("xyz");
  });

  it("returns null for empty input", () => {
    expect(parseMemberIdFromQr("")).toBeNull();
    expect(parseMemberIdFromQr("   ")).toBeNull();
  });
});

describe("resolveCheckinToken", () => {
  it("prefers memberId over qrData and code", () => {
    expect(
      resolveCheckinToken({
        memberId: " mid ",
        qrData: '{"memberId":"qr"}',
        code: "phone",
      }),
    ).toBe("mid");
  });

  it("uses QR JSON when memberId is missing", () => {
    expect(resolveCheckinToken({ qrData: '{"memberId":"from-qr"}' })).toBe(
      "from-qr",
    );
  });

  it("uses code when memberId and qrData are empty", () => {
    expect(resolveCheckinToken({ code: "  +21620123456  " })).toBe(
      "+21620123456",
    );
  });

  it("returns null when every field is empty", () => {
    expect(resolveCheckinToken({})).toBeNull();
    expect(resolveCheckinToken({ memberId: "  ", qrData: "", code: "" })).toBeNull();
  });
});

describe("decideCheckinOutcome", () => {
  it("returns NOT_FOUND when member is missing", () => {
    expect(decideCheckinOutcome(null)).toBe("NOT_FOUND");
  });

  it("returns GRANTED for an active unfrozen member", () => {
    expect(
      decideCheckinOutcome({
        status: MemberStatus.ACTIVE,
        subscriptionEnd: addDays(new Date(), 10),
      }),
    ).toBe("GRANTED");
  });

  it("returns EXPIRED when subscription has ended", () => {
    expect(
      decideCheckinOutcome({
        status: MemberStatus.EXPIRED,
        subscriptionEnd: subDays(new Date(), 5),
      }),
    ).toBe("EXPIRED");
  });

  it("returns FROZEN even if subscription dates are still valid", () => {
    expect(
      decideCheckinOutcome({
        status: MemberStatus.FROZEN,
        subscriptionEnd: addDays(new Date(), 10),
      }),
    ).toBe("FROZEN");
  });

  it("returns FROZEN over EXPIRED when status is frozen and dates are past", () => {
    expect(
      decideCheckinOutcome({
        status: MemberStatus.FROZEN,
        subscriptionEnd: subDays(new Date(), 5),
      }),
    ).toBe("FROZEN");
  });
});

describe("kiosk timing constants", () => {
  it("uses a 4s result overlay and 45s idle timeout", () => {
    expect(KIOSK_RESULT_MS).toBe(4000);
    expect(KIOSK_IDLE_MS).toBe(45000);
  });
});
