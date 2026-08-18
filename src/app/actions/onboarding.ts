"use server";

import { AccessMode, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
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

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const entryRaw = formData.get("entryAnswer");
  if (!isEntryAnswer(entryRaw)) {
    return { error: "onboarding.invalidEntry" };
  }

  const parsedGym = gymSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
  });
  if (!parsedGym.success) {
    return { error: parsedGym.error.issues[0]?.message ?? "Données invalides" };
  }

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { plan: true },
  });
  if (!gym) return { error: "Non autorisé" };

  const suggested = suggestFromEntryAnswer(entryRaw);
  const allowed = modesAllowedForPlan(gym.plan);
  const accessMode = allowed.includes(suggested.accessMode)
    ? suggested.accessMode
    : AccessMode.DESK_ONLY;

  const name = parsedGym.data.name.trim();
  const location = parsedGym.data.location?.trim() || null;

  await prisma.gym.update({
    where: { id: session.gymId },
    data: {
      accessMode,
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
