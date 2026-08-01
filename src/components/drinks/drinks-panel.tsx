"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProductsSection } from "./products-section";
import { SalesList } from "./sales-list";
import { SellForm } from "./sell-form";
import type { DrinkProductRow, DrinkSaleRow } from "./types";

export type { DrinkProductRow, DrinkSaleRow };

type Section = "products" | "sell" | "history";

export function DrinksPanel({
  monthKey,
  products,
  sales,
  revenue,
}: {
  monthKey: string;
  products: DrinkProductRow[];
  sales: DrinkSaleRow[];
  revenue: number;
}) {
  const t = useT();
  const router = useRouter();
  const [section, setSection] = useState<Section>("products");

  const tabs: { id: Section; label: string }[] = [
    { id: "products", label: t("drinks.section.products") },
    { id: "sell", label: t("drinks.section.sell") },
    { id: "history", label: t("drinks.section.history") },
  ];

  function onMonthChange(value: string) {
    if (!value) return;
    router.push(`/drinks?month=${value}`);
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <Field label={t("drinks.month")}>
          <Input
            type="month"
            name="month"
            value={monthKey}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={cn(
                "rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
                section === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {section === "products" ? <ProductsSection products={products} /> : null}
      {section === "sell" ? <SellForm products={products} /> : null}
      {section === "history" ? (
        <SalesList sales={sales} revenue={revenue} />
      ) : null}
    </div>
  );
}
