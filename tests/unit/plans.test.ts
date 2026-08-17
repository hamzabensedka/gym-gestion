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

  it("all plans have utility_bills", () => {
    expect(planHasFeature(Plan.STARTER, "utility_bills")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "utility_bills")).toBe(true);
    expect(planHasFeature(Plan.PRO, "utility_bills")).toBe(true);
  });

  it("starter has no drinks", () => {
    expect(planHasFeature(Plan.STARTER, "drinks")).toBe(false);
  });

  it("growth has kiosk and csv export", () => {
    expect(planHasFeature(Plan.GROWTH, "kiosk")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "csv_export")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "access_export")).toBe(false);
    expect(getPlanLimits(Plan.GROWTH).maxStaff).toBe(5);
  });

  it("growth and pro have drinks", () => {
    expect(planHasFeature(Plan.GROWTH, "drinks")).toBe(true);
    expect(planHasFeature(Plan.PRO, "drinks")).toBe(true);
  });

  it("starter has no class_booking", () => {
    expect(planHasFeature(Plan.STARTER, "class_booking")).toBe(false);
  });

  it("growth and pro have class_booking", () => {
    expect(planHasFeature(Plan.GROWTH, "class_booking")).toBe(true);
    expect(planHasFeature(Plan.PRO, "class_booking")).toBe(true);
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
