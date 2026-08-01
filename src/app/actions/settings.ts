"use server";

import bcrypt from "bcryptjs";
import { AccessMode, Plan, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getPlanLimits, modesAllowedForPlan } from "@/lib/plans";
import { requireSession, refreshSession } from "@/lib/session";
import { gymSchema, passwordSchema } from "@/lib/validations";

function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && Object.values(Plan).includes(value as Plan);
}

function isAccessMode(value: unknown): value is AccessMode {
  return (
    typeof value === "string" &&
    Object.values(AccessMode).includes(value as AccessMode)
  );
}

export async function updateGymAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const parsed = gymSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
    cardTheme: formData.get("cardTheme") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  await prisma.gym.update({
    where: { id: session.gymId },
    data: {
      name: parsed.data.name.trim(),
      location: parsed.data.location?.trim() || null,
      cardTheme: parsed.data.cardTheme ?? null,
    },
  });

  await refreshSession({ gymName: parsed.data.name.trim() });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/member");
  revalidatePath("/member/card");
  return { ok: true };
}

export async function updatePlanAndAccessAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const planRaw = formData.get("plan");
  if (!isPlan(planRaw)) {
    return { error: "settings.invalidPlan" };
  }

  const modeRaw = formData.get("accessMode");
  if (!isAccessMode(modeRaw)) {
    return { error: "settings.invalidAccessMode" };
  }

  const maxStaff = getPlanLimits(planRaw).maxStaff;
  const allowed = modesAllowedForPlan(planRaw);
  const accessMode = allowed.includes(modeRaw) ? modeRaw : AccessMode.DESK_ONLY;

  await prisma.gym.update({
    where: { id: session.gymId },
    data: {
      plan: planRaw,
      maxStaff,
      accessMode,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  return { ok: true, plan: planRaw, accessMode, maxStaff };
}

export async function updatePlanAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const planRaw = formData.get("plan");
  if (!isPlan(planRaw)) {
    return { error: "settings.invalidPlan" };
  }

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { accessMode: true },
  });
  if (!gym) return { error: "Non autorisé" };

  const maxStaff = getPlanLimits(planRaw).maxStaff;
  const allowed = modesAllowedForPlan(planRaw);
  const accessMode = allowed.includes(gym.accessMode)
    ? gym.accessMode
    : AccessMode.DESK_ONLY;

  await prisma.gym.update({
    where: { id: session.gymId },
    data: {
      plan: planRaw,
      maxStaff,
      accessMode,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/staff");
  return { ok: true, plan: planRaw, accessMode, maxStaff };
}

export async function updateAccessModeAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const modeRaw = formData.get("accessMode");
  if (!isAccessMode(modeRaw)) {
    return { error: "settings.invalidAccessMode" };
  }

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { plan: true },
  });
  if (!gym) return { error: "Non autorisé" };

  if (!modesAllowedForPlan(gym.plan).includes(modeRaw)) {
    return { error: "settings.invalidAccessMode" };
  }

  await prisma.gym.update({
    where: { id: session.gymId },
    data: { accessMode: modeRaw },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, accessMode: modeRaw };
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSession();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "Non autorisé" };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "settings.wrongPassword" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true };
}
