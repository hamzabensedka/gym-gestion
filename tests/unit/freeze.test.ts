import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import { extendSubscriptionByDays, frozenDays } from "@gym/shared/freeze";

describe("freeze helpers", () => {
  it("counts frozen days inclusively from start day", () => {
    const frozenAt = new Date("2026-07-01T10:00:00");
    const unfreezeAt = new Date("2026-07-05T18:00:00");
    expect(frozenDays(frozenAt, unfreezeAt)).toBe(4);
  });

  it("extends subscription end by frozen days", () => {
    const end = new Date("2026-08-01T12:00:00");
    const extended = extendSubscriptionByDays(end, 7);
    expect(extended.getTime()).toBe(addDays(end, 7).getTime());
  });
});
