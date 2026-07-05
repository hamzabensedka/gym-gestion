import type { Prisma } from "@prisma/client";

export type MemberSession = {
  memberId: string;
  gymId: string;
  gymName: string;
  name: string;
  email: string;
};

/** Mirrors Prisma MemberInviteStatus enum */
export const MemberInviteStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;

export type MemberInviteStatusValue =
  (typeof MemberInviteStatus)[keyof typeof MemberInviteStatus];

export function canMemberLogin(
  inviteStatus: MemberInviteStatusValue | null,
): boolean {
  return inviteStatus === MemberInviteStatus.ACTIVE;
}

export function isOnboardedMember(member: {
  inviteStatus: MemberInviteStatusValue | null;
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

export const DEFAULT_INVITE_TTL_HOURS = 72;

export {
  normalizeAppScheme,
  buildMobileInviteUrl,
  buildWebInviteUrl,
} from "./invite-url";
export { buildMemberInviteEmailHtml } from "./invite-email";
