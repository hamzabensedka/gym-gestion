import { planHasFeature, type PlanFeature } from "./plans";
import type { Plan } from "@prisma/client";

export function canAddStaff(currentCount: number, maxStaff: number): boolean {
  return currentCount < maxStaff;
}

export function assertPlanFeature(plan: Plan, feature: PlanFeature): void {
  if (!planHasFeature(plan, feature)) {
    throw new Error("FEATURE_LOCKED");
  }
}