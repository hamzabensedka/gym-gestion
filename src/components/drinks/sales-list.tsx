"use client";

import type { PaymentMethod } from "@prisma/client";
import { History } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";
import type { DrinkSaleRow } from "./types";

const methodKeys = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
} as const satisfies Record<PaymentMethod, TranslationKey>;

export function SalesList({
  sales,
  revenue,
}: {
  sales: DrinkSaleRow[];
  revenue: number;
}) {
  const t = useT();

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("drinks.revenue")}
        </p>
        <p className="text-2xl font-semibold tabular-nums">
          {formatCurrency(revenue)}
        </p>
      </Card>

      <div className="space-y-2.5">
        {sales.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t("drinks.noSales")}
          </Card>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id} className="flex-row items-start gap-3 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <History className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">{sale.productName}</p>
                <p className="text-sm font-medium tabular-nums">
                  {sale.quantity} × {formatCurrency(sale.unitPrice)} ={" "}
                  {formatCurrency(sale.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(methodKeys[sale.method])} · {formatDate(sale.soldAt)}
                </p>
                {sale.note ? (
                  <p className="text-xs text-muted-foreground">{sale.note}</p>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
