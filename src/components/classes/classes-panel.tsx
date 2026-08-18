"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { generateWeekAction } from "@/app/actions/classes";
import { useI18n, useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
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

type Tab = "planning" | "catalog";

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
  const { locale } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [tab, setTab] = useState<Tab>(classes.length === 0 ? "catalog" : "planning");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState<number[]>([1]);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [audience, setAudience] = useState("MIXED");
  const [openAddAfterCreate, setOpenAddAfterCreate] = useState(false);

  const weekStart = startOfWeek(new Date(`${weekKey}T00:00:00`), { weekStartsOn: 1 });
  const dfLocale = locale === "ar" ? ar : fr;
  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "d MMM", { locale: dfLocale })} – ${format(addDays(weekStart, 6), "d MMM", { locale: dfLocale })}`;
  const activeClasses = classes.filter((klass) => klass.active);
  const showRoster = Boolean(rosterSessionId && rosterSession && roster);

  useEffect(() => {
    if (openAddAfterCreate && activeClasses.length > 0) {
      setAdding(true);
      setOpenAddAfterCreate(false);
    }
  }, [openAddAfterCreate, activeClasses.length]);

  function goToWeek(value: string) {
    if (!value) return;
    const monday = format(
      startOfWeek(new Date(`${value}T00:00:00`), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    router.push(`/classes?week=${monday}`);
  }

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function handleAdd(formData: FormData) {
    setError(null);
    if (days.length === 0) {
      setError(t("classes.pickDays"));
      return;
    }
    formData.set("weekStart", weekKey);
    formData.set(
      "slots",
      JSON.stringify(days.map((weekday) => ({ weekday, start, end }))),
    );
    startTransition(async () => {
      const result = await generateWeekAction(formData);
      if (result && "error" in result && result.error) {
        setError(translateClassError(t, result.error));
        return;
      }
      formRef.current?.reset();
      setDays([1]);
      setStart("18:00");
      setEnd("19:00");
      setAudience("MIXED");
      setAdding(false);
      router.refresh();
    });
  }

  const fillPlanning = tab === "planning" && !showRoster && !adding;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        fillPlanning && "min-h-0 flex-1",
      )}
    >
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {(
          [
            ["planning", "classes.tab.planning"],
            ["catalog", "classes.tab.catalog"],
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setAdding(false);
              if (id === "planning" && rosterSessionId) {
                router.push(`/classes?week=${weekKey}`);
              }
            }}
            className={cn(
              "min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors",
              tab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "catalog" ? (
        <ClassCatalog
          classes={classes}
          onFirstCreated={() => {
            setTab("planning");
            setOpenAddAfterCreate(true);
          }}
        />
      ) : null}

      {tab === "planning" ? (
        <div className={cn("flex flex-col gap-4", fillPlanning && "min-h-0 flex-1")}>
          {!showRoster ? (
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
          ) : null}

          {error ? (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {error}
            </p>
          ) : null}

          {showRoster && rosterSession && roster ? (
            <SessionRoster weekKey={weekKey} session={rosterSession} rows={roster} />
          ) : null}

          {!showRoster ? (
            <>
              {sessions.length > 0 || !adding ? (
                <div className={cn(fillPlanning && "min-h-0 flex-1")}>
                  <WeekGrid
                    weekKey={weekKey}
                    sessions={sessions}
                    hrefFor={(id) => `/classes?week=${weekKey}&session=${id}`}
                    emptyTitle={t("classes.noSessions")}
                    emptyDescription={t("classes.emptyWeekCta")}
                    fill={fillPlanning}
                    className={fillPlanning ? "h-full" : undefined}
                  />
                </div>
              ) : null}

              {adding ? (
                <Card className="space-y-4 p-4">
                  <p className="text-sm font-semibold">{t("classes.addSession")}</p>
                  {activeClasses.length === 0 ? (
                    <p className="text-pretty text-sm text-muted-foreground">
                      {t("classes.empty")}
                    </p>
                  ) : (
                    <form ref={formRef} action={handleAdd} className="space-y-4">
                      <Field label={t("classes.name")}>
                        <Select
                          name="classId"
                          required
                          defaultValue={activeClasses[0]?.id}
                          options={activeClasses.map((klass) => ({
                            value: klass.id,
                            label: klass.name,
                          }))}
                        />
                      </Field>
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("classes.days")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((day) => {
                            const selected = days.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={cn(
                                  "min-h-11 min-w-11 rounded-lg px-2 text-xs font-semibold transition-colors",
                                  selected
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-border bg-card text-muted-foreground",
                                )}
                              >
                                {t(weekdayKey(day))}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label={t("classes.start")}>
                          <TimePicker value={start} onValueChange={setStart} required />
                        </Field>
                        <Field label={t("classes.end")}>
                          <TimePicker value={end} onValueChange={setEnd} required />
                        </Field>
                      </div>
                      <Field label={t("classes.coach")}>
                        <Input name="coachName" maxLength={80} />
                      </Field>
                      <Field label={t("classes.audience")}>
                        <Select
                          name="audience"
                          value={audience}
                          onValueChange={setAudience}
                          required
                          options={[
                            { value: "MIXED", label: t("classes.audience.MIXED") },
                            { value: "LADIES", label: t("classes.audience.LADIES") },
                            { value: "MEN", label: t("classes.audience.MEN") },
                          ]}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={pending}>
                          {t("classes.addSession")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => setAdding(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              ) : (
                <Button
                  type="button"
                  className="min-h-12 w-full shrink-0"
                  onClick={() => {
                    if (activeClasses.length === 0) {
                      setTab("catalog");
                      return;
                    }
                    setAdding(true);
                  }}
                >
                  <Plus className="size-5" />
                  {t("classes.addSession")}
                </Button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
