import { ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useState } from "react";
import { Link, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { FeatherIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch, apiText } from "@/lib/api";
import { shareCsv } from "@/lib/share-csv";
import { Badge, Button, Card, CardTitle, ListRow, PageHeader, StatCard } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { formatCurrency, formatDate } from "@gym/shared/format";
import { formatPeakHourRange } from "@gym/shared/peak-hours";
import { buildWhatsappUrl } from "@gym/shared/subscription";
import { BulkWhatsappBar } from "@/components/bulk-whatsapp";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import type { ActionItem, ActionItemCategory, ActionItemsData } from "@gym/shared/dashboard-actions";
import {
  formatPercentChange,
  formatSignedCount,
  type DashboardTrends,
} from "@gym/shared/dashboard-trends";
import type { TranslationKey } from "@gym/shared/i18n";

type SettingsSnapshot = {
  features: string[];
};

type DashboardData = {
  gymName: string;
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  expiringCount: number;
  todayCheckins: number;
  collectedThisMonth: number;
  collectedToday: number;
  expectedMonthlyRevenue: number;
  unpaidExpiredCount: number;
  actionItems: ActionItemsData;
  expiringSoon: Array<{ id: string; fullName: string; phone: string; subscriptionEnd: string }>;
  busiestHour: number | null;
  recentCheckins: Array<{ id: string; timestamp: string; member: { id: string; fullName: string } }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: "CASH" | "D17" | "BANK_TRANSFER" | "CARD" | "OTHER";
    paidAt: string;
    member: { id: string; fullName: string };
  }>;
  weeklyAttendance: Array<{ date: string; count: number }>;
  trends: DashboardTrends;
  utilityBillsThisMonth: number | null;
  drinksRevenueThisMonth: number | null;
};

const paymentMethodKeys: Record<DashboardData["recentPayments"][number]["method"], TranslationKey> = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
};

const categoryLabelKey: Record<ActionItemCategory, TranslationKey> = {
  PAYMENT_FOLLOWUP: "dash.actionPaymentFollowup",
  EXPIRED: "dash.actionExpired",
  EXPIRING: "dash.actionExpiring",
  INACTIVE: "dash.actionInactive",
};

const categoryTone: Record<ActionItemCategory, "danger" | "warning" | "neutral"> = {
  PAYMENT_FOLLOWUP: "danger",
  EXPIRED: "danger",
  EXPIRING: "warning",
  INACTIVE: "neutral",
};

const viewAllHref: Partial<Record<ActionItemCategory, string>> = {
  EXPIRING: "/(admin)/members",
  EXPIRED: "/(admin)/members",
  PAYMENT_FOLLOWUP: "/(admin)/members",
  INACTIVE: "/(admin)/attendance",
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

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });

  const renew = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/members/${memberId}/renew`, {
        method: "POST",
        body: JSON.stringify({ months: 1 }),
      }),
    onSuccess: () => {
      setRenewTarget(null);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const [renewTarget, setRenewTarget] = useState<{ id: string; name: string } | null>(null);
  const [exportingPayments, setExportingPayments] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const canCsv = (settings?.features ?? []).includes("csv_export");

  async function exportPayments() {
    setExportingPayments(true);
    try {
      const from = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const to = format(new Date(), "yyyy-MM-dd");
      const csv = await apiText(`/payments/export?from=${from}&to=${to}`);
      await shareCsv("payments.csv", csv);
    } catch (e) {
      setErrorNotice(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setExportingPayments(false);
    }
  }

  function whatsappMessage(item: ActionItem, gymName: string) {
    const date = formatDate(item.subscriptionEnd, locale);
    if (item.category === "INACTIVE") {
      return t("dash.waInactive", { name: item.fullName, gym: gymName });
    }
    if (item.category === "EXPIRING") {
      return t("detail.waActive", { name: item.fullName, gym: gymName, date });
    }
    return t("detail.waExpired", { name: item.fullName, gym: gymName, date });
  }

  function openRenewConfirm(memberId: string, memberName: string) {
    setRenewTarget({ id: memberId, name: memberName });
  }

  if (isLoading || !data) {
    return (
      <View style={styles.safe}>
        <Text style={styles.loading}>{t("common.loading")}</Text>
      </View>
    );
  }

  const total = data.totalMembers || 1;
  const activePct = (data.activeMembers / total) * 100;
  const expiringPct = (data.expiringCount / total) * 100;
  const expiredPct = (data.expiredMembers / total) * 100;
  const maxWeekly = Math.max(...data.weeklyAttendance.map((d) => d.count), 1);
  const showUtilityBills = data.utilityBillsThisMonth !== null;
  const showDrinksRevenue = data.drinksRevenueThisMonth !== null;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />

        <Card style={styles.actionsCard}>
          <View style={styles.cardHeading}>
            <FeatherIcon name="check-square" size={20} color={colors.critical} />
            <View style={{ flex: 1 }}>
              <CardTitle>{t("dash.actionsTitle")}</CardTitle>
              <Text style={styles.sectionSub}>{t("dash.actionsSubtitle")}</Text>
            </View>
          </View>

          {(["PAYMENT_FOLLOWUP", "EXPIRED", "EXPIRING", "INACTIVE"] as ActionItemCategory[])
            .filter((category) => data.actionItems.counts[category] > 0).length > 0 ? (
            <View style={styles.chipRow}>
              {(["PAYMENT_FOLLOWUP", "EXPIRED", "EXPIRING", "INACTIVE"] as ActionItemCategory[])
                .filter((category) => data.actionItems.counts[category] > 0)
                .map((category) => {
                  const href = viewAllHref[category];
                  const label = `${t(categoryLabelKey[category])} (${data.actionItems.counts[category]})`;
                  return href ? (
                    <Link key={category} href={href} style={styles.chip}>
                      <Text style={styles.chipText}>{label}</Text>
                    </Link>
                  ) : (
                    <View key={category} style={styles.chip}>
                      <Text style={styles.chipText}>{label}</Text>
                    </View>
                  );
                })}
            </View>
          ) : null}

          {data.actionItems.items.length === 0 ? (
            <Text style={styles.empty}>{t("dash.actionsEmpty")}</Text>
          ) : (
            data.actionItems.items.map((item) => (
              <View key={`${item.memberId}-${item.category}`} style={styles.actionItem}>
                <View style={styles.actionHeader}>
                  <Text style={styles.listName}>{item.fullName}</Text>
                  <Badge label={t(categoryLabelKey[item.category])} tone={categoryTone[item.category]} />
                </View>
                <Text style={styles.listMeta}>
                  {item.category === "INACTIVE"
                    ? t("dash.actionInactiveHint")
                    : `${t("dash.expiresOn")} ${formatDate(item.subscriptionEnd, locale)}`}
                </Text>
                <View style={styles.actionButtons}>
                  {(item.category === "EXPIRING" ||
                    item.category === "EXPIRED" ||
                    item.category === "PAYMENT_FOLLOWUP") && (
                    <Button
                      label={t("dash.actionRenew")}
                      size="sm"
                      variant="secondary"
                      onPress={() => openRenewConfirm(item.memberId, item.fullName)}
                      loading={renew.isPending}
                    />
                  )}
                  <Button
                    label={t("dash.actionPayment")}
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push(`/(admin)/members/${item.memberId}`)}
                  />
                  <Button
                    label={t("detail.whatsapp")}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      Linking.openURL(buildWhatsappUrl(item.phone, whatsappMessage(item, data.gymName)))
                    }
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        <View style={styles.revenueCard}>
          <View style={styles.revenueContent}>
            <Text style={styles.revenueLabel}>{t("dash.collectedThisMonth").toUpperCase()}</Text>
            <Text style={styles.revenueValue}>{formatCurrency(data.collectedThisMonth)}</Text>
            <Text style={styles.revenueHint}>
              {t("dash.expectedRevenueHint", {
                amount: formatCurrency(data.expectedMonthlyRevenue),
              })}
            </Text>
            <Text style={styles.revenueToday}>
              {t("dash.collectedToday")} : {formatCurrency(data.collectedToday)}
            </Text>
          </View>
          <View style={styles.revenueIcon}>
            <FeatherIcon name="trending-up" size={20} color={colors.brand} />
          </View>
        </View>

        <View style={styles.trendsGrid}>
          {(
            [
              {
                labelKey: "dash.trendCheckins" as TranslationKey,
                comparisonKey: "dash.trendVsLastWeek" as TranslationKey,
                delta:
                  data.trends.checkinsWeek.percentChange !== null
                    ? formatPercentChange(data.trends.checkinsWeek.percentChange, locale)
                    : t("dash.trendNoBaseline"),
                tone: trendTone(data.trends.checkinsWeek.delta),
              },
              {
                labelKey: "dash.trendActiveMembers" as TranslationKey,
                comparisonKey: "dash.trendVsLastMonth" as TranslationKey,
                delta: formatSignedCount(data.trends.activeMembersMonth.delta, locale),
                tone: trendTone(data.trends.activeMembersMonth.delta),
              },
              {
                labelKey: "dash.trendExpiredMembers" as TranslationKey,
                comparisonKey: "dash.trendVsLastMonth" as TranslationKey,
                delta: formatSignedCount(data.trends.expiredMembersMonth.delta, locale),
                tone: trendTone(data.trends.expiredMembersMonth.delta, true),
              },
              {
                labelKey: "dash.trendCollected" as TranslationKey,
                comparisonKey: "dash.trendVsLastMonth" as TranslationKey,
                delta: formatSignedCurrency(data.trends.collectedRevenueMonth.delta),
                tone: trendTone(data.trends.collectedRevenueMonth.delta),
              },
            ] as const
          ).map((chip) => (
            <View key={chip.labelKey} style={styles.trendChip}>
              <Text style={styles.trendLabel}>{t(chip.labelKey)}</Text>
              <View style={styles.trendDeltaRow}>
                <Badge label={chip.delta} tone={chip.tone} />
                <Text style={styles.trendComparison}>{t(chip.comparisonKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        {showUtilityBills || showDrinksRevenue ? (
          <View style={styles.statsGrid}>
            {showUtilityBills ? (
              <StatCard
                label={t("bills.total")}
                value={formatCurrency(data.utilityBillsThisMonth!)}
                icon={<FeatherIcon name="file-text" size={18} color={colors.foreground} />}
              />
            ) : null}
            {showDrinksRevenue ? (
              <StatCard
                label={t("drinks.revenue")}
                value={formatCurrency(data.drinksRevenueThisMonth!)}
                tone="brand"
                icon={<FeatherIcon name="coffee" size={18} color={colors.brand} />}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard
            label={t("dash.totalMembers")}
            value={data.totalMembers}
            icon={<FeatherIcon name="users" size={18} color={colors.foreground} />}
          />
          <StatCard
            label={t("dash.activeMembers")}
            value={data.activeMembers}
            tone="success"
            icon={<FeatherIcon name="user-check" size={18} color={colors.brand} />}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            label={t("dash.expiredMembers")}
            value={data.expiredMembers}
            tone="danger"
            icon={<FeatherIcon name="user-x" size={18} color={colors.critical} />}
          />
          <StatCard
            label={t("dash.todayCheckins")}
            value={data.todayCheckins}
            tone="brand"
            icon={<FeatherIcon name="activity" size={18} color={colors.brand} />}
          />
        </View>

        <Card>
          <CardTitle>{t("dash.statusSplit")}</CardTitle>
          <View style={styles.statusBar}>
            <View style={[styles.statusSegment, { flex: activePct, backgroundColor: colors.brand }]} />
            <View
              style={[styles.statusSegment, { flex: expiringPct, backgroundColor: colors.foreground50 }]}
            />
            <View
              style={[styles.statusSegment, { flex: expiredPct, backgroundColor: colors.foreground25 }]}
            />
          </View>
          <View style={styles.legendRow}>
            <Legend color={colors.brand} label={t("common.active")} value={data.activeMembers} />
            <Legend color={colors.foreground50} label={t("common.expiringSoon")} value={data.expiringCount} />
            <Legend color={colors.foreground25} label={t("common.expired")} value={data.expiredMembers} />
          </View>
        </Card>

        <Card>
          <CardTitle>{t("dash.weeklyAttendance")}</CardTitle>
          <View style={styles.chart}>
            {data.weeklyAttendance.map((day) => (
              <View key={day.date} style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(8, (day.count / maxWeekly) * 80) },
                  ]}
                />
                <Text style={styles.barLabel}>{day.count}</Text>
              </View>
            ))}
          </View>
          {data.busiestHour !== null ? (
            <Text style={styles.sectionSub}>
              {t("dash.busiestHour")}: {formatPeakHourRange(data.busiestHour, locale)}
            </Text>
          ) : null}
        </Card>

        <Card>
          <View style={styles.cardHeading}>
            <FeatherIcon name="calendar" size={20} color={colors.brand} />
            <CardTitle>{t("dash.expiringTitle")}</CardTitle>
          </View>
          {data.expiringSoon.length > 0 ? (
            <BulkWhatsappBar
              members={data.expiringSoon.map((member) => ({
                id: member.id,
                fullName: member.fullName,
                phone: member.phone,
              }))}
              getMessage={(recipient) => {
                const member = data.expiringSoon.find((item) => item.id === recipient.id)!;
                return t("detail.waActive", {
                  name: recipient.fullName,
                  gym: data.gymName,
                  date: formatDate(member.subscriptionEnd, locale),
                });
              }}
              labels={{
                remind: (total) => t("wa.bulkRemind", { total }),
                next: t("wa.bulkNext"),
                progress: (current, total) => t("wa.bulkProgress", { current, total }),
                done: t("wa.bulkDone"),
              }}
            />
          ) : null}
          {data.expiringSoon.length === 0 ? (
            <Text style={styles.empty}>{t("dash.noExpiring")}</Text>
          ) : (
            data.expiringSoon.map((m) => (
              <Link key={m.id} href={`/(admin)/members/${m.id}`} asChild>
                <ListRow>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{m.fullName}</Text>
                    <Text style={styles.listMeta}>
                      {t("dash.expiresOn")} {formatDate(m.subscriptionEnd, locale)}
                    </Text>
                  </View>
                </ListRow>
              </Link>
            ))
          )}
        </Card>

        <Card>
          <View style={styles.cardHeading}>
            <FeatherIcon name="clock" size={20} color={colors.brand} />
            <CardTitle>{t("dash.recentActivity")}</CardTitle>
          </View>
          {data.recentCheckins.length === 0 ? (
            <Text style={styles.empty}>{t("att.noToday")}</Text>
          ) : (
            data.recentCheckins.map((c) => (
              <View key={c.id} style={styles.recentRow}>
                <Text style={styles.listName}>{c.member.fullName}</Text>
                <Badge
                  label={new Date(c.timestamp).toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </View>
            ))
          )}
        </Card>

        <Card>
          <View style={styles.paymentsHeading}>
            <View style={[styles.cardHeading, { marginBottom: 0 }]}>
              <FeatherIcon name="credit-card" size={20} color={colors.brand} />
              <CardTitle>{t("dash.recentPayments")}</CardTitle>
            </View>
            {canCsv ? (
              <Button
                label={t("payments.export")}
                variant="outline"
                size="sm"
                onPress={exportPayments}
                loading={exportingPayments}
              />
            ) : null}
          </View>
          {data.recentPayments.length === 0 ? (
            <Text style={styles.empty}>{t("dash.noPayments")}</Text>
          ) : (
            data.recentPayments.map((payment) => (
              <Link key={payment.id} href={`/(admin)/members/${payment.member.id}`} asChild>
                <ListRow>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{payment.member.fullName}</Text>
                    <Text style={styles.listMeta}>
                      {t(paymentMethodKeys[payment.method])} · {formatDate(payment.paidAt, locale)}
                    </Text>
                  </View>
                  <Badge label={formatCurrency(payment.amount)} tone="success" />
                </ListRow>
              </Link>
            ))
          )}
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={renewTarget !== null}
        onClose={() => setRenewTarget(null)}
        tone="brand"
        title={t("renew.confirmTitle")}
        description={
          renewTarget
            ? t("renew.confirmBody", { name: renewTarget.name, months: "1" })
            : ""
        }
        confirmLabel={t("renew.confirm")}
        cancelLabel={t("common.cancel")}
        loading={renew.isPending}
        onConfirm={() => {
          if (renewTarget) renew.mutate(renewTarget.id);
        }}
      />

      <NoticeDialog
        visible={errorNotice !== null}
        onClose={() => setErrorNotice(null)}
        title={t("common.error")}
        description={errorNotice ?? undefined}
        tone="critical"
        confirmLabel={t("common.ok")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  loading: { padding: spacing.lg, color: colors.mutedForeground },
  revenueCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    padding: 20,
    marginBottom: spacing.md,
  },
  revenueContent: { flex: 1 },
  revenueLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: colors.brandText,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.foreground,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  revenueHint: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  revenueToday: { fontSize: 12, fontWeight: "500", color: colors.foreground, marginTop: 4, opacity: 0.7 },
  revenueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  trendChip: {
    flexBasis: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trendLabel: { fontSize: 12, color: colors.mutedForeground },
  trendDeltaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  trendComparison: { fontSize: 11, color: colors.mutedForeground },
  statsGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  statusBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  statusSegment: { minWidth: 2 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999 },
  legendText: { fontSize: 14, color: colors.foreground },
  legendValue: { fontSize: 14, fontWeight: "700", color: colors.foreground, fontVariant: ["tabular-nums"] },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 100 },
  barWrap: { alignItems: "center", flex: 1 },
  bar: { width: 20, backgroundColor: colors.brand, borderRadius: 4 },
  barLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, fontVariant: ["tabular-nums"] },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  paymentsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  sectionSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  actionsCard: { borderLeftWidth: 4, borderLeftColor: colors.critical },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.muted,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  actionItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.muted,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  actionButtons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  empty: { textAlign: "center", paddingVertical: spacing.lg, fontSize: 14, color: colors.mutedForeground },
  listName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  listMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
