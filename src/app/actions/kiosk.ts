"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function verifyKioskExitAction(
  password: string,
): Promise<{ ok: true } | { error: "INVALID_PASSWORD" | "UNAUTHORIZED" }> {
  const session = await getSession();
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.STAFF)) {
    return { error: "UNAUTHORIZED" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user) {
    return { error: "INVALID_PASSWORD" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "INVALID_PASSWORD" };
  }

  return { ok: true };
}
