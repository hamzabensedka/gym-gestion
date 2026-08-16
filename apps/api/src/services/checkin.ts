import { MemberStatus } from "@prisma/client";
import { prisma } from "../db";
import { getMemberStatus } from "@gym/shared/auth";
import { daysUntil } from "@gym/shared/subscription";
import { normalizePhone } from "@gym/shared/format";
import { normalizeBadgeNumber } from "@gym/shared/badge";
import {
  decideCheckinOutcome,
  parseMemberIdFromQr,
  resolveCheckinToken,
  type CheckinInput,
  type CheckinOutcome,
} from "@gym/shared/checkin";

export type { CheckinOutcome };
export { parseMemberIdFromQr, resolveCheckinToken, decideCheckinOutcome };

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

async function findMemberForCheckin(gymId: string, token: string) {
  const byId = await prisma.member.findFirst({
    where: { id: token, gymId },
  });
  if (byId) return byId;

  const phone = normalizePhone(token);
  if (phone) {
    const byPhone = await prisma.member.findFirst({
      where: { gymId, phone },
    });
    if (byPhone) return byPhone;
  }

  const badge = normalizeBadgeNumber(token);
  if (badge) {
    const byBadge = await prisma.member.findFirst({
      where: { gymId, badgeNumber: badge },
    });
    if (byBadge) return byBadge;
  }

  return null;
}

function toResult(
  outcome: CheckinOutcome,
  member?: {
    id: string;
    fullName: string;
    status: MemberStatus;
    subscriptionEnd: Date;
  },
  daysLeft?: number,
): CheckinResult {
  if (!member || outcome === "NOT_FOUND" || outcome === "INVALID") {
    return { success: false, outcome };
  }

  return {
    success: outcome === "GRANTED",
    outcome,
    memberName: member.fullName,
    memberId: member.id,
    status: member.status,
    daysLeft,
    subscriptionEnd: member.subscriptionEnd.toISOString(),
  };
}

export async function performCheckinFromInput(
  gymId: string,
  input: CheckinInput,
): Promise<CheckinResult> {
  const token = resolveCheckinToken(input);
  if (!token) {
    return { success: false, outcome: "INVALID" };
  }

  const member = await findMemberForCheckin(gymId, token);
  const outcome = decideCheckinOutcome(member);

  if (!member || outcome === "NOT_FOUND") {
    return { success: false, outcome: "NOT_FOUND" };
  }

  if (outcome === "FROZEN") {
    return toResult("FROZEN", member);
  }

  const status = getMemberStatus(member.subscriptionEnd);
  if (status !== member.status) {
    await prisma.member.update({
      where: { id: member.id },
      data: { status },
    });
    member.status = status;
  }

  if (outcome === "EXPIRED") {
    return toResult("EXPIRED", { ...member, status: MemberStatus.EXPIRED });
  }

  await prisma.checkin.create({
    data: { memberId: member.id, gymId },
  });

  return toResult(
    "GRANTED",
    { ...member, status: MemberStatus.ACTIVE },
    daysUntil(member.subscriptionEnd),
  );
}

export async function performCheckin(
  gymId: string,
  memberId: string,
): Promise<CheckinResult> {
  return performCheckinFromInput(gymId, { memberId });
}
