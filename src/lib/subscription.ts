import { addMonths, differenceInCalendarDays, isAfter } from "date-fns";

export const PLAN_MONTHS = [1, 3, 6, 12] as const;
export type PlanMonths = (typeof PLAN_MONTHS)[number];

export function daysUntil(date: Date | string): number {
  return differenceInCalendarDays(new Date(date), new Date());
}

export function isExpiringSoon(end: Date | string, withinDays = 7): boolean {
  const days = daysUntil(end);
  return days >= 0 && days <= withinDays;
}

/**
 * Extend a subscription by N months. If the current end date is still in the
 * future we extend from it, otherwise we extend from today.
 */
export function extendSubscription(currentEnd: Date, months: number): Date {
  const base = isAfter(currentEnd, new Date()) ? currentEnd : new Date();
  return addMonths(base, months);
}

/**
 * Build a wa.me deep link with a pre-filled message (works on mobile + desktop).
 */
export { buildWhatsappUrl, normalizeWhatsappPhone, WHATSAPP_DEFAULT_COUNTRY_CODE } from "@gym/shared/subscription";
