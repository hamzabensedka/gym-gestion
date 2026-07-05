import { MemberInviteStatus, type Prisma } from "@prisma/client";

export type MemberSession = {
  memberId: string;
  gymId: string;
  gymName: string;
  name: string;
  email: string;
};

export function canMemberLogin(inviteStatus: MemberInviteStatus | null): boolean {
  return inviteStatus === MemberInviteStatus.ACTIVE;
}

/** Member created by admin who completed the official invite + password flow. */
export function isOnboardedMember(member: {
  inviteStatus: MemberInviteStatus | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
}): boolean {
  return (
    member.inviteStatus === MemberInviteStatus.ACTIVE &&
    member.passwordHash != null &&
    member.emailVerifiedAt != null
  );
}

export const onboardedMemberWhere = {
  inviteStatus: MemberInviteStatus.ACTIVE,
  passwordHash: { not: null },
  emailVerifiedAt: { not: null },
} satisfies Prisma.MemberWhereInput;

export function withOnboardedMemberFilter(
  where: Prisma.MemberWhereInput = {},
): Prisma.MemberWhereInput {
  return { ...where, ...onboardedMemberWhere };
}

export const INVITE_TTL_HOURS = Number(process.env.INVITE_TTL_HOURS ?? 72);
