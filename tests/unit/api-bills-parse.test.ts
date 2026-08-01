import { describe, expect, it } from "vitest";
import {
  parseMonthQuery,
  parseOptionalDateInput,
  parsePeriodMonthInput,
} from "../../apps/api/src/routes/bills";

describe("parseMonthQuery", () => {
  it("parses yyyy-MM", () => {
    const result = parseMonthQuery("2026-08");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(1);
  });

  it("defaults to current month for invalid input", () => {
    const now = new Date();
    const result = parseMonthQuery("not-a-month");
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
  });
});

describe("parsePeriodMonthInput", () => {
  it("accepts yyyy-MM and yyyy-MM-dd", () => {
    const fromMonth = parsePeriodMonthInput("2026-08");
    const fromDate = parsePeriodMonthInput("2026-08-15");
    expect(fromMonth?.getMonth()).toBe(7);
    expect(fromDate?.getMonth()).toBe(7);
  });

  it("rejects invalid values", () => {
    expect(parsePeriodMonthInput("")).toBeNull();
    expect(parsePeriodMonthInput("2026-13")).toBeNull();
    expect(parsePeriodMonthInput(42)).toBeNull();
  });
});

describe("parseOptionalDateInput", () => {
  it("returns undefined for empty optional input", () => {
    expect(parseOptionalDateInput(null)).toBeUndefined();
    expect(parseOptionalDateInput("")).toBeUndefined();
  });

  it("parses ISO date strings", () => {
    const date = parseOptionalDateInput("2026-08-15T00:00:00.000Z");
    expect(date).toBeInstanceOf(Date);
    expect(Number.isNaN(date!.getTime())).toBe(false);
  });

  it("returns null for invalid dates", () => {
    expect(parseOptionalDateInput("not-a-date")).toBeNull();
    expect(parseOptionalDateInput(123)).toBeNull();
  });
});
