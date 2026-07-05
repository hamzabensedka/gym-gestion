import { MemberStatus } from "@prisma/client";
import {
  extendSubscriptionByDays,
  frozenDays,
  isMemberFrozen,
  parseOptionalFreezeUntil,
} from "@gym/shared/freeze";
import { getMemberStatus } from "./auth";
import { prisma } from "./db";

export async function freezeMember(
  gymId: string,
  memberId: string,
  until?: string,
) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true, status: true },
  });
  if (!member) return { error: "Membre introuvable" as const };
  if (isMemberFrozen(member.status)) return { error: "freeze.alreadyFrozen" as const };

  const frozenUntil = parseOptionalFreezeUntil(until);

  await prisma.member.update({
    where: { id: memberId, gymId },
    data: {
      status: MemberStatus.FROZEN,
      frozenAt: new Date(),
      frozenUntil,
    },
  });

  return { ok: true as const };
}

export async function unfreezeMember(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: { id: true, status: true, frozenAt: true, subscriptionEnd: true },
  });
  if (!member) return { error: "Membre introuvable" as const };
  if (!isMemberFrozen(member.status) || !member.frozenAt) {
    return { error: "freeze.notFrozen" as const };
  }

  const days = frozenDays(member.frozenAt);
  const subscriptionEnd = extendSubscriptionByDays(member.subscriptionEnd, days);

  await prisma.member.update({
    where: { id: memberId, gymId },
    data: {
      subscriptionEnd,
      status: getMemberStatus(subscriptionEnd),
      frozenAt: null,
      frozenUntil: null,
    },
  });

  return {
    ok: true as const,
    subscriptionEnd: subscriptionEnd.toISOString(),
    extendedDays: days,
  };
}

export function resolveMemberStatusOnSubscriptionChange(
  currentStatus: MemberStatus,
  subscriptionEnd: Date,
): MemberStatus {
  if (currentStatus === MemberStatus.FROZEN) return MemberStatus.FROZEN;
  return getMemberStatus(subscriptionEnd);
}
