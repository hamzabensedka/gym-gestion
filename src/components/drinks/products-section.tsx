"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CupSoda, PackagePlus, Plus } from "lucide-react";
import {
  createProductAction,
  restockProductAction,
  toggleProductActiveAction,
} from "@/app/actions/drinks";
import { useT } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DrinkProductRow } from "./types";

export function ProductsSection({ products }: { products: DrinkProductRow[] }) {
  const t = useT();
  const router = useRouter();
  const createRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [restockingId, setRestockingId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProductAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      createRef.current?.reset();
      router.refresh();
    });
  }

  function handleRestock(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await restockProductAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setRestockingId(null);
      router.refresh();
    });
  }

  function handleToggle(productId: string) {
    setError(null);
    startTransition(async () => {
      const result = await toggleProductActiveAction(productId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {products.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {t("drinks.noProducts")}
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="flex-row items-start gap-3 p-4">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  product.active
                    ? "bg-brand/10 text-brand"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <CupSoda className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{product.name}</p>
                  <Badge tone={product.active ? "success" : "neutral"}>
                    {product.active ? t("drinks.active") : t("drinks.inactive")}
                  </Badge>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatCurrency(product.sellPrice)}
                  {product.costPrice != null ? (
                    <span className="ms-2 text-xs font-normal text-muted-foreground">
                      {t("drinks.costPrice")}: {formatCurrency(product.costPrice)}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("drinks.stock")}:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {product.stockQty}
                  </span>
                </p>
                {restockingId === product.id ? (
                  <form
                    action={handleRestock}
                    className="mt-2 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="min-w-[7rem]">
                      <Field label={t("drinks.restockQty")}>
                        <Input
                          name="quantity"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          required
                          autoFocus
                        />
                      </Field>
                    </div>
                    <Button type="submit" size="sm" disabled={pending}>
                      {t("drinks.restock")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setRestockingId(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </form>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setRestockingId((id) =>
                      id === product.id ? null : product.id,
                    )
                  }
                  title={t("drinks.restock")}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <PackagePlus className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggle(product.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {product.active ? t("drinks.deactivate") : t("drinks.activate")}
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-foreground" strokeWidth={1.75} />
            <CardTitle>{t("drinks.addProduct")}</CardTitle>
          </div>
        </CardHeader>
        <form ref={createRef} action={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("drinks.name")}>
              <Input name="name" required />
            </Field>
            <Field label={`${t("drinks.sellPrice")} (TND)`}>
              <Input
                name="sellPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
              />
            </Field>
            <Field label={`${t("drinks.costPrice")} (TND)`}>
              <Input
                name="costPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
              />
            </Field>
            <Field label={t("drinks.stockQty")}>
              <Input
                name="stockQty"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                defaultValue={0}
                required
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Plus className="size-5" />
            {t("drinks.create")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
