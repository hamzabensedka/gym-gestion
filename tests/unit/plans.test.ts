import { describe, expect, it } from "vitest";
import { Plan, AccessMode } from "@prisma/client";
import {
  planHasFeature,
  getPlanLimits,
  modesAllowedForPlan,
  suggestFromEntryAnswer,
} from "@/lib/plans";

describe("plans", () => {
  it("starter has no kiosk or access export", () => {
    expect(planHasFeature(Plan.STARTER, "kiosk")).toBe(false);
    expect(planHasFeature(Plan.STARTER, "access_export")).toBe(false);
    expect(getPlanLimits(Plan.STARTER).maxStaff).toBe(2);
  });

  it("growth has kiosk and csv export", () => {
    expect(planHasFeature(Plan.GROWTH, "kiosk")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "csv_export")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "access_export")).toBe(false);
    expect(getPlanLimits(Plan.GROWTH).maxStaff).toBe(5);
  });

  it("pro has badge + access export", () => {
    expect(planHasFeature(Plan.PRO, "badge_numbers")).toBe(true);
    expect(planHasFeature(Plan.PRO, "access_export")).toBe(true);
    expect(getPlanLimits(Plan.PRO).maxStaff).toBe(10);
  });

  it("suggests pro + badge extension for badge_pc", () => {
    expect(suggestFromEntryAnswer("badge_pc")).toEqual({
      plan: Plan.PRO,
      accessMode: AccessMode.BADGE_PC_EXTENSION,
    });
  });

  it("limits modes by plan", () => {
    expect(modesAllowedForPlan(Plan.STARTER)).toEqual([AccessMode.DESK_ONLY]);
    expect(modesAllowedForPlan(Plan.PRO)).toContain(
      AccessMode.BADGE_PC_EXTENSION
    );
  });
});
