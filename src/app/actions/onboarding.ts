"use server";

import { AccessMode, Plan, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getPlanLimits,
  modesAllowedForPlan,
  suggestFromEntryAnswer,
  type EntryAnswer,
} from "@/lib/plans";
import { requireSession, refreshSession } from "@/lib/session";
import { gymSchema } from "@/lib/validations";

const ENTRY_ANSWERS: EntryAnswer[] = [
  "desk",
  "open_kiosk",
  "badge_pc",
  "vendor",
  "new_kit",
];

function isEntryAnswer(value: unknown): value is EntryAnswer {
  return typeof value === "string" && ENTRY_ANSWERS.includes(value as EntryAnswer);
}

function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && Object.values(Plan).includes(value as Plan);
}

function resolvePlanAndMode(
  entryAnswer: EntryAnswer,
  planOverride?: Plan,
): { plan: Plan; accessMode: AccessMode } {
  const suggested = suggestFromEntryAnswer(entryAnswer);
  const plan = planOverride ?? suggested.plan;
  let accessMode = suggested.accessMode;
  if (!modesAllowedForPlan(plan).includes(accessMode)) {
    accessMode = AccessMode.DESK_ONLY;
  }
  return { plan, accessMode };
}

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const entryRaw = formData.get("entryAnswer");
  if (!isEntryAnswer(entryRaw)) {
    return { error: "onboarding.invalidEntry" };
  }

  const planRaw = formData.get("plan");
  const planOverride =
    planRaw && String(planRaw).trim() !== ""
      ? isPlan(planRaw)
        ? planRaw
        : null
      : undefined;
  if (planOverride === null) {
    return { error: "onboarding.invalidPlan" };
  }

  const parsedGym = gymSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
  });
  if (!parsedGym.success) {
    return { error: parsedGym.error.issues[0]?.message ?? "Données invalides" };
  }

  const { plan, accessMode } = resolvePlanAndMode(entryRaw, planOverride);
  const maxStaff = getPlanLimits(plan).maxStaff;
  const name = parsedGym.data.name.trim();
  const location = parsedGym.data.location?.trim() || null;

  await prisma.gym.update({
    where: { id: session.gymId },
    data: {
      plan,
      accessMode,
      maxStaff,
      name,
      location,
      onboardingCompletedAt: new Date(),
    },
  });

  await refreshSession({ gymName: name });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}

export async function skipOnboardingAction() {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  await prisma.gym.update({
    where: { id: session.gymId },
    data: { onboardingCompletedAt: new Date() },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}
