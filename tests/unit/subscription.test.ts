import { describe, it, expect } from "vitest";
import { addMonths, addDays } from "date-fns";
import {
  daysUntil,
  isExpiringSoon,
  extendSubscription,
  buildWhatsappUrl,
} from "@/lib/subscription";

describe("subscription helpers", () => {
  it("counts days until subscription end", () => {
    const end = addDays(new Date(), 5);
    expect(daysUntil(end)).toBe(5);
  });

  it("detects subscriptions expiring within 7 days", () => {
    expect(isExpiringSoon(addDays(new Date(), 3))).toBe(true);
    expect(isExpiringSoon(addDays(new Date(), 30))).toBe(false);
  });

  it("extends from current end when still active", () => {
    const currentEnd = addMonths(new Date(), 2);
    const extended = extendSubscription(currentEnd, 1);
    expect(daysUntil(extended)).toBeGreaterThan(daysUntil(currentEnd));
  });

  it("extends from today when subscription already expired", () => {
    const pastEnd = addMonths(new Date(), -1);
    const extended = extendSubscription(pastEnd, 1);
    expect(daysUntil(extended)).toBeGreaterThan(20);
  });

  it("builds WhatsApp deep links", () => {
    const url = buildWhatsappUrl("+216 20 123 456", "Hello");
    expect(url).toContain("https://wa.me/21620123456");
    expect(url).toContain(encodeURIComponent("Hello"));
  });

  it("adds Tunisia country code when missing", () => {
    const url = buildWhatsappUrl("20 123 456", "Hello");
    expect(url).toContain("https://wa.me/21620123456");
  });

  it("strips leading zero from local numbers", () => {
    const url = buildWhatsappUrl("020 123 456", "Hello");
    expect(url).toContain("https://wa.me/21620123456");
  });
});
