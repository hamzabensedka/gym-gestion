"use client";

import { isToday } from "date-fns";
import { useI18n } from "@/components/i18n/locale-provider";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeeklyChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  const { locale } = useI18n();
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="flex h-44 items-stretch gap-2.5">
      {data.map((item) => {
        const today = isToday(new Date(item.date));
        const heightPct = (item.count / max) * 100;
        return (
          <div key={item.date} className="flex h-full flex-1 flex-col items-center gap-2">
            <span className="tnum text-xs font-semibold text-muted-foreground">
              {item.count}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-lg transition-[height,background-color] duration-500 ease-out",
                  today ? "bg-brand" : "bg-muted",
                )}
                style={{
                  height: `${Math.max(heightPct, item.count ? 6 : 3)}%`,
                }}
              />
            </div>
            <span
              className={cn(
                "text-xs font-medium capitalize",
                today ? "text-brand" : "text-muted-foreground",
              )}
            >
              {formatDay(item.date, locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
