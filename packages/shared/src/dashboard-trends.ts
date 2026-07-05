export type TrendMetric = {
  current: number;
  previous: number;
  delta: number;
  percentChange: number | null;
};

export type DashboardTrends = {
  checkinsWeek: TrendMetric;
  activeMembersMonth: TrendMetric;
  expiredMembersMonth: TrendMetric;
  collectedRevenueMonth: TrendMetric;
};

export function buildTrendMetric(current: number, previous: number): TrendMetric {
  const delta = current - previous;
  const percentChange = previous > 0 ? (delta / previous) * 100 : null;
  return { current, previous, delta, percentChange };
}

export function formatPercentChange(value: number | null, locale: string): string {
  if (value === null) return "";
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(rounded);
  return `${formatted}%`;
}

export function formatSignedCount(delta: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-FR", {
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(delta);
}
