import { getISODay } from "date-fns";

export const HOUR_PX = 56;

export type WeekCalendarItem = {
  id: string;
  day: number;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

export type WeekCalendarLayout = {
  startHour: number;
  endHour: number;
  hours: number[];
  height: number;
  items: WeekCalendarItem[];
  nowTop: number | null;
  todayIsoDay: number | null;
};

type SessionInput = {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
};

type InternalEvent = {
  id: string;
  day: number;
  startMin: number;
  endMin: number;
};

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function layoutGroup(events: InternalEvent[]): WeekCalendarItem[] {
  const columns: number[] = [];
  const colById = new Map<string, number>();
  const sorted = events.slice().sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    if (a.endMin !== b.endMin) return b.endMin - a.endMin;
    return a.id.localeCompare(b.id);
  });

  for (const event of sorted) {
    let col = columns.findIndex((end) => end <= event.startMin);
    if (col === -1) {
      col = columns.length;
      columns.push(event.endMin);
    } else {
      columns[col] = event.endMin;
    }
    colById.set(event.id, col);
  }

  const colCount = Math.max(columns.length, 1);
  const widthPct = 100 / colCount;

  return sorted.map((event) => {
    const col = colById.get(event.id) ?? 0;
    return {
      id: event.id,
      day: event.day,
      top: 0,
      height: 0,
      leftPct: col * widthPct,
      widthPct,
    };
  });
}

function layoutDay(events: InternalEvent[]): WeekCalendarItem[] {
  const sorted = events.slice().sort((a, b) => a.startMin - b.startMin);
  const items: WeekCalendarItem[] = [];
  let group: InternalEvent[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (group.length === 0) return;
    items.push(...layoutGroup(group));
    group = [];
    groupEnd = Number.NEGATIVE_INFINITY;
  };

  for (const event of sorted) {
    if (group.length > 0 && event.startMin >= groupEnd) {
      flush();
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, event.endMin);
  }
  flush();
  return items;
}

export function buildWeekCalendar(
  sessions: SessionInput[],
  options?: { now?: Date; weekStart?: Date },
): WeekCalendarLayout {
  const events: InternalEvent[] = sessions.map((session) => {
    const startsAt = new Date(session.startsAt);
    const endsAt = new Date(session.endsAt);
    return {
      id: session.id,
      day: getISODay(startsAt),
      startMin: minutesOfDay(startsAt),
      endMin: Math.max(minutesOfDay(endsAt), minutesOfDay(startsAt) + 15),
    };
  });

  const minMin = Math.min(...events.map((event) => event.startMin));
  const maxMin = Math.max(...events.map((event) => event.endMin));
  const startHour = Math.max(0, Math.floor(minMin / 60) - 1);
  const endHour = Math.min(24, Math.ceil(maxMin / 60) + 1);
  const hourCount = Math.max(endHour - startHour, 1);
  const origin = startHour * 60;

  const byDay = new Map<number, InternalEvent[]>();
  for (const event of events) {
    const bucket = byDay.get(event.day) ?? [];
    bucket.push(event);
    byDay.set(event.day, bucket);
  }

  const items: WeekCalendarItem[] = [];
  for (const dayEvents of byDay.values()) {
    for (const item of layoutDay(dayEvents)) {
      const event = events.find((row) => row.id === item.id);
      if (!event) continue;
      items.push({
        ...item,
        top: ((event.startMin - origin) / 60) * HOUR_PX,
        height: ((event.endMin - event.startMin) / 60) * HOUR_PX,
      });
    }
  }

  const now = options?.now;
  let nowTop: number | null = null;
  let todayIsoDay: number | null = null;
  if (now) {
    const weekStart = options?.weekStart;
    const inWeek =
      !weekStart ||
      (now.getTime() >= weekStart.getTime() &&
        now.getTime() < weekStart.getTime() + 7 * 86400000);
    if (inWeek) {
      todayIsoDay = getISODay(now);
      const nowMin = minutesOfDay(now);
      if (nowMin >= origin && nowMin <= endHour * 60) {
        nowTop = ((nowMin - origin) / 60) * HOUR_PX;
      }
    }
  }

  return {
    startHour,
    endHour,
    hours: Array.from({ length: hourCount + 1 }, (_, index) => startHour + index),
    height: hourCount * HOUR_PX,
    items,
    nowTop,
    todayIsoDay,
  };
}
