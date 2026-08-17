"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, getISODay } from "date-fns";
import { cancelSessionAction } from "@/app/actions/classes";
import { useT } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  WEEKDAYS,
  translateClassError,
  weekdayKey,
  type DeskSessionView,
} from "./types";

export function WeekGrid({
  weekKey,
  sessions,
}: {
  weekKey: string;
  sessions: DeskSessionView[];
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<DeskSessionView | null>(null);

  const byDay = new Map<number, DeskSessionView[]>();
  for (const day of WEEKDAYS) {
    byDay.set(day, []);
  }
  for (const session of sessions) {
    const day = getISODay(new Date(session.startsAt)) as (typeof WEEKDAYS)[number];
    const bucket = byDay.get(day) ?? [];
    bucket.push(session);
    byDay.set(day, bucket);
  }

  function handleCancel() {
    if (!cancelling) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelSessionAction(cancelling.id);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        setCancelling(null);
        return;
      }
      setCancelling(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("classes.noSessions")}
        </div>
      ) : null}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="grid min-w-[52rem] grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => {
            const daySessions = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className="space-y-2 rounded-xl border border-border bg-muted/40 p-2"
              >
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(weekdayKey(day))}
                </h3>
                <div className="space-y-2">
                  {daySessions.map((session) => {
                    const cancelled = session.status === "CANCELLED";
                    const full = session.remaining <= 0;
                    return (
                      <div
                        key={session.id}
                        className={cn(
                          "space-y-2 rounded-lg border border-border bg-card p-2.5 shadow-sm",
                          cancelled && "opacity-70",
                        )}
                      >
                        <p className="text-sm font-semibold leading-tight text-pretty">
                          {session.className}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {format(new Date(session.startsAt), "HH:mm")}
                          {" – "}
                          {format(new Date(session.endsAt), "HH:mm")}
                        </p>
                        <p className="text-xs font-medium tabular-nums">
                          {full
                            ? t("classes.full")
                            : t("classes.spotsLeft", { count: session.remaining })}
                        </p>
                        {session.coachName ? (
                          <p className="text-xs text-muted-foreground">
                            {t("classes.coach")}: {session.coachName}
                          </p>
                        ) : null}
                        {cancelled ? (
                          <Badge tone="neutral">
                            {t("classes.error.SESSION_CANCELLED")}
                          </Badge>
                        ) : null}
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/classes?week=${weekKey}&session=${session.id}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "min-h-10",
                            )}
                          >
                            {t("classes.roster")}
                          </Link>
                          {!cancelled ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              className="min-h-10"
                              onClick={() => setCancelling(session)}
                            >
                              {t("classes.sessionCancel")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title={t("classes.sessionCancel")}
        description={
          cancelling
            ? `${cancelling.className} · ${format(new Date(cancelling.startsAt), "HH:mm")}`
            : ""
        }
        confirmLabel={t("classes.sessionCancel")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleCancel}
      />
    </div>
  );
}
