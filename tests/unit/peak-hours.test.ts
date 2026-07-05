import { describe, it, expect } from "vitest";
import { buildPeakHours, formatPeakHourRange } from "@gym/shared/peak-hours";

describe("buildPeakHours", () => {
  it("counts check-ins per hour bucket", () => {
    const timestamps = [
      new Date(2026, 0, 1, 8, 30),
      new Date(2026, 0, 1, 8, 45),
      new Date(2026, 0, 1, 18, 0),
    ];
    const { peakHours, busiestHour } = buildPeakHours(timestamps);

    expect(peakHours[8].count).toBe(2);
    expect(peakHours[18].count).toBe(1);
    expect(busiestHour).toBe(8);
  });

  it("breaks ties toward the earliest hour", () => {
    const timestamps = [
      new Date(2026, 0, 1, 10, 0),
      new Date(2026, 0, 1, 14, 0),
    ];
    const { busiestHour } = buildPeakHours(timestamps);
    expect(busiestHour).toBe(10);
  });

  it("returns null busiest hour for empty data", () => {
    const { peakHours, busiestHour } = buildPeakHours([]);
    expect(peakHours).toHaveLength(24);
    expect(busiestHour).toBeNull();
  });
});

describe("formatPeakHourRange", () => {
  it("formats a 24-hour range", () => {
    expect(formatPeakHourRange(18, "fr")).toBe("18:00–19:00");
    expect(formatPeakHourRange(23, "ar")).toBe("23:00–00:00");
  });
});
