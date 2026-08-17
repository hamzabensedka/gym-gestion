import type { Context, Next } from "hono";
import { assertPlanFeature } from "@gym/shared/gym-features";
import type { PlanFeature } from "@gym/shared/plans";
import { prisma } from "../db";

export async function assertGymFeature(gymId: string, feature: PlanFeature) {
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { plan: true },
  });
  assertPlanFeature(gym.plan, feature);
}

export function isFeatureLockedError(error: unknown): boolean {
  return error instanceof Error && error.message === "FEATURE_LOCKED";
}

export function featureLockedResponse(c: Context) {
  return c.json(
    { error: { code: "FEATURE_LOCKED", message: "Fonctionnalité non incluse dans votre plan" } },
    403,
  );
}

export function requireGymFeature(feature: PlanFeature) {
  return async (c: Context, next: Next) => {
    const staff = c.get("staff");
    try {
      await assertGymFeature(staff.gymId, feature);
    } catch (error) {
      if (isFeatureLockedError(error)) {
        return featureLockedResponse(c);
      }
      throw error;
    }
    await next();
  };
}

export function requireMemberGymFeature(feature: PlanFeature) {
  return async (c: Context, next: Next) => {
    const member = c.get("member");
    try {
      await assertGymFeature(member.gymId, feature);
    } catch (error) {
      if (isFeatureLockedError(error)) return featureLockedResponse(c);
      throw error;
    }
    await next();
  };
}
