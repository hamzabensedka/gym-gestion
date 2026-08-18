"use client";

import { useActionState, useState } from "react";
import { Plan } from "@prisma/client";
import { submitPublicLeadAction } from "@/app/actions/plan-requests";
import { PlanCards } from "@/components/plans/plan-cards";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

const PLAN_ERROR_KEYS = new Set<string>([
  "plans.invalidLead",
  "plans.alreadyCurrent",
  "plans.rateLimited",
]);

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_LEADS_WHATSAPP?.trim() ?? "";

export function PublicPlansForm() {
  const t = useT();
  const [plan, setPlan] = useState<Plan>(Plan.GROWTH);
  const [gymName, setGymName] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { ok?: boolean; error?: string } | null, formData: FormData) => {
      const result = await submitPublicLeadAction(formData);
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
  const whatsappHref =
    WHATSAPP_NUMBER.length > 0
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          `Bonjour, salle ${gymName}, offre ${plan}`,
        )}`
      : null;

  return (
    <form action={formAction} className="space-y-6" aria-label={t("plans.title")}>
      <PlanCards selected={plan} onSelect={setPlan} mode="public" />
      <input type="hidden" name="plan" value={plan} />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gymName">{t("plans.leadName")}</Label>
          <Input
            id="gymName"
            name="gymName"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            required
            aria-required="true"
            autoComplete="organization"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">{t("plans.leadCity")}</Label>
          <Input id="city" name="city" required aria-required="true" autoComplete="address-level2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("plans.leadPhone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            aria-required="true"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("plans.leadEmail")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            aria-required="true"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
      </div>

      {errorKey ? (
        <p
          role="alert"
          className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
        >
          {t(errorKey as TranslationKey)}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending} static={pending}>
        {t("plans.submit")}
      </Button>

      {whatsappHref ? (
        <Button variant="outline" size="lg" className="w-full" asChild>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            {t("plans.whatsapp")}
          </a>
        </Button>
      ) : null}
    </form>
  );
}
