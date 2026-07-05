import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { MemberInviteStatus } from "@prisma/client";
import { DEFAULT_INVITE_TTL_HOURS } from "@gym/shared/member-auth";
import { prisma } from "../db";
import { sendMemberInviteEmail } from "./email";

const INVITE_TTL_HOURS = Number(process.env.INVITE_TTL_HOURS ?? DEFAULT_INVITE_TTL_HOURS);

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

  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
    return { error: "members.inviteSendFailed" as const };
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
