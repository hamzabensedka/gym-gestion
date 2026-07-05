import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { MemberStatus } from "./auth";

export function isMemberFrozen(status: string): boolean {
  return status === MemberStatus.FROZEN;
}

export function frozenDays(frozenAt: Date, unfreezeAt: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(startOfDay(unfreezeAt), startOfDay(frozenAt)));
}

export function extendSubscriptionByDays(subscriptionEnd: Date, days: number): Date {
  if (days <= 0) return subscriptionEnd;
  return addDays(subscriptionEnd, days);
}

export function parseOptionalFreezeUntil(value?: string | null): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T23:59:59`);
}
