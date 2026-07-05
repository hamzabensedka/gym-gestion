"use client";

import { useState } from "react";
import { addMonths, format } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import { PLAN_MONTHS } from "@/lib/subscription";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MemberFormProps = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    fullName: string;
    phone: string;
    email?: string | null;
    subscriptionStart: string;
    subscriptionEnd: string;
    notes?: string | null;
    monthlyFee: number;
    inviteStatus?: string | null;
  };
  mode: "create" | "edit";
};

const planLabelKey: Record<number, TranslationKey> = {
  1: "form.plan1",
  3: "form.plan3",
  6: "form.plan6",
  12: "form.plan12",
};

const today = format(new Date(), "yyyy-MM-dd");

export function MemberForm({ action, defaultValues, mode }: MemberFormProps) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [start, setStart] = useState(defaultValues?.subscriptionStart ?? today);
  const [end, setEnd] = useState(defaultValues?.subscriptionEnd ?? "");
  const [activePlan, setActivePlan] = useState<number | null>(null);

  function applyPlan(months: number) {
    const base = start ? new Date(`${start}T12:00:00`) : new Date();
    setEnd(format(addMonths(base, months), "yyyy-MM-dd"));
    setActivePlan(months);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <Field label={t("common.name")}>
        <Input name="fullName" defaultValue={defaultValues?.fullName} required autoFocus={mode === "create"} />
      </Field>

      <Field label={t("common.phone")}>
        <Input
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+216 20 123 456"
          defaultValue={defaultValues?.phone}
          required
        />
      </Field>

      <Field label={t("members.email")}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="membre@email.com"
          defaultValue={defaultValues?.email ?? ""}
        />
      </Field>

      {defaultValues?.inviteStatus !== "ACTIVE" ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
          <input
            type="checkbox"
            name="sendInvite"
            defaultChecked={mode === "create"}
            className="size-4 rounded border-border accent-brand"
          />
          <span className="text-sm text-foreground">{t("members.sendInvite")}</span>
        </label>
      ) : null}

      <div>
        <p className="mb-1.5 text-sm font-semibold text-foreground">{t("form.plan")}</p>
        <div className="grid grid-cols-4 gap-2">
          {PLAN_MONTHS.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => applyPlan(months)}
              className={cn(
                "rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors",
                activePlan === months
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-muted-foreground hover:border-brand/50",
              )}
            >
              {t(planLabelKey[months])}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.startDate")}>
          <Input
            type="date"
            name="subscriptionStart"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </Field>
        <Field label={t("common.endDate")}>
          <Input
            type="date"
            name="subscriptionEnd"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setActivePlan(null);
            }}
            required
          />
        </Field>
      </div>

      <Field label={`${t("common.monthlyFee")} (TND)`}>
        <Input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          name="monthlyFee"
          defaultValue={defaultValues?.monthlyFee ?? 0}
          required
        />
      </Field>

      <Field label={t("common.notes")} skeletonClassName="min-h-24">
        <Textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} />
      </Field>

      {error ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
          {t(error as TranslationKey)}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {!pending ? <Check className="size-5" /> : null}
        {pending ? t("common.saving") : mode === "create" ? t("form.create") : t("common.save")}
      </Button>
    </form>
  );
}
