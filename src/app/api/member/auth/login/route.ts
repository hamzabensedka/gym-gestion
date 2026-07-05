import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { canMemberLogin } from "@/lib/member-auth";
import { createMemberSession } from "@/lib/member-session";
import { destroySession } from "@/lib/session";
import { memberLoginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = memberLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const member = await prisma.member.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.passwordHash || !canMemberLogin(member.inviteStatus)) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, member.passwordHash);
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
