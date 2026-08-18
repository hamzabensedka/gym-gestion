"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  memberBookAction,
  memberCancelAction,
} from "@/app/actions/member-classes";
import { WeekGrid } from "@/components/classes/week-grid";
import { translateClassError } from "@/components/classes/types";
import { useI18n, useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MemberSessionView = {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  remaining: number;
  coachName: string | null;
  audience: "MIXED" | "LADIES" | "MEN";
  myBooking: "BOOKED" | "CANCELLED" | null;
};

export function MemberClassesList({
  weekKey,
  sessions,
  selectedId,
}: {
  weekKey: string;
  sessions: MemberSessionView[];
  selectedId?: string | null;
}) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const weekStart = startOfWeek(new Date(`${weekKey}T00:00:00`), { weekStartsOn: 1 });
  const dfLocale = locale === "ar" ? ar : fr;
  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "d MMM", { locale: dfLocale })} – ${format(addDays(weekStart, 6), "d MMM", { locale: dfLocale })}`;
  const selected = selectedId
    ? (sessions.find((session) => session.id === selectedId) ?? null)
    : null;

  function goToWeek(value: string) {
    router.push(`/member/classes?week=${value}`);
  }

  function selectSession(sessionId: string) {
    router.push(`/member/classes?week=${weekKey}&session=${sessionId}`);
  }

  function runAction(
    sessionId: string,
    action: typeof memberBookAction | typeof memberCancelAction,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action(sessionId);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      router.refresh();
    });
  }

  const booked = selected?.myBooking === "BOOKED";
  const full = selected != null && selected.remaining <= 0;
  const canBook = selected != null && !booked && !full;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0"
          onClick={() => goToWeek(prevWeek)}
          aria-label={prevWeek}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums">
          {weekLabel}
        </p>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0"
          onClick={() => goToWeek(nextWeek)}
          aria-label={nextWeek}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <WeekGrid
          weekKey={weekKey}
          sessions={sessions.map((session) => ({
            id: session.id,
            className: session.className,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            remaining: session.remaining,
            coachName: session.coachName,
            booked: session.myBooking === "BOOKED",
            audience: session.audience,
          }))}
          onSelect={selectSession}
          selectedId={selected?.id ?? null}
          emptyTitle={t("classes.noSessions")}
          emptyDescription={t("classes.memberEmpty")}
          fill
          className="min-h-0 flex-1"
        />
      </div>

      {selected ? (
        <article className="shrink-0 space-y-3 rounded-[22px] border border-white/12 bg-[#0a0a0a] p-4">
          <div className="space-y-1">
            <h2 className="text-balance text-base font-semibold text-foreground">
              {selected.className}
            </h2>
            <p className="tnum text-xs text-muted-foreground">
              {formatDate(selected.startsAt, locale)}
              {" · "}
              {formatTime(selected.startsAt, locale)}
              {" – "}
              {formatTime(selected.endsAt, locale)}
            </p>
            {selected.coachName ? (
              <p className="text-pretty text-xs text-muted-foreground">
                {t("classes.coach")}: {selected.coachName}
              </p>
            ) : null}
            {selected.audience !== "MIXED" ? (
              <p className="text-xs font-medium text-brand">
                {t(
                  selected.audience === "LADIES"
                    ? "classes.audience.LADIES"
                    : "classes.audience.MEN",
                )}
              </p>
            ) : null}
            <p
              className={cn(
                "tnum text-xs font-medium",
                full ? "text-muted-foreground" : "text-brand",
              )}
            >
              {booked
                ? t("classes.booked")
                : full
                  ? t("classes.full")
                  : t("classes.spotsLeft", { count: selected.remaining })}
            </p>
          </div>
          {booked ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 min-h-10 w-full border-white/12 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
              disabled={pending}
              onClick={() => runAction(selected.id, memberCancelAction)}
            >
              {t("classes.cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10 min-h-10 w-full"
              disabled={pending || !canBook}
              onClick={() => runAction(selected.id, memberBookAction)}
            >
              {t("classes.book")}
            </Button>
          )}
        </article>
      ) : sessions.length > 0 ? (
        <p className="shrink-0 text-pretty text-center text-sm text-muted-foreground">
          {t("classes.memberPickSession")}
        </p>
      ) : null}
    </div>
  );
}
