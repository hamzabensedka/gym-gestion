import { describe, expect, test } from "vitest";
import { AccessMode, Plan } from "@prisma/client";
import { modesAllowedForPlan, getPlanLimits } from "@gym/shared/plans";

function resolveAccessMode(plan: Plan, mode: AccessMode): AccessMode {
  const allowed = modesAllowedForPlan(plan);
  return allowed.includes(mode) ? mode : AccessMode.DESK_ONLY;
}

describe("plan-access", () => {
  test("STARTER rejects KIOSK → DESK_ONLY", () => {
    expect(resolveAccessMode(Plan.STARTER, AccessMode.KIOSK)).toBe(AccessMode.DESK_ONLY);
  });

  test("PRO keeps BADGE_PC_EXTENSION", () => {
    expect(resolveAccessMode(Plan.PRO, AccessMode.BADGE_PC_EXTENSION)).toBe(
      AccessMode.BADGE_PC_EXTENSION,
    );
  });

  test("maxStaff follows plan", () => {
    expect(getPlanLimits(Plan.GROWTH).maxStaff).toBe(5);
  });
});
