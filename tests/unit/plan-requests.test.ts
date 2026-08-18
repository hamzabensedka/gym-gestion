import { describe, expect, it } from "vitest";
import { Plan } from "@prisma/client";
import { PLAN_CATALOG } from "@gym/shared/plan-catalog";
import {
  allowLeadAttempt,
  parseGymPlanInput,
  parsePublicLeadInput,
} from "@gym/shared/plan-requests";

describe("PLAN_CATALOG", () => {
  it("has starter, growth, and pro in that order", () => {
    expect(PLAN_CATALOG.map((row) => row.plan)).toEqual([
      Plan.STARTER,
      Plan.GROWTH,
      Plan.PRO,
    ]);
  });

  it("lists class_booking on growth and pro only", () => {
    const byPlan = Object.fromEntries(
      PLAN_CATALOG.map((row) => [row.plan, row.includeKeys]),
    );
    expect(byPlan.STARTER).not.toContain("plans.feature.classes");
    expect(byPlan.GROWTH).toContain("plans.feature.classes");
    expect(byPlan.PRO).toContain("plans.feature.badges");
  });
});

describe("parsePublicLeadInput", () => {
  const valid = {
    gymName: " FitBox Tunis ",
    city: "Tunis",
    phone: "+21620123456",
    email: "owner@test.tn",
    plan: "GROWTH",
  };

  it("trims fields and accepts a valid lead", () => {
    expect(parsePublicLeadInput(valid)).toMatchObject({
      ok: true,
      gymName: "FitBox Tunis",
      city: "Tunis",
      phone: "+21620123456",
      email: "owner@test.tn",
      plan: Plan.GROWTH,
    });
  });

  it("rejects missing fields and bad plan", () => {
    expect(parsePublicLeadInput({ ...valid, gymName: "" }).ok).toBe(false);
    expect(parsePublicLeadInput({ ...valid, email: "nope" }).ok).toBe(false);
    expect(parsePublicLeadInput({ ...valid, plan: "ENTERPRISE" }).ok).toBe(false);
  });
});

describe("parseGymPlanInput", () => {
  it("accepts a plan enum string", () => {
    expect(parseGymPlanInput({ plan: "PRO" })).toMatchObject({
      ok: true,
      plan: Plan.PRO,
    });
  });

  it("rejects the gym's current plan", () => {
    const result = parseGymPlanInput({ plan: "GROWTH" }, Plan.GROWTH);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("plans.alreadyCurrent");
  });
});

describe("allowLeadAttempt", () => {
  it("allows five hits then blocks the sixth in the same window", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(allowLeadAttempt(key)).toBe(true);
    }
    expect(allowLeadAttempt(key)).toBe(false);
  });
});
