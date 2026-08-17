import { format, isValid, parse } from "date-fns";
import type { Locale } from "date-fns";

export type MonthCell = {
  key: string;
  label: string;
  disabled: boolean;
  selected: boolean;
};

/** Parse `yyyy-MM` into the first day of that month, or undefined if invalid. */
export function parseYearMonth(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = parse(`${value}-01`, "yyyy-MM-dd", new Date());
  return isValid(date) ? date : undefined;
}

/** Year used for the month grid: prefer explicit view, else selection, else now. */
export function resolveViewYear(
  viewYear: number | undefined,
  selectedYearMonth: string | undefined,
  now: Date = new Date(),
): number {
  if (typeof viewYear === "number" && Number.isFinite(viewYear)) {
    return viewYear;
  }
  const selected = parseYearMonth(selectedYearMonth);
  return selected?.getFullYear() ?? now.getFullYear();
}

export function shiftViewYear(viewYear: number, delta: number): number {
  return viewYear + delta;
}

/**
 * When the selected value changes, sync the grid year to that selection.
 * Returns the previous view year when selection is empty or unchanged year.
 */
export function syncViewYearToSelection(
  selectedYearMonth: string | undefined,
  currentViewYear: number,
): number {
  const selected = parseYearMonth(selectedYearMonth);
  if (!selected) return currentViewYear;
  return selected.getFullYear();
}

export function buildMonthCells({
  viewYear,
  selectedYearMonth,
  min,
  max,
  locale,
}: {
  viewYear: number;
  selectedYearMonth: string | undefined;
  min?: string;
  max?: string;
  locale: Locale;
}): MonthCell[] {
  const minDate = parseYearMonth(min);
  const maxDate = parseYearMonth(max);

  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(viewYear, month, 1);
    const key = format(date, "yyyy-MM");
    const beforeMin = minDate
      ? date < new Date(minDate.getFullYear(), minDate.getMonth(), 1)
      : false;
    const afterMax = maxDate
      ? date > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
      : false;
    return {
      key,
      label: format(date, "MMM", { locale }),
      disabled: beforeMin || afterMax,
      selected: selectedYearMonth === key,
    };
  });
}
