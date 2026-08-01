"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ShoppingBag } from "lucide-react";
import { sellDrinkAction } from "@/app/actions/drinks";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { TranslationKey } from "@/lib/i18n";
import { formatCurrency } from "@/lib/format";
import { paymentMethods } from "@/lib/validations";
import type { DrinkProductRow } from "./types";

const methodLabelKey: Record<(typeof paymentMethods)[number], TranslationKey> = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
};

export function SellForm({ products }: { products: DrinkProductRow[] }) {
  const t = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const today = format(new Date(), "yyyy-MM-dd");

  const activeProducts = products.filter((p) => p.active && p.stockQty > 0);
  const selected = activeProducts.find((p) => p.id === selectedId) ?? activeProducts[0];

  function handleSell(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sellDrinkAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  if (activeProducts.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {t("drinks.noSellable")}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5 text-foreground" strokeWidth={1.75} />
          <CardTitle>{t("drinks.sell")}</CardTitle>
        </div>
      </CardHeader>
      <form ref={formRef} action={handleSell} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("drinks.product")}>
            <Select
              name="productId"
              required
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.stockQty}) — {formatCurrency(product.sellPrice)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("drinks.quantity")}>
            <Input
              name="quantity"
              type="number"
              inputMode="numeric"
              min="1"
              max={selected?.stockQty ?? 1}
              step="1"
              defaultValue={1}
              required
            />
          </Field>
          <Field label={t("payments.method")}>
            <Select name="method" required defaultValue="CASH">
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {t(methodLabelKey[method])}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("drinks.soldAt")}>
            <Input name="soldAt" type="date" required defaultValue={today} />
          </Field>
        </div>
        <Field label={t("drinks.note")}>
          <Textarea name="note" rows={2} />
        </Field>
        {error ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          <ShoppingBag className="size-5" />
          {t("drinks.confirmSell")}
        </Button>
      </form>
    </Card>
  );
}
