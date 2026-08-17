"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UtilityType } from "@prisma/client";
import { Check, Plus, Trash2, Zap } from "lucide-react";
import {
  createBillAction,
  deleteBillAction,
  markBillPaidAction,
} from "@/app/actions/bills";
import { useT } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type BillRow = {
  id: string;
  type: UtilityType;
  amount: number;
  periodMonth: string;
  dueDate: string | null;
  paidAt: string | null;
  note: string | null;
};

const UTILITY_TYPES = ["WATER", "ELECTRICITY", "GAS", "CUSTOM"] as const satisfies readonly UtilityType[];

const TYPE_LABEL: Record<UtilityType, TranslationKey> = {
  WATER: "bills.type.WATER",
  ELECTRICITY: "bills.type.ELECTRICITY",
  GAS: "bills.type.GAS",
  CUSTOM: "bills.type.CUSTOM",
};

function billTitle(bill: BillRow, t: (key: TranslationKey) => string): string {
  if (bill.type === "CUSTOM") {
    return bill.note?.trim() || t("bills.type.CUSTOM");
  }
  return t(TYPE_LABEL[bill.type]);
}

export function BillsPanel({
  monthKey,
  bills,
  total,
  byType,
}: {
  monthKey: string;
  bills: BillRow[];
  total: number;
  byType: Record<UtilityType, number>;
}) {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingBill, setDeletingBill] = useState<BillRow | null>(null);
  const [billType, setBillType] = useState<UtilityType>("WATER");

  function onMonthChange(value: string) {
    if (!value) return;
    router.push(`/bills?month=${value}`);
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBillAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setBillType("WATER");
      router.refresh();
    });
  }

  function handleMarkPaid(billId: string) {
    setError(null);
    startTransition(async () => {
      const result = await markBillPaidAction(billId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deletingBill) return;
    startTransition(async () => {
      const result = await deleteBillAction(deletingBill.id);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setDeletingBill(null);
        return;
      }
      setDeletingBill(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <Field label={t("bills.month")}>
          <MonthPicker value={monthKey} onValueChange={onMonthChange} />
        </Field>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("bills.total")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {UTILITY_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{t(TYPE_LABEL[type])}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatCurrency(byType[type] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-2.5">
        {bills.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t("bills.noBills")}
          </Card>
        ) : (
          bills.map((bill) => {
            const paid = bill.paidAt != null;
            return (
              <Card key={bill.id} className="flex-row items-start gap-3 p-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    paid ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Zap className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{billTitle(bill, t)}</p>
                    <Badge tone={paid ? "success" : "neutral"}>
                      {paid ? t("bills.paid") : t("bills.unpaid")}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(bill.amount)}
                  </p>
                  {bill.dueDate ? (
                    <p className="text-xs text-muted-foreground">
                      {t("bills.dueDate")}: {formatDate(bill.dueDate)}
                    </p>
                  ) : null}
                  {bill.note && bill.type !== "CUSTOM" ? (
                    <p className="text-xs text-muted-foreground">{bill.note}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!paid ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleMarkPaid(bill.id)}
                      title={t("bills.markPaid")}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <Check className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeletingBill(bill)}
                    title={t("bills.delete")}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-foreground" strokeWidth={1.75} />
            <CardTitle>{t("bills.add")}</CardTitle>
          </div>
        </CardHeader>
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("bills.type")}>
              <Select
                name="type"
                value={billType}
                onValueChange={(value) => setBillType(value as UtilityType)}
                required
                options={UTILITY_TYPES.map((type) => ({
                  value: type,
                  label: t(TYPE_LABEL[type]),
                }))}
              />
            </Field>
            <Field label={`${t("bills.amount")} (TND)`}>
              <Input
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
              />
            </Field>
            <Field label={t("bills.period")}>
              <MonthPicker name="periodMonth" defaultValue={monthKey} required />
            </Field>
            <Field label={t("bills.dueDate")}>
              <DatePicker name="dueDate" />
            </Field>
          </div>
          <Field
            label={
              billType === "CUSTOM"
                ? t("bills.customName")
                : t("bills.note")
            }
          >
            <Input
              name="note"
              required={billType === "CUSTOM"}
              placeholder={
                billType === "CUSTOM"
                  ? t("bills.customNamePlaceholder")
                  : undefined
              }
            />
          </Field>
          {error ? (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Plus className="size-5" />
            {t("bills.create")}
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={deletingBill !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingBill(null);
        }}
        title={t("common.confirmDelete")}
        description={t("bills.confirmDeleteBody")}
        confirmLabel={t("bills.delete")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDelete}
      />
    </div>
  );
}
