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

/** Tunisia mobile numbers are 8 digits after country code 216. */
export const WHATSAPP_DEFAULT_COUNTRY_CODE = "216";

export function normalizeWhatsappPhone(
  phone: string,
  countryCode = WHATSAPP_DEFAULT_COUNTRY_CODE,
): string {
  let digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith(countryCode)) {
    return digits;
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 8) {
    return `${countryCode}${digits}`;
  }

  if (digits.length > 8) {
    return digits;
  }

  return `${countryCode}${digits}`;
}

/**
 * Build a wa.me deep link with a pre-filled message (works on mobile + desktop).
 */
export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = normalizeWhatsappPhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type WhatsappRecipient = {
  id: string;
  fullName: string;
  phone: string;
};

export function buildWhatsappQueue<T extends WhatsappRecipient>(
  members: T[],
  messageFor: (member: T) => string,
): Array<{ memberId: string; fullName: string; url: string }> {
  return members.map((member) => ({
    memberId: member.id,
    fullName: member.fullName,
    url: buildWhatsappUrl(member.phone, messageFor(member)),
  }));
}
