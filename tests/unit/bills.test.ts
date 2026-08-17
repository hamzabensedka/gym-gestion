import { describe, expect, it } from "vitest";
import { UtilityType } from "@prisma/client";
import { sumBillsForMonth, periodMonthStart } from "@/lib/bills";

describe("sumBillsForMonth", () => {
  it("totals and groups by type", () => {
    const month = new Date("2026-08-01T12:00:00");
    const result = sumBillsForMonth(
      [
        { type: UtilityType.WATER, amount: 40, periodMonth: month },
        { type: UtilityType.ELECTRICITY, amount: 120, periodMonth: month },
        { type: UtilityType.GAS, amount: 30, periodMonth: month },
        { type: UtilityType.CUSTOM, amount: 10, periodMonth: month },
      ],
      month,
    );
    expect(result.total).toBe(200);
    expect(result.byType.WATER).toBe(40);
    expect(result.byType.ELECTRICITY).toBe(120);
    expect(result.byType.GAS).toBe(30);
    expect(result.byType.CUSTOM).toBe(10);
  });

  it("ignores bills from other months", () => {
    const month = new Date("2026-08-01T12:00:00");
    const otherMonth = new Date("2026-07-01T12:00:00");
    const result = sumBillsForMonth(
      [
        { type: UtilityType.WATER, amount: 40, periodMonth: month },
        { type: UtilityType.GAS, amount: 30, periodMonth: otherMonth },
      ],
      month,
    );
    expect(result.total).toBe(40);
    expect(result.byType.WATER).toBe(40);
    expect(result.byType.GAS).toBe(0);
  });
});

describe("periodMonthStart", () => {
  it("returns first day of month at noon", () => {
    const result = periodMonthStart(new Date("2026-08-15T18:30:00"));
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });
});
