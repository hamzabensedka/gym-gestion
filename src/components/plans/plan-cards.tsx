"use client";

import { Plan } from "@prisma/client";
import { PLAN_CATALOG } from "@gym/shared/plan-catalog";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { useI18n, useT } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<Plan, TranslationKey> = {
  STARTER: "onboarding.plan.STARTER",
  GROWTH: "onboarding.plan.GROWTH",
  PRO: "onboarding.plan.PRO",
};

export type PlanCardsProps = {
  selected: Plan;
  onSelect: (plan: Plan) => void;
  currentPlan?: Plan;
  trialEndsAt?: string | null;
  mode: "public" | "gym";
};

export function PlanCards({
  selected,
  onSelect,
  currentPlan,
  trialEndsAt,
  mode,
}: PlanCardsProps) {
  const t = useT();
  const { locale } = useI18n();

  return (
    <div>
      <p className="text-pretty text-sm text-muted-foreground">{t("plans.manualPay")}</p>
      <div role="radiogroup" aria-label={t("plans.title")}>
        <StaggerGroup className="stagger-group-plans mt-3 grid gap-3 lg:grid-cols-3">
          {PLAN_CATALOG.map((def) => {
            const isSelected = selected === def.plan;
            const isCurrent = mode === "gym" && currentPlan === def.plan;

            return (
              <button
                key={def.plan}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(def.plan)}
                className={cn(
                  "flex h-full min-h-11 w-full flex-col items-start rounded-2xl border p-4 text-start",
                  "transition-[transform,box-shadow,border-color] duration-150",
                  "active:scale-[0.96]",
                  isSelected
                    ? "border-brand shadow-md ring-2 ring-brand"
                    : "border-border hover:border-brand/40",
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <h2 className="text-balance text-lg font-semibold text-foreground">
                    {t(PLAN_LABEL[def.plan])}
                  </h2>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {t("plans.current")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-pretty text-sm text-muted-foreground">
                  {t(def.pitchKey as TranslationKey)}
                </p>
                {isCurrent && trialEndsAt ? (
                  <p className="mt-1 text-pretty text-xs text-muted-foreground">
                    {t("plans.trialUntil", { date: formatDate(trialEndsAt, locale) })}
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-pretty text-sm text-foreground">
                  {def.includeKeys.map((key) => (
                    <li key={key}>{t(key as TranslationKey)}</li>
                  ))}
                </ul>
                <p className="mt-3 tabular-nums text-sm text-muted-foreground">
                  {t("plans.staffSeats", { n: def.staffSeats })}
                </p>
                {mode === "gym" && !isCurrent ? (
                  <span className="mt-auto pt-3 text-sm font-medium text-brand">
                    {t("plans.requestThis")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </StaggerGroup>
      </div>
    </div>
  );
}
