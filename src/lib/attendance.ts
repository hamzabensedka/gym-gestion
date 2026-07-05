import { subDays, startOfDay, endOfDay } from "date-fns";
import { buildPeakHours } from "@gym/shared/peak-hours";
import { prisma } from "./db";
import { withOnboardedMemberFilter } from "./member-auth";

export async function getAttendanceData(gymId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const weekStart = startOfDay(subDays(new Date(), 6));
  const inactiveSince = startOfDay(subDays(new Date(), 7));

  const [dailyCheckins, weeklyCount, mostActive, allMembers, weeklyTimestamps] = await Promise.all([
    prisma.checkin.findMany({
      where: { gymId, timestamp: { gte: todayStart, lte: todayEnd } },
      include: {
        member: {
          select: { fullName: true, phone: true, status: true },
        },
      },
      orderBy: { timestamp: "desc" },
    }),
    prisma.checkin.count({
      where: { gymId, timestamp: { gte: weekStart, lte: todayEnd } },
    }),
    prisma.checkin.groupBy({
      by: ["memberId"],
      where: { gymId, timestamp: { gte: weekStart, lte: todayEnd } },
      _count: { memberId: true },
      orderBy: { _count: { memberId: "desc" } },
      take: 5,
    }),
    prisma.member.findMany({
      where: withOnboardedMemberFilter({ gymId }),
      select: {
        id: true,
        fullName: true,
        phone: true,
        status: true,
        checkins: {
          where: { timestamp: { gte: inactiveSince } },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.checkin.findMany({
      where: { gymId, timestamp: { gte: weekStart, lte: todayEnd } },
      select: { timestamp: true },
    }),
  ]);

  const memberIds = mostActive.map((item) => item.memberId);
  const memberNames = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, fullName: true },
  });
  const nameMap = new Map(memberNames.map((member) => [member.id, member.fullName]));

  const inactiveMembers = allMembers.filter((member) => member.checkins.length === 0);
  const { peakHours, busiestHour } = buildPeakHours(weeklyTimestamps.map((c) => c.timestamp));

  return {
    dailyCheckins,
    weeklyCount,
    mostActive: mostActive.map((item) => ({
      memberId: item.memberId,
      fullName: nameMap.get(item.memberId) ?? "Inconnu",
      count: item._count.memberId,
    })),
    inactiveMembers,
    peakHours,
    busiestHour,
  };
}
