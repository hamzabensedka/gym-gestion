import { MemberStatus, Plan } from "@prisma/client";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { buildActionItems } from "@gym/shared/dashboard-actions";
import { buildTrendMetric } from "@gym/shared/dashboard-trends";
import { buildPeakHours } from "@gym/shared/peak-hours";
import { periodMonthStart } from "./bills";
import { prisma } from "./db";
import { syncMemberStatuses } from "./checkin";
import { withOnboardedMemberFilter } from "./member-auth";
import { planHasFeature } from "./plans";

export async function getDashboardData(gymId: string) {
  await syncMemberStatuses(gymId);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const billsPeriodMonth = periodMonthStart(now);
  const weekStart = startOfDay(subDays(now, 6));
  const previousWeekStart = startOfDay(subDays(now, 13));
  const previousWeekEnd = endOfDay(subDays(now, 7));
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const expiringBefore = endOfDay(addDays(now, 7));
  const inactiveSince = startOfDay(subDays(now, 7));

  const [
    gym,
    totalMembers,
    activeMembers,
    expiredMembers,
    todayCheckins,
    expiringSoon,
    weeklyCheckins,
    activeFees,
    recentCheckins,
    collectedTodayAgg,
    collectedMonthAgg,
    recentPayments,
    inactiveMembers,
    expiredMembersList,
    checkinsPreviousWeek,
    collectedLastMonthAgg,
    activeAtMonthStart,
    expiredAtMonthStart,
    utilityBillsMonthAgg,
    drinksRevenueMonthAgg,
  ] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId }, select: { name: true, plan: true } }),
    prisma.member.count({ where: withOnboardedMemberFilter({ gymId }) }),
    prisma.member.count({
      where: withOnboardedMemberFilter({ gymId, status: MemberStatus.ACTIVE }),
    }),
    prisma.member.count({
      where: withOnboardedMemberFilter({ gymId, status: MemberStatus.EXPIRED }),
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
      select: {
        id: true,
        fullName: true,
        phone: true,
        subscriptionEnd: true,
        monthlyFee: true,
      },
    }),
    prisma.checkin.findMany({
      where: { gymId, timestamp: { gte: weekStart, lte: todayEnd } },
      select: { timestamp: true },
    }),
    prisma.member.aggregate({
      where: withOnboardedMemberFilter({ gymId, status: MemberStatus.ACTIVE }),
      _sum: { monthlyFee: true },
    }),
    prisma.checkin.findMany({
      where: { gymId },
      orderBy: { timestamp: "desc" },
      take: 6,
      select: {
        id: true,
        timestamp: true,
        member: { select: { id: true, fullName: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { gymId, paidAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { gymId, paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { gymId },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        member: { select: { id: true, fullName: true } },
      },
    }),
    prisma.member.findMany({
      where: withOnboardedMemberFilter({
        gymId,
        status: MemberStatus.ACTIVE,
        checkins: { none: { timestamp: { gte: inactiveSince } } },
      }),
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        subscriptionEnd: true,
        monthlyFee: true,
      },
    }),
    prisma.member.findMany({
      where: withOnboardedMemberFilter({ gymId, status: MemberStatus.EXPIRED }),
      orderBy: { subscriptionEnd: "desc" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        subscriptionEnd: true,
        monthlyFee: true,
        payments: {
          orderBy: { paidAt: "desc" },
          take: 1,
          select: { paidAt: true },
        },
      },
    }),
    prisma.checkin.count({
      where: { gymId, timestamp: { gte: previousWeekStart, lte: previousWeekEnd } },
    }),
    prisma.payment.aggregate({
      where: { gymId, paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.member.count({
      where: withOnboardedMemberFilter({
        gymId,
        subscriptionStart: { lte: monthStart },
        subscriptionEnd: { gte: monthStart },
      }),
    }),
    prisma.member.count({
      where: withOnboardedMemberFilter({
        gymId,
        subscriptionEnd: { lt: monthStart },
      }),
    }),
    prisma.utilityBill.aggregate({
      where: { gymId, periodMonth: billsPeriodMonth },
      _sum: { amount: true },
    }),
    prisma.drinkSale.aggregate({
      where: { gymId, soldAt: { gte: monthStart, lte: monthEnd } },
      _sum: { total: true },
    }),
  ]);

  const plan = gym?.plan ?? Plan.STARTER;
  const utilityBillsThisMonth = planHasFeature(plan, "utility_bills")
    ? Number(utilityBillsMonthAgg._sum.amount ?? 0)
    : null;
  const drinksRevenueThisMonth = planHasFeature(plan, "drinks")
    ? Number(drinksRevenueMonthAgg._sum.total ?? 0)
    : null;

  const paymentFollowup = expiredMembersList.filter((member) => {
    const lastPayment = member.payments[0];
    return !lastPayment || lastPayment.paidAt < member.subscriptionEnd;
  });

  const expiredForActions = expiredMembersList.map(({ payments: _, ...member }) => member);

  const actionItems = buildActionItems({
    expiring: expiringSoon,
    expired: expiredForActions,
    inactive: inactiveMembers,
    paymentFollowup: paymentFollowup.map(({ payments: _, ...member }) => member),
  });

  const weeklyAttendance = Array.from({ length: 7 }, (_, index) => {
    const day = startOfDay(addDays(weekStart, index));
    const dayEnd = endOfDay(day);
    const count = weeklyCheckins.filter(
      (checkin) => checkin.timestamp >= day && checkin.timestamp <= dayEnd,
    ).length;
    return { date: day.toISOString(), count };
  });

  const collectedThisMonth = Number(collectedMonthAgg._sum.amount ?? 0);
  const collectedLastMonth = Number(collectedLastMonthAgg._sum.amount ?? 0);
  const checkinsCurrentWeek = weeklyCheckins.length;

  const trends = {
    checkinsWeek: buildTrendMetric(checkinsCurrentWeek, checkinsPreviousWeek),
    activeMembersMonth: buildTrendMetric(activeMembers, activeAtMonthStart),
    expiredMembersMonth: buildTrendMetric(expiredMembers, expiredAtMonthStart),
    collectedRevenueMonth: buildTrendMetric(collectedThisMonth, collectedLastMonth),
  };

  const { busiestHour } = buildPeakHours(weeklyCheckins.map((checkin) => checkin.timestamp));

  return {
    gymName: gym?.name ?? "",
    totalMembers,
    activeMembers,
    expiredMembers,
    expiringCount: expiringSoon.length,
    todayCheckins,
    expiringSoon,
    weeklyAttendance,
    recentCheckins,
    collectedThisMonth,
    collectedToday: Number(collectedTodayAgg._sum.amount ?? 0),
    expectedMonthlyRevenue: Number(activeFees._sum.monthlyFee ?? 0),
    unpaidExpiredCount: paymentFollowup.length,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      paidAt: payment.paidAt.toISOString(),
      member: payment.member,
    })),
    actionItems,
    trends,
    busiestHour,
    utilityBillsThisMonth,
    drinksRevenueThisMonth,
  };
}
