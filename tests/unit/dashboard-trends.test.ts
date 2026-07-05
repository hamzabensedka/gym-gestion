import { describe, it, expect } from "vitest";
import {
  buildTrendMetric,
  formatPercentChange,
  formatSignedCount,
} from "@gym/shared/dashboard-trends";

describe("buildTrendMetric", () => {
  it("computes delta and percent change", () => {
    const metric = buildTrendMetric(12, 10);
    expect(metric).toEqual({
      current: 12,
      previous: 10,
      delta: 2,
      percentChange: 20,
    });
  });

  it("returns null percent when previous is zero", () => {
    const metric = buildTrendMetric(5, 0);
    expect(metric.delta).toBe(5);
    expect(metric.percentChange).toBeNull();
  });

  it("handles negative delta", () => {
    const metric = buildTrendMetric(8, 10);
    expect(metric.delta).toBe(-2);
    expect(metric.percentChange).toBe(-20);
  });
});

describe("formatPercentChange", () => {
  it("formats signed percent in French locale", () => {
    expect(formatPercentChange(18, "fr")).toBe("+18%");
    expect(formatPercentChange(-5, "fr")).toBe("-5%");
  });

  it("returns empty string for null baseline", () => {
    expect(formatPercentChange(null, "fr")).toBe("");
  });
});

describe("formatSignedCount", () => {
  it("formats signed integers", () => {
    expect(formatSignedCount(3, "fr")).toBe("+3");
    expect(formatSignedCount(-2, "fr")).toBe("-2");
    expect(formatSignedCount(0, "fr")).toBe("0");
  });
});
