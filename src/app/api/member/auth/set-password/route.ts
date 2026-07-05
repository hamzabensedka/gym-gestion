import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MemberInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createMemberSession } from "@/lib/member-session";
import { memberSetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = memberSetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const member = await prisma.member.findFirst({
    where: { inviteToken: parsed.data.token },
    include: { gym: { select: { name: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }

  if (
    member.inviteStatus === MemberInviteStatus.DISABLED ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Invitation expirée" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.member.update({
    where: { id: member.id },
    data: {
      passwordHash,
      inviteStatus: MemberInviteStatus.ACTIVE,
      inviteToken: null,
      inviteExpiresAt: null,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
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
