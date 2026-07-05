import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getDefaultRoute } from "@/lib/auth";
import { canMemberLogin } from "@/lib/member-auth";
import { createMemberSession, destroyMemberSession } from "@/lib/member-session";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (user) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    await destroyMemberSession();
    await createSession({
      userId: user.id,
      gymId: user.gymId,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return NextResponse.json({ redirectTo: getDefaultRoute(user.role) });
  }

  const member = await prisma.member.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.passwordHash || !canMemberLogin(member.inviteStatus)) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, member.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
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

  return NextResponse.json({ redirectTo: "/member" });
}
