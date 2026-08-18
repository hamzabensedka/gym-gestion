"use client";

import { useActionState, useState } from "react";
import { Plan } from "@prisma/client";
import { requestGymPlanAction } from "@/app/actions/plan-requests";
import { PlanCards } from "@/components/plans/plan-cards";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

const PLAN_ERROR_KEYS = new Set<string>([
  "plans.invalidLead",
  "plans.alreadyCurrent",
  "plans.rateLimited",
]);

export function GymPlansPanel({
  currentPlan,
  trialEndsAt,
}: {
  currentPlan: Plan;
  trialEndsAt: string | null;
}) {
  const t = useT();
  const [plan, setPlan] = useState<Plan>(currentPlan);

  const [state, formAction, pending] = useActionState(
    async (_prev: { ok?: boolean; error?: string } | null, formData: FormData) => {
      const result = await requestGymPlanAction(formData);
      return result ?? null;
    },
    null,
  );

  if (state?.ok) {
    return (
      <p role="status" className="text-pretty text-sm font-medium text-foreground">
        {t("plans.success")}
      </p>
    );
  }

  const errorKey = state?.error
    ? PLAN_ERROR_KEYS.has(state.error)
      ? state.error
      : "plans.invalidLead"
    : null;
  const isCurrent = plan === currentPlan;

  return (
    <form action={formAction} className="space-y-6" aria-label={t("plans.title")}>
      <PlanCards
        selected={plan}
        onSelect={setPlan}
        currentPlan={currentPlan}
        trialEndsAt={trialEndsAt}
        mode="gym"
      />
      <input type="hidden" name="plan" value={plan} />

      {errorKey ? (
        <p
          role="alert"
          className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
        >
          {t(errorKey as TranslationKey)}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || isCurrent}
        static={pending}
      >
        {t("plans.submit")}
      </Button>
    </form>
  );
}
