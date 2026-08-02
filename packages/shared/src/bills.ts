import { UtilityType } from "@prisma/client";
import { startOfMonth } from "date-fns";

export type BillForSum = {
  type: UtilityType;
  amount: number;
  periodMonth: Date;
};

export function periodMonthStart(date: Date): Date {
  const start = startOfMonth(date);
  start.setHours(12, 0, 0, 0);
  return start;
}

export function sumBillsForMonth(
  bills: BillForSum[],
  monthStart: Date,
): { total: number; byType: Record<UtilityType, number> } {
  const target = periodMonthStart(monthStart).getTime();

  const byType: Record<UtilityType, number> = {
    [UtilityType.WATER]: 0,
    [UtilityType.ELECTRICITY]: 0,
    [UtilityType.GAS]: 0,
  };

  let total = 0;
  for (const bill of bills) {
    if (periodMonthStart(bill.periodMonth).getTime() !== target) continue;
    total += bill.amount;
    byType[bill.type] += bill.amount;
  }

  return { total, byType };
}
