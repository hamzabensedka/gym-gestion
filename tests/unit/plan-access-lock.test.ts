import { describe, expect, it } from "vitest";
import { AccessMode } from "@prisma/client";
import { parsePlanAccessPatch } from "@gym/shared/plan-requests";

describe("parsePlanAccessPatch", () => {
  it("rejects a body that includes plan", () => {
    const result = parsePlanAccessPatch({ plan: "PRO", accessMode: "DESK_ONLY" });
    expect(result.ok).toBe(false);
  });

  it("accepts accessMode only", () => {
    const result = parsePlanAccessPatch({ accessMode: "KIOSK" });
    expect(result).toEqual({ ok: true, accessMode: AccessMode.KIOSK });
  });
});
