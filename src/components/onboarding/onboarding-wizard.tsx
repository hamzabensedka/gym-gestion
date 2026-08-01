"use client";

import { useMemo, useState, useTransition } from "react";
import { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/app/actions/onboarding";
import {
  suggestFromEntryAnswer,
  type EntryAnswer,
} from "@/lib/plans";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ENTRY_OPTIONS: {
  value: EntryAnswer;
  labelKey: TranslationKey;
}[] = [
  { value: "desk", labelKey: "onboarding.entry.desk" },
  { value: "open_kiosk", labelKey: "onboarding.entry.open_kiosk" },
  { value: "badge_pc", labelKey: "onboarding.entry.badge_pc" },
  { value: "vendor", labelKey: "onboarding.entry.vendor" },
  { value: "new_kit", labelKey: "onboarding.entry.new_kit" },
];

const PLAN_LABEL: Record<Plan, TranslationKey> = {
  STARTER: "onboarding.plan.STARTER",
  GROWTH: "onboarding.plan.GROWTH",
  PRO: "onboarding.plan.PRO",
};

export function OnboardingWizard({
  gymName,
  gymLocation,
}: {
  gymName: string;
  gymLocation: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [entryAnswer, setEntryAnswer] = useState<EntryAnswer>("desk");
  const [error, setError] = useState<string | null>(null);

  const suggested = useMemo(
    () => suggestFromEntryAnswer(entryAnswer),
    [entryAnswer],
  );

  function onComplete(formData: FormData) {
    setError(null);
    formData.set("entryAnswer", entryAnswer);
    formData.set("plan", suggested.plan);
    startTransition(async () => {
      const result = await completeOnboardingAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const result = await skipOnboardingAction();
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="space-y-6">
      <form action={onComplete} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-[17px] font-semibold text-foreground">
            {t("onboarding.entryQuestion")}
          </legend>
          <div className="space-y-2">
            {ENTRY_OPTIONS.map((option) => {
              const selected = entryAnswer === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                    selected
                      ? "border-brand bg-muted"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    name="entryAnswerRadio"
                    value={option.value}
                    checked={selected}
                    onChange={() => setEntryAnswer(option.value)}
                    className="mt-1 size-4 accent-brand"
                  />
                  <span className="text-sm leading-snug text-foreground">
                    {t(option.labelKey)}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.suggestedPlan")}:{" "}
            <span className="font-semibold text-foreground">
              {t(PLAN_LABEL[suggested.plan])}
            </span>
          </p>
        </fieldset>

        <div className="space-y-4">
          <h3 className="text-[17px] font-semibold">{t("onboarding.confirmGym")}</h3>
          <Field label={t("onboarding.gymName")}>
            <Input name="name" defaultValue={gymName} required />
          </Field>
          <Field label={t("onboarding.gymLocation")}>
            <Input name="location" defaultValue={gymLocation} />
          </Field>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
          >
            {t(error as TranslationKey)}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" disabled={pending} className="sm:flex-1">
            {pending ? t("common.saving") : t("onboarding.continue")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onSkip}
            className="sm:flex-1"
          >
            {t("onboarding.skip")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
