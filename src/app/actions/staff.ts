"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { staffSchema } from "@/lib/validations";

export async function createStaffAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const parsed = staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        gymId: session.gymId,
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash,
        role: parsed.data.role as Role,
      },
    });
  } catch {
    return { error: "staff.emailExists" };
  }

  revalidatePath("/staff");
}

export async function deleteStaffAction(userId: string) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return;
  if (userId === session.userId) return;

  await prisma.user.deleteMany({
    where: { id: userId, gymId: session.gymId },
  });

  revalidatePath("/staff");
}
