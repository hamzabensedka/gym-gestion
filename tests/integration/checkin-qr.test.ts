import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateMemberQrPayload } from "@/lib/member-qr";
import { parseMemberIdFromQr, performCheckin } from "@/lib/checkin";
import { resetTestDatabase, findGymId, getMemberIdByName } from "../helpers/db";

describe("QR check-in payload integration", () => {
  let gymId: string;
  let activeMemberId: string;

  beforeEach(async () => {
    resetTestDatabase();
    gymId = await findGymId();
    const id = await getMemberIdByName("Ahmed Ben Ali");
    if (!id) throw new Error("Seed member missing");
    activeMemberId = id;
  });

  it("parses QR JSON payload and grants check-in", async () => {
    const qrData = generateMemberQrPayload(activeMemberId);
    const memberId = parseMemberIdFromQr(qrData);
    expect(memberId).toBe(activeMemberId);

    const result = await performCheckin(gymId, memberId!);
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("GRANTED");
  });

  it("rejects expired member via QR payload", async () => {
    const expiredId = await getMemberIdByName("Sara Trabelsi");
    if (!expiredId) throw new Error("Expired seed member missing");

    const qrData = generateMemberQrPayload(expiredId);
    const memberId = parseMemberIdFromQr(qrData);
    const result = await performCheckin(gymId, memberId!);

    expect(result.success).toBe(false);
    expect(result.outcome).toBe("EXPIRED");
  });
});
