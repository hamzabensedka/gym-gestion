import { MemberStatus } from "@prisma/client";
import { addDays, endOfDay, startOfDay } from "date-fns";
import type { DeskTodaySummary } from "@gym/shared/desk";
import { withOnboardedMemberFilter } from "@gym/shared/member-auth";
import { prisma } from "../db";
import { syncMemberStatuses } from "./checkin";

export async function getDeskTodayData(gymId: string): Promise<DeskTodaySummary> {
  await syncMemberStatuses(gymId);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const expiringBefore = endOfDay(addDays(now, 7));

  const [checkins, todayCheckins, expiringMembers, expired] = await Promise.all([
    prisma.checkin.findMany({
      where: { gymId, timestamp: { gte: todayStart, lte: todayEnd } },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        timestamp: true,
        member: { select: { fullName: true, phone: true } },
      },
    }),
    prisma.checkin.count({
      where: { gymId, timestamp: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.member.findMany({
      where: withOnboardedMemberFilter({
        gymId,
        status: MemberStatus.ACTIVE,
        subscriptionEnd: { lte: expiringBefore, gte: todayStart },
      }),
      orderBy: { subscriptionEnd: "asc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        phone: true,
        subscriptionEnd: true,
      },
    }),
    prisma.member.count({
      where: withOnboardedMemberFilter({ gymId, status: MemberStatus.EXPIRED }),
    }),
  ]);

  const expiringSoon = await prisma.member.count({
    where: withOnboardedMemberFilter({
      gymId,
      status: MemberStatus.ACTIVE,
      subscriptionEnd: { lte: expiringBefore, gte: todayStart },
    }),
  });

  return {
    todayCheckins,
    expiringSoon,
    expired,
    checkins: checkins.map((checkin) => ({
      id: checkin.id,
      timestamp: checkin.timestamp.toISOString(),
      member: checkin.member,
    })),
    expiringMembers: expiringMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      subscriptionEnd: member.subscriptionEnd.toISOString(),
    })),
  };
}
