import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { MemberInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { INVITE_TTL_HOURS } from "@/lib/member-auth";
import { sendMemberInviteEmail } from "@/lib/email";

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function getInviteExpiry(): Date {
  return addHours(new Date(), INVITE_TTL_HOURS);
}

export async function issueMemberInvite(memberId: string, gymId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.email) {
    return { error: "members.inviteNoEmail" as const };
  }

  const token = generateInviteToken();
  const inviteExpiresAt = getInviteExpiry();

  await prisma.member.update({
    where: { id: memberId },
    data: {
      inviteToken: token,
      inviteExpiresAt,
      inviteStatus: MemberInviteStatus.PENDING,
      passwordHash: null,
    },
  });

  const result = await sendMemberInviteEmail({
    to: member.email,
    gymName: member.gym.name,
    token,
  });

  if (!result.ok) {
    return { error: "members.inviteSendFailed" as const };
  }

  return { ok: true as const };
}
