import { MemberStatus } from "@prisma/client";
import { prisma } from "./db";
import { getMemberStatus, isMemberActive } from "./auth";
import { isMemberFrozen } from "@gym/shared/freeze";
import { daysUntil } from "./subscription";

export type CheckinOutcome =
  | "GRANTED"
  | "EXPIRED"
  | "FROZEN"
  | "NOT_FOUND"
  | "INVALID";

export type CheckinResult = {
  success: boolean;
  outcome: CheckinOutcome;
  memberName?: string;
  memberId?: string;
  status?: MemberStatus;
  daysLeft?: number;
  subscriptionEnd?: string;
};

export async function syncMemberStatuses(gymId: string) {
  const members = await prisma.member.findMany({
    where: { gymId },
    select: { id: true, subscriptionEnd: true, status: true },
  });

  await Promise.all(
    members
      .filter((m) => m.status !== MemberStatus.FROZEN)
      .filter((m) => getMemberStatus(m.subscriptionEnd) !== m.status)
      .map((member) =>
        prisma.member.update({
          where: { id: member.id },
          data: { status: getMemberStatus(member.subscriptionEnd) },
        }),
      ),
  );
}

export async function performCheckin(
  gymId: string,
  memberId: string,
): Promise<CheckinResult> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
  });

  if (!member) {
    return { success: false, outcome: "NOT_FOUND" };
  }

  if (isMemberFrozen(member.status)) {
    return {
      success: false,
      outcome: "FROZEN",
      memberName: member.fullName,
      memberId: member.id,
      status: MemberStatus.FROZEN,
      subscriptionEnd: member.subscriptionEnd.toISOString(),
    };
  }

  const status = getMemberStatus(member.subscriptionEnd);
  if (status !== member.status) {
    await prisma.member.update({
      where: { id: member.id },
      data: { status },
    });
  }

  if (!isMemberActive(member.subscriptionEnd)) {
    return {
      success: false,
      outcome: "EXPIRED",
      memberName: member.fullName,
      memberId: member.id,
      status: MemberStatus.EXPIRED,
      subscriptionEnd: member.subscriptionEnd.toISOString(),
    };
  }

  await prisma.checkin.create({
    data: { memberId: member.id, gymId },
  });

  return {
    success: true,
    outcome: "GRANTED",
    memberName: member.fullName,
    memberId: member.id,
    status: MemberStatus.ACTIVE,
    daysLeft: daysUntil(member.subscriptionEnd),
    subscriptionEnd: member.subscriptionEnd.toISOString(),
  };
}

export function parseMemberIdFromQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { memberId?: string; id?: string };
    return parsed.memberId ?? parsed.id ?? null;
  } catch {
    return trimmed;
  }
}
