import { Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { createTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { PaymentMethod } from "@prisma/client";

type PaymentRow = {
  id: string;
  amount: { toString(): string } | number | string;
  method: PaymentMethod;
  paidAt: Date;
  note: string | null;
  recordedBy: { name: string };
};

const methodKeys = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
} as const;

export function PaymentHistory({
  payments,
  locale,
}: {
  payments: PaymentRow[];
  locale: Locale;
}) {
  const t = createTranslator(locale);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" strokeWidth={1.75} />
          <CardTitle>{t("payments.history")}</CardTitle>
        </div>
      </CardHeader>
      {payments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("payments.noPayments")}
        </p>
      ) : (
        <ul className="space-y-1">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm odd:bg-muted"
            >
              <div className="min-w-0">
                <p className="tnum font-semibold text-foreground">
                  {formatCurrency(Number(payment.amount))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(methodKeys[payment.method])} · {formatDate(payment.paidAt, locale)}
                </p>
                {payment.note ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{payment.note}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {t("payments.recordedBy")} {payment.recordedBy.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
