import { describe, expect, it } from "vitest";
import {
  HOUR_PX,
  buildWeekCalendar,
} from "@/lib/week-calendar";

function session(id: string, start: Date, end: Date) {
  return {
    id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

describe("buildWeekCalendar", () => {
  it("places a 1-hour class at its start hour with 1-hour height", () => {
    const start = new Date(2026, 7, 17, 18, 0, 0);
    const end = new Date(2026, 7, 17, 19, 0, 0);
    const layout = buildWeekCalendar([session("a", start, end)]);

    expect(layout.startHour).toBe(17);
    expect(layout.endHour).toBe(20);
    expect(layout.items).toHaveLength(1);
    expect(layout.items[0]).toMatchObject({
      id: "a",
      day: 1,
      top: HOUR_PX,
      height: HOUR_PX,
      leftPct: 0,
      widthPct: 100,
    });
    expect(layout.items[0].topPct).toBeCloseTo(100 / 3);
    expect(layout.items[0].heightPct).toBeCloseTo(100 / 3);
    expect(layout.height).toBe(3 * HOUR_PX);
  });

  it("splits overlapping classes in the same day into side-by-side columns", () => {
    const start = new Date(2026, 7, 17, 18, 0, 0);
    const end = new Date(2026, 7, 17, 19, 0, 0);
    const layout = buildWeekCalendar([
      session("a", start, end),
      session("b", start, end),
    ]);

    const columns = layout.items
      .slice()
      .sort((a, b) => a.leftPct - b.leftPct)
      .map((item) => ({
        id: item.id,
        leftPct: item.leftPct,
        widthPct: item.widthPct,
      }));

    expect(columns).toEqual([
      { id: "a", leftPct: 0, widthPct: 50 },
      { id: "b", leftPct: 50, widthPct: 50 },
    ]);
  });

  it("keeps non-overlapping classes in the same day at full width", () => {
    const layout = buildWeekCalendar([
      session("a", new Date(2026, 7, 17, 10, 0, 0), new Date(2026, 7, 17, 11, 0, 0)),
      session("b", new Date(2026, 7, 17, 18, 0, 0), new Date(2026, 7, 17, 19, 0, 0)),
    ]);

    expect(layout.items.every((item) => item.widthPct === 100 && item.leftPct === 0)).toBe(
      true,
    );
  });

  it("returns a now offset when now falls inside the visible hours", () => {
    const layout = buildWeekCalendar(
      [session("a", new Date(2026, 7, 17, 18, 0, 0), new Date(2026, 7, 17, 19, 0, 0))],
      { now: new Date(2026, 7, 17, 18, 30, 0) },
    );

    expect(layout.nowTop).toBe(HOUR_PX + HOUR_PX / 2);
    expect(layout.nowTopPct).toBe(50);
    expect(layout.todayIsoDay).toBe(1);
  });
});
