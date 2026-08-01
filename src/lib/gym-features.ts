import { prisma } from "@/lib/db";
import { planHasFeature, type PlanFeature } from "@/lib/plans";

export function canAddStaff(currentCount: number, maxStaff: number): boolean {
  return currentCount < maxStaff;
}

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
  if (!planHasFeature(gym.plan, feature)) {
    throw new Error("FEATURE_LOCKED");
  }
}
