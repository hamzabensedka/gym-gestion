"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  memberBookAction,
  memberCancelAction,
} from "@/app/actions/member-classes";
import { translateClassError } from "@/components/classes/types";
import { useI18n } from "@/components/i18n/locale-provider";
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
  myBooking: "BOOKED" | "CANCELLED" | null;
};

export function MemberClassesList({
  sessions,
}: {
  sessions: MemberSessionView[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  if (sessions.length === 0) {
    return (
      <p className="text-pretty text-sm text-muted-foreground">
        {t("classes.memberEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}
      {sessions.map((session) => {
        const booked = session.myBooking === "BOOKED";
        const full = session.remaining <= 0;
        const canBook = !booked && !full;

        return (
          <article
            key={session.id}
            className="space-y-3 rounded-[22px] border border-white/12 bg-[#0a0a0a] p-4"
          >
            <div className="space-y-1">
              <h2 className="text-balance text-base font-semibold text-foreground">
                {session.className}
              </h2>
              <p className="tnum text-xs text-muted-foreground">
                {formatDate(session.startsAt, locale)}
                {" · "}
                {formatTime(session.startsAt, locale)}
                {" – "}
                {formatTime(session.endsAt, locale)}
              </p>
              {session.coachName ? (
                <p className="text-pretty text-xs text-muted-foreground">
                  {t("classes.coach")}: {session.coachName}
                </p>
              ) : null}
              <p
                className={cn(
                  "tnum text-xs font-medium",
                  full ? "text-muted-foreground" : "text-brand",
                )}
              >
                {full
                  ? t("classes.full")
                  : t("classes.spotsLeft", { count: session.remaining })}
              </p>
            </div>
            {booked ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 min-h-10 w-full border-white/12 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                disabled={pending}
                onClick={() => runAction(session.id, memberCancelAction)}
              >
                {t("classes.cancel")}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-10 min-h-10 w-full"
                disabled={pending || !canBook}
                onClick={() => runAction(session.id, memberBookAction)}
              >
                {t("classes.book")}
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}
