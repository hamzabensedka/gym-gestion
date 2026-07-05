import { describe, it, expect } from "vitest";
import { buildActionItems } from "@gym/shared/dashboard-actions";

const member = (id: string, name: string) => ({
  id,
  fullName: name,
  phone: "+21620000000",
  subscriptionEnd: new Date("2026-07-10"),
  monthlyFee: 80,
});

describe("buildActionItems", () => {
  it("prioritizes payment follow-up and deduplicates members", () => {
    const result = buildActionItems({
      paymentFollowup: [member("a", "Alice")],
      expired: [member("a", "Alice"), member("b", "Bob")],
      expiring: [member("c", "Carla")],
      inactive: [member("d", "Dan")],
    });

    expect(result.items).toHaveLength(4);
    expect(result.items[0]?.category).toBe("PAYMENT_FOLLOWUP");
    expect(result.items[0]?.memberId).toBe("a");
    expect(result.counts.PAYMENT_FOLLOWUP).toBe(1);
    expect(result.counts.EXPIRED).toBe(2);
  });

  it("limits total items to 10", () => {
    const many = Array.from({ length: 8 }, (_, i) => member(`e${i}`, `Member ${i}`));
    const result = buildActionItems({
      paymentFollowup: many,
      expired: many,
      expiring: many,
      inactive: many,
    });

    expect(result.items.length).toBeLessThanOrEqual(10);
  });
});
