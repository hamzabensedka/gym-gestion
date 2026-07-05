"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDefaultRoute } from "@/lib/auth";
import { canMemberLogin } from "@/lib/member-auth";
import { createMemberSession, destroyMemberSession } from "@/lib/member-session";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  const user = await prisma.user.findFirst({
    where: { email },
    include: { gym: true },
  });

  if (user) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Email ou mot de passe incorrect" };
    }

    await destroyMemberSession();
    await createSession({
      userId: user.id,
      gymId: user.gymId,
      gymName: user.gym.name,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    redirect(getDefaultRoute(user.role));
  }

  const member = await prisma.member.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.passwordHash || !canMemberLogin(member.inviteStatus)) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    return { error: "Email ou mot de passe incorrect" };
  }

  await destroySession();
  await prisma.member.update({
    where: { id: member.id },
    data: { lastLoginAt: new Date() },
  });
  await createMemberSession({
    memberId: member.id,
    gymId: member.gymId,
    gymName: member.gym.name,
    name: member.fullName,
    email: member.email!,
  });

  redirect("/member");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
