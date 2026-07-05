"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Banknote, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import { recordPaymentAction } from "@/app/actions/payments";
import { paymentMethods } from "@/lib/validations";
import type { TranslationKey } from "@/lib/i18n";
import { useRouter } from "next/navigation";

const methodLabelKey: Record<(typeof paymentMethods)[number], TranslationKey> = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
};

type PaymentFormProps = {
  memberId: string;
  defaultAmount?: number;
};

export function PaymentForm({ memberId, defaultAmount }: PaymentFormProps) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordPaymentAction(memberId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="mb-1 flex items-center gap-2">
        <Banknote className="size-5 text-foreground" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-foreground">{t("payments.record")}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">
            <Check className="size-3.5" />
            {t("payments.recordDone")}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("payments.amount")}>
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={defaultAmount ?? ""}
            placeholder="0.00"
          />
        </Field>
        <Field label={t("payments.paidAt")}>
          <Input name="paidAt" type="date" required defaultValue={today} />
        </Field>
      </div>

      <Field label={t("payments.method")}>
        <Select name="method" required defaultValue="CASH">
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {t(methodLabelKey[method])}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("payments.note")}>
        <Textarea name="note" rows={2} placeholder={t("common.notes")} />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {t("payments.record")}
      </Button>
    </form>
  );
}
