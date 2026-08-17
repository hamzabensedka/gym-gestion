"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  createSessionAction,
  generateWeekAction,
} from "@/app/actions/classes";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { ClassCatalog } from "./class-catalog";
import { SessionRoster } from "./session-roster";
import {
  WEEKDAYS,
  translateClassError,
  weekdayKey,
  type ClassRowView,
  type DeskSessionView,
  type RosterRowView,
} from "./types";
import { WeekGrid } from "./week-grid";

type SlotDraft = { key: string; weekday: string; start: string; end: string };

function newSlot(): SlotDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    weekday: "1",
    start: "18:00",
    end: "19:00",
  };
}

export function ClassesPanel({
  weekKey,
  classes,
  sessions,
  rosterSessionId,
  rosterSession,
  roster,
}: {
  weekKey: string;
  classes: ClassRowView[];
  sessions: DeskSessionView[];
  rosterSessionId: string | null;
  rosterSession: DeskSessionView | null;
  roster: RosterRowView[] | null;
}) {
  const t = useT();
  const router = useRouter();
  const generateRef = useRef<HTMLFormElement>(null);
  const sessionRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [slots, setSlots] = useState<SlotDraft[]>([newSlot()]);

  const weekStart = startOfWeek(new Date(`${weekKey}T00:00:00`), { weekStartsOn: 1 });
  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const activeClasses = classes.filter((klass) => klass.active);

  function goToWeek(value: string) {
    if (!value) return;
    const monday = format(
      startOfWeek(new Date(`${value}T00:00:00`), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    router.push(`/classes?week=${monday}`);
  }

  function handleGenerate(formData: FormData) {
    setError(null);
    formData.set("weekStart", weekKey);
    formData.set(
      "slots",
      JSON.stringify(
        slots.map((slot) => ({
          weekday: Number(slot.weekday),
          start: slot.start,
          end: slot.end,
        })),
      ),
    );
    startTransition(async () => {
      const result = await generateWeekAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      generateRef.current?.reset();
      setSlots([newSlot()]);
      router.refresh();
    });
  }

  function handleCreateSession(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSessionAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      sessionRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <Field label={t("classes.week")}>
          <div className="flex items-center gap-2">
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
            <Input
              type="date"
              name="week"
              value={weekKey}
              onChange={(event) => goToWeek(event.target.value)}
            />
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
        </Field>
      </Card>

      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {error}
        </p>
      ) : null}

      {rosterSessionId && rosterSession && roster ? (
        <SessionRoster weekKey={weekKey} session={rosterSession} rows={roster} />
      ) : null}

      <WeekGrid weekKey={weekKey} sessions={sessions} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-foreground" strokeWidth={1.75} />
            <CardTitle>{t("classes.generateWeek")}</CardTitle>
          </div>
        </CardHeader>
        <form ref={generateRef} action={handleGenerate} className="space-y-4">
          <input type="hidden" name="weekStart" value={weekKey} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("classes.name")}>
              <Select name="classId" required defaultValue={activeClasses[0]?.id ?? ""}>
                {activeClasses.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("classes.capacity")}>
              <Input
                name="capacity"
                type="number"
                inputMode="numeric"
                min="1"
                max="200"
                step="1"
              />
            </Field>
            <Field label={t("classes.coach")}>
              <Input name="coachName" maxLength={80} />
            </Field>
          </div>
          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div
                key={slot.key}
                className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-3"
              >
                <Field label={t(weekdayKey(Number(slot.weekday) as (typeof WEEKDAYS)[number]))}>
                  <Select
                    value={slot.weekday}
                    onChange={(event) => {
                      const weekday = event.target.value;
                      setSlots((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, weekday } : row,
                        ),
                      );
                    }}
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day} value={String(day)}>
                        {t(weekdayKey(day))}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("classes.week")}>
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(event) => {
                      const start = event.target.value;
                      setSlots((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, start } : row,
                        ),
                      );
                    }}
                    required
                  />
                </Field>
                <Field label={t("classes.week")}>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(event) => {
                      const end = event.target.value;
                      setSlots((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, end } : row,
                        ),
                      );
                    }}
                    required
                  />
                </Field>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-10"
              onClick={() => setSlots((current) => [...current, newSlot()])}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {t("classes.generateWeek")}
          </Button>
        </form>
      </Card>

      <Card>
        <form ref={sessionRef} action={handleCreateSession} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("classes.name")}>
              <Select name="classId" required defaultValue={activeClasses[0]?.id ?? ""}>
                {activeClasses.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("classes.capacity")}>
              <Input
                name="capacity"
                type="number"
                inputMode="numeric"
                min="1"
                max="200"
                step="1"
              />
            </Field>
            <Field label={t("classes.week")}>
              <Input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label={t("classes.week")}>
              <Input name="endsAt" type="datetime-local" required />
            </Field>
            <Field label={t("classes.coach")}>
              <Input name="coachName" maxLength={80} />
            </Field>
          </div>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {t("common.save")}
          </Button>
        </form>
      </Card>

      <ClassCatalog classes={classes} />
    </div>
  );
}
