import { assertPlanFeature, canAddStaff } from "@gym/shared/gym-features";
import { prisma } from "@/lib/db";
import type { PlanFeature } from "@/lib/plans";

export { canAddStaff };

export async function getGymBilling(gymId: string) {
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: {
      plan: true,
      accessMode: true,
      maxStaff: true,
      onboardingCompletedAt: true,
      planStatus: true,
    },
  });
  return gym;
}

export async function assertFeature(gymId: string, feature: PlanFeature) {
  const gym = await getGymBilling(gymId);
  assertPlanFeature(gym.plan, feature);
}
