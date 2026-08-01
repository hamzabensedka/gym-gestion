import { Role, UtilityType } from "@prisma/client";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { BillsPanel, type BillRow } from "@/components/bills/bills-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { periodMonthStart, sumBillsForMonth } from "@/lib/bills";
import { prisma } from "@/lib/db";
import { assertFeature, getGymBilling } from "@/lib/gym-features";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";

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

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const gym = await getGymBilling(session.gymId);
  if (!planHasFeature(gym.plan, "utility_bills")) {
    redirect("/dashboard");
  }

  try {
    await assertFeature(session.gymId, "utility_bills");
  } catch {
    redirect("/dashboard");
  }

  const { month: monthParam } = await searchParams;
  const monthStart = parseMonthParam(monthParam);
  const monthKey = format(monthStart, "yyyy-MM");

  const locale = await getLocale();
  const t = createTranslator(locale);

  const bills = await prisma.utilityBill.findMany({
    where: { gymId: session.gymId, periodMonth: monthStart },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      periodMonth: true,
      dueDate: true,
      paidAt: true,
      note: true,
    },
  });

  const rows: BillRow[] = bills.map((bill) => ({
    id: bill.id,
    type: bill.type,
    amount: Number(bill.amount),
    periodMonth: bill.periodMonth.toISOString(),
    dueDate: bill.dueDate?.toISOString() ?? null,
    paidAt: bill.paidAt?.toISOString() ?? null,
    note: bill.note,
  }));

  const summary = sumBillsForMonth(
    rows.map((bill) => ({
      type: bill.type,
      amount: bill.amount,
      periodMonth: new Date(bill.periodMonth),
    })),
    monthStart,
  );

  const byType = {
    [UtilityType.WATER]: summary.byType[UtilityType.WATER],
    [UtilityType.ELECTRICITY]: summary.byType[UtilityType.ELECTRICITY],
    [UtilityType.GAS]: summary.byType[UtilityType.GAS],
  };

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("bills.title")} subtitle={t("bills.subtitle")} />
      <BillsPanel
        monthKey={monthKey}
        bills={rows}
        total={summary.total}
        byType={byType}
      />
    </StaggerGroup>
  );
}
