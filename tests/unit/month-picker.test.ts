import { describe, expect, it } from "vitest";
import { fr } from "date-fns/locale";
import {
  buildMonthCells,
  parseYearMonth,
  resolveViewYear,
  shiftViewYear,
  syncViewYearToSelection,
} from "@/lib/month-picker";

describe("parseYearMonth", () => {
  it("parses yyyy-MM to the first day of the month", () => {
    const date = parseYearMonth("2026-08");
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(1);
  });

  it("returns undefined for empty or invalid values", () => {
    expect(parseYearMonth(undefined)).toBeUndefined();
    expect(parseYearMonth("")).toBeUndefined();
    expect(parseYearMonth("not-a-month")).toBeUndefined();
  });
});

describe("shiftViewYear", () => {
  it("moves the viewed year forward and backward without depending on selection", () => {
    expect(shiftViewYear(2026, 1)).toBe(2027);
    expect(shiftViewYear(2026, -1)).toBe(2025);
    expect(shiftViewYear(2026, 2)).toBe(2028);
  });
});

describe("syncViewYearToSelection", () => {
  it("snaps the grid year to the selected yyyy-MM when selection is set", () => {
    expect(syncViewYearToSelection("2026-08", 2027)).toBe(2026);
    expect(syncViewYearToSelection("2027-03", 2025)).toBe(2027);
  });

  it("keeps the navigated year when nothing is selected", () => {
    expect(syncViewYearToSelection(undefined, 2027)).toBe(2027);
    expect(syncViewYearToSelection("", 2024)).toBe(2024);
  });
});

describe("resolveViewYear", () => {
  it("prefers an explicit view year over selection", () => {
    expect(resolveViewYear(2027, "2026-08")).toBe(2027);
  });

  it("falls back to selection then now", () => {
    expect(resolveViewYear(undefined, "2025-01")).toBe(2025);
    expect(
      resolveViewYear(undefined, undefined, new Date("2030-03-15")),
    ).toBe(2030);
  });
});

describe("buildMonthCells", () => {
  it("builds 12 months for the viewed year and marks the selection", () => {
    const cells = buildMonthCells({
      viewYear: 2027,
      selectedYearMonth: "2027-03",
      locale: fr,
    });
    expect(cells).toHaveLength(12);
    expect(cells[0]?.key).toBe("2027-01");
    expect(cells[11]?.key).toBe("2027-12");
    expect(cells.find((c) => c.key === "2027-03")?.selected).toBe(true);
    expect(cells.find((c) => c.key === "2027-08")?.selected).toBe(false);
  });

  it("disables months outside min/max bounds", () => {
    const cells = buildMonthCells({
      viewYear: 2026,
      selectedYearMonth: "2026-08",
      min: "2026-06",
      max: "2026-09",
      locale: fr,
    });
    expect(cells.find((c) => c.key === "2026-05")?.disabled).toBe(true);
    expect(cells.find((c) => c.key === "2026-06")?.disabled).toBe(false);
    expect(cells.find((c) => c.key === "2026-09")?.disabled).toBe(false);
    expect(cells.find((c) => c.key === "2026-10")?.disabled).toBe(true);
  });

  it("keeps navigating years independent of the selected month year", () => {
    const cells = buildMonthCells({
      viewYear: 2028,
      selectedYearMonth: "2026-08",
      locale: fr,
    });
    expect(cells.every((c) => c.key.startsWith("2028-"))).toBe(true);
    expect(cells.every((c) => !c.selected)).toBe(true);
  });
});
