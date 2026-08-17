"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  deskCancelBookingAction,
  deleteSessionAction,
  updateSessionAction,
} from "@/app/actions/classes";
import { useT } from "@/components/i18n/locale-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  translateClassError,
  type DeskSessionView,
  type RosterRowView,
} from "./types";

function toDateTimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export function SessionRoster({
  weekKey,
  session,
  rows,
}: {
  weekKey: string;
  session: DeskSessionView;
  rows: RosterRowView[];
}) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cancellingMemberId, setCancellingMemberId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const booked = rows.filter((row) => row.status === "BOOKED");

  function handleUpdate(formData: FormData) {
    setError(null);
    formData.set("sessionId", session.id);
    startTransition(async () => {
      const result = await updateSessionAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      router.refresh();
    });
  }

  function handleCancelBooking() {
    if (!cancellingMemberId) return;
    setError(null);
    startTransition(async () => {
      const result = await deskCancelBookingAction(session.id, cancellingMemberId);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        setCancellingMemberId(null);
        return;
      }
      setCancellingMemberId(null);
      router.refresh();
    });
  }

  function handleDeleteSession() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSessionAction(session.id);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        setDeleting(false);
        return;
      }
      setDeleting(false);
      router.push(`/classes?week=${weekKey}`);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 p-4">
      <CardHeader className="flex-row items-start justify-between gap-3 p-0">
        <div className="space-y-1">
          <CardTitle>{t("classes.roster")}</CardTitle>
          <p className="text-sm font-medium">{session.className}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {format(new Date(session.startsAt), "HH:mm")}
            {" – "}
            {format(new Date(session.endsAt), "HH:mm")}
          </p>
        </div>
        <Link
          href={`/classes?week=${weekKey}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-10")}
        >
          {t("common.cancel")}
        </Link>
      </CardHeader>

      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {booked.map((row) => (
          <div
            key={row.memberId}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <p className="min-w-0 truncate text-sm font-medium">{row.fullName}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              className="min-h-10"
              onClick={() => setCancellingMemberId(row.memberId)}
            >
              {t("classes.cancel")}
            </Button>
          </div>
        ))}
      </div>

      <form action={handleUpdate} className="space-y-3 border-t border-border pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("classes.capacity")}>
            <Input
              name="capacity"
              type="number"
              inputMode="numeric"
              min="1"
              max="200"
              step="1"
              defaultValue={session.capacity}
            />
          </Field>
          <Field label={t("classes.coach")}>
            <Input name="coachName" defaultValue={session.coachName ?? ""} maxLength={80} />
          </Field>
          <Field label={t("classes.week")}>
            <Input
              name="startsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(session.startsAt)}
            />
          </Field>
          <Field label={t("classes.week")}>
            <Input
              name="endsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(session.endsAt)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t("common.save")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setDeleting(true)}
          >
            {t("classes.sessionDelete")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={cancellingMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setCancellingMemberId(null);
        }}
        title={t("classes.cancel")}
        description={
          booked.find((row) => row.memberId === cancellingMemberId)?.fullName ?? ""
        }
        confirmLabel={t("classes.cancel")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleCancelBooking}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(false);
        }}
        title={t("common.confirmDelete")}
        description={session.className}
        confirmLabel={t("classes.sessionDelete")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDeleteSession}
      />
    </Card>
  );
}
