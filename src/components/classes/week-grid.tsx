"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { useT } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HOUR_PX, buildWeekCalendar } from "@/lib/week-calendar";
import { WEEKDAYS, weekdayKey } from "./types";

export type WeekGridSession = {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  remaining: number;
  coachName: string | null;
  audience?: "MIXED" | "LADIES" | "MEN";
  status?: "SCHEDULED" | "CANCELLED";
  booked?: boolean;
};

export function WeekGrid({
  weekKey,
  sessions,
  hrefFor,
  onSelect,
  selectedId,
  emptyTitle,
  emptyDescription,
}: {
  weekKey: string;
  sessions: WeekGridSession[];
  hrefFor?: (sessionId: string) => string;
  onSelect?: (sessionId: string) => void;
  selectedId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const t = useT();
  const weekStart = startOfWeek(new Date(`${weekKey}T00:00:00`), { weekStartsOn: 1 });
  const byId = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );
  const layout = useMemo(
    () =>
      buildWeekCalendar(sessions, {
        now: new Date(),
        weekStart: startOfWeek(new Date(`${weekKey}T00:00:00`), { weekStartsOn: 1 }),
      }),
    [sessions, weekKey],
  );
  const itemsByDay = useMemo(() => {
    const map = new Map<number, typeof layout.items>();
    for (const item of layout.items) {
      const bucket = map.get(item.day) ?? [];
      bucket.push(item);
      map.set(item.day, bucket);
    }
    return map;
  }, [layout.items]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {emptyTitle ?? t("classes.noSessions")}
        </p>
        {emptyDescription ? (
          <p className="mt-1 text-pretty text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[min(70dvh,36rem)] overflow-auto">
        <div className="min-w-[46rem]">
          <div className="sticky top-0 z-20 grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-border bg-card/95">
            <div />
            {WEEKDAYS.map((day) => {
              const date = addDays(weekStart, day - 1);
              const isToday = layout.todayIsoDay === day;
              return (
                <div
                  key={day}
                  className={cn(
                    "border-l border-border px-1.5 py-2 text-center",
                    isToday && "bg-brand/10",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                      isToday && "text-brand",
                    )}
                  >
                    {t(weekdayKey(day))}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isToday && "text-brand",
                    )}
                  >
                    {format(date, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]"
            style={{ height: layout.height }}
          >
            <div className="relative">
              {layout.hours.map((hour, index) => (
                <p
                  key={hour}
                  className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: index * HOUR_PX }}
                >
                  {String(hour).padStart(2, "0")}:00
                </p>
              ))}
            </div>

            {WEEKDAYS.map((day) => {
              const isToday = layout.todayIsoDay === day;
              const dayItems = itemsByDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={cn(
                    "relative border-l border-border",
                    isToday && "bg-brand/5",
                  )}
                >
                  {layout.hours.slice(0, -1).map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border/70"
                      style={{ top: index * HOUR_PX }}
                    />
                  ))}

                  {isToday && layout.nowTop != null ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20"
                      style={{ top: layout.nowTop }}
                    >
                      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand" />
                      <div className="h-px bg-brand" />
                    </div>
                  ) : null}

                  {dayItems.map((item) => {
                    const session = byId.get(item.id);
                    if (!session) return null;
                    const cancelled = session.status === "CANCELLED";
                    const full = session.remaining <= 0;
                    const showDetails = item.height >= 48;
                    const selected = selectedId === session.id;
                    const style: CSSProperties = {
                      top: item.top + 2,
                      height: Math.max(item.height - 4, 28),
                      left: `calc(${item.leftPct}% + 3px)`,
                      width: `calc(${item.widthPct}% - 6px)`,
                    };
                    const className = cn(
                      "absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-start shadow-sm transition-colors",
                      cancelled
                        ? "border-border bg-muted/80 text-muted-foreground"
                        : session.booked
                          ? "border-brand bg-brand/35 text-foreground"
                          : "border-brand/30 bg-brand/15 hover:bg-brand/25",
                      selected && "ring-2 ring-brand ring-offset-1 ring-offset-card",
                    );
                    const body = (
                      <>
                        <p className="truncate text-[11px] font-semibold leading-tight">
                          {session.className}
                        </p>
                        <p className="tabular-nums text-[10px] leading-tight text-muted-foreground">
                          {format(new Date(session.startsAt), "HH:mm")}
                          {" – "}
                          {format(new Date(session.endsAt), "HH:mm")}
                        </p>
                        {showDetails ? (
                          <p className="mt-0.5 text-[10px] font-medium tabular-nums">
                            {session.booked
                              ? t("classes.booked")
                              : full
                                ? t("classes.full")
                                : t("classes.spotsLeft", { count: session.remaining })}
                          </p>
                        ) : null}
                        {showDetails && session.audience && session.audience !== "MIXED" ? (
                          <p className="truncate text-[10px] font-medium text-brand">
                            {t(
                              session.audience === "LADIES"
                                ? "classes.audience.LADIES"
                                : "classes.audience.MEN",
                            )}
                          </p>
                        ) : null}
                        {showDetails && session.coachName ? (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {session.coachName}
                          </p>
                        ) : null}
                        {cancelled ? (
                          <Badge tone="neutral" className="mt-1">
                            {t("classes.error.SESSION_CANCELLED")}
                          </Badge>
                        ) : null}
                      </>
                    );

                    if (onSelect) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(session.id)}
                          className={className}
                          style={style}
                        >
                          {body}
                        </button>
                      );
                    }

                    const href = hrefFor?.(session.id) ?? `#${session.id}`;
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className={className}
                        style={style}
                      >
                        {body}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
