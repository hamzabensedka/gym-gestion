import Link from "next/link";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import {
  DrinksPanel,
  type DrinkProductRow,
  type DrinkSaleRow,
} from "@/components/drinks/drinks-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { buttonVariants } from "@/components/ui/button";
import { periodMonthStart } from "@/lib/bills";
import { sumDrinkRevenue } from "@/lib/drinks";
import { prisma } from "@/lib/db";
import { assertFeature, getGymBilling } from "@/lib/gym-features";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

function parseMonthParam(raw?: string): Date {
  if (raw) {
    const match = /^(\d{4})-(\d{2})$/.exec(raw);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12) {
        return periodMonthStart(new Date(year, month - 1, 1));
      }
    }
  }
  return periodMonthStart(new Date());
}

function monthRange(monthStart: Date) {
  const start = monthStart;
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  return { start, end };
}

export default async function DrinksPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const gym = await getGymBilling(session.gymId);
  const unlocked = planHasFeature(gym.plan, "drinks");

  if (!unlocked) {
    return (
      <StaggerGroup className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title={t("drinks.title")}
          subtitle={t("drinks.lockedSubtitle")}
        />
        <div className="space-y-4">
          <p className="text-pretty text-sm text-muted-foreground">
            {t("drinks.upgradeBody")}
          </p>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
          >
            {t("drinks.upgradeCta")}
          </Link>
        </div>
      </StaggerGroup>
    );
  }

  try {
    await assertFeature(session.gymId, "drinks");
  } catch {
    redirect("/dashboard");
  }

  const { month: monthParam } = await searchParams;
  const monthStart = parseMonthParam(monthParam);
  const monthKey = format(monthStart, "yyyy-MM");
  const { start, end } = monthRange(monthStart);

  const [products, sales] = await Promise.all([
    prisma.drinkProduct.findMany({
      where: { gymId: session.gymId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sellPrice: true,
        costPrice: true,
        stockQty: true,
        active: true,
      },
    }),
    prisma.drinkSale.findMany({
      where: {
        gymId: session.gymId,
        soldAt: { gte: start, lt: end },
      },
      orderBy: { soldAt: "desc" },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        total: true,
        method: true,
        soldAt: true,
        note: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  const productRows: DrinkProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sellPrice: Number(product.sellPrice),
    costPrice: product.costPrice != null ? Number(product.costPrice) : null,
    stockQty: product.stockQty,
    active: product.active,
  }));

  const saleRows: DrinkSaleRow[] = sales.map((sale) => ({
    id: sale.id,
    productName: sale.product.name,
    quantity: sale.quantity,
    unitPrice: Number(sale.unitPrice),
    total: Number(sale.total),
    method: sale.method,
    soldAt: sale.soldAt.toISOString(),
    note: sale.note,
  }));

  const revenue = sumDrinkRevenue(saleRows.map((sale) => ({ total: sale.total })));

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("drinks.title")} subtitle={t("drinks.subtitle")} />
      <DrinksPanel
        monthKey={monthKey}
        products={productRows}
        sales={saleRows}
        revenue={revenue}
      />
    </StaggerGroup>
  );
}
