import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { createTranslator, type Locale, type TranslationKey } from "@/lib/i18n";
import {
  formatPercentChange,
  formatSignedCount,
  type DashboardTrends,
} from "@gym/shared/dashboard-trends";

type TrendChipsProps = {
  trends: DashboardTrends;
  locale: Locale;
};

type ChipConfig = {
  labelKey: TranslationKey;
  comparisonKey: TranslationKey;
  delta: string;
  tone: "success" | "danger" | "neutral";
};

function trendTone(delta: number, invert = false): "success" | "danger" | "neutral" {
  if (delta === 0) return "neutral";
  const positive = invert ? delta < 0 : delta > 0;
  return positive ? "success" : "danger";
}

function formatSignedCurrency(delta: number): string {
  if (delta === 0) return formatCurrency(0);
  const sign = delta > 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(delta))}`;
}

export function TrendChips({ trends, locale }: TrendChipsProps) {
  const t = createTranslator(locale);

  const chips: ChipConfig[] = [
    {
      labelKey: "dash.trendCheckins",
      comparisonKey: "dash.trendVsLastWeek",
      delta:
        trends.checkinsWeek.percentChange !== null
          ? formatPercentChange(trends.checkinsWeek.percentChange, locale)
          : t("dash.trendNoBaseline"),
      tone: trendTone(trends.checkinsWeek.delta),
    },
    {
      labelKey: "dash.trendActiveMembers",
      comparisonKey: "dash.trendVsLastMonth",
      delta: formatSignedCount(trends.activeMembersMonth.delta, locale),
      tone: trendTone(trends.activeMembersMonth.delta),
    },
    {
      labelKey: "dash.trendExpiredMembers",
      comparisonKey: "dash.trendVsLastMonth",
      delta: formatSignedCount(trends.expiredMembersMonth.delta, locale),
      tone: trendTone(trends.expiredMembersMonth.delta, true),
    },
    {
      labelKey: "dash.trendCollected",
      comparisonKey: "dash.trendVsLastMonth",
      delta: formatSignedCurrency(trends.collectedRevenueMonth.delta),
      tone: trendTone(trends.collectedRevenueMonth.delta),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {chips.map((chip) => (
        <div
          key={chip.labelKey}
          className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 px-3 py-2"
        >
          <span className="text-xs text-muted-foreground">{t(chip.labelKey)}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={chip.tone} className="tnum text-xs font-semibold">
              {chip.delta}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{t(chip.comparisonKey)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
