"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, refreshSession } from "@/lib/session";
import { gymSchema, passwordSchema } from "@/lib/validations";

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
