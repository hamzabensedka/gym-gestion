"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  cancelSessionAction,
  deskCancelBookingAction,
  deleteSessionAction,
  updateSessionAction,
} from "@/app/actions/classes";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Select } from "@/components/ui/select";
import {
  translateClassError,
  type DeskSessionView,
  type RosterRowView,
} from "./types";

function splitDateTime(iso: string): { date: string; time: string } {
  const local = format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  const [date, time] = local.split("T");
  return { date, time };
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
  const [cancellingSession, setCancellingSession] = useState(false);

  const booked = rows.filter((row) => row.status === "BOOKED");

  function handleUpdate(formData: FormData) {
    setError(null);
    formData.set("sessionId", session.id);
    const startDate = String(formData.get("startsDate") ?? "");
    const startTime = String(formData.get("startsTime") ?? "");
    const endDate = String(formData.get("endsDate") ?? "");
    const endTime = String(formData.get("endsTime") ?? "");
    if (startDate && startTime) formData.set("startsAt", `${startDate}T${startTime}`);
    if (endDate && endTime) formData.set("endsAt", `${endDate}T${endTime}`);
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

  function handleCancelSession() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSessionAction(session.id);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        setCancellingSession(false);
        return;
      }
      setCancellingSession(false);
      router.push(`/classes?week=${weekKey}`);
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
        <Button asChild variant="outline">
          <Link href={`/classes?week=${weekKey}`}>
            <ArrowLeft className="size-4" />
            {t("common.back")}
          </Link>
        </Button>
      </CardHeader>

      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {booked.length === 0 ? (
          <p className="text-pretty text-sm text-muted-foreground">{t("classes.noRoster")}</p>
        ) : null}
        {booked.map((row) => (
          <div
            key={row.memberId}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <p className="min-w-0 truncate text-sm font-medium">{row.fullName}</p>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setCancellingMemberId(row.memberId)}
            >
              {t("classes.cancel")}
            </Button>
          </div>
        ))}
      </div>

      <form key={session.id} action={handleUpdate} className="space-y-3 border-t border-border pt-4">
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
          <div className="sm:col-span-2">
            <Field label={t("classes.audience")}>
              <Select
                name="audience"
                defaultValue={session.audience}
                required
                options={[
                  { value: "MIXED", label: t("classes.audience.MIXED") },
                  { value: "LADIES", label: t("classes.audience.LADIES") },
                  { value: "MEN", label: t("classes.audience.MEN") },
                ]}
              />
            </Field>
          </div>
          <Field label={t("classes.start")}>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker name="startsDate" defaultValue={splitDateTime(session.startsAt).date} required />
              <TimePicker name="startsTime" defaultValue={splitDateTime(session.startsAt).time} required />
            </div>
          </Field>
          <Field label={t("classes.end")}>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker name="endsDate" defaultValue={splitDateTime(session.endsAt).date} required />
              <TimePicker name="endsTime" defaultValue={splitDateTime(session.endsAt).time} required />
            </div>
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            {t("common.save")}
          </Button>
          {session.status !== "CANCELLED" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="w-full"
              onClick={() => setCancellingSession(true)}
            >
              {t("classes.sessionCancel")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            className="w-full"
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
        open={cancellingSession}
        onOpenChange={(open) => {
          if (!open) setCancellingSession(false);
        }}
        title={t("classes.sessionCancel")}
        description={session.className}
        confirmLabel={t("classes.sessionCancel")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleCancelSession}
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
