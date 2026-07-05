import { NextResponse } from "next/server";
import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMemberStatus } from "@/lib/auth";
import { getMemberSession } from "@/lib/member-session";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({
    where: { id: session.memberId, gymId: session.gymId },
    include: { gym: { select: { name: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  const status = getMemberStatus(member.subscriptionEnd);

  return NextResponse.json({
    memberId: member.id,
    fullName: member.fullName,
    email: member.email,
    gymName: member.gym.name,
    subscriptionEnd: member.subscriptionEnd.toISOString(),
    status,
    inviteStatus: member.inviteStatus,
    isActive: status === MemberStatus.ACTIVE,
  });
}
