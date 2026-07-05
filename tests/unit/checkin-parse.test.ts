import { describe, it, expect } from "vitest";
import { parseMemberIdFromQr } from "@/lib/checkin";

describe("parseMemberIdFromQr", () => {
  it("returns raw string when not JSON", () => {
    expect(parseMemberIdFromQr("member-id-123")).toBe("member-id-123");
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
